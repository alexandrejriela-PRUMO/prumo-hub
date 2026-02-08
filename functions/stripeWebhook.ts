import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    console.log('Webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userEmail = session.metadata.user_email;
        const propertyId = session.metadata.property_id;

        // Criar fatura paga
        await base44.asServiceRole.entities.Invoice.create({
          client_email: userEmail,
          description: `Assinatura Plano Campo Nobre - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
          amount: 497.00,
          due_date: new Date().toISOString().split('T')[0],
          status: 'Pago',
          payment_date: new Date().toISOString().split('T')[0],
        });

        console.log('Invoice created for:', userEmail);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const userEmail = subscription.metadata.user_email;

        // Criar fatura paga para renovação
        await base44.asServiceRole.entities.Invoice.create({
          client_email: userEmail,
          description: `Assinatura Plano Campo Nobre - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
          amount: 497.00,
          due_date: new Date().toISOString().split('T')[0],
          status: 'Pago',
          payment_date: new Date().toISOString().split('T')[0],
        });

        console.log('Renewal invoice created for:', userEmail);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const userEmail = subscription.metadata.user_email;

        // Criar notificação de falha
        await base44.asServiceRole.entities.InAppNotification.create({
          user_email: userEmail,
          title: 'Falha no Pagamento',
          message: 'Não conseguimos processar o pagamento da sua assinatura. Por favor, atualize sua forma de pagamento.',
          event_type: 'fatura_vencendo',
          severity: 'error',
        });

        console.log('Payment failed for:', userEmail);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userEmail = subscription.metadata.user_email;

        // Notificar cancelamento
        await base44.asServiceRole.entities.InAppNotification.create({
          user_email: userEmail,
          title: 'Assinatura Cancelada',
          message: 'Sua assinatura foi cancelada. Entre em contato com o suporte se tiver dúvidas.',
          event_type: 'outro',
          severity: 'warning',
        });

        console.log('Subscription canceled for:', userEmail);
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});