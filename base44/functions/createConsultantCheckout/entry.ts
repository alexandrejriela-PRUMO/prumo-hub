import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PRUMO_COMMISSION_PERCENT = 10; // 10% de comissão do PRUMO

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const masterApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!masterApiKey) {
      return Response.json({ error: 'ASAAS_API_KEY não configurada' }, { status: 500 });
    }

    const body = await req.json();
    const { clientName, clientEmail, clientCpfCnpj, description, value, billingType } = body || {};

    if (!clientName || !description || !value) {
      return Response.json({ error: 'Campos obrigatórios: clientName, description, value' }, { status: 400 });
    }

    // Buscar subconta do consultor
    const metas = await base44.entities.UserMetadata.filter({ user_email: user.email });
    if (!metas?.length || !metas[0].asaas_subaccount_id) {
      return Response.json({ error: 'Subconta Asaas não encontrada. Configure sua conta primeiro.' }, { status: 400 });
    }

    const subaccount = metas[0];
    const subaccountApiKey = subaccount.asaas_subaccount_api_key || masterApiKey;

    // Buscar walletId do PRUMO (master account) para split
    let prumoWalletIdActual = null;
    try {
      const walletRes = await fetch('https://api-sandbox.asaas.com/v3/wallet', {
        headers: { 'access_token': masterApiKey, 'User-Agent': 'PRUMOHub/1.0.0' },
      });
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        prumoWalletIdActual = walletData.id;
      }
    } catch (e) {
      console.warn('[createConsultantCheckout] Não foi possível obter walletId do PRUMO:', e.message);
    }

    // API Asaas v3: billingType (singular, string), chargeType (singular)
    const checkoutPayload = {
      billingType: (billingType && billingType !== 'UNDEFINED' && billingType !== '') ? billingType : 'UNDEFINED',
      chargeType: 'DETACHED',
      name: description,
      description: `Serviço prestado por: ${user.full_name || user.email}`,
      value,
      dueDateLimitDays: 5,
      externalReference: `consultant_${user.email}_${Date.now()}`,
      notification: {
        email: clientEmail || user.email,
      },
    };

    // Adicionar split se tivermos o walletId do PRUMO
    if (prumoWalletIdActual && prumoWalletIdActual !== subaccount.asaas_wallet_id) {
      checkoutPayload.split = [{
        walletId: prumoWalletIdActual,
        percentualValue: PRUMO_COMMISSION_PERCENT,
      }];
    }

    console.log('[createConsultantCheckout] Criando paymentLink na subconta:', subaccount.asaas_subaccount_id);
    console.log('[createConsultantCheckout] Payload:', JSON.stringify(checkoutPayload));

    // Usar a chave da subconta para criar o link de pagamento
    const response = await fetch('https://api-sandbox.asaas.com/v3/paymentLinks', {
      method: 'POST',
      headers: {
        'access_token': subaccountApiKey,
        'User-Agent': 'PRUMOHub/1.0.0',
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(checkoutPayload),
    });

    const data = await response.json();
    console.log('[createConsultantCheckout] Resposta Asaas:', response.status, JSON.stringify(data).substring(0, 500));

    if (!response.ok) {
      const errorMsg = data.errors
        ? data.errors.map(e => e.description || e.message).join('; ')
        : data.message || 'Erro ao criar checkout';
      console.error('[createConsultantCheckout] Erro Asaas:', errorMsg);
      return Response.json({ error: errorMsg }, { status: 400 });
    }

    // Montar URL do checkout
    const checkoutUrl = data.url || `https://sandbox.asaas.com/c/${data.id}`;
    console.log(`[createConsultantCheckout] PaymentLink criado: ${data.id} → ${checkoutUrl}`);

    return Response.json({
      success: true,
      checkoutUrl,
      id: data.id,
      split_configured: !!prumoWalletIdActual,
      commission_percent: prumoWalletIdActual ? PRUMO_COMMISSION_PERCENT : 0,
    });
  } catch (error) {
    console.error('[createConsultantCheckout] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});