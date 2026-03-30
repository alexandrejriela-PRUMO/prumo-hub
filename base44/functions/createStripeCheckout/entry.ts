import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Configuração central dos planos — preços em centavos (BRL)
const PLANS = {
  // Produtor Rural
  produtor_monthly: { name: 'PRUMO Hub - Produtor Rural (Mensal)', amount: 49700, interval: 'month', user_type: 'produtor', plan_id: 'produtor', billing: 'monthly' },
  produtor_annual:  { name: 'PRUMO Hub - Produtor Rural (Anual)',   amount: 447300, interval: 'year',  user_type: 'produtor', plan_id: 'produtor', billing: 'annual' },

  // Consultor Start
  start_monthly: { name: 'PRUMO Hub - Consultor Start (Mensal)', amount: 12900, interval: 'month', user_type: 'consultor', plan_id: 'start', billing: 'monthly' },
  start_annual:  { name: 'PRUMO Hub - Consultor Start (Anual)',   amount: 129000, interval: 'year',  user_type: 'consultor', plan_id: 'start', billing: 'annual' },

  // Consultor Pro
  pro_monthly: { name: 'PRUMO Hub - Consultor Pro (Mensal)', amount: 24900, interval: 'month', user_type: 'consultor', plan_id: 'pro', billing: 'monthly' },
  pro_annual:  { name: 'PRUMO Hub - Consultor Pro (Anual)',   amount: 249000, interval: 'year',  user_type: 'consultor', plan_id: 'pro', billing: 'annual' },

  // Consultor Enterprise
  enterprise_monthly: { name: 'PRUMO Hub - Consultor Enterprise (Mensal)', amount: 49700, interval: 'month', user_type: 'consultor', plan_id: 'enterprise', billing: 'monthly' },
  enterprise_annual:  { name: 'PRUMO Hub - Consultor Enterprise (Anual)',   amount: 497000, interval: 'year',  user_type: 'consultor', plan_id: 'enterprise', billing: 'annual' },
};

async function getOrCreatePrice(plan) {
  // Busca produto pelo nome exato
  const products = await stripe.products.list({ limit: 100 });
  let product = products.data.find(p => p.name === plan.name && p.active);

  if (!product) {
    product = await stripe.products.create({
      name: plan.name,
      metadata: { plan_id: plan.plan_id, billing: plan.billing, user_type: plan.user_type },
    });
  }

  // Busca preço ativo existente com mesmo valor e intervalo
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
  const existingPrice = prices.data.find(
    p => p.unit_amount === plan.amount && p.recurring?.interval === plan.interval
  );

  if (existingPrice) return existingPrice;

  return await stripe.prices.create({
    product: product.id,
    unit_amount: plan.amount,
    currency: 'brl',
    recurring: { interval: plan.interval },
    metadata: { plan_id: plan.plan_id, billing: plan.billing, user_type: plan.user_type },
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, billing } = await req.json();

    // Monta a chave do plano: ex "start_monthly", "enterprise_annual", "produtor_monthly"
    const billingKey = billing === 'annual' ? 'annual' : 'monthly';
    const planKey = `${plan || 'produtor'}_${billingKey}`;
    const planConfig = PLANS[planKey];

    if (!planConfig) {
      return Response.json({ error: `Plano inválido: ${planKey}` }, { status: 400 });
    }

    const price = await getOrCreatePrice(planConfig);

    // Busca ou cria customer no Stripe para evitar duplicatas
    const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    }

    const origin = req.headers.get('origin') || 'https://app.prumo.com.br';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      ...(customerId ? { customer: customerId } : { customer_email: user.email }),
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${origin}/Invoices?success=true`,
      cancel_url: `${origin}/Invoices?canceled=true`,
      metadata: {
        user_email: user.email,
        plan_id: planConfig.plan_id,
        billing: billingKey,
        user_type: planConfig.user_type,
      },
      subscription_data: {
        metadata: {
          user_email: user.email,
          plan_id: planConfig.plan_id,
          billing: billingKey,
          user_type: planConfig.user_type,
        },
      },
    });

    console.log(`[Checkout] ${user.email} → ${planKey} → session ${session.id}`);
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('[Checkout] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});