/**
 * migrarTodosArquivosParaR2
 * Varre todas as entidades com campos de arquivo, detecta URLs que NÃO são do R2,
 * baixa via fetch (streaming) e faz re-upload para o R2, atualizando o banco.
 * Suporta: Supabase Storage, Base44 Storage (qtrypzzcjebvfcihiynt.supabase.co), URLs públicas.
 * ADMIN ONLY.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const R2_ACCOUNT_ID        = Deno.env.get('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID     = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME       = (Deno.env.get('R2_BUCKET_NAME') || '').trim().replace(/\s+/g, '-').toLowerCase();
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY         = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_BUCKET      = Deno.env.get('SUPABASE_BUCKET_NAME') || 'prumo-files';

const R2_HOST = `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_DOMAIN = 'r2.cloudflarestorage.com';

// ── Helpers AWS4 ──────────────────────────────────────────────────────────────

async function hmac(key, msg) {
  const k = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const ck = await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', ck, new TextEncoder().encode(msg)));
}

async function sha256hex(data) {
  const b = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map(x => x.toString(16).padStart(2, '0')).join('');
}

function hex(b) { return [...b].map(x => x.toString(16).padStart(2, '0')).join(''); }

async function r2PutStream(r2Path, bodyStream, contentType = 'application/octet-stream', contentLength) {
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const credScope = `${dateStamp}/auto/s3/aws4_request`;

  const encodedPath = '/' + r2Path.split('/').map(encodeURIComponent).join('/');
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const headers = {
    'host':                     R2_HOST,
    'x-amz-content-sha256':     payloadHash,
    'x-amz-date':               amzDate,
    'content-type':             contentType,
  };
  if (contentLength) headers['content-length'] = String(contentLength);

  const sortedKeys       = Object.keys(headers).sort();
  const canonicalHeaders = sortedKeys.map(k => `${k}:${headers[k]}`).join('\n') + '\n';
  const signedHeaders    = sortedKeys.join(';');

  const canonicalReq = ['PUT', encodedPath, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const reqHash      = await sha256hex(canonicalReq);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credScope, reqHash].join('\n');

  const kDate = await hmac(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const sig   = hex(await hmac(await hmac(await hmac(await hmac(kDate, 'auto'), 's3'), 'aws4_request'), stringToSign));

  const resp = await fetch(`https://${R2_HOST}${encodedPath}`, {
    method: 'PUT',
    headers: {
      'host':                 R2_HOST,
      'x-amz-date':           amzDate,
      'x-amz-content-sha256': payloadHash,
      'content-type':         contentType,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
    },
    body: bodyStream,
    // @ts-ignore duplex required for streaming
    duplex: 'half',
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`R2 PUT ${r2Path}: ${resp.status} ${txt.slice(0, 200)}`);
  }

  return `https://${R2_HOST}/${r2Path}`;
}

// ── URL classification ────────────────────────────────────────────────────────

function isR2Url(url) {
  return url && url.includes(R2_DOMAIN);
}

/**
 * Retorna o tipo da URL para decidir o que fazer:
 *   'r2'       → já está no R2 (URL absoluta com r2.cloudflarestorage.com)
 *   'r2_path'  → caminho relativo já armazenado no R2 (ex: "licencas/user/arquivo.pdf")
 *   'supabase' → Supabase Storage privado (precisa de auth header)
 *   'public'   → URL http pública qualquer (base44 CDN, qtrypzzcjebvfcihiynt, etc.)
 *   null       → vazio / não é URL de arquivo
 */
function classifyUrl(url) {
  if (!url || typeof url !== 'string' || url.trim() === '') return null;
  if (isR2Url(url)) return 'r2';
  // Caminho relativo (sem protocolo) → já está no R2
  if (!url.startsWith('http')) return 'r2_path';
  // Supabase Storage (projeto do cliente)
  if (url.includes('supabase.co') && url.includes('/storage/v1/')) return 'supabase';
  // Base44 CDN ou qualquer URL pública
  return 'public';
}

