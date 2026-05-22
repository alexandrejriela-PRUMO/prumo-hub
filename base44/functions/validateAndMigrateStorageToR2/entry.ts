/**
 * validateAndMigrateStorageToR2 — Valida e padroniza paths de arquivo para R2
 * Localiza arquivo em Supabase e migra para R2 se necessário.
 * Retorna path corrigido/migrado.
 *
 * Chamado por componentes de visualização para garantir que todo arquivo
 * aponta para R2 (sem oscilações entre Supabase e R2).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const R2_BUCKET = Deno.env.get('R2_BUCKET_NAME');
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
const R2_ACCESS_KEY = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Hash para HMAC-SHA256
const hashHmacSha256 = async (key, message) => {
  const keyBuf = new TextEncoder().encode(key);
  const msgBuf = new TextEncoder().encode(message);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgBuf);
  return new Uint8Array(signature);
};

const toHex = (arr) => Array.from(arr).map(x => x.toString(16).padStart(2, '0')).join('');

const hashSha256 = async (data) => {
  const buf = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return toHex(new Uint8Array(digest));
};

// Verificar se arquivo existe em Supabase
const fileExistsInSupabase = async (filePath) => {
  try {
    const url = `${SUPABASE_URL}/storage/v1/object/public/prumo-files/${filePath}`;
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

// Migrate Supabase → R2
const migrateFileToR2 = async (supabasePath) => {
  try {
    // Download de Supabase
    const supabaseUrl = `${SUPABASE_URL}/storage/v1/object/authenticated/prumo-files/${supabasePath}`;
    const supabaseRes = await fetch(supabaseUrl, {
      headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!supabaseRes.ok) return null;
    
    const fileBuffer = await supabaseRes.arrayBuffer();
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    
    // Upload para R2 com mesmo path
    const r2Path = `${R2_BUCKET}/${supabasePath}`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]/g, '').slice(0, 8) + 'T' + now.toISOString().replace(/[:-]/g, '').slice(9, 15) + 'Z';
    const dateStamp = amzDate.slice(0, 8);
    
    const canonicalRequest = [
      'PUT',
      `/${supabasePath}`,
      '',
      `host:${R2_ACCOUNT_ID}.r2.amazonaws.com`,
      'x-amz-content-sha256:' + await hashSha256(fileBase64),
      'x-amz-date:' + amzDate,
      '',
      'host;x-amz-content-sha256;x-amz-date',
      await hashSha256(fileBase64),
    ].join('\n');
    
    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      await hashSha256(canonicalRequest),
    ].join('\n');
    
    const kDate = await hashHmacSha256(`AWS4${R2_SECRET_KEY}`, dateStamp);
    const kRegion = await hashHmacSha256(toHex(kDate), 'auto');
    const kService = await hashHmacSha256(toHex(kRegion), 's3');
    const kSigning = await hashHmacSha256(toHex(kService), 'aws4_request');
    const signature = toHex(await hashHmacSha256(toHex(kSigning), stringToSign));
    
    const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;
    
    const r2Res = await fetch(`https://${R2_ACCOUNT_ID}.r2.amazonaws.com/${supabasePath}`, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/octet-stream',
        'x-amz-date': amzDate,
        'x-amz-content-sha256': await hashSha256(fileBase64),
      },
      body: Buffer.from(fileBase64, 'base64'),
    });
    
    return r2Res.ok ? supabasePath : null;
  } catch (err) {
    console.error('[validateAndMigrateStorageToR2] Erro ao migrar:', err.message);
    return null;
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { filePath } = await req.json();
    if (!filePath) return Response.json({ error: 'filePath required' }, { status: 400 });

    // 1️⃣ Se já aponta para R2, validar e retornar
    if (filePath.startsWith('r2://') || filePath.includes('.r2.amazonaws.com')) {
      return Response.json({ filePath, source: 'r2', status: 'valid' });
    }

    // 2️⃣ Se aponta para Supabase, tentar migrar
    if (filePath.includes('supabase') || filePath.includes('/storage/')) {
      const cleanPath = filePath.split('/storage/v1/object/').pop() || filePath;
      const exists = await fileExistsInSupabase(cleanPath);
      
      if (exists) {
        const migratedPath = await migrateFileToR2(cleanPath);
        if (migratedPath) {
          return Response.json({
            filePath: migratedPath,
            source: 'r2',
            status: 'migrated',
            message: 'Arquivo migrado de Supabase para R2',
          });
        }
      }
    }

    // 3️⃣ Assume que é path relativo R2 já
    return Response.json({
      filePath,
      source: 'r2',
      status: 'assumed_r2',
    });

  } catch (error) {
    console.error('[validateAndMigrateStorageToR2] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});