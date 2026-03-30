import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      return Response.json({ error: 'Nenhuma assinatura encontrada para este e-mail.' }, { status: 404 });
    }

    const origin = req.headers.get('origin') || 'https://app.prumo.com.br';

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/Invoices`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('[Portal] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});