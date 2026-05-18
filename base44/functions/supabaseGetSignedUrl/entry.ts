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

  const { filePath, expiresIn } = await req.json();

  if (!filePath) {
    return Response.json({ error: 'filePath é obrigatório' }, { status: 400 });
  }

  const expiry = expiresIn || 3600; // padrão: 1 hora

  // Gera URL assinada temporária para download seguro
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET_NAME}/${filePath}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: expiry }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error('[supabaseGetSignedUrl] Erro ao gerar URL assinada:', err);
    return Response.json({ error: 'Falha ao gerar URL assinada', details: err }, { status: 500 });
  }

  const data = await response.json();

  return Response.json({
    signedUrl: `${SUPABASE_URL}/storage/v1${data.signedURL}`,
    expiresIn: expiry,
  });
});