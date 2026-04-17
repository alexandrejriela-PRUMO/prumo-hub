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
  // Aceita GET para validação de URL
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

  const { email, fullName, document } = extractBuyer(body);

  if (!email) {
    console.warn('[webhookTransacaoPaga] Email não encontrado. Keys:', Object.keys(body));
    return Response.json({ received: true, message: 'Email não encontrado no payload.', payload_keys: Object.keys(body) }, { status: 200 });
  }

  const cleanDoc = cleanDocument(document || '');
  const tempPassword = cleanDoc || 'prumo2024';
  const hashedPassword = await hashPassword(tempPassword);

  try {
    // Usar asServiceRole pois é chamado externamente sem usuário autenticado
    const base44 = createClientFromRequest(req);

    const existing = await base44.asServiceRole.entities.User.filter({ email });
    if (existing && existing.length > 0) {
      console.log(`[webhookTransacaoPaga] Usuário já existe: ${email}`);
      return Response.json({ received: true, message: 'Usuário já cadastrado.', email }, { status: 200 });
    }

    // Verificar se já existe registro pendente
    const existing2 = await base44.asServiceRole.entities.LeadFormSubmission.filter({ email });
    if (existing2 && existing2.length > 0) {
      console.log(`[webhookTransacaoPaga] Lead já registrado: ${email}`);
      return Response.json({ received: true, message: 'Lead já registrado.', email }, { status: 200 });
    }

    // Salvar como lead pendente de ativação
    await base44.asServiceRole.entities.LeadFormSubmission.create({
      perfil: 'produtor',
      nome: fullName || email,
      email,
      telefone: '',
      submitted_at: new Date().toISOString(),
      parceiro: 'nexano_webhook',
    });

    console.log(`[webhookTransacaoPaga] Lead salvo para: ${email}`);

    return Response.json({ received: true, message: 'Lead registrado com sucesso. Acesse o dashboard para convidar o usuário.', email }, { status: 201 });
  } catch (error) {
    console.error('[webhookTransacaoPaga] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});