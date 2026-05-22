/**
 * adminMigrateAllFilesToR2Complete — Migra todos os documentos, mapeamentos e arquivos
 * de Supabase para R2 de uma vez, atualizando referências no banco.
 * 
 * ADMIN ONLY — Deve ser chamado 1 vez pelo admin.
 * Processa: Documents, Licenses, Mappings, PRAD, Georeferencing, etc.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const R2_BUCKET = Deno.env.get('R2_BUCKET_NAME');
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
const R2_ACCESS_KEY = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');

// Regex para detectar URLs de Supabase
const SUPABASE_REGEX = /supabase\.co|\/storage\/v1\/object\//i;

// Migrar arquivo de Supabase → R2
const migrateSupabaseToR2 = async (supabasePath) => {
  try {
    if (!SUPABASE_REGEX.test(supabasePath)) return supabasePath; // Já é R2 ou inválido

    const cleanPath = supabasePath.split('/storage/v1/object/').pop() || supabasePath.split('/prumo-files/').pop();
    if (!cleanPath) return supabasePath;

    // Download de Supabase
    const supabaseUrl = `${SUPABASE_URL}/storage/v1/object/authenticated/prumo-files/${cleanPath}`;
    const supabaseRes = await fetch(supabaseUrl, {
      headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
    });

    if (!supabaseRes.ok) {
      console.warn(`[migrate] Supabase 404: ${cleanPath}`);
      return supabasePath; // Manter original se não encontrar
    }

    const fileBuffer = await supabaseRes.arrayBuffer();
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    // Upload para R2 com mesmo path
    const amzDate = new Date().toISOString().replace(/[:-]/g, '').replace('.000Z', 'Z');
    const dateStamp = amzDate.slice(0, 8);

    const hashSha256 = async (data) => {
      const buf = new TextEncoder().encode(data);
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
    };

    const payload = fileBase64;
    const canonicalRequest = [
      'PUT',
      `/${cleanPath}`,
      '',
      `host:${R2_ACCOUNT_ID}.r2.amazonaws.com`,
      `x-amz-content-sha256:${await hashSha256(payload)}`,
      `x-amz-date:${amzDate}`,
      '',
      'host;x-amz-content-sha256;x-amz-date',
      await hashSha256(payload),
    ].join('\n');

    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      await hashSha256(canonicalRequest),
    ].join('\n');

    const hashHmac = async (key, msg) => {
      const keyBuf = new TextEncoder().encode(key);
      const msgBuf = new TextEncoder().encode(msg);
      const cryptoKey = await crypto.subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgBuf);
      return Array.from(new Uint8Array(sig)).map(x => x.toString(16).padStart(2, '0')).join('');
    };

    const kDate = await hashHmac(`AWS4${R2_SECRET_KEY}`, dateStamp);
    const kRegion = await hashHmac(kDate, 'auto');
    const kService = await hashHmac(kRegion, 's3');
    const kSigning = await hashHmac(kService, 'aws4_request');
    const signature = await hashHmac(kSigning, stringToSign);

    const authHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY}/${credentialScope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`;

    const r2Res = await fetch(`https://${R2_ACCOUNT_ID}.r2.amazonaws.com/${cleanPath}`, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/octet-stream',
        'x-amz-date': amzDate,
        'x-amz-content-sha256': await hashSha256(payload),
      },
      body: Buffer.from(payload, 'base64'),
    });

    return r2Res.ok ? cleanPath : supabasePath;
  } catch (err) {
    console.warn(`[migrate] Erro ao migrar ${supabasePath}:`, err.message);
    return supabasePath;
  }
};

// Migrar array de arquivos
const migrateFileArray = async (files) => {
  if (!Array.isArray(files)) return files;
  return Promise.all(files.map(async (file) => ({
    ...file,
    url: await migrateSupabaseToR2(file.url),
  })));
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log(`[adminMigrateAllFilesToR2Complete] Iniciado por ${user.email}`);
    const stats = {
      documents: 0,
      documentsMigrated: 0,
      licenses: 0,
      licensesMigrated: 0,
      mappings: 0,
      mappingsMigrated: 0,
      prad: 0,
      pradMigrated: 0,
      georef: 0,
      georefMigrated: 0,
      errors: [],
    };

    // 1️⃣ Migrar Documents
    try {
      const docs = await base44.asServiceRole.entities.Document.list('-created_date', 10000);
      stats.documents = docs.length;
      for (const doc of docs) {
        const updated = {};
        if (doc.file_url && SUPABASE_REGEX.test(doc.file_url)) {
          updated.file_url = await migrateSupabaseToR2(doc.file_url);
        }
        if (doc.files && Array.isArray(doc.files)) {
          updated.files = await migrateFileArray(doc.files);
        }
        if (Object.keys(updated).length > 0) {
          try {
            await base44.asServiceRole.entities.Document.update(doc.id, updated);
            stats.documentsMigrated++;
          } catch (e) {
            stats.errors.push(`Document ${doc.id}: ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.warn('[migrate] Documents:', e.message);
      stats.errors.push(`Documents batch: ${e.message}`);
    }

    // 2️⃣ Migrar Licenses (documentos)
    try {
      const licenses = await base44.asServiceRole.entities.License.list('-created_date', 10000);
      stats.licenses = licenses.length;
      for (const lic of licenses) {
        const updated = {};
        if (lic.documents && Array.isArray(lic.documents)) {
          updated.documents = await migrateFileArray(lic.documents);
        }
        if (lic.updates && Array.isArray(lic.updates)) {
          updated.updates = await Promise.all(lic.updates.map(async (upd) => ({
            ...upd,
            file_url: upd.file_url ? await migrateSupabaseToR2(upd.file_url) : upd.file_url,
          })));
        }
        if (Object.keys(updated).length > 0) {
          try {
            await base44.asServiceRole.entities.License.update(lic.id, updated);
            stats.licensesMigrated++;
          } catch (e) {
            stats.errors.push(`License ${lic.id}: ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.warn('[migrate] Licenses:', e.message);
      stats.errors.push(`Licenses batch: ${e.message}`);
    }

    // 3️⃣ Migrar Mappings (files + DJI files)
    try {
      const mappings = await base44.asServiceRole.entities.Mapping.list('-created_date', 10000);
      stats.mappings = mappings.length;
      for (const map of mappings) {
        const updated = {};
        if (map.files && Array.isArray(map.files)) {
          updated.files = await migrateFileArray(map.files);
        }
        if (map.dji_files && Array.isArray(map.dji_files)) {
          updated.dji_files = await Promise.all(map.dji_files.map(async (dji) => ({
            ...dji,
            file_url: dji.file_url ? await migrateSupabaseToR2(dji.file_url) : dji.file_url,
          })));
        }
        if (Object.keys(updated).length > 0) {
          try {
            await base44.asServiceRole.entities.Mapping.update(map.id, updated);
            stats.mappingsMigrated++;
          } catch (e) {
            stats.errors.push(`Mapping ${map.id}: ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.warn('[migrate] Mappings:', e.message);
      stats.errors.push(`Mappings batch: ${e.message}`);
    }

    // 4️⃣ Migrar PRAD (documents + annual_reports + monitoring + image_monitoring)
    try {
      const prads = await base44.asServiceRole.entities.PRAD.list('-created_date', 10000);
      stats.prad = prads.length;
      for (const prad of prads) {
        const updated = {};
        if (prad.documents && Array.isArray(prad.documents)) {
          updated.documents = await migrateFileArray(prad.documents);
        }
        if (prad.annual_reports && Array.isArray(prad.annual_reports)) {
          updated.annual_reports = await Promise.all(prad.annual_reports.map(async (report) => ({
            ...report,
            file_url: report.file_url ? await migrateSupabaseToR2(report.file_url) : report.file_url,
          })));
        }
        if (prad.monitoring?.periodic_reports && Array.isArray(prad.monitoring.periodic_reports)) {
          updated.monitoring = {
            ...prad.monitoring,
            periodic_reports: await Promise.all(prad.monitoring.periodic_reports.map(async (rep) => ({
              ...rep,
              file_url: rep.file_url ? await migrateSupabaseToR2(rep.file_url) : rep.file_url,
            }))),
          };
        }
        if (prad.image_monitoring?.satellite_images) {
          updated.image_monitoring = {
            ...prad.image_monitoring,
            satellite_images: await Promise.all(prad.image_monitoring.satellite_images.map(async (img) => ({
              ...img,
              image_url: img.image_url ? await migrateSupabaseToR2(img.image_url) : img.image_url,
            }))),
          };
        }
        if (Object.keys(updated).length > 0) {
          try {
            await base44.asServiceRole.entities.PRAD.update(prad.id, updated);
            stats.pradMigrated++;
          } catch (e) {
            stats.errors.push(`PRAD ${prad.id}: ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.warn('[migrate] PRAD:', e.message);
      stats.errors.push(`PRAD batch: ${e.message}`);
    }

    // 5️⃣ Migrar Georeferencing (documents)
    try {
      const georeferences = await base44.asServiceRole.entities.Georeferencing.list('-created_date', 10000);
      stats.georef = georeferences.length;
      for (const geo of georeferences) {
        const updated = {};
        if (geo.documents && Array.isArray(geo.documents)) {
          updated.documents = await migrateFileArray(geo.documents);
        }
        if (Object.keys(updated).length > 0) {
          try {
            await base44.asServiceRole.entities.Georeferencing.update(geo.id, updated);
            stats.georefMigrated++;
          } catch (e) {
            stats.errors.push(`Georeferencing ${geo.id}: ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.warn('[migrate] Georeferencing:', e.message);
      stats.errors.push(`Georeferencing batch: ${e.message}`);
    }

    console.log(`[adminMigrateAllFilesToR2Complete] Concluído:`, stats);
    return Response.json({ success: true, stats });

  } catch (error) {
    console.error('[adminMigrateAllFilesToR2Complete]:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});