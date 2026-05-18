import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const BUCKET_NAME = Deno.env.get('SUPABASE_BUCKET_NAME');

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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Acesso negado. Apenas admins.' }, { status: 403 });
  }

  const { dry_run = false } = await req.json().catch(() => ({}));

  // Buscar todos os mappings
  const allMappings = await base44.asServiceRole.entities.Mapping.list('-created_date', 500);

  // Filtrar apenas os que têm arquivos com URLs do Base44
  const toMigrate = allMappings.filter(m =>
    Array.isArray(m.files) &&
    m.files.some(f => f.url && f.url.includes('base44.app'))
  );

  console.log(`[migrateMappings] Total de mappings: ${allMappings.length}, com arquivos Base44: ${toMigrate.length}`);

  if (dry_run) {
    return Response.json({
      dry_run: true,
      total_mappings: allMappings.length,
      mappings_to_migrate: toMigrate.length,
      files_to_migrate: toMigrate.reduce((acc, m) => acc + m.files.filter(f => f.url?.includes('base44.app')).length, 0),
      details: toMigrate.map(m => ({
        id: m.id,
        title: m.title,
        files: m.files.filter(f => f.url?.includes('base44.app')).map(f => f.name),
      })),
    });
  }

  const results = { migrated: 0, failed: 0, errors: [] };

  for (const mapping of toMigrate) {
    const updatedFiles = [...mapping.files];
    let changed = false;

    for (let i = 0; i < updatedFiles.length; i++) {
      const file = updatedFiles[i];
      if (!file.url || !file.url.includes('base44.app')) continue;

      try {
        console.log(`[migrateMappings] Baixando: ${file.name} (${file.url})`);

        // Baixar o arquivo da URL antiga
        const downloadRes = await fetch(file.url);
        if (!downloadRes.ok) {
          throw new Error(`Download falhou: ${downloadRes.status}`);
        }

        const buffer = await downloadRes.arrayBuffer();
        const contentType = downloadRes.headers.get('content-type') || file.type || 'application/octet-stream';

        // Gerar novo path no Supabase
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_');
        const newPath = `mapeamentos/${mapping.user_email || 'migrated'}/${timestamp}_${safeName}`;

        // Upload para Supabase
        await uploadToSupabase(newPath, buffer, contentType);

        // Atualizar URL no arquivo
        updatedFiles[i] = { ...file, url: newPath };
        changed = true;
        results.migrated++;
        console.log(`[migrateMappings] ✓ Migrado: ${file.name} → ${newPath}`);

      } catch (err) {
        console.error(`[migrateMappings] ✗ Erro em ${file.name}:`, err.message);
        results.failed++;
        results.errors.push({ mapping_id: mapping.id, file: file.name, error: err.message });
      }
    }

    if (changed) {
      await base44.asServiceRole.entities.Mapping.update(mapping.id, { files: updatedFiles });
    }
  }

  return Response.json({
    success: true,
    ...results,
    message: `Migração concluída: ${results.migrated} arquivo(s) migrado(s), ${results.failed} falha(s).`,
  });
});