import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const apiKey = Deno.env.get('ASAAS_API_KEY');
    const body = await req.json().catch(() => ({}));
    const email = body.email || 'santarute.atendimento@gmail.com';

    const results = {};

    // 1. List all accounts
    const listRes = await fetch('https://api-sandbox.asaas.com/v3/accounts?limit=100', {
      headers: { 'access_token': apiKey, 'User-Agent': 'PRUMOHub/1.0.0', 'accept': 'application/json' }
    });
    const listData = await listRes.json();
    results.listAccounts = {
      status: listRes.status,
      totalCount: listData.totalCount,
      hasData: !!listData.data,
      count: listData.data?.length || 0,
      items: listData.data?.map(a => ({ id: a.id, email: a.email, name: a.name, cpfCnpj: a.cpfCnpj?.substring(0,8)+'...' })) || [],
    };

    // 2. Search by email
    const emailRes = await fetch(`https://api-sandbox.asaas.com/v3/accounts?email=${encodeURIComponent(email)}`, {
      headers: { 'access_token': apiKey, 'User-Agent': 'PRUMOHub/1.0.0', 'accept': 'application/json' }
    });
    const emailData = await emailRes.json();
    results.searchByEmail = {
      status: emailRes.status,
      totalCount: emailData.totalCount,
      count: emailData.data?.length || 0,
    };

    // 3. Search customers
    const custRes = await fetch(`https://api-sandbox.asaas.com/v3/customers?email=${encodeURIComponent(email)}`, {
      headers: { 'access_token': apiKey, 'User-Agent': 'PRUMOHub/1.0.0', 'accept': 'application/json' }
    });
    const custData = await custRes.json();
    results.customers = {
      status: custRes.status,
      totalCount: custData.totalCount,
      count: custData.data?.length || 0,
      items: custData.data?.map(c => ({ id: c.id, email: c.email, name: c.name })) || [],
    };

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});