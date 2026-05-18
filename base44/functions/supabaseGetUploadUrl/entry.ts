import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const BUCKET_NAME = Deno.env.get('SUPABASE_BUCKET_NAME');

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { fileName, contentType, folder } = await req.json();

  if (!fileName || !contentType) {
    return Response.json({ error: 'fileName e contentType são obrigatórios' }, { status: 400 });
  }

  // Organiza arquivos por usuário/pasta para evitar conflitos
  const safeFolder = folder || 'uploads';
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_');
  const filePath = `${safeFolder}/${user.email}/${timestamp}_${safeName}`;

  // Gera URL pré-assinada para upload direto do frontend para o Supabase (sem passar pelo backend)
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET_NAME}/${filePath}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: 3600 }), // 1 hora para completar o upload
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error('[supabaseGetUploadUrl] Erro ao gerar URL de upload:', err);
    return Response.json({ error: 'Falha ao gerar URL de upload', details: err }, { status: 500 });
  }

  const data = await response.json();

  // Retorna a URL assinada de upload e o filePath para salvar na entidade
  return Response.json({
    uploadUrl: `${SUPABASE_URL}/storage/v1${data.url}`,
    filePath,
    token: data.token,
  });
});