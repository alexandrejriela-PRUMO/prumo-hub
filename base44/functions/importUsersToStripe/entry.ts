import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Mesmos planos definidos no createStripeCheckout
const PLANS = {
  produtor:   { name: 'PRUMO Hub – Produtor Rural',     monthlyPrice: 49700, annualPrice: 447300 },
  start:      { name: 'PRUMO Hub – Consultor Start',    monthlyPrice: 12900, annualPrice: 129000 },
  pro:        { name: 'PRUMO Hub – Consultor Pro',      monthlyPrice: 24900, annualPrice: 249000 },
  enterprise: { name: 'PRUMO Hub – Consultor Enterprise', monthlyPrice: 49700, annualPrice: 497000 },
};

async function getOrCreatePrice(planId, billing) {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Plano desconhecido: ${planId}`);

  const interval = billing === 'annual' ? 'year' : 'month';
  const amount = billing === 'annual' ? plan.annualPrice : plan.monthlyPrice;

  // Busca produto existente
  const products = await stripe.products.list({ active: true, limit: 100 });
  let product = products.data.find(p => p.metadata?.plan_id === planId);

  if (!product) {
    product = await stripe.products.create({
      name: plan.name,
      metadata: { plan_id: planId },
    });
  }

  // Busca price existente
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  let price = prices.data.find(p => p.recurring?.interval === interval && p.unit_amount === amount);

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: 'brl',
      recurring: { interval },
    });
  }

  return price.id;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const body = await req.json();
    // Modo: preview (só lista) ou import (cria no Stripe)
    const { mode = 'preview', users: usersToImport } = body;

    // Busca todos os usuários do app
    const allUsers = await base44.asServiceRole.entities.User.list();

    // Filtra apenas quem tem plano ativo mas sem stripe_customer_id
    const candidates = allUsers.filter(u => {
      if (usersToImport && !usersToImport.includes(u.id)) return false;
      // Deve ter subscription_plan e não ter stripe_customer_id
      return u.subscription_plan && !u.stripe_customer_id;
    });

    if (mode === 'preview') {
      return Response.json({
        total: allUsers.length,
        candidates: candidates.map(u => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          subscription_plan: u.subscription_plan,
          subscription_status: u.subscription_status,
          user_type: u.user_type,
        })),
      });
    }

    // mode === 'import'
    const results = [];

    for (const u of candidates) {
      try {
        // 1. Cria ou recupera customer no Stripe
        const existingCustomers = await stripe.customers.list({ email: u.email, limit: 1 });
        let customer = existingCustomers.data[0];

        if (!customer) {
          customer = await stripe.customers.create({
            email: u.email,
            name: u.full_name || u.email,
            metadata: { base44_user_id: u.id, user_type: u.user_type || 'produtor' },
          });
        }

        // 2. Determina plano e billing
        const planId = u.subscription_plan || (u.user_type === 'consultor' ? 'start' : 'produtor');
        const billing = u.subscription_billing || 'monthly';
        const priceId = await getOrCreatePrice(planId, billing);

        // 3. Verifica se já tem assinatura ativa
        const existingSubs = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'active',
          limit: 1,
        });

        let subscription = existingSubs.data[0];
        let action = 'skipped_already_subscribed';

        if (!subscription) {
          // Cria assinatura com trial de 0 dias (já está pagando)
          subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent'],
            metadata: { imported: 'true', imported_at: new Date().toISOString() },
          });
          action = 'subscription_created';
        }

        // 4. Atualiza usuário no Base44 com IDs do Stripe
        await base44.asServiceRole.entities.User.update(u.id, {
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
        });

        results.push({
          user_id: u.id,
          email: u.email,
          customer_id: customer.id,
          subscription_id: subscription.id,
          action,
          status: 'success',
        });
      } catch (err) {
        results.push({
          user_id: u.id,
          email: u.email,
          status: 'error',
          error: err.message,
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return Response.json({
      imported: successCount,
      errors: errorCount,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});