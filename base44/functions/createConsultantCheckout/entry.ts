import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PRUMO_FEES: Record<string, { type: 'fixed' | 'percent'; value: number }> = {
  PIX:         { type: 'fixed',   value: 2.90 },
  BOLETO:      { type: 'fixed',   value: 3.90 },
  CREDIT_CARD: { type: 'percent', value: 5 },
};

const BILLING_TYPE_MAP: Record<string, string> = {
  pix:    'PIX',
  boleto: 'BOLETO',
  cartao: 'CREDIT_CARD',
};

function buildSplitEntry(walletId: string, asaasBillingType: string, chargeValue: number) {
  const rule = PRUMO_FEES[asaasBillingType];
  if (!rule) return { split: [], estimatedFee: 0 };
  if (rule.type === 'fixed') {
    return {
      split: [{ walletId, fixedValue: rule.value }],
      estimatedFee: rule.value,
    };
  }
  return {
    split: [{ walletId, percentualValue: rule.value }],
    estimatedFee: chargeValue * (rule.value / 100),
  };
}

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

    const asaasBillingType = BILLING_TYPE_MAP[billingType];
    if (!asaasBillingType) {
      return Response.json({ error: 'Forma de pagamento inválida. Escolha PIX, Boleto ou Cartão.' }, { status: 400 });
    }

    // Buscar subconta do consultor
    const metas = await base44.entities.UserMetadata.filter({ user_email: user.email });
    if (!metas?.length || !metas[0].asaas_subaccount_id) {
      return Response.json({ error: 'Subconta Asaas não encontrada. Configure sua conta primeiro.' }, { status: 400 });
    }

    const subaccount = metas[0];
    const subaccountApiKey = subaccount.asaas_subaccount_api_key || masterApiKey;

    const prumoWalletIdActual = '1475d263-44f4-45f1-b0eb-384f8c2dd98d';

    const { split, estimatedFee: prumoFee } = buildSplitEntry(prumoWalletIdActual, asaasBillingType, value);

    const checkoutPayload: Record<string, unknown> = {
      billingType: asaasBillingType,
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

    if (split.length > 0 && prumoWalletIdActual !== subaccount.asaas_wallet_id) {
      checkoutPayload.split = split;
    }

    console.log('[createConsultantCheckout] Criando paymentLink na subconta:', subaccount.asaas_subaccount_id);
    console.log('[createConsultantCheckout] Payload:', JSON.stringify(checkoutPayload));

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
        ? data.errors.map((e: { description?: string; message?: string }) => e.description || e.message).join('; ')
        : data.message || 'Erro ao criar checkout';
      console.error('[createConsultantCheckout] Erro Asaas:', errorMsg);
      return Response.json({ error: errorMsg }, { status: 400 });
    }

    const checkoutUrl = data.url || `https://sandbox.asaas.com/c/${data.id}`;
    console.log(`[createConsultantCheckout] PaymentLink criado: ${data.id} → ${checkoutUrl}`);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);
    try {
      await base44.entities.ConsultorCharge.create({
        consultor_email: user.email,
        client_email: clientEmail || '',
        client_name: clientName,
        description,
        amount: value,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'Pendente',
        stripe_payment_intent_id: data.id,
        stripe_payment_url: checkoutUrl,
        notes: `Asaas PaymentLink: ${data.id}`,
      });
      console.log('[createConsultantCheckout] ConsultorCharge salvo');
    } catch (chargeErr) {
      console.warn('[createConsultantCheckout] Erro ao salvar ConsultorCharge:', (chargeErr as Error).message);
    }

    return Response.json({
      success: true,
      checkoutUrl,
      id: data.id,
      split_configured: split.length > 0,
      prumo_fee: prumoFee,
    });
  } catch (error) {
    console.error('[createConsultantCheckout] Erro:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
