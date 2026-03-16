import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { client_email, property_id, description, amount, due_date, payment_method, notes } = await req.json();

    if (!user.stripe_account_id) {
      return Response.json({ error: 'Conecte sua conta Stripe antes de criar cobranças.' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const methodMap = {
      boleto: ['boleto'],
      pix: ['pix'],
      cartao: ['card'],
    };

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: methodMap[payment_method] || ['boleto'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: { name: description },
              unit_amount: Math.round(parseFloat(amount) * 100),
            },
            quantity: 1,
          },
        ],
        customer_email: client_email,
        success_url: `${origin}/ConsultorClients?payment=success`,
        cancel_url: `${origin}/ConsultorClients`,
        metadata: {
          consultor_email: user.email,
          client_email,
          property_id: property_id || '',
        },
      },
      { stripeAccount: user.stripe_account_id }
    );

    const charge = await base44.entities.ConsultorCharge.create({
      consultor_email: user.email,
      client_email,
      property_id: property_id || '',
      description,
      amount: parseFloat(amount),
      due_date,
      status: 'Pendente',
      payment_method: payment_method || 'boleto',
      stripe_payment_intent_id: session.payment_intent || session.id,
      stripe_payment_url: session.url,
      notes: notes || '',
      nfe_status: 'Não emitida',
    });

    return Response.json({ charge, payment_url: session.url });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});