function isAlreadyMigrated(url) {
  const t = classifyUrl(url);
  return !t || t === 'r2' || t === 'r2_path';
}

// ── Download helpers ──────────────────────────────────────────────────────────

async function fetchFile(url) {
  // Para Supabase privado, tentar com auth
  const isSupabase = url.includes('supabase.co') && url.includes('/storage/v1/');
  const headers = {};
  if (isSupabase && SUPABASE_KEY) {
    headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  }

  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ao baixar ${url.slice(0, 80)}`);
  return resp;
}

function extractR2Path(url) {
  // Tenta reutilizar a estrutura de pasta da URL original
  try {
    const u = new URL(url);
    // Remover parâmetros de query (tokens assinados)
    let path = u.pathname;
    // Supabase: /storage/v1/object/public/bucket/...  ou  /storage/v1/object/authenticated/bucket/...
    const sbMatch = path.match(/\/storage\/v1\/object\/(?:public|authenticated|sign)\/[^/]+\/(.+)/);
    if (sbMatch) return sbMatch[1];
    // Genérico: usar tudo depois do host, sem leading slash
    return path.replace(/^\//, '') || `migrados/${Date.now()}_${Math.random().toString(36).slice(2)}`;
  } catch {
    return `migrados/${Date.now()}_arquivo`;
  }
}

function getContentType(url) {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  const map = {
    pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip', tif: 'image/tiff', tiff: 'image/tiff',
    kml: 'application/vnd.google-earth.kml+xml', kmz: 'application/vnd.google-earth.kmz',
    shp: 'application/octet-stream', geojson: 'application/geo+json',
    mp4: 'video/mp4', mov: 'video/quicktime',
  };
  return map[ext] || 'application/octet-stream';
}

// ── Migrate single URL ────────────────────────────────────────────────────────

async function migrateUrl(url, stats) {
  const type = classifyUrl(url);
  if (!type || type === 'r2') return url; // nada a fazer

  const r2Path = extractR2Path(url);

  try {
    const resp = await fetchFile(url);
    const contentType = resp.headers.get('content-type') || getContentType(url);
    const contentLength = resp.headers.get('content-length');

    const newUrl = await r2PutStream(r2Path, resp.body, contentType, contentLength ? Number(contentLength) : undefined);
    stats.migrated++;
    return newUrl;
  } catch (err) {
    stats.failed++;
    stats.errors.push({ url: url.slice(0, 100), reason: err.message });
    return url; // manter URL original em caso de falha
  }
}

// ── Walk and migrate all URL fields in a nested object ───────────────────────

async function walkAndMigrate(obj, stats) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => walkAndMigrate(item, stats)));
  }
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    // Campos que tipicamente guardam URLs
    const isUrlField = /^(url|file_url|image_url|documento|arquivo|path|src|href|link|download_url|signed_url|attachment_url|photo_url)$/i.test(key);
    if (isUrlField && typeof val === 'string' && !isAlreadyMigrated(val)) {
      stats.found++;
      result[key] = await migrateUrl(val, stats);
    } else if (val && typeof val === 'object') {
      result[key] = await walkAndMigrate(val, stats);
    }
  }
  return result;
}

// ── Entity definitions — all known file-bearing fields ───────────────────────
// Each entry: entity name + top-level fields to walk (undefined = walk entire record)

const ENTITY_CONFIGS = [
  { name: 'Document',          fields: ['file_url', 'files'] },
  { name: 'Mapping',           fields: ['files', 'dji_files', 'agronomic_prescription'] },
  { name: 'License',           fields: ['documents', 'updates'] },
  { name: 'PRAD',              fields: ['documents', 'annual_reports', 'monitoring', 'image_monitoring', 'environmental_diagnosis'] },
  { name: 'ClientContract',    fields: ['documents'] },
  { name: 'Georeferencing',    fields: ['documents'] },
  { name: 'Expense',           fields: ['attachments'] },
  { name: 'Process',           fields: ['updates'] },
  { name: 'EnvironmentalAlert', fields: ['attachments'] },
  { name: 'Budget',            fields: ['logo_url'] },
  { name: 'CARManagement',     fields: ['documents', 'files'] },
  { name: 'ART',               fields: ['documents', 'file_url'] },
  { name: 'ConsultorCharge',   fields: ['attachments'] },
  { name: 'CarbonCredit',      fields: ['documents', 'files'] },
  { name: 'PSAContract',       fields: ['documents', 'files'] },
  { name: 'EnvironmentalEasement', fields: ['documents', 'files'] },
  { name: 'RuralCredit',       fields: ['documents', 'files'] },
  { name: 'HarvestLoss',       fields: ['documents', 'files'] },
  { name: 'Certification',     fields: ['documents', 'certificate_url'] },
  { name: 'GreenLoan',         fields: ['documents'] },
  { name: 'TaxIncentive',      fields: ['documents'] },
  { name: 'ClimateMonitoring', fields: [] }, // sem arquivos
  { name: 'Property',          fields: [] }, // sem arquivos
];

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user   = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  console.log(`[migrarTodosArquivosParaR2] Iniciado por ${user.email}`);

  const report = {
    tables_checked: [],
    total_records:  0,
    total_found:    0,
    total_migrated: 0,
    total_failed:   0,
    errors:         [],
    details:        [],
  };

  for (const cfg of ENTITY_CONFIGS) {
    if (!cfg.fields || cfg.fields.length === 0) {
      report.tables_checked.push({ entity: cfg.name, skipped: true, reason: 'sem campos de arquivo' });
      continue;
    }

    const entityStats = { entity: cfg.name, records: 0, found: 0, migrated: 0, failed: 0, errors: [] };

    try {
      const entity  = base44.asServiceRole.entities[cfg.name];
      if (!entity) {
        entityStats.error = 'entidade não encontrada no SDK';
        report.tables_checked.push(entityStats);
        continue;
      }

      const records = await entity.list('-created_date', 5000);
      entityStats.records = records.length;
      report.total_records += records.length;
      console.log(`[migrar] ${cfg.name}: ${records.length} registros`);

      for (const record of records) {
        const updatedFields = {};
        let changed = false;

        for (const field of cfg.fields) {
          const val = record[field];
          if (val === undefined || val === null) continue;

          const fieldStats = { found: 0, migrated: 0, failed: 0, errors: entityStats.errors };
          const migrated = await walkAndMigrate({ [field]: val }, fieldStats);
          entityStats.found    += fieldStats.found;
          entityStats.migrated += fieldStats.migrated;
          entityStats.failed   += fieldStats.failed;

          if (fieldStats.migrated > 0) {
            updatedFields[field] = migrated[field];
            changed = true;
          }
        }

        if (changed) {
          try {
            await entity.update(record.id, updatedFields);
            console.log(`[migrar] ✓ ${cfg.name}(${record.id}) atualizado`);
          } catch (updateErr) {
            entityStats.failed++;
            entityStats.errors.push({ record_id: record.id, reason: `update falhou: ${updateErr.message}` });
          }
        }
      }
    } catch (batchErr) {
      entityStats.error = batchErr.message;
      console.error(`[migrar] Erro batch ${cfg.name}:`, batchErr.message);
    }

    report.tables_checked.push(entityStats);
    report.total_found    += entityStats.found;
    report.total_migrated += entityStats.migrated;
    report.total_failed   += entityStats.failed;
    if (entityStats.errors.length > 0) {
      report.errors.push(...entityStats.errors.slice(0, 5).map(e => `${cfg.name}: ${JSON.stringify(e)}`));
    }
  }

  console.log(`[migrarTodosArquivosParaR2] Concluído — encontrados: ${report.total_found}, migrados: ${report.total_migrated}, falhas: ${report.total_failed}`);

  return Response.json({
    success: true,
    summary: {
      tables_checked: report.tables_checked.length,
      total_records:  report.total_records,
      total_found:    report.total_found,
      total_migrated: report.total_migrated,
      total_failed:   report.total_failed,
    },
    tables: report.tables_checked,
    errors: report.errors.slice(0, 20),
  });
});