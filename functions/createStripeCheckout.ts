import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId, planType } = await req.json();
    const resolvedPlanType = planType || user.user_type || 'produtor';

    // Planos por tipo de usuário
    const planConfig = {
      consultor: { name: 'PRUMO Hub - Plano Consultor', amount: 49700 },
      produtor: { name: 'PRUMO Hub - Plano Produtor Rural', amount: 49700 },
    };
    const plan = planConfig[resolvedPlanType] || planConfig.produtor;

    // Criar ou buscar o produto pelo nome do plano
    const allProducts = await stripe.products.list({ limit: 100 });
    let product = allProducts.data.find(p => p.name === plan.name && p.active);
    if (!product) {
      product = await stripe.products.create({
        name: plan.name,
        description: `Assinatura mensal - ${plan.name}`,
      });
    }

    // Criar ou buscar o preço ativo
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
    let price;
    if (prices.data.length > 0) {
      price = prices.data[0];
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.amount,
        currency: 'brl',
        recurring: { interval: 'month' },
      });
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/Invoices?success=true`,
      cancel_url: `${req.headers.get('origin')}/Invoices?canceled=true`,
      customer_email: user.email,
      metadata: {
        user_email: user.email,
        property_id: propertyId || 'default',
        plan_type: resolvedPlanType,
      },
      subscription_data: {
        metadata: {
          user_email: user.email,
          property_id: propertyId || 'default',
          plan_type: resolvedPlanType,
        },
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});