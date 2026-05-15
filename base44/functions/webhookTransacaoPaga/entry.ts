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
    body?.client ||
    body?.data?.customer ||
    body?.customer ||
    body?.buyer ||
    body?.data?.buyer ||
    body?.data?.client ||
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

  const phone =
    buyer?.phone || buyer?.phone_number || body?.data?.phone || body?.phone || '';

  return { email, fullName, document, phone };
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

  console.warn('[webhookTransacaoPaga] Plano não reconhecido. ProductName:', productName, 'OfferId:', offerId);
  return { perfil: 'consultor', plano: 'start', user_type: 'consultor', max_properties: 5, max_users: 1 };
}

async function upsertUserMetadata(base44, email, userId, planInfo) {
  const existingMeta = await base44.asServiceRole.entities.UserMetadata.filter({ user_email: email });
  const metaData = {
    user_email: email,
    user_id: userId,
    plano: planInfo.plano,
    user_type: planInfo.user_type,
    max_properties: planInfo.max_properties,
    max_users: planInfo.max_users,
    subscription_status: 'active',
  };
  if (existingMeta && existingMeta.length > 0) {
    await base44.asServiceRole.entities.UserMetadata.update(existingMeta[0].id, metaData);
    console.log(`[webhookTransacaoPaga] UserMetadata atualizado para ${email}: plano=${planInfo.plano}, status=active`);
  } else {
    await base44.asServiceRole.entities.UserMetadata.create(metaData);
    console.log(`[webhookTransacaoPaga] UserMetadata criado para ${email}: plano=${planInfo.plano}, status=active`);
  }
}

async function upsertLead(base44, email, fullName, phone, planInfo, cleanDoc) {
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
      telefone: phone || '',
      submitted_at: new Date().toISOString(),
      parceiro: `nexano_${planInfo.plano}`,
      plano: planInfo.plano,
      user_type: planInfo.user_type,
      subscription_status: 'active',
      document: cleanDoc || '',
      max_properties: planInfo.max_properties,
      max_users: planInfo.max_users,
    });
  }
  console.log(`[webhookTransacaoPaga] Lead upserted para ${email}: plano=${planInfo.plano}`);
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return Response.json({ status: 'ok', webhook: 'webhookTransacaoPaga' }, { status: 200 });
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

  // Validação do token — a Nexano envia no campo "token" do body
  const receivedToken = body?.token;
  const expectedToken = Deno.env.get('WEBHOOK_TOKEN_PAGO');
  if (expectedToken && receivedToken !== expectedToken) {
    console.warn('[webhookTransacaoPaga] Token inválido. Recebido:', receivedToken);
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[webhookTransacaoPaga] PAYLOAD RECEBIDO:', JSON.stringify(body, null, 2));

  const { email, fullName, document, phone } = extractBuyer(body);

  if (!email) {
    console.warn('[webhookTransacaoPaga] Email não encontrado. Keys:', Object.keys(body));
    return Response.json({ received: true, message: 'Email não encontrado no payload.', payload_keys: Object.keys(body) }, { status: 200 });
  }

  const planInfo = extractPlan(body);
  console.log('[webhookTransacaoPaga] Plano identificado:', planInfo);

  const cleanDoc = cleanDocument(document || '');
  const tempPasswordPlain = cleanDoc || 'prumo2024';
  const hashedTempPassword = await hashPassword(tempPasswordPlain);

  try {
    const base44 = createClientFromRequest(req);

    // ── PASSO 1: Sempre fazer upsert do Lead (fonte da verdade do pagamento) ──
    // Isso garante que o AccessBlockedGuard consiga verificar o pagamento mesmo
    // antes do usuário existir na plataforma
    await upsertLead(base44, email, fullName, phone, planInfo, cleanDoc);

    // ── PASSO 2: Verificar se usuário já existe (pelo UserMetadata) ──
    const existingMeta = await base44.asServiceRole.entities.UserMetadata.filter({ user_email: email });

    if (existingMeta && existingMeta.length > 0) {
      // Usuário já existe na plataforma — atualizar UserMetadata diretamente
      await base44.asServiceRole.entities.UserMetadata.update(existingMeta[0].id, {
        plano: planInfo.plano,
        user_type: planInfo.user_type,
        max_properties: planInfo.max_properties,
        max_users: planInfo.max_users,
        subscription_status: 'active',
      });
      console.log(`[webhookTransacaoPaga] Usuário existente: UserMetadata atualizado para ${email} → plano ${planInfo.plano}, status=active`);
      return Response.json({
        received: true,
        message: 'Usuário existente atualizado e ativado.',
        email,
        plano: planInfo.plano,
      }, { status: 200 });
    }

    // ── PASSO 3: Novo usuário — Lead já salvo com status active (Passo 1) ──
    // O AccessBlockedGuard detecta o lead nexano_* com active e libera o acesso no primeiro login
    // e cria o UserMetadata automaticamente.
    console.log(`[webhookTransacaoPaga] Novo usuário. Lead salvo com status active para: ${email}`);

    // ── PASSO 4: E-mail de boas-vindas ──
    try {
      await base44.asServiceRole.functions.invoke('sendCustomInviteEmail', {
        email,
        name: fullName || email.split('@')[0],
        type: planInfo.user_type,
        plan: planInfo.plano,
        document: cleanDoc,
      });
      console.log(`[webhookTransacaoPaga] E-mail de boas-vindas enviado para: ${email}`);
    } catch (emailError) {
      console.warn(`[webhookTransacaoPaga] Erro ao enviar e-mail (não crítico): ${emailError.message}`);
    }

    return Response.json({
      received: true,
      message: 'Pagamento registrado. E-mail enviado. Acesso liberado no primeiro login em hub.prumo.site.',
      email,
      plano: planInfo.plano,
      perfil: planInfo.perfil,
    }, { status: 201 });

  } catch (error) {
    console.error('[webhookTransacaoPaga] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});