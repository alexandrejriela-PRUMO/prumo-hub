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

  const { filePath } = await req.json();

  if (!filePath) {
    return Response.json({ error: 'filePath é obrigatório' }, { status: 400 });
  }

  // Segurança: apenas admin ou dono do arquivo (caminho contém o email do usuário)
  const isAdmin = user.role === 'admin';
  const isOwner = filePath.includes(user.email);
  if (!isAdmin && !isOwner) {
    return Response.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${filePath}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error('[supabaseDeleteFile] Erro ao deletar arquivo:', err);
    return Response.json({ error: 'Falha ao deletar arquivo', details: err }, { status: 500 });
  }

  return Response.json({ success: true, filePath });
});