import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function hashPassword(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function cleanDocument(doc) {
  return (doc || '').replace(/\D/g, '');
}

function extractPlanInfo(externalRef) {
  if (!externalRef) return { perfil: 'produtor', plano: 'unico', user_type: 'produtor', max_properties: 1, max_users: 3 };
  if (externalRef.includes('consultor_enterprise')) {
    return { perfil: 'consultor', plano: 'enterprise', user_type: 'consultor', max_properties: 200, max_users: 3 };
  }
  return { perfil: 'produtor', plano: 'unico', user_type: 'produtor', max_properties: 1, max_users: 3 };
}

async function fetchAsaasCustomer(customerId, apiKey) {
  try {
    const res = await fetch(`https://api-sandbox.asaas.com/v3/customers/${customerId}`, {
      headers: { 'access_token': apiKey, 'User-Agent': 'PRUMOHub/1.0.0' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchAsaasCheckout(checkoutId, apiKey) {
  try {
    const res = await fetch(`https://api-sandbox.asaas.com/v3/checkouts/${checkoutId}`, {
      headers: { 'access_token': apiKey, 'User-Agent': 'PRUMOHub/1.0.0' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const webhookToken = req.headers.get('asaas-access-token');
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    if (!webhookToken || webhookToken !== expectedToken) {
      console.warn('[webhookAsaas] Token inválido ou ausente');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('[webhookAsaas] RAW PAYLOAD:', JSON.stringify(body, null, 2));

    const event = body.event;
    const payment = body.payment || {};

    const relevantEvents = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_CREDIT_CARD_CAPTURED'];
    if (!relevantEvents.includes(event)) {
      console.log(`[webhookAsaas] Evento ignorado: ${event}`);
      return Response.json({ received: true, event }, { status: 200 });
    }

    // O externalReference do checkout NÃO vem no payment — buscar via checkoutSession
    let externalRef = payment.externalReference;
    if (!externalRef && payment.checkoutSession) {
      const apiKey = Deno.env.get('ASAAS_API_KEY');
      const checkout = await fetchAsaasCheckout(payment.checkoutSession, apiKey);
      if (checkout) {
        externalRef = checkout.externalReference;
        console.log(`[webhookAsaas] externalReference obtido do checkout: ${externalRef}`);
      }
    }
    const planInfo = extractPlanInfo(externalRef);
    console.log(`[webhookAsaas] Plano: ${planInfo.user_type} / ${planInfo.plano}`);

    // Extract customer info from payment
    let customerEmail = null;
    let customerName = null;
    let customerDoc = null;

    if (typeof payment.customer === 'string') {
      const apiKey = Deno.env.get('ASAAS_API_KEY');
      const custData = await fetchAsaasCustomer(payment.customer, apiKey);
      if (custData) {
        customerEmail = custData.email;
        customerName = custData.name;
        customerDoc = custData.cpfCnpj;
      }
    } else if (payment.customer && typeof payment.customer === 'object') {
      customerEmail = payment.customer.email;
      customerName = payment.customer.name;
      customerDoc = payment.customer.cpfCnpj;
    }

    if (!customerEmail) {
      console.warn('[webhookAsaas] Email do cliente não encontrado no payload');
      return Response.json({ received: true, message: 'Email não encontrado' }, { status: 200 });
    }

    console.log(`[webhookAsaas] Cliente: ${customerEmail} (${customerName || 'sem nome'})`);

    const base44 = createClientFromRequest(req);
    const cleanDoc = cleanDocument(customerDoc || '');
    const tempPassword = cleanDoc || 'prumo2024';
    const hashedPassword = await hashPassword(tempPassword);

    // Check existing user
    const existing = await base44.asServiceRole.entities.User.filter({ email: customerEmail });
    if (existing && existing.length > 0) {
      console.log(`[webhookAsaas] Usuário existente: ${customerEmail} — atualizando para ${planInfo.user_type}`);
      await base44.asServiceRole.entities.User.update(existing[0].id, {
        user_type: planInfo.user_type,
        plano: planInfo.plano,
        subscription_status: 'active',
        created_via_webhook: true,
      });

      const existingMeta = await base44.asServiceRole.entities.UserMetadata.filter({ user_email: customerEmail });
      if (existingMeta && existingMeta.length > 0) {
        await base44.asServiceRole.entities.UserMetadata.update(existingMeta[0].id, {
          plano: planInfo.plano,
          user_type: planInfo.user_type,
          max_properties: planInfo.max_properties,
          max_users: planInfo.max_users,
          subscription_status: 'active',
        });
      } else {
        await base44.asServiceRole.entities.UserMetadata.create({
          user_email: customerEmail,
          user_id: existing[0].id,
          plano: planInfo.plano,
          user_type: planInfo.user_type,
          max_properties: planInfo.max_properties,
          max_users: planInfo.max_users,
          subscription_status: 'active',
        });
      }

      return Response.json({ received: true, message: 'Usuário existente atualizado', email: customerEmail }, { status: 200 });
    }

    // New user
    await base44.users.inviteUser(customerEmail, 'user');
    console.log(`[webhookAsaas] Usuário convidado: ${customerEmail}`);

    const users = await base44.asServiceRole.entities.User.filter({ email: customerEmail });
    if (users && users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        full_name: customerName || customerEmail,
        user_type: planInfo.user_type,
        plano: planInfo.plano,
        document: cleanDoc,
        hashed_temp_password: hashedPassword,
        must_change_password: true,
        webhook_source: 'asaas',
        created_via_webhook: true,
        subscription_status: 'active',
      });

      await base44.asServiceRole.entities.UserMetadata.create({
        user_email: customerEmail,
        user_id: users[0].id,
        plano: planInfo.plano,
        user_type: planInfo.user_type,
        max_properties: planInfo.max_properties,
        max_users: planInfo.max_users,
        subscription_status: 'active',
      });
    }

    // Upsert Lead
    try {
      const leads = await base44.asServiceRole.entities.LeadFormSubmission.filter({ email: customerEmail });
      if (leads && leads.length > 0) {
        await base44.asServiceRole.entities.LeadFormSubmission.update(leads[0].id, {
          subscription_status: 'active',
          plano: planInfo.plano,
          user_type: planInfo.user_type,
          parceiro: 'asaas',
          max_properties: planInfo.max_properties,
          max_users: planInfo.max_users,
        });
      } else {
        await base44.asServiceRole.entities.LeadFormSubmission.create({
          perfil: planInfo.perfil,
          nome: customerName || customerEmail,
          email: customerEmail,
          submitted_at: new Date().toISOString(),
          parceiro: 'asaas',
          plano: planInfo.plano,
          user_type: planInfo.user_type,
          subscription_status: 'active',
          max_properties: planInfo.max_properties,
          max_users: planInfo.max_users,
        });
      }
    } catch (leadErr) {
      console.warn('[webhookAsaas] Erro ao salvar lead:', leadErr.message);
    }

    return Response.json({
      received: true,
      message: 'Usuário criado com sucesso',
      email: customerEmail,
      user_type: planInfo.user_type,
      plano: planInfo.plano,
    }, { status: 201 });
  } catch (error) {
    console.error('[webhookAsaas] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});