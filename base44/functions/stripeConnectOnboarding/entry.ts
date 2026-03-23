import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action } = await req.json();

    if (action === 'get_status') {
      if (user.stripe_account_id) {
        const account = await stripe.accounts.retrieve(user.stripe_account_id);
        return Response.json({
          connected: true,
          account_id: user.stripe_account_id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        });
      }
      return Response.json({ connected: false });
    }

    if (action === 'create_onboarding_link') {
      let accountId = user.stripe_account_id;

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'BR',
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
        accountId = account.id;
        await base44.auth.updateMe({ stripe_account_id: accountId, stripe_account_status: 'pending' });
      }

      const origin = req.headers.get('origin') || 'https://app.base44.com';
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/PaymentSettings?refresh=true`,
        return_url: `${origin}/PaymentSettings?success=true`,
        type: 'account_onboarding',
      });

      return Response.json({ url: accountLink.url });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});