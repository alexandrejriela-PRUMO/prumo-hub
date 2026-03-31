import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Função desativada — integração com Google Calendar removida
Deno.serve(async (req) => {
  return Response.json({ error: 'Google Calendar integration has been removed.' }, { status: 410 });
});