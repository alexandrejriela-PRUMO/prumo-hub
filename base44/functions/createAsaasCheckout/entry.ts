import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PLAN_CONFIG = {
  produtor_unico: {
    name: 'PRUMO Hub - Produtor Rural',
    description: 'Plano Unico Completo: gestao ambiental completa da propriedade rural.',
    value: 697,
    externalRef: 'produtor_unico',
  },
  consultor_enterprise: {
    name: 'PRUMO Hub - Consultor',
    description: 'Plano Enterprise: CRM, contratos, financeiro e gestao de clientes.',
    value: 497,
    externalRef: 'consultor_enterprise',
  },
};

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { plan_type, email, name, cpfCnpj, phone } = body || {};

    const plan = PLAN_CONFIG[plan_type];
    if (!plan) {
      return Response.json({ error: 'Tipo de plano inválido. Use produtor_unico ou consultor_enterprise.' }, { status: 400 });
    }

    const apiKey = Deno.env.get('ASAAS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'ASAAS_API_KEY não configurada' }, { status: 500 });
    }

    const externalReference = `${plan.externalRef}_${Date.now()}`;

    const checkoutPayload = {
      billingTypes: ['CREDIT_CARD'],
      chargeType: 'RECURRENT',
      externalReference,
      callback: {
        successUrl: `https://hub.prumo.site/CompraConfirmada?offer=${plan.externalRef}&external_ref=${externalReference}`,
        cancelUrl: 'https://hub.prumo.site/',
        expiredUrl: 'https://hub.prumo.site/',
      },
      items: [{
        name: plan.name,
        description: plan.description,
        value: plan.value,
        quantity: 1,
      }],
      subscription: {
        cycle: 'MONTHLY',
        nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    };

    // Não enviamos customerData — o próprio checkout do Asaas coleta
    // nome, email, CPF/CNPJ, telefone e endereço do cliente.

    const response = await fetch('https://api-sandbox.asaas.com/v3/checkouts', {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'User-Agent': 'PRUMOHub/1.0.0',
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(checkoutPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[createAsaasCheckout] Asaas error:', JSON.stringify(data));
      const errorMsg = data.errors
        ? data.errors.map(e => e.description || e.message).join('; ')
        : data.message || 'Erro ao criar checkout';
      return Response.json({ error: errorMsg }, { status: 400 });
    }

    const checkoutUrl = `https://sandbox.asaas.com/checkoutSession/show?id=${data.id}`;
    console.log(`[createAsaasCheckout] Checkout criado: ${data.id} → ${checkoutUrl}`);
    return Response.json({ checkoutUrl, id: data.id, externalReference });
  } catch (error) {
    console.error('[createAsaasCheckout] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});