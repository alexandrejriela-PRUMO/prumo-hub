import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const BUCKET_NAME = Deno.env.get('SUPABASE_BUCKET_NAME');

const BASE44_URL_PATTERN = 'base44.app';

async function uploadToSupabase(filePath, fileBuffer, contentType) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${filePath}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: fileBuffer,
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase upload falhou: ${res.status} ${err}`);
  }
  return filePath;
}

async function migrateUrl(oldUrl, folder, ownerEmail) {
  if (!oldUrl || !oldUrl.includes(BASE44_URL_PATTERN)) return null;

  const downloadRes = await fetch(oldUrl);
  if (!downloadRes.ok) throw new Error(`Download falhou: ${downloadRes.status}`);

  const buffer = await downloadRes.arrayBuffer();
  const contentType = downloadRes.headers.get('content-type') || 'application/octet-stream';

  // Extrair nome do arquivo da URL
  const urlParts = oldUrl.split('/');
  const rawName = urlParts[urlParts.length - 1] || `file_${Date.now()}`;
  const timestamp = Date.now();
  const newPath = `${folder}/${ownerEmail || 'migrated'}/${timestamp}_${rawName}`;

  await uploadToSupabase(newPath, buffer, contentType);
  return newPath;
}

// Definição de cada entidade e como extrair/atualizar seus arquivos
const ENTITY_CONFIGS = [
  {
    name: 'Mapping',
    folder: 'mapeamentos',
    ownerField: 'user_email',
    extract: (data) => {
      const patches = [];
      if (Array.isArray(data.files)) {
        data.files.forEach((f, i) => {
          if (f.url?.includes(BASE44_URL_PATTERN)) {
            patches.push({ path: `files[${i}].url`, oldUrl: f.url });
          }
        });
      }
      return patches;
    },
    apply: (data, patches) => {
      const updated = { ...data, files: [...(data.files || [])] };
      patches.forEach(p => {
        const idx = parseInt(p.path.match(/\[(\d+)\]/)[1]);
        updated.files[idx] = { ...updated.files[idx], url: p.newUrl };
      });
      return updated;
    },
  },
  {
    name: 'License',
    folder: 'licencas',
    ownerField: 'owner_email',
    extract: (data) => {
      const patches = [];
      if (Array.isArray(data.documents)) {
        data.documents.forEach((d, i) => {
          if (d.url?.includes(BASE44_URL_PATTERN)) patches.push({ path: `documents[${i}].url`, oldUrl: d.url });
        });
      }
      if (Array.isArray(data.updates)) {
        data.updates.forEach((u, i) => {
          if (u.file_url?.includes(BASE44_URL_PATTERN)) patches.push({ path: `updates[${i}].file_url`, oldUrl: u.file_url });
        });
      }
      return patches;
    },
    apply: (data, patches) => {
      const updated = { ...data, documents: [...(data.documents || [])], updates: [...(data.updates || [])] };
      patches.forEach(p => {
        const idx = parseInt(p.path.match(/\[(\d+)\]/)[1]);
        if (p.path.startsWith('documents')) updated.documents[idx] = { ...updated.documents[idx], url: p.newUrl };
        else if (p.path.startsWith('updates')) updated.updates[idx] = { ...updated.updates[idx], file_url: p.newUrl };
      });
      return updated;
    },
  },
  {
    name: 'PRAD',
    folder: 'prad',
    ownerField: 'owner_email',
    extract: (data) => {
      const patches = [];
      if (Array.isArray(data.documents)) {
        data.documents.forEach((d, i) => {
          if (d.url?.includes(BASE44_URL_PATTERN)) patches.push({ path: `documents[${i}].url`, oldUrl: d.url });
        });
      }
      if (Array.isArray(data.annual_reports)) {
        data.annual_reports.forEach((r, i) => {
          if (r.file_url?.includes(BASE44_URL_PATTERN)) patches.push({ path: `annual_reports[${i}].file_url`, oldUrl: r.file_url });
        });
      }
      return patches;
    },
    apply: (data, patches) => {
      const updated = { ...data, documents: [...(data.documents || [])], annual_reports: [...(data.annual_reports || [])] };
      patches.forEach(p => {
        const idx = parseInt(p.path.match(/\[(\d+)\]/)[1]);
        if (p.path.startsWith('documents')) updated.documents[idx] = { ...updated.documents[idx], url: p.newUrl };
        else if (p.path.startsWith('annual_reports')) updated.annual_reports[idx] = { ...updated.annual_reports[idx], file_url: p.newUrl };
      });
      return updated;
    },
  },
  {
    name: 'ClientContract',
    folder: 'contratos',
    ownerField: 'consultor_email',
    extract: (data) => {
      const patches = [];
      if (Array.isArray(data.documents)) {
        data.documents.forEach((d, i) => {
          if (d.url?.includes(BASE44_URL_PATTERN)) patches.push({ path: `documents[${i}].url`, oldUrl: d.url });
        });
      }
      return patches;
    },
    apply: (data, patches) => {
      const updated = { ...data, documents: [...(data.documents || [])] };
      patches.forEach(p => {
        const idx = parseInt(p.path.match(/\[(\d+)\]/)[1]);
        updated.documents[idx] = { ...updated.documents[idx], url: p.newUrl };
      });
      return updated;
    },
  },
  {
    name: 'Process',
    folder: 'processos',
    ownerField: 'client_email',
    extract: (data) => {
      const patches = [];
      if (Array.isArray(data.updates)) {
        data.updates.forEach((u, i) => {
          if (u.file_url?.includes(BASE44_URL_PATTERN)) patches.push({ path: `updates[${i}].file_url`, oldUrl: u.file_url });
        });
      }
      return patches;
    },
    apply: (data, patches) => {
      const updated = { ...data, updates: [...(data.updates || [])] };
      patches.forEach(p => {
        const idx = parseInt(p.path.match(/\[(\d+)\]/)[1]);
        updated.updates[idx] = { ...updated.updates[idx], file_url: p.newUrl };
      });
      return updated;
    },
  },
  {
    name: 'EnvironmentalAlert',
    folder: 'alertas',
    ownerField: 'responsible_email',
    extract: (data) => {
      const patches = [];
      if (Array.isArray(data.attachments)) {
        data.attachments.forEach((a, i) => {
          if (a.url?.includes(BASE44_URL_PATTERN)) patches.push({ path: `attachments[${i}].url`, oldUrl: a.url });
        });
      }
      return patches;
    },
    apply: (data, patches) => {
      const updated = { ...data, attachments: [...(data.attachments || [])] };
      patches.forEach(p => {
        const idx = parseInt(p.path.match(/\[(\d+)\]/)[1]);
        updated.attachments[idx] = { ...updated.attachments[idx], url: p.newUrl };
      });
      return updated;
    },
  },
  {
    name: 'Georeferencing',
    folder: 'georreferenciamento',
    ownerField: 'owner_email',
    extract: (data) => {
      const patches = [];
      if (Array.isArray(data.documents)) {
        data.documents.forEach((d, i) => {
          if (d.url?.includes(BASE44_URL_PATTERN)) patches.push({ path: `documents[${i}].url`, oldUrl: d.url });
        });
      }
      return patches;
    },
    apply: (data, patches) => {
      const updated = { ...data, documents: [...(data.documents || [])] };
      patches.forEach(p => {
        const idx = parseInt(p.path.match(/\[(\d+)\]/)[1]);
        updated.documents[idx] = { ...updated.documents[idx], url: p.newUrl };
      });
      return updated;
    },
  },
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Acesso negado. Apenas admins.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const dry_run = body.dry_run ?? false;
  const only_entity = body.entity ?? null; // opcional: migrar só uma entidade

  const results = {
    dry_run,
    total_files_found: 0,
    total_files_migrated: 0,
    total_files_failed: 0,
    by_entity: {},
    errors: [],
  };

  const configs = only_entity
    ? ENTITY_CONFIGS.filter(c => c.name === only_entity)
    : ENTITY_CONFIGS;

  for (const config of configs) {
    const entityResult = { files_found: 0, migrated: 0, failed: 0 };
    results.by_entity[config.name] = entityResult;

    let records;
    try {
      records = await base44.asServiceRole.entities[config.name].list('-created_date', 500);
    } catch (e) {
      console.error(`[migrate] Erro ao listar ${config.name}:`, e.message);
      continue;
    }

    for (const record of records) {
      const data = record;
      const patches = config.extract(data);
      if (patches.length === 0) continue;

      entityResult.files_found += patches.length;
      results.total_files_found += patches.length;

      if (dry_run) continue;

      const owner = data[config.ownerField] || 'migrated';

      for (const patch of patches) {
        try {
          const newUrl = await migrateUrl(patch.oldUrl, config.folder, owner);
          patch.newUrl = newUrl;
          entityResult.migrated++;
          results.total_files_migrated++;
          console.log(`[migrate] ✓ ${config.name}/${record.id}: ${patch.path}`);
        } catch (err) {
          entityResult.failed++;
          results.total_files_failed++;
          results.errors.push({ entity: config.name, id: record.id, path: patch.path, error: err.message });
          console.error(`[migrate] ✗ ${config.name}/${record.id} ${patch.path}:`, err.message);
        }
      }

      const successPatches = patches.filter(p => p.newUrl);
      if (successPatches.length > 0) {
        const updatedData = config.apply(data, successPatches);
        // Remover campos built-in antes de atualizar
        const { id, created_date, updated_date, created_by, entity_name, app_id, is_sample, is_deleted, deleted_date, environment, ...cleanData } = updatedData;
        await base44.asServiceRole.entities[config.name].update(record.id, cleanData);
      }
    }
  }

  return Response.json(results);
});