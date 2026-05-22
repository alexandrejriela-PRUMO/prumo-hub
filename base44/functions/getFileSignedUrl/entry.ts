/**
 * Backend unificado para gerar signed URLs de download.
 * Tenta R2 primeiro; se o arquivo não existir lá, gera URL do Supabase.
 * Resolve o problema de arquivos antigos (Supabase) coexistindo com novos (R2).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_BUCKET_NAME = Deno.env.get('SUPABASE_BUCKET_NAME');

async function hmacSha256(key, data) {
  const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

async function sha256Hex(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function r2SignedUrl(filePath, expiresIn = 3600) {
  const region = 'auto';
  const service = 's3';
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;

  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const encodedBucket = encodeURIComponent(R2_BUCKET_NAME);
  const canonicalUri = `/${encodedBucket}/${encodedPath}`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  });

  const canonicalRequest = ['GET', canonicalUri, queryParams.toString(), `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join('\n');

  const kDate = await hmacSha256(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(await hmacSha256(kSigning, stringToSign));
  queryParams.set('X-Amz-Signature', signature);

  return `https://${host}${canonicalUri}?${queryParams.toString()}`;
}

async function supabaseSignedUrl(filePath, expiresIn = 3600) {
  const resp = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/${SUPABASE_BUCKET_NAME}/${filePath}`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn }),
    }
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.signedURL ? `${SUPABASE_URL}/storage/v1${data.signedURL}` : null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { filePath, expiresIn = 3600, storage } = await req.json();
    if (!filePath) return Response.json({ error: 'filePath é obrigatório' }, { status: 400 });

    // Se for URL absoluta, retorna direto
    if (filePath.startsWith('http')) return Response.json({ signedUrl: filePath, source: 'direct' });

    // Se explicitamente marcado como supabase
    if (storage === 'supabase') {
      const url = await supabaseSignedUrl(filePath, expiresIn);
      if (url) return Response.json({ signedUrl: url, source: 'supabase' });
      return Response.json({ error: 'Arquivo não encontrado no Supabase' }, { status: 404 });
    }

    // Tenta R2 primeiro (HEAD request para verificar existência)
    const r2Url = await r2SignedUrl(filePath, expiresIn);
    try {
      const headRes = await fetch(r2Url, { method: 'HEAD' });
      if (headRes.ok) {
        return Response.json({ signedUrl: r2Url, source: 'r2' });
      }
    } catch {
      // R2 não respondeu
    }

    // Fallback: Supabase (para arquivos antigos)
    const supUrl = await supabaseSignedUrl(filePath, expiresIn);
    if (supUrl) return Response.json({ signedUrl: supUrl, source: 'supabase' });

    return Response.json({ error: 'Arquivo não encontrado em nenhum storage' }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});