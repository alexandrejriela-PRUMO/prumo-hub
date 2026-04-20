import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const PLAN_LABELS = {
  produtor: 'Produtor Rural',
  start: 'Consultor Start',
  pro: 'Consultor Pro',
  enterprise: 'Consultor Enterprise',
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log('[Webhook] Event:', event.type);

    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        const userEmail = session.metadata?.user_email;
        const planId = session.metadata?.plan_id || 'produtor';
        const userType = session.metadata?.user_type || 'produtor';
        const billing = session.metadata?.billing || 'monthly';
        const amountPaid = session.amount_total ? session.amount_total / 100 : 0;
        const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const planLabel = PLAN_LABELS[planId] || planId;

        if (!userEmail) break;

        // Atualiza o user_type na plataforma
        const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            user_type: userType,
            plano: planId,
            subscription_plan: planId,
            subscription_billing: billing,
            subscription_status: 'active',
            subscription_since: new Date().toISOString(),
            checkout_completed_at: new Date().toISOString(),
            stripe_customer_id: session.customer || null,
            stripe_subscription_id: session.subscription || null,
            last_payment_amount: amountPaid,
            last_payment_date: new Date().toISOString().split('T')[0],
          });
        }

        // Cria invoice na plataforma
        const newInvoice = await base44.asServiceRole.entities.Invoice.create({
          client_email: userEmail,
          description: `Assinatura PRUMO Hub - ${planLabel} - ${monthLabel}`,
          amount: amountPaid,
          due_date: new Date().toISOString().split('T')[0],
          status: 'Pago',
          payment_date: new Date().toISOString().split('T')[0],
          stripe_invoice_id: session.id,
          plan_type: userType,
          nfe_status: 'Não emitida',
        });

        // Emite NF-e
        try {
          await base44.asServiceRole.functions.invoke('emitirNFePlataforma', { invoice_id: newInvoice.id });
        } catch (nfeErr) {
          console.warn('[Webhook] NF-e não emitida:', nfeErr.message);
        }

        // Notificação in-app
        await base44.asServiceRole.entities.InAppNotification.create({
          user_email: userEmail,
          title: '✅ Assinatura ativada!',
          message: `Seu plano ${planLabel} foi ativado com sucesso. Bem-vindo ao PRUMO Hub!`,
          event_type: 'outro',
          severity: 'info',
          read: false,
        });

        console.log(`[Webhook] Checkout completed: ${userEmail} → ${planId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const stripeInvoice = event.data.object;
        // Evita duplicidade com checkout.session.completed (primeira cobrança)
        if (stripeInvoice.billing_reason === 'subscription_create') break;
        if (!stripeInvoice.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(stripeInvoice.subscription);
        const userEmail = subscription.metadata?.user_email;
        const planId = subscription.metadata?.plan_id || 'produtor';
        const userType = subscription.metadata?.user_type || 'produtor';
        if (!userEmail) break;

        const amountPaid = stripeInvoice.amount_paid ? stripeInvoice.amount_paid / 100 : 0;
        const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const planLabel = PLAN_LABELS[planId] || planId;

        // Garante que subscription_status continua ativo
        const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            subscription_status: 'active',
            last_payment_amount: amountPaid,
            last_payment_date: new Date().toISOString().split('T')[0],
          });
        }

        const renewalInvoice = await base44.asServiceRole.entities.Invoice.create({
          client_email: userEmail,
          description: `Renovação PRUMO Hub - ${planLabel} - ${monthLabel}`,
          amount: amountPaid,
          due_date: new Date().toISOString().split('T')[0],
          status: 'Pago',
          payment_date: new Date().toISOString().split('T')[0],
          stripe_invoice_id: stripeInvoice.id,
          stripe_subscription_id: stripeInvoice.subscription,
          plan_type: userType,
          nfe_status: 'Não emitida',
        });

        try {
          await base44.asServiceRole.functions.invoke('emitirNFePlataforma', { invoice_id: renewalInvoice.id });
        } catch (nfeErr) {
          console.warn('[Webhook] NF-e renovação não emitida:', nfeErr.message);
        }

        console.log(`[Webhook] Renewal: ${userEmail} → ${planId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const userEmail = subscription.metadata?.user_email;
        if (!userEmail) break;

        await base44.asServiceRole.entities.InAppNotification.create({
          user_email: userEmail,
          title: '⚠️ Falha no Pagamento',
          message: 'Não foi possível processar o pagamento da sua assinatura. Atualize sua forma de pagamento para manter o acesso.',
          event_type: 'fatura_vencendo',
          severity: 'error',
          read: false,
        });

        console.log(`[Webhook] Payment failed: ${userEmail}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userEmail = subscription.metadata?.user_email;
        if (!userEmail) break;

        const newStatus = subscription.status; // active, past_due, canceled, etc.
        const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            subscription_status: newStatus,
          });
        }

        console.log(`[Webhook] Subscription updated: ${userEmail} → ${newStatus}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userEmail = subscription.metadata?.user_email;
        if (!userEmail) break;

        const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            subscription_status: 'canceled',
          });
        }

        await base44.asServiceRole.entities.InAppNotification.create({
          user_email: userEmail,
          title: 'Assinatura Cancelada',
          message: 'Sua assinatura PRUMO Hub foi cancelada. Entre em contato com o suporte se tiver dúvidas.',
          event_type: 'outro',
          severity: 'warning',
          read: false,
        });

        console.log(`[Webhook] Subscription canceled: ${userEmail}`);
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});