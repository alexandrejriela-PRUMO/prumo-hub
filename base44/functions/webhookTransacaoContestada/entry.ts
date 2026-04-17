import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function extractBuyer(body) {
  const buyer =
    body?.data?.customer || body?.customer || body?.buyer ||
    body?.data?.buyer || body?.data?.client || body?.client ||
    body?.purchase?.customer || body?.event?.customer || {};

  const email = buyer?.email || body?.data?.email || body?.email || body?.customer_email || null;
  const fullName = buyer?.name || buyer?.full_name || body?.data?.name || body?.name || null;

  return { email, fullName };
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return Response.json({ status: 'ok', webhook: 'webhookTransacaoContestada' }, { status: 200 });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // TOKEN DE VALIDAÇÃO — será ativado após receber o token da plataforma
  // const token = req.headers.get('Authorization') || req.headers.get('X-Webhook-Token') || '';
  // const expectedToken = Deno.env.get('WEBHOOK_TOKEN_CONTESTADO');
  // if (expectedToken && token !== expectedToken && token !== `Bearer ${expectedToken}`) {
  //   return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[webhookTransacaoContestada] HEADERS:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
  console.log('[webhookTransacaoContestada] PAYLOAD:', JSON.stringify(body, null, 2));

  const { email, fullName } = extractBuyer(body);

  if (!email) {
    console.warn('[webhookTransacaoContestada] Email não encontrado no payload.');
    return Response.json({ received: true, message: 'Email não encontrado. Payload logado.', payload_keys: Object.keys(body) }, { status: 200 });
  }

  try {
    const base44 = createClientFromRequest(req);

    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (!users || users.length === 0) {
      console.log(`[webhookTransacaoContestada] Usuário não encontrado: ${email}`);
      return Response.json({ received: true, message: 'Usuário não encontrado.', email }, { status: 200 });
    }

    // BLOQUEAR usuário por chargeback
    await base44.asServiceRole.entities.User.update(users[0].id, {
      status: 'inactive',
      blocked_reason: 'chargeback',
      blocked_at: new Date().toISOString(),
    });

    console.log(`[webhookTransacaoContestada] Usuário bloqueado por chargeback: ${email}`);
    return Response.json({ received: true, message: 'Usuário bloqueado por contestação (chargeback).', email }, { status: 200 });
  } catch (error) {
    console.error('[webhookTransacaoContestada] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});