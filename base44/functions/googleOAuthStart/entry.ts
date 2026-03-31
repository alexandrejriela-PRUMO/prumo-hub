import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Função desativada — integração com Google OAuth removida
Deno.serve(async (req) => {
  return Response.json({ error: 'Google OAuth integration has been removed.' }, { status: 410 });
});