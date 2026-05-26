/**
 * migrarArquivosSupabaseParaR2
 * 
 * 1) Varre todos os registros de entidades com campos de arquivo
 * 2) Para cada path relativo, verifica se o arquivo existe no R2
 * 3) Se NÃO existir no R2: baixa do Supabase (prumo-docs bucket) e faz upload para R2
 * 4) Para URLs absolutas media.base44.com: faz fetch direto e upload para R2, atualiza banco
 * 5) Retorna relatório completo
 * 
 * ADMIN ONLY
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const R2_ACCOUNT_ID        = Deno.env.get('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID     = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME       = (Deno.env.get('R2_BUCKET_NAME') || '').trim().replace(/\s+/g, '-').toLowerCase();
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY         = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_BUCKET      = Deno.env.get('SUPABASE_BUCKET_NAME') || 'prumo-docs';

const R2_HOST = `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// ── AWS4 helpers ──────────────────────────────────────────────────────────────

async function hmac(key, msg) {
  const k = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const ck = await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', ck, new TextEncoder().encode(msg)));
}

async function sha256hex(data) {
  const b = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map(x => x.toString(16).padStart(2,'0')).join('');
}

function hex(b) { return [...b].map(x => x.toString(16).padStart(2,'0')).join(''); }

function awsHeaders(method, path, extraHeaders = {}) {
  const now     = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g,'').slice(0,15) + 'Z';
  const dateSt  = amzDate.slice(0,8);
  return { amzDate, dateSt, credScope: `${dateSt}/auto/s3/aws4_request` };
}

async function r2SignedUrl(filePath, expiresIn = 3600) {
  const region = 'auto', service = 's3';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g,'').slice(0,15)+'Z';
  const dateStamp = amzDate.slice(0,8);
  const credScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS_KEY_ID}/${credScope}`;
  const canonicalUri = '/' + filePath.split('/').map(encodeURIComponent).join('/');
  const queryEntries = [
    ['X-Amz-Algorithm','AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders','host'],
  ].sort((a,b) => a[0].localeCompare(b[0]));
  const qs = queryEntries.map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const canonicalReq = ['GET', canonicalUri, qs, `host:${R2_HOST}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const reqHash = await sha256hex(canonicalReq);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credScope, reqHash].join('\n');
  const kDate = await hmac(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const sig = hex(await hmac(await hmac(await hmac(await hmac(kDate,'auto'),'s3'),'aws4_request'), stringToSign));
  return `https://${R2_HOST}${canonicalUri}?${qs}&X-Amz-Signature=${sig}`;
}

async function r2FileExists(filePath) {
  const region = 'auto', service = 's3';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g,'').slice(0,15)+'Z';
  const dateStamp = amzDate.slice(0,8);
  const credScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS_KEY_ID}/${credScope}`;
  const canonicalUri = '/' + filePath.split('/').map(encodeURIComponent).join('/');
  const queryEntries = [
    ['X-Amz-Algorithm','AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', '60'],
    ['X-Amz-SignedHeaders','host'],
  ].sort((a,b) => a[0].localeCompare(b[0]));
  const qs = queryEntries.map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const canonicalReq = ['HEAD', canonicalUri, qs, `host:${R2_HOST}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const reqHash = await sha256hex(canonicalReq);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credScope, reqHash].join('\n');
  const kDate = await hmac(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const sig = hex(await hmac(await hmac(await hmac(await hmac(kDate,'auto'),'s3'),'aws4_request'), stringToSign));
  try {
    const resp = await fetch(`https://${R2_HOST}${canonicalUri}?${qs}&X-Amz-Signature=${sig}`, { method: 'HEAD' });
    return resp.ok;
  } catch { return false; }
}

async function r2PutStream(r2Path, body, contentType = 'application/octet-stream') {
  const now     = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g,'').slice(0,15)+'Z';
  const dateStamp = amzDate.slice(0,8);
  const credScope = `${dateStamp}/auto/s3/aws4_request`;
  const encodedPath = '/' + r2Path.split('/').map(encodeURIComponent).join('/');
  const payload = 'UNSIGNED-PAYLOAD';
  const sortedKeys = ['content-type','host','x-amz-content-sha256','x-amz-date'];
  const hdrs = {
    'host': R2_HOST,
    'x-amz-content-sha256': payload,
    'x-amz-date': amzDate,
    'content-type': contentType,
  };
  const canonicalHeaders = sortedKeys.map(k => `${k}:${hdrs[k]}`).join('\n') + '\n';
  const signedHeaders = sortedKeys.join(';');
  const canonicalReq = ['PUT', encodedPath, '', canonicalHeaders, signedHeaders, payload].join('\n');
  const reqHash = await sha256hex(canonicalReq);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credScope, reqHash].join('\n');
  const kDate = await hmac(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const sig = hex(await hmac(await hmac(await hmac(await hmac(kDate,'auto'),'s3'),'aws4_request'), stringToSign));
  const resp = await fetch(`https://${R2_HOST}${encodedPath}`, {
    method: 'PUT',
    headers: {
      'host': R2_HOST,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payload,
      'content-type': contentType,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
    },
    body,
    duplex: 'half',
  });
  if (!resp.ok) { const t = await resp.text(); throw new Error(`R2 PUT ${r2Path}: ${resp.status} ${t.slice(0,200)}`); }
}

function getContentType(name) {
  const ext = name.split('?')[0].split('.').pop()?.toLowerCase();
  const map = {
    pdf:'application/pdf', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg',
    gif:'image/gif', webp:'image/webp', doc:'application/msword',
    docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls:'application/vnd.ms-excel', xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip:'application/zip', tif:'image/tiff', tiff:'image/tiff',
    kml:'application/vnd.google-earth.kml+xml', kmz:'application/vnd.google-earth.kmz',
    mp4:'video/mp4', mov:'video/quicktime',
  };
  return map[ext] || 'application/octet-stream';
}

// Extrai o path relativo de uma URL absoluta (media.base44.com ou supabase)
function extractRelativePath(url) {
  try {
    const u = new URL(url);
    // Supabase: /storage/v1/object/[public|sign|authenticated]/bucket/path
    const sbMatch = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/[^/]+\/(.+)/);
    if (sbMatch) return sbMatch[1].split('?')[0];
    // media.base44.com: /files/public/{appId}/{filename}  → usar como-está, sem leading slash
    return u.pathname.replace(/^\//, '').split('?')[0];
  } catch { return null; }
}

// ── Migrar um arquivo: retorna { status, r2Path, newUrl? } ───────────────────

async function migrateFile(rawValue) {
  const isAbsolute = typeof rawValue === 'string' && rawValue.startsWith('http');
  const isBase44   = isAbsolute && rawValue.includes('media.base44.com');
  const isSupabase = isAbsolute && rawValue.includes('supabase.co');
  const isRelative = typeof rawValue === 'string' && !isAbsolute && rawValue.trim() !== '';

  if (!rawValue) return { status: 'skip', reason: 'empty' };

  // ── Caminho relativo: verificar no R2 e copiar do Supabase se ausente ──────
  if (isRelative) {
    const exists = await r2FileExists(rawValue);
    if (exists) return { status: 'r2_ok', r2Path: rawValue };

    // Não existe no R2 → baixar do Supabase
    const supabaseUrl = `${SUPABASE_URL}/storage/v1/object/authenticated/${SUPABASE_BUCKET}/${rawValue}`;
    const resp = await fetch(supabaseUrl, {
      headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` },
    });
    if (!resp.ok) {
      // Tentar bucket público também
      const pubUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${rawValue}`;
      const pubResp = await fetch(pubUrl);
      if (!pubResp.ok) {
        return { status: 'not_found', r2Path: rawValue, reason: `Supabase ${resp.status}` };
      }
      await r2PutStream(rawValue, pubResp.body, getContentType(rawValue));
      return { status: 'copied_from_supabase_public', r2Path: rawValue };
    }
    await r2PutStream(rawValue, resp.body, getContentType(rawValue));
    return { status: 'copied_from_supabase', r2Path: rawValue };
  }

  // ── URL absoluta Supabase ─────────────────────────────────────────────────
  if (isSupabase) {
    const relPath = extractRelativePath(rawValue);
    if (!relPath) return { status: 'skip', reason: 'cannot extract path' };

    const exists = await r2FileExists(relPath);
    if (exists) return { status: 'r2_ok', r2Path: relPath, newUrl: relPath };

    // Baixar do Supabase com service role
    const resp = await fetch(rawValue, {
      headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` },
    });
    if (!resp.ok) {
      return { status: 'not_found', r2Path: relPath, reason: `fetch ${resp.status}` };
    }
    await r2PutStream(relPath, resp.body, getContentType(relPath));
    return { status: 'copied_from_supabase', r2Path: relPath, newUrl: relPath };
  }

  // ── URL absoluta media.base44.com ─────────────────────────────────────────
  if (isBase44) {
    const relPath = extractRelativePath(rawValue);
    if (!relPath) return { status: 'skip', reason: 'cannot extract path' };

    const exists = await r2FileExists(relPath);
    if (exists) return { status: 'r2_ok', r2Path: relPath, newUrl: relPath };

    const resp = await fetch(rawValue);
    if (!resp.ok) return { status: 'not_found', r2Path: relPath, reason: `fetch ${resp.status}` };
    await r2PutStream(relPath, resp.body, getContentType(relPath));
    return { status: 'copied_from_base44', r2Path: relPath, newUrl: relPath };
  }

  return { status: 'skip', reason: 'unknown format' };
}

// ── Walk object, migrate all URL fields, return { updated, changes } ─────────

async function walkAndMigrate(obj, stats) {
  if (!obj || typeof obj !== 'object') return { val: obj, changed: false };
  if (Array.isArray(obj)) {
    let changed = false;
    const arr = await Promise.all(obj.map(async item => {
      const r = await walkAndMigrate(item, stats);
      if (r.changed) changed = true;
      return r.val;
    }));
    return { val: arr, changed };
  }
  const result = { ...obj };
  let changed = false;
  for (const key of Object.keys(result)) {
    const val = result[key];
    const isUrlField = /^(url|file_url|image_url|documento|arquivo|path|src|href|link|download_url|attachment_url|photo_url)$/i.test(key);
    if (isUrlField && typeof val === 'string' && val.trim() !== '') {
      stats.scanned++;
      const res = await migrateFile(val);
      stats[res.status] = (stats[res.status] || 0) + 1;
      if (res.status.startsWith('copied') && res.newUrl) {
        result[key] = res.newUrl;
        changed = true;
        stats.db_updated++;
        console.log(`[migrate] ✓ ${key}: ${val.slice(0,60)} → ${res.r2Path}`);
      } else if (res.status === 'not_found') {
        stats.errors.push({ field: key, val: val.slice(0,80), reason: res.reason });
        console.warn(`[migrate] ✗ not_found: ${val.slice(0,80)}`);
      }
    } else if (val && typeof val === 'object') {
      const r = await walkAndMigrate(val, stats);
      if (r.changed) { result[key] = r.val; changed = true; }
    }
  }
  return { val: result, changed };
}

// ── Entity list ───────────────────────────────────────────────────────────────

const ENTITY_CONFIGS = [
  { name: 'Mapping',            fields: ['files', 'dji_files', 'agronomic_prescription'] },
  { name: 'License',            fields: ['documents', 'updates'] },
  { name: 'PRAD',               fields: ['documents', 'annual_reports', 'monitoring', 'image_monitoring', 'environmental_diagnosis'] },
  { name: 'ClientContract',     fields: ['documents'] },
  { name: 'Georeferencing',     fields: ['documents', 'perimeter_adjustments'] },
  { name: 'Expense',            fields: ['attachments'] },
  { name: 'Process',            fields: ['updates'] },
  { name: 'EnvironmentalAlert', fields: ['attachments'] },
  { name: 'Budget',             fields: ['logo_url'] },
  { name: 'CARManagement',      fields: ['documents', 'files'] },
  { name: 'ART',                fields: ['documents', 'file_url'] },
  { name: 'ConsultorCharge',    fields: ['attachments'] },
  { name: 'CarbonCredit',       fields: ['documents', 'files'] },
  { name: 'PSAContract',        fields: ['documents', 'files'] },
  { name: 'EnvironmentalEasement', fields: ['documents', 'files'] },
  { name: 'RuralCredit',        fields: ['documents', 'files'] },
  { name: 'HarvestLoss',        fields: ['documents', 'files'] },
  { name: 'Certification',      fields: ['documents', 'certificate_url'] },
  { name: 'GreenLoan',          fields: ['documents'] },
  { name: 'TaxIncentive',       fields: ['documents'] },
  { name: 'Document',           fields: ['file_url', 'files'] },
  // Property: pode ter URLs media.base44.com em campos JSON string
  { name: 'Property',           fields: ['boundaries', 'kml_layers', 'rural_extra'] },
];

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user   = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  console.log(`[migrarArquivosSupabaseParaR2] Iniciado por ${user.email}`);

  const globalStats = {
    scanned: 0,
    r2_ok: 0,
    copied_from_supabase: 0,
    copied_from_supabase_public: 0,
    copied_from_base44: 0,
    not_found: 0,
    skip: 0,
    db_updated: 0,
    errors: [],
  };

  const tableReport = [];

  for (const cfg of ENTITY_CONFIGS) {
    const entity = base44.asServiceRole.entities[cfg.name];
    if (!entity) continue;

    const tStats = { entity: cfg.name, records: 0, scanned: 0, r2_ok: 0, copied: 0, not_found: 0, db_updated: 0, errors: [] };

    try {
      const records = await entity.list('-created_date', 5000);
      tStats.records = records.length;
      console.log(`[migrar] ${cfg.name}: ${records.length} registros`);

      for (const record of records) {
        const localStats = { scanned: 0, r2_ok: 0, copied_from_supabase: 0, copied_from_supabase_public: 0, copied_from_base44: 0, not_found: 0, skip: 0, db_updated: 0, errors: [] };
        const updatedFields = {};
        let recordChanged = false;

        for (const field of cfg.fields) {
          const val = record[field];
          if (val === undefined || val === null) continue;
          const r = await walkAndMigrate({ [field]: val }, localStats);
          if (r.changed) {
            updatedFields[field] = r.val[field];
            recordChanged = true;
          }
        }

        // Merge stats
        tStats.scanned    += localStats.scanned;
        tStats.r2_ok      += localStats.r2_ok || 0;
        tStats.copied     += (localStats.copied_from_supabase || 0) + (localStats.copied_from_supabase_public || 0) + (localStats.copied_from_base44 || 0);
        tStats.not_found  += localStats.not_found || 0;
        tStats.db_updated += localStats.db_updated || 0;
        tStats.errors.push(...localStats.errors);

        globalStats.scanned    += localStats.scanned;
        globalStats.r2_ok      += localStats.r2_ok || 0;
        globalStats.copied_from_supabase        += localStats.copied_from_supabase || 0;
        globalStats.copied_from_supabase_public += localStats.copied_from_supabase_public || 0;
        globalStats.copied_from_base44          += localStats.copied_from_base44 || 0;
        globalStats.not_found  += localStats.not_found || 0;
        globalStats.db_updated += localStats.db_updated || 0;
        globalStats.errors.push(...localStats.errors.slice(0,3));

        if (recordChanged) {
          await entity.update(record.id, updatedFields);
          console.log(`[migrar] DB atualizado: ${cfg.name}(${record.id})`);
        }
      }
    } catch (err) {
      tStats.error = err.message;
      console.error(`[migrar] Erro em ${cfg.name}:`, err.message);
    }

    tableReport.push(tStats);
  }

  const totalCopied = globalStats.copied_from_supabase + globalStats.copied_from_supabase_public + globalStats.copied_from_base44;

  console.log(`[migrarArquivosSupabaseParaR2] Concluído — escaneados: ${globalStats.scanned}, já no R2: ${globalStats.r2_ok}, copiados: ${totalCopied}, não encontrados: ${globalStats.not_found}`);

  return Response.json({
    success: true,
    summary: {
      total_scanned:              globalStats.scanned,
      already_in_r2:              globalStats.r2_ok,
      copied_from_supabase:       globalStats.copied_from_supabase,
      copied_from_supabase_public: globalStats.copied_from_supabase_public,
      copied_from_base44_cdn:     globalStats.copied_from_base44,
      total_copied:               totalCopied,
      not_found_anywhere:         globalStats.not_found,
      db_records_updated:         globalStats.db_updated,
    },
    tables: tableReport,
    errors: globalStats.errors.slice(0, 30),
  });
});