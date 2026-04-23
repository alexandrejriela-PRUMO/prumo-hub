import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  return Response.json({ error: 'Funcionalidade removida.' }, { status: 410 });
});