import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = Deno.env.get('ASAAS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'ASAAS_API_KEY não configurada' }, { status: 500 });
    }

    const body = await req.json();
    const {
      name, email, cpfCnpj, birthDate, companyType,
      phone, mobilePhone, postalCode, address, addressNumber,
      complement, province, income
    } = body || {};

    if (!name || !email || !cpfCnpj) {
      return Response.json({ error: 'Campos obrigatórios: name, email, cpfCnpj' }, { status: 400 });
    }

    // Verificar se já existe subconta
    const metas = await base44.entities.UserMetadata.filter({ user_email: email });
    if (metas?.length > 0 && metas[0].asaas_subaccount_id) {
      return Response.json({
        already_exists: true,
        subaccount_id: metas[0].asaas_subaccount_id,
        wallet_id: metas[0].asaas_wallet_id,
      });
    }

    const subaccountPayload = {
      name,
      email,
      cpfCnpj,
      birthDate: birthDate || undefined,
      companyType: companyType || (cpfCnpj.length > 11 ? 'LIMITED' : undefined),
      phone: phone || undefined,
      mobilePhone: mobilePhone || undefined,
      postalCode: postalCode || undefined,
      address: address || undefined,
      addressNumber: addressNumber || undefined,
      complement: complement || undefined,
      province: province || undefined,
      incomeValue: income || 5000,
      webhooks: [
        {
          name: 'PRUMO Hub - Cobranças',
          url: 'https://hub.prumo.site/api/functions/webhookAsaas',
          email,
          sendType: 'SEQUENTIALLY',
          interrupted: false,
          enabled: true,
          apiVersion: 3,
          authToken: Deno.env.get('ASAAS_WEBHOOK_TOKEN') || '',
          events: [
            'PAYMENT_CREATED',
            'PAYMENT_UPDATED',
            'PAYMENT_CONFIRMED',
            'PAYMENT_RECEIVED',
            'PAYMENT_OVERDUE',
            'PAYMENT_DELETED',
            'PAYMENT_SPLIT_DIVERGENCE_BLOCK',
          ],
        },
      ],
    };

    console.log('[createAsaasSubaccount] Criando subconta para:', email, JSON.stringify(subaccountPayload));

    const response = await fetch('https://api-sandbox.asaas.com/v3/accounts', {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'User-Agent': 'PRUMOHub/1.0.0',
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(subaccountPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[createAsaasSubaccount] Erro Asaas:', JSON.stringify(data));
      const errorMsg = data.errors
        ? data.errors.map(e => e.description || e.message).join('; ')
        : data.message || 'Erro ao criar subconta';
      return Response.json({ error: errorMsg }, { status: 400 });
    }

    const subaccountId = data.id;
    const walletId = data.walletId;
    const subaccountApiKey = data.apiKey;

    console.log(`[createAsaasSubaccount] Subconta criada: ${subaccountId}, wallet: ${walletId}`);

    // Salvar no UserMetadata
    if (metas?.length > 0) {
      await base44.entities.UserMetadata.update(metas[0].id, {
        asaas_subaccount_id: subaccountId,
        asaas_wallet_id: walletId,
        asaas_subaccount_api_key: subaccountApiKey,
      });
    } else {
      await base44.entities.UserMetadata.create({
        user_email: email,
        user_id: user.id,
        asaas_subaccount_id: subaccountId,
        asaas_wallet_id: walletId,
        asaas_subaccount_api_key: subaccountApiKey,
      });
    }

    return Response.json({
      success: true,
      subaccount_id: subaccountId,
      wallet_id: walletId,
      api_key: subaccountApiKey,
    }, { status: 201 });
  } catch (error) {
    console.error('[createAsaasSubaccount] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});