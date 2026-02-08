import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId } = await req.json();

    // Criar ou buscar o produto
    const products = await stripe.products.list({ limit: 1 });
    let product;
    
    if (products.data.length > 0) {
      product = products.data[0];
    } else {
      product = await stripe.products.create({
        name: 'Plano Campo Nobre - PRUMO Hub',
        description: 'Assinatura mensal por propriedade',
      });
    }

    // Criar ou buscar o preço
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 1
    });
    
    let price;
    if (prices.data.length > 0) {
      price = prices.data[0];
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 49700, // R$ 497,00 em centavos
        currency: 'brl',
        recurring: {
          interval: 'month',
        },
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
      },
      subscription_data: {
        metadata: {
          user_email: user.email,
          property_id: propertyId || 'default',
        },
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});