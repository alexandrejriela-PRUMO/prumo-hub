import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = Deno.env.get('GEE_SERVICE_ACCOUNT_EMAIL') || 'not set';
    const pkRaw = Deno.env.get('GEE_PRIVATE_KEY') || 'not set';
    const projectId = Deno.env.get('GEE_PROJECT_ID') || 'not set';

    return Response.json({
      ok: true,
      email,
      projectId,
      pkType: pkRaw.startsWith('{') ? 'json' : 'pem',
      pkLength: pkRaw.length,
      pkStart: pkRaw.substring(0, 40)
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});