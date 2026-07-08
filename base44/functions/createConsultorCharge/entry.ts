import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PRUMO_FEES: Record<string, { type: 'fixed' | 'percent'; value: number }> = {
  PIX:         { type: 'fixed',   value: 2.90 },
  BOLETO:      { type: 'fixed',   value: 3.90 },
  CREDIT_CARD: { type: 'percent', value: 5 },
};

const BILLING_TYPE_MAP: Record<string, string> = {
  boleto: 'BOLETO',
  pix:    'PIX',
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

function diffDaysFromToday(dueDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + 'T00:00:00');
  const diffMs = due.getTime() - today.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(days, 1);
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
    const { client_email, client_name, property_id, description, amount, due_date, payment_method, notes } = body || {};

    if (!description || !amount || !due_date) {
      return Response.json({ error: 'Campos obrigatórios: description, amount, due_date' }, { status: 400 });
    }

    const asaasBillingType = BILLING_TYPE_MAP[payment_method];
    if (!asaasBillingType) {
      return Response.json({ error: 'Forma de pagamento inválida. Escolha PIX, Boleto ou Cartão.' }, { status: 400 });
    }

    // Determinar o email efetivo do consultor (resolve membro de equipe → consultor principal)
    let consultorEmail = user.email;

    if (user.role !== 'admin') {
      const memberships = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email,
        status: 'Ativo',
      });
      if (memberships.length > 0) {
        consultorEmail = memberships[0].primary_user_email;
      }
    }

    // Buscar subconta do consultor efetivo (não do membro da equipe)
    const metas = await base44.asServiceRole.entities.UserMetadata.filter({ user_email: consultorEmail });
    if (!metas?.length || !metas[0].asaas_subaccount_id) {
      return Response.json({ error: 'Subconta Asaas não encontrada. Configure sua conta primeiro.' }, { status: 400 });
    }

    const subaccount = metas[0];
    const subaccountApiKey = subaccount.asaas_subaccount_api_key || masterApiKey;

    const prumoWalletIdActual = '1475d263-44f4-45f1-b0eb-384f8c2dd98d';

    const { split, estimatedFee: prumoFee } = buildSplitEntry(prumoWalletIdActual, asaasBillingType, amount);
    const dueDateLimitDays = diffDaysFromToday(due_date);

    const checkoutPayload: Record<string, unknown> = {
      billingType: asaasBillingType,
      chargeType: 'DETACHED',
      name: description,
      description: `Serviço prestado por: ${user.full_name || user.email}`,
      value: amount,
      dueDateLimitDays,
      externalReference: `consultor_${user.email}_${Date.now()}`,
      notification: {
        email: client_email || user.email,
      },
    };

    if (split.length > 0 && prumoWalletIdActual !== subaccount.asaas_wallet_id) {
      checkoutPayload.split = split;
    }

    console.log('[createConsultorCharge] Criando paymentLink na subconta:', subaccount.asaas_subaccount_id);
    console.log('[createConsultorCharge] Payload:', JSON.stringify(checkoutPayload));

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
    console.log('[createConsultorCharge] Resposta Asaas:', response.status, JSON.stringify(data).substring(0, 500));

    if (!response.ok) {
      const errorMsg = data.errors
        ? data.errors.map((e: { description?: string; message?: string }) => e.description || e.message).join('; ')
        : data.message || 'Erro ao criar cobrança';
      console.error('[createConsultorCharge] Erro Asaas:', errorMsg);
      return Response.json({ error: errorMsg }, { status: 400 });
    }

    const checkoutUrl = data.url || `https://sandbox.asaas.com/c/${data.id}`;
    console.log(`[createConsultorCharge] PaymentLink criado: ${data.id} → ${checkoutUrl}`);

    try {
      await base44.asServiceRole.entities.ConsultorCharge.create({
        consultor_email: consultorEmail,
        client_email: client_email || '',
        client_name: client_name || '',
        property_id: property_id || null,
        description,
        amount,
        due_date,
        status: 'Pendente',
        payment_method: payment_method || null,
        stripe_payment_intent_id: data.id,
        stripe_payment_url: checkoutUrl,
        notes: notes || `Asaas PaymentLink: ${data.id}`,
      });
      console.log('[createConsultorCharge] ConsultorCharge salvo');
    } catch (chargeErr) {
      console.warn('[createConsultorCharge] Erro ao salvar ConsultorCharge:', (chargeErr as Error).message);
    }

    return Response.json({
      success: true,
      checkoutUrl,
      id: data.id,
      split_configured: split.length > 0,
      prumo_fee: prumoFee,
    });
  } catch (error) {
    console.error('[createConsultorCharge] Erro:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});