import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { responsible_email, assigner_name, type, title, client_name } = await req.json();

    if (!responsible_email || !title) {
      return Response.json({ error: 'responsible_email e title são obrigatórios' }, { status: 400 });
    }

    const typeLabel = type === 'task' ? 'Tarefa' : 'Interação';
    const notifTitle = `PRUMO · ${typeLabel} delegada a você`;
    const message = `${assigner_name || 'O consultor'} delegou uma ${typeLabel.toLowerCase()} para você no CRM do cliente "${client_name}".\n\nTítulo: ${title}`;

    // Notificação in-app
    await base44.asServiceRole.entities.InAppNotification.create({
      user_email: responsible_email,
      title: notifTitle,
      message,
      event_type: type === 'task' ? 'atualizacao_cliente_crm' : 'novo_cliente_crm',
      severity: 'info',
      read: false,
    });

    // Email
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'PRUMO Hub',
      to: responsible_email,
      subject: notifTitle,
      body: `Olá,\n\n${message}\n\nAcesse o aplicativo PRUMO para visualizar os detalhes.\n\nAtenciosamente,\nEquipe PRUMO`,
    });

    console.log(`[CRM Assignment] Notificação enviada para ${responsible_email} — ${typeLabel}: ${title}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[CRM Assignment] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});