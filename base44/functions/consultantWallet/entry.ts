import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body || {};

    // Busca a API key da subconta
    const metas = await base44.entities.UserMetadata.filter({ user_email: user.email });
    const meta = metas?.[0];
    if (!meta?.asaas_subaccount_id) {
      return Response.json({ error: 'Subconta Asaas não configurada. Ative o gateway primeiro.' }, { status: 400 });
    }
    const apiKey = meta.asaas_subaccount_api_key;
    if (!apiKey) {
      return Response.json({ error: 'API key da subconta não encontrada. Reative sua subconta.' }, { status: 400 });
    }

    const headers = {
      'access_token': apiKey,
      'User-Agent': 'PRUMOHub/1.0.0',
      'accept': 'application/json',
      'content-type': 'application/json',
    };

    const baseUrl = 'https://api-sandbox.asaas.com/v3';

    // ── Saldo ──────────────────────────────────────────
    if (action === 'balance') {
      const res = await fetch(`${baseUrl}/finance/balance`, { headers });
      const data = await res.json();
      if (!res.ok) {
        return Response.json({ error: data.errors?.[0]?.description || 'Erro ao consultar saldo' }, { status: res.status });
      }
      return Response.json({ balance: data.balance || 0 });
    }

    // ── Transferência PIX ──────────────────────────────
    if (action === 'transfer') {
      const { value, pixAddressKey, description } = body;
      if (!value || value <= 0) {
        return Response.json({ error: 'Informe um valor válido para transferência' }, { status: 400 });
      }
      if (!pixAddressKey) {
        return Response.json({ error: 'Informe a chave PIX de destino' }, { status: 400 });
      }

      // Verifica saldo antes
      const balanceRes = await fetch(`${baseUrl}/finance/balance`, { headers });
      const balanceData = await balanceRes.json();
      if (!balanceRes.ok || (balanceData.balance || 0) < value) {
        return Response.json({ error: 'Saldo insuficiente para esta transferência', balance: balanceData.balance || 0 }, { status: 400 });
      }

      const transferPayload = {
        value: Number(value),
        pixAddressKey,
        description: description || `Transferência PRUMO - ${user.email}`,
      };

      const res = await fetch(`${baseUrl}/transfers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(transferPayload),
      });
      const data = await res.json();

      if (!res.ok) {
        const errMsg = data.errors?.[0]?.description || data.message || 'Erro ao criar transferência';
        return Response.json({ error: errMsg }, { status: res.status });
      }

      return Response.json({
        success: true,
        transfer: {
          id: data.id,
          value: data.value,
          netValue: data.netValue,
          transferFee: data.transferFee,
          status: data.status,
          pixAddressKey: data.pixAddressKey,
          scheduleDate: data.scheduleDate,
          createdAt: data.dateCreated || data.createdAt,
        },
      });
    }

    // ── Extrato (transações financeiras) ───────────────
    if (action === 'statement') {
      const { offset = 0, limit = 20, startDate, endDate } = body;
      let url = `${baseUrl}/financialTransactions?offset=${offset}&limit=${limit}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url, { headers });
      const data = await res.json();

      if (!res.ok) {
        return Response.json({ error: data.errors?.[0]?.description || 'Erro ao consultar extrato' }, { status: res.status });
      }

      return Response.json({
        data: (data.data || []).map(tx => ({
          id: tx.id,
          type: tx.type,
          description: tx.description,
          value: tx.value,
          netValue: tx.netValue,
          feeValue: tx.feeValue,
          balanceBefore: tx.balanceBefore,
          balanceAfter: tx.balanceAfter,
          date: tx.date || tx.createdAt,
          status: tx.status,
        })),
        hasMore: data.hasMore || false,
        totalCount: data.totalCount || 0,
      });
    }

    return Response.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[consultantWallet] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});