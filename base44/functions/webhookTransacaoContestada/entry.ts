import { createClient } from 'npm:@base44/sdk@0.8.25';

function extractBuyer(body) {
  const buyer =
    body?.data?.customer || body?.customer || body?.buyer ||
    body?.data?.buyer || body?.data?.client || body?.client ||
    body?.purchase?.customer || body?.event?.customer || {};

  const email = buyer?.email || body?.data?.email || body?.email || body?.customer_email || null;
  return { email };
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return Response.json({ status: 'ok', webhook: 'webhookTransacaoContestada' }, { status: 200 });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[webhookTransacaoContestada] PAYLOAD:', JSON.stringify(body, null, 2));

  const { email } = extractBuyer(body);

  if (!email) {
    console.warn('[webhookTransacaoContestada] Email não encontrado no payload.');
    return Response.json({ received: true, message: 'Email não encontrado.', payload_keys: Object.keys(body) }, { status: 200 });
  }

  try {
    const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

    // Atualizar UserMetadata
    const metas = await base44.asServiceRole.entities.UserMetadata.filter({ user_email: email });
    if (metas && metas.length > 0) {
      await base44.asServiceRole.entities.UserMetadata.update(metas[0].id, {
        subscription_status: 'chargeback',
      });
    }

    // Atualizar Lead
    const leads = await base44.asServiceRole.entities.LeadFormSubmission.filter({ email });
    if (leads && leads.length > 0) {
      await base44.asServiceRole.entities.LeadFormSubmission.update(leads[0].id, {
        subscription_status: 'chargeback',
      });
    }

    console.log(`[webhookTransacaoContestada] Chargeback registrado: ${email}`);
    return Response.json({ received: true, message: 'Chargeback registrado.', email }, { status: 200 });
  } catch (error) {
    console.error('[webhookTransacaoContestada] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});