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

  // Baixa o arquivo diretamente do Supabase usando service role
  const downloadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${filePath}`;
  const fileResponse = await fetch(downloadUrl, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!fileResponse.ok) {
    return Response.json({ error: 'Arquivo não encontrado' }, { status: 404 });
  }

  const fileName = filePath.split('/').pop() || 'arquivo';
  const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
  const fileBytes = await fileResponse.arrayBuffer();

  return new Response(fileBytes, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': fileBytes.byteLength.toString(),
    },
  });
});