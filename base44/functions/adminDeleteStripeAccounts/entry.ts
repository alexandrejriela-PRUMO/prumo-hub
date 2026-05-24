import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Buscar todas as contas Stripe (is_stripe = true)
    const stripeAccounts = await base44.asServiceRole.entities.FinancialAccount.filter({ is_stripe: true }, 'name', 1000);

    let deleted = 0;
    for (const acc of stripeAccounts) {
      await base44.asServiceRole.entities.FinancialAccount.delete(acc.id);
      deleted++;
    }

    return Response.json({ success: true, deleted, message: `${deleted} contas Stripe removidas.` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});