/**
 * Função de migração em massa: copia todos os arquivos do Supabase para Cloudflare R2
 * e atualiza as referências nas entidades. Uso: chamar via admin apenas.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = (Deno.env.get('R2_BUCKET_NAME') || '').trim().replace(/\s+/g, '-').toLowerCase();
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

async function uploadToR2(filePath, fileContent) {
  const region = 'auto';
  const service = 's3';
  const host = `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;

  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const canonicalUri = `/${encodedPath}`;
  const payloadHash = await sha256Hex(fileContent);

  const queryEntries = [];
  const canonicalQueryString = '';

  const canonicalRequest = ['PUT', canonicalUri, canonicalQueryString, `host:${host}\n`, 'host', payloadHash].join('\n');
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join('\n');

  const kDate = await hmacSha256(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  const uploadUrl = `https://${host}${canonicalUri}`;

  const resp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=host, Signature=${signature}`,
      'X-Amz-Date': amzDate,
      'Content-Type': 'application/octet-stream',
    },
    body: fileContent,
  });

  if (!resp.ok) {
    throw new Error(`R2 upload failed: ${resp.status}`);
  }

  return filePath;
}

async function downloadFromSupabase(filePath) {
  const url = `${SUPABASE_URL}/storage/v1/object/authenticated/${SUPABASE_BUCKET_NAME}/${filePath}`;
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });

  if (!resp.ok) {
    throw new Error(`Supabase download failed: ${resp.status}`);
  }

  return resp.arrayBuffer();
}

function isSupabaseUrl(url) {
  return url && (url.includes('supabase') || url.includes('/storage/v1/'));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Admin only
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[migrateAllFilesToR2] Iniciando migração...');

    let totalMigrated = 0;
    let totalFailed = 0;
    const errors = [];

    // Entidades com arquivos
    const entitiesToMigrate = [
      { name: 'Document', fileFields: ['url'] },
      { name: 'Mapping', fileFields: ['files'] },
      { name: 'License', fileFields: ['documents'] },
      { name: 'PRAD', fileFields: ['documents', 'annual_reports'] },
      { name: 'ClientContract', fileFields: ['documents'] },
      { name: 'Georeferencing', fileFields: ['documents'] },
      { name: 'Expense', fileFields: ['attachments'] },
    ];

    for (const entityConfig of entitiesToMigrate) {
      try {
        console.log(`[migrateAllFilesToR2] Processando entidade: ${entityConfig.name}`);

        const entity = base44.asServiceRole.entities[entityConfig.name];
        if (!entity) {
          console.warn(`[migrateAllFilesToR2] Entidade ${entityConfig.name} não encontrada`);
          continue;
        }

        const records = await entity.list('-created_date', 1000);
        if (!records || records.length === 0) continue;

        for (const record of records) {
          for (const fieldName of entityConfig.fileFields) {
            const fieldValue = record[fieldName];
            if (!fieldValue) continue;

            let filesToProcess = [];

            // Campo é string (URL direta)
            if (typeof fieldValue === 'string' && isSupabaseUrl(fieldValue)) {
              filesToProcess = [{ url: fieldValue, field: fieldName, isArray: false }];
            }
            // Campo é array de objetos (ex: files, documents)
            else if (Array.isArray(fieldValue)) {
              filesToProcess = fieldValue
                .filter(item => item?.url && isSupabaseUrl(item.url))
                .map(item => ({ url: item.url, originalItem: item, field: fieldName, isArray: true }));
            }

            for (const fileInfo of filesToProcess) {
              try {
                // Extrair path do Supabase (remover URL base)
                let supabasePath = fileInfo.url;
                if (supabasePath.includes('/storage/v1/object/')) {
                  supabasePath = supabasePath.split('/storage/v1/object/')[1];
                  // Remover bucket name se estiver no path
                  if (supabasePath.startsWith(`${SUPABASE_BUCKET_NAME}/`)) {
                    supabasePath = supabasePath.substring(SUPABASE_BUCKET_NAME.length + 1);
                  }
                }

                console.log(`[migrateAllFilesToR2] Migrando: ${supabasePath.slice(0, 50)}`);

                // Download do Supabase
                const fileContent = await downloadFromSupabase(supabasePath);

                // Upload para R2
                const newPath = await uploadToR2(supabasePath, fileContent);

                // Atualizar registro
                if (fileInfo.isArray) {
                  const updatedArray = record[fieldName].map(item =>
                    item.url === fileInfo.url ? { ...item, url: newPath } : item
                  );
                  await entity.update(record.id, { [fieldName]: updatedArray });
                } else {
                  await entity.update(record.id, { [fieldName]: newPath });
                }

                totalMigrated++;
                console.log(`[migrateAllFilesToR2] ✓ Migrado: ${newPath.slice(0, 50)}`);
              } catch (fileErr) {
                totalFailed++;
                errors.push(`${entityConfig.name}(${record.id}): ${fileErr.message}`);
                console.error(`[migrateAllFilesToR2] Erro ao migrar arquivo:`, fileErr.message);
              }
            }
          }
        }
      } catch (entityErr) {
        console.error(`[migrateAllFilesToR2] Erro ao processar ${entityConfig.name}:`, entityErr.message);
      }
    }

    return Response.json({
      success: true,
      totalMigrated,
      totalFailed,
      errors: errors.slice(0, 10), // Retorna só os 10 primeiros erros
      message: `Migração completa: ${totalMigrated} arquivos migrados, ${totalFailed} com erro`,
    });
  } catch (error) {
    console.error('[migrateAllFilesToR2] Erro geral:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});