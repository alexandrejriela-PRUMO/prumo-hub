/**
 * Migra arquivos do Storage Base44 (media.base44.com) e Supabase para R2.
 * Caminhos relativos sem http já estão no R2 e são ignorados.
 * Para URLs Supabase com ?token= expirado, usa endpoint authenticated com service-role key.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = (Deno.env.get('R2_BUCKET_NAME') || '').trim().replace(/\s+/g, '-').toLowerCase();
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_BUCKET_NAME = Deno.env.get('SUPABASE_BUCKET_NAME');

// ─── URL classification ───────────────────────────────────────────────────────

/**
 * Classifica a origem de uma URL.
 * Retorna 'base44', 'supabase', ou null.
 * null significa caminho relativo (já no R2) ou URL desconhecida — deve ser ignorado.
 */
function classifyUrl(url) {
  if (!url || !url.startsWith('http')) return null; // caminho relativo = já no R2
  if (url.includes('media.base44.com')) return 'base44';
  if (url.includes('supabase.co/storage') || url.includes('/storage/v1/')) return 'supabase';
  return null;
}

// ─── Path extraction ──────────────────────────────────────────────────────────

function extractR2Path(url, type) {
  if (type === 'base44') {
    // https://media.base44.com/path/to/file.pdf → path/to/file.pdf
    try {
      return new URL(url).pathname.replace(/^\//, '');
    } catch {
      return url.split('media.base44.com/').pop() || url;
    }
  }

  // Supabase: .../storage/v1/object/(sign|public|authenticated)/bucket/path/to/file?token=...
  const afterObject = url.split('/storage/v1/object/')[1] || '';
  const withoutMethod = afterObject.replace(/^(sign|public|authenticated)\//, '');
  const withoutQuery = withoutMethod.split('?')[0];

  if (SUPABASE_BUCKET_NAME && withoutQuery.startsWith(`${SUPABASE_BUCKET_NAME}/`)) {
    return withoutQuery.substring(SUPABASE_BUCKET_NAME.length + 1);
  }
  return withoutQuery;
}

// ─── Download ─────────────────────────────────────────────────────────────────

async function downloadFile(url, type) {
  if (type === 'base44') {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`base44 download failed: ${resp.status}`);
    return resp.arrayBuffer();
  }

  // Para URLs Supabase com ?token= (pode ter expirado), troca pelo endpoint authenticated
  // que usa o service-role key em vez do JWT temporário.
  let fetchUrl = url;
  if (url.includes('?token=') || url.includes('/storage/v1/object/sign/')) {
    const filePath = extractR2Path(url, 'supabase');
    fetchUrl = `${SUPABASE_URL}/storage/v1/object/authenticated/${SUPABASE_BUCKET_NAME}/${filePath}`;
  }

  const resp = await fetch(fetchUrl, {
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!resp.ok) throw new Error(`Supabase download failed: ${resp.status} — ${fetchUrl}`);
  return resp.arrayBuffer();
}

// ─── Upload to R2 (AWS Sig v4) ────────────────────────────────────────────────

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

async function uploadToR2(filePath, fileContent) {
  const region = 'auto';
  const service = 's3';
  const host = `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const canonicalUri = `/${encodedPath}`;
  const payloadHash = await sha256Hex(fileContent);
  const canonicalRequest = ['PUT', canonicalUri, '', `host:${host}\n`, 'host', payloadHash].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');

  const kDate = await hmacSha256(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  const resp = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=host, Signature=${signature}`,
      'X-Amz-Date': amzDate,
      'Content-Type': 'application/octet-stream',
    },
    body: fileContent,
  });

  if (!resp.ok) throw new Error(`R2 upload failed: ${resp.status}`);
  return filePath;
}

// ─── walkAndMigrate ───────────────────────────────────────────────────────────

/**
 * Tenta migrar uma URL para R2.
 * Retorna o novo caminho relativo (R2) em caso de sucesso, ou a URL original em caso de falha.
 * Chama onMigrated() ou onError(msg) conforme o resultado.
 */
async function walkAndMigrate(url, label, onMigrated, onError) {
  const type = classifyUrl(url);
  if (!type) return url; // já no R2 ou desconhecido — sem alteração

  try {
    const r2Path = extractR2Path(url, type);
    if (!r2Path) throw new Error(`Não foi possível extrair path de: ${url}`);

    console.log(`[migrate] [${type}] ${url.slice(0, 80)}`);
    const fileContent = await downloadFile(url, type);
    const newPath = await uploadToR2(r2Path, fileContent);

    onMigrated();
    console.log(`[migrate] ✓ → ${newPath.slice(0, 60)}`);
    return newPath;
  } catch (err) {
    onError(`${label}: ${err.message}`);
    console.error(`[migrate] ✗ ${label}: ${err.message}`);
    return url; // mantém original em caso de falha
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[migrateAllFilesToR2] Iniciando migração...');

    let totalMigrated = 0;
    let totalFailed = 0;
    const errors = [];

    const onMigrated = () => { totalMigrated++; };
    const onError = (msg) => { totalFailed++; errors.push(msg); };

    const entitiesToMigrate = [
      { name: 'Document',        fileFields: ['url'] },
      { name: 'Mapping',         fileFields: ['files'] },
      { name: 'License',         fileFields: ['documents'] },
      { name: 'PRAD',            fileFields: ['documents', 'annual_reports'] },
      { name: 'ClientContract',  fileFields: ['documents'] },
      { name: 'Georeferencing',  fileFields: ['documents'] },
      { name: 'Expense',         fileFields: ['attachments'] },
    ];

    for (const entityConfig of entitiesToMigrate) {
      try {
        console.log(`[migrateAllFilesToR2] Processando: ${entityConfig.name}`);
        const entity = base44.asServiceRole.entities[entityConfig.name];
        if (!entity) { console.warn(`Entidade ${entityConfig.name} não encontrada`); continue; }

        const records = await entity.list('-created_date', 1000);
        if (!records?.length) continue;

        for (const record of records) {
          for (const fieldName of entityConfig.fileFields) {
            const fieldValue = record[fieldName];
            if (!fieldValue) continue;

            if (typeof fieldValue === 'string') {
              const label = `${entityConfig.name}(${record.id}).${fieldName}`;
              const newUrl = await walkAndMigrate(fieldValue, label, onMigrated, onError);
              if (newUrl !== fieldValue) {
                await entity.update(record.id, { [fieldName]: newUrl });
              }
            } else if (Array.isArray(fieldValue)) {
              let changed = false;
              const updatedArray = [];
              for (const item of fieldValue) {
                if (!item?.url || classifyUrl(item.url) === null) {
                  updatedArray.push(item);
                  continue;
                }
                const label = `${entityConfig.name}(${record.id}).${fieldName}[]`;
                const newUrl = await walkAndMigrate(item.url, label, onMigrated, onError);
                if (newUrl !== item.url) changed = true;
                updatedArray.push({ ...item, url: newUrl });
              }
              if (changed) await entity.update(record.id, { [fieldName]: updatedArray });
            }
          }
        }
      } catch (entityErr) {
        console.error(`[migrateAllFilesToR2] Erro em ${entityConfig.name}:`, entityErr.message);
      }
    }

    return Response.json({
      success: true,
      totalMigrated,
      totalFailed,
      errors: errors.slice(0, 20),
      message: `Migração completa: ${totalMigrated} migrados, ${totalFailed} com erro`,
    });
  } catch (error) {
    console.error('[migrateAllFilesToR2] Erro geral:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
