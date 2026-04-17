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

  const phone =
    buyer?.phone || buyer?.phone_number || body?.data?.phone || body?.phone || '';

  return { email, fullName, document, phone };
}

/**
 * Identifica o plano e user_type a partir do payload do Nexano.
 * O Nexano geralmente envia o nome da oferta/produto em campos como:
 *   body.product.name, body.offer.name, body.data.product_name, etc.
 * Ajuste os campos conforme o payload real do seu Nexano.
 */
function extractPlan(body) {
  const productName =
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
    body?.offer?.id ||
    body?.data?.offer_id ||
    body?.offer_id ||
    body?.plan?.id ||
    '';

  const productNameLower = (productName + ' ' + offerId).toLowerCase();

  // Mapeamento de planos do Nexano → user_type + plano_interno
  // Consultor - Start
  if (productNameLower.includes('start') || offerId === 'GYXWU5X') {
    return { perfil: 'consultor', plano: 'start', user_type: 'consultor', max_properties: 5, max_users: 1 };
  }
  // Consultor - Pro
  if (productNameLower.includes('pro') || offerId === '8QA4VR2') {
    return { perfil: 'consultor', plano: 'pro', user_type: 'consultor', max_properties: 10, max_users: 2 };
  }
  // Consultor - Enterprise
  if (productNameLower.includes('enterprise') || offerId === 'EQL1OTT') {
    return { perfil: 'consultor', plano: 'enterprise', user_type: 'consultor', max_properties: 200, max_users: 3 };
  }
  // Produtor - Plano Único
  if (productNameLower.includes('produtor') || productNameLower.includes('rural') || productNameLower.includes('único') || productNameLower.includes('unico') || offerId === 'GNJXUCE') {
    return { perfil: 'produtor', plano: 'unico', user_type: 'produtor', max_properties: 1, max_users: 1 };
  }

  // Fallback: se não reconheceu, salva como produtor básico
  console.warn('[webhookTransacaoPaga] Plano não reconhecido. ProductName:', productName, 'OfferId:', offerId);
  return { perfil: 'produtor', plano: 'desconhecido', user_type: 'produtor', max_properties: 1, max_users: 1 };
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

  console.log('[webhookTransacaoPaga] PAYLOAD RECEBIDO:', JSON.stringify(body, null, 2));

  const { email, fullName, document, phone } = extractBuyer(body);

  if (!email) {
    console.warn('[webhookTransacaoPaga] Email não encontrado. Keys:', Object.keys(body));
    return Response.json({ received: true, message: 'Email não encontrado no payload.', payload_keys: Object.keys(body) }, { status: 200 });
  }

  const planInfo = extractPlan(body);
  console.log('[webhookTransacaoPaga] Plano identificado:', planInfo);

  const cleanDoc = cleanDocument(document || '');

  try {
    const base44 = createClientFromRequest(req);

    // Verificar se usuário já existe
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      // Atualizar plano do usuário existente
      await base44.asServiceRole.entities.User.update(existingUser.id, {
        user_type: planInfo.user_type,
        plano: planInfo.plano,
        max_properties: planInfo.max_properties,
        max_users: planInfo.max_users,
        subscription_status: 'active',
        subscription_updated_at: new Date().toISOString(),
      });
      console.log(`[webhookTransacaoPaga] Usuário existente atualizado: ${email} → plano ${planInfo.plano}`);
      return Response.json({ received: true, message: 'Usuário existente atualizado com o novo plano.', email, plano: planInfo.plano }, { status: 200 });
    }

    // Verificar se já existe lead pendente
    const existingLeads = await base44.asServiceRole.entities.LeadFormSubmission.filter({ email });

    if (existingLeads && existingLeads.length > 0) {
      // Atualizar o lead existente com info do plano
      await base44.asServiceRole.entities.LeadFormSubmission.update(existingLeads[0].id, {
        plano: planInfo.plano,
        user_type: planInfo.user_type,
        parceiro: `nexano_${planInfo.plano}`,
        subscription_status: 'pending_invite',
      });
      console.log(`[webhookTransacaoPaga] Lead existente atualizado com plano: ${email}`);
      return Response.json({ received: true, message: 'Lead existente atualizado com plano.', email, plano: planInfo.plano }, { status: 200 });
    }

    // Criar novo lead com todas as informações do plano
    await base44.asServiceRole.entities.LeadFormSubmission.create({
      perfil: planInfo.perfil,
      nome: fullName || email,
      email,
      telefone: phone || '',
      submitted_at: new Date().toISOString(),
      parceiro: `nexano_${planInfo.plano}`,
      plano: planInfo.plano,
      user_type: planInfo.user_type,
      subscription_status: 'pending_invite',
      document: cleanDoc || '',
    });

    console.log(`[webhookTransacaoPaga] Novo lead criado: ${email} | Plano: ${planInfo.plano} | Tipo: ${planInfo.user_type}`);

    return Response.json({
      received: true,
      message: 'Lead registrado com sucesso. Pronto para convite.',
      email,
      plano: planInfo.plano,
      perfil: planInfo.perfil,
    }, { status: 201 });

  } catch (error) {
    console.error('[webhookTransacaoPaga] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});