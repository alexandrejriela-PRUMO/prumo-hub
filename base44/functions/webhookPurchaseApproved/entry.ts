import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Helper: hash simples com SHA-256 via Web Crypto API
async function hashPassword(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Remove pontuação do CPF/CNPJ: 000.000.000-00 → 00000000000
function cleanDocument(doc = '') {
  return doc.replace(/\D/g, '');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Log completo do payload para análise do formato
  console.log('[webhookPurchaseApproved] RAW PAYLOAD:', JSON.stringify(body, null, 2));
  console.log('[webhookPurchaseApproved] HEADERS:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

  // ── FASE 1: endpoint aberto para receber evento de teste e analisar payload ──
  // Após análise, o token e o mapeamento serão ajustados aqui.

  // Tentar extrair dados do comprador de campos comuns em plataformas de pagamento
  // Após receber o evento de teste, esses caminhos serão ajustados
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

  const role = 'user'; // usuário padrão; pode ser ajustado conforme tipo de produto
  const userType = 'produtor'; // padrão; ajustar após análise do payload

  // Se não tiver email, logar e retornar 200 (idempotência — pode ser evento de outro tipo)
  if (!email) {
    console.warn('[webhookPurchaseApproved] Email não encontrado no payload. Nenhum usuário criado.');
    return Response.json({
      received: true,
      message: 'Payload recebido, mas email não encontrado. Aguardando análise do formato.',
      payload_keys: Object.keys(body),
    }, { status: 200 });
  }

  const cleanDoc = cleanDocument(document || '');
  const tempPassword = cleanDoc || 'prumo2024'; // fallback se doc não vier
  const hashedPassword = await hashPassword(tempPassword);

  try {
    const base44 = createClientFromRequest(req);

    // Verificar idempotência: usuário já existe?
    const existing = await base44.asServiceRole.entities.User.filter({ email });
    if (existing && existing.length > 0) {
      console.log(`[webhookPurchaseApproved] Usuário já existe: ${email}`);
      return Response.json({ received: true, message: 'Usuário já cadastrado.', email }, { status: 200 });
    }

    // Convidar/criar usuário na plataforma
    await base44.users.inviteUser(email, role);
    console.log(`[webhookPurchaseApproved] Usuário convidado: ${email}`);

    // Salvar dados extras no usuário (nome, documento, senha hasheada, flag de senha temporária)
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users && users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        full_name: fullName || email,
        user_type: userType,
        document: cleanDoc,
        hashed_temp_password: hashedPassword,
        must_change_password: true,
        webhook_source: 'purchase_approved',
        created_via_webhook: true,
      });
      console.log(`[webhookPurchaseApproved] Dados do usuário atualizados: ${email}`);
    }

    return Response.json({
      received: true,
      message: 'Usuário criado com sucesso.',
      email,
    }, { status: 201 });

  } catch (error) {
    console.error('[webhookPurchaseApproved] Erro ao criar usuário:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});