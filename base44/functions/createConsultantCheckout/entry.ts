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
    const prumoWalletId = subaccount.asaas_wallet_id ? null : null; // Precisamos do walletId do PRUMO

    // Buscar walletId do PRUMO (master account)
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

    const checkoutPayload = {
      billingTypes: billingType && billingType !== 'UNDEFINED' ? [billingType] : ['BOLETO', 'PIX', 'CREDIT_CARD'],
      chargeTypes: ['DETACHED'],
      externalReference: `consultant_${user.email}_${Date.now()}`,
      customerData: {
        name: clientName,
        email: clientEmail || undefined,
        cpfCnpj: clientCpfCnpj || undefined,
      },
      callback: {
        successUrl: `https://hub.prumo.site/CompraConfirmada?consultant=${user.email}`,
        cancelUrl: 'https://hub.prumo.site/',
        expiredUrl: 'https://hub.prumo.site/',
      },
      items: [{
        name: description,
        description: `Serviço prestado por: ${user.full_name || user.email}`,
        value,
        quantity: 1,
      }],
    };

    // Adicionar split se tivermos o walletId do PRUMO
    if (prumoWalletIdActual && prumoWalletIdActual !== subaccount.asaas_wallet_id) {
      checkoutPayload.split = [{
        walletId: prumoWalletIdActual,
        percentualValue: PRUMO_COMMISSION_PERCENT,
      }];
    }

    console.log('[createConsultantCheckout] Criando checkout na subconta:', subaccount.asaas_subaccount_id);

    // Usar a API key da subconta para criar o checkout
    const apiKeyToUse = subaccountApiKey;

    const response = await fetch('https://api-sandbox.asaas.com/v3/checkouts', {
      method: 'POST',
      headers: {
        'access_token': apiKeyToUse,
        'User-Agent': 'PRUMOHub/1.0.0',
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(checkoutPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[createConsultantCheckout] Erro Asaas:', JSON.stringify(data));
      const errorMsg = data.errors
        ? data.errors.map(e => e.description || e.message).join('; ')
        : data.message || 'Erro ao criar checkout';
      return Response.json({ error: errorMsg }, { status: 400 });
    }

    const checkoutUrl = `https://sandbox.asaas.com/checkoutSession/show?id=${data.id}`;
    console.log(`[createConsultantCheckout] Checkout criado: ${data.id} → ${checkoutUrl}`);

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