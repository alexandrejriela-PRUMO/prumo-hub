import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function hashPassword(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function cleanDocument(doc = '') {
  return doc.replace(/\D/g, '');
}

function extractBuyer(body) {
  const buyer =
    body?.data?.customer ||
    body?.customer ||
    body?.buyer ||
    body?.data?.buyer ||
    body?.data?.client ||
    body?.client ||
    body?.purchase?.customer ||
    body?.event?.customer ||
    {};

  const email =
    buyer?.email || body?.data?.email || body?.email || body?.customer_email || null;

  const fullName =
    buyer?.name || buyer?.full_name || body?.data?.name || body?.name || body?.customer_name || null;

  const document =
    buyer?.cpf || buyer?.cnpj || buyer?.document || buyer?.tax_id ||
    body?.data?.cpf || body?.data?.cnpj || body?.data?.document ||
    body?.cpf || body?.cnpj || null;

  return { email, fullName, document };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const token = req.headers.get('Authorization') || req.headers.get('X-Webhook-Token') || '';
  const expectedToken = Deno.env.get('WEBHOOK_TOKEN_PAGO');
  if (expectedToken && token !== expectedToken && token !== `Bearer ${expectedToken}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[webhookTransacaoPaga] HEADERS:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
  console.log('[webhookTransacaoPaga] PAYLOAD:', JSON.stringify(body, null, 2));

  const { email, fullName, document } = extractBuyer(body);

  if (!email) {
    console.warn('[webhookTransacaoPaga] Email não encontrado no payload.');
    return Response.json({ received: true, message: 'Email não encontrado. Payload logado para análise.', payload_keys: Object.keys(body) }, { status: 200 });
  }

  const cleanDoc = cleanDocument(document || '');
  const tempPassword = cleanDoc || 'prumo2024';
  const hashedPassword = await hashPassword(tempPassword);

  try {
    const base44 = createClientFromRequest(req);

    // Idempotência
    const existing = await base44.asServiceRole.entities.User.filter({ email });
    if (existing && existing.length > 0) {
      console.log(`[webhookTransacaoPaga] Usuário já existe: ${email}`);
      return Response.json({ received: true, message: 'Usuário já cadastrado.', email }, { status: 200 });
    }

    // Criar usuário
    await base44.users.inviteUser(email, 'user');
    console.log(`[webhookTransacaoPaga] Usuário convidado: ${email}`);

    // Atualizar dados extras
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users && users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        full_name: fullName || email,
        user_type: 'produtor',
        document: cleanDoc,
        hashed_temp_password: hashedPassword,
        must_change_password: true,
        webhook_source: 'transacao_paga',
        created_via_webhook: true,
        status: 'active',
      });
    }

    return Response.json({ received: true, message: 'Usuário criado com sucesso.', email }, { status: 201 });
  } catch (error) {
    console.error('[webhookTransacaoPaga] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});