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

function extractPlan(body) {
  const productName =
    body?.orderItems?.[0]?.product?.name ||
    body?.product?.name ||
    body?.offer?.name ||
    body?.data?.product_name ||
    body?.data?.offer_name ||
    body?.plan?.name ||
    body?.subscription?.plan?.name ||
    body?.purchase?.product?.name ||
    body?.event?.product?.name ||
    body?.product_name ||
    body?.offer_name ||
    '';

  const offerId =
    body?.offerCode ||
    body?.offer?.id ||
    body?.data?.offer_id ||
    body?.offer_id ||
    body?.plan?.id ||
    '';

  const productNameLower = (productName + ' ' + offerId).toLowerCase();

  // Produtor - Plano Único
  if (offerId === 'GNJXUCE' || productNameLower.includes('único') || productNameLower.includes('unico')) {
    return { perfil: 'produtor', plano: 'unico', user_type: 'produtor', max_properties: 1, max_users: 1 };
  }
  // Consultor - Enterprise (checar antes do 'pro')
  if (offerId === 'EQL1OTT' || productNameLower.includes('enterprise')) {
    return { perfil: 'consultor', plano: 'enterprise', user_type: 'consultor', max_properties: 200, max_users: 3 };
  }
  // Consultor - Pro
  if (offerId === '8QA4VR2' || productNameLower.includes('consultor pro')) {
    return { perfil: 'consultor', plano: 'pro', user_type: 'consultor', max_properties: 10, max_users: 2 };
  }
  // Consultor - Start
  if (offerId === 'GYXWU5X' || productNameLower.includes('start')) {
    return { perfil: 'consultor', plano: 'start', user_type: 'consultor', max_properties: 5, max_users: 1 };
  }
  // Fallback produtor por nome
  if (productNameLower.includes('produtor') || productNameLower.includes('rural')) {
    return { perfil: 'produtor', plano: 'unico', user_type: 'produtor', max_properties: 1, max_users: 1 };
  }
  // Fallback por perfil no consultor (qualquer coisa com 'consultor' no nome)
  if (productNameLower.includes('consultor')) {
    return { perfil: 'consultor', plano: 'start', user_type: 'consultor', max_properties: 5, max_users: 1 };
  }

  console.warn('[webhookPurchaseApproved] Plano não reconhecido. ProductName:', productName, 'OfferId:', offerId);
  // Sem fallback cego — logar para investigação. Padrão neutro sem user_type incorreto.
  return { perfil: 'produtor', plano: 'unico', user_type: 'produtor', max_properties: 1, max_users: 1 };
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return Response.json({ status: 'ok', webhook: 'webhookPurchaseApproved' }, { status: 200 });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  console.log('[webhookPurchaseApproved] RAW PAYLOAD:', JSON.stringify(body, null, 2));

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
    buyer?.email ||
    body?.data?.email ||
    body?.email ||
    body?.customer_email ||
    null;

  const fullName =
    buyer?.name ||
    buyer?.full_name ||
    body?.data?.name ||
    body?.name ||
    body?.customer_name ||
    null;

  const document =
    buyer?.cpf ||
    buyer?.cnpj ||
    buyer?.document ||
    buyer?.tax_id ||
    body?.data?.cpf ||
    body?.data?.cnpj ||
    body?.data?.document ||
    body?.cpf ||
    body?.cnpj ||
    null;

  if (!email) {
    console.warn('[webhookPurchaseApproved] Email não encontrado no payload.');
    return Response.json({ received: true, message: 'Email não encontrado.', payload_keys: Object.keys(body) }, { status: 200 });
  }

  // Identificar plano e perfil corretos a partir do payload
  const planInfo = extractPlan(body);
  console.log('[webhookPurchaseApproved] Plano identificado:', planInfo);

  const cleanDoc = cleanDocument(document || '');
  const tempPassword = cleanDoc || 'prumo2024';
  const hashedPassword = await hashPassword(tempPassword);

  try {
    const base44 = createClientFromRequest(req);

    // Verificar idempotência: usuário já existe?
    const existing = await base44.asServiceRole.entities.User.filter({ email });
    if (existing && existing.length > 0) {
      console.log(`[webhookPurchaseApproved] Usuário já existe: ${email} — atualizando user_type para ${planInfo.user_type}`);
      // Atualizar user_type mesmo que já exista (pode ter sido criado com tipo errado)
      await base44.asServiceRole.entities.User.update(existing[0].id, {
        user_type: planInfo.user_type,
        plano: planInfo.plano,
        subscription_status: 'active',
        created_via_webhook: true,
      });

      // Atualizar/criar UserMetadata
      const existingMeta = await base44.asServiceRole.entities.UserMetadata.filter({ user_email: email });
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
          user_email: email,
          user_id: existing[0].id,
          plano: planInfo.plano,
          user_type: planInfo.user_type,
          max_properties: planInfo.max_properties,
          max_users: planInfo.max_users,
          subscription_status: 'active',
        });
      }

      return Response.json({ received: true, message: 'Usuário existente atualizado.', email, user_type: planInfo.user_type }, { status: 200 });
    }

    // Novo usuário — convidar na plataforma
    await base44.users.inviteUser(email, 'user');
    console.log(`[webhookPurchaseApproved] Usuário convidado: ${email}`);

    // Atualizar dados com user_type correto baseado no plano
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users && users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        full_name: fullName || email,
        user_type: planInfo.user_type,
        plano: planInfo.plano,
        document: cleanDoc,
        hashed_temp_password: hashedPassword,
        must_change_password: true,
        webhook_source: 'purchase_approved',
        created_via_webhook: true,
        subscription_status: 'active',
      });

      // Criar UserMetadata com plano e user_type corretos
      await base44.asServiceRole.entities.UserMetadata.create({
        user_email: email,
        user_id: users[0].id,
        plano: planInfo.plano,
        user_type: planInfo.user_type,
        max_properties: planInfo.max_properties,
        max_users: planInfo.max_users,
        subscription_status: 'active',
      });

      console.log(`[webhookPurchaseApproved] Usuário criado: ${email}, user_type=${planInfo.user_type}, plano=${planInfo.plano}`);
    }

    // Upsert Lead para rastreabilidade
    try {
      const leads = await base44.asServiceRole.entities.LeadFormSubmission.filter({ email });
      if (leads && leads.length > 0) {
        await base44.asServiceRole.entities.LeadFormSubmission.update(leads[0].id, {
          subscription_status: 'active',
          plano: planInfo.plano,
          user_type: planInfo.user_type,
          parceiro: `nexano_${planInfo.plano}`,
          max_properties: planInfo.max_properties,
          max_users: planInfo.max_users,
        });
      } else {
        await base44.asServiceRole.entities.LeadFormSubmission.create({
          perfil: planInfo.perfil,
          nome: fullName || email,
          email,
          submitted_at: new Date().toISOString(),
          parceiro: `nexano_${planInfo.plano}`,
          plano: planInfo.plano,
          user_type: planInfo.user_type,
          subscription_status: 'active',
          max_properties: planInfo.max_properties,
          max_users: planInfo.max_users,
        });
      }
    } catch (leadErr) {
      console.warn('[webhookPurchaseApproved] Erro ao salvar lead (não crítico):', leadErr.message);
    }

    return Response.json({
      received: true,
      message: 'Usuário criado com sucesso.',
      email,
      user_type: planInfo.user_type,
      plano: planInfo.plano,
    }, { status: 201 });

  } catch (error) {
    console.error('[webhookPurchaseApproved] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});