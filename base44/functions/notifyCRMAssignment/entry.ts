import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { responsible_email, assigner_name, type, title, client_name, property_id } = await req.json();

    if (!responsible_email || !title) {
      return Response.json({ error: 'responsible_email e title são obrigatórios' }, { status: 400 });
    }

    let typeLabel, notifTitle, message, eventType;

    if (type === 'task') {
      typeLabel = 'Tarefa';
      notifTitle = `PRUMO · Tarefa delegada a você`;
      message = `${assigner_name || 'O consultor'} delegou a tarefa "${title}" para você no CRM do cliente "${client_name}".`;
      eventType = 'atualizacao_cliente_crm';
    } else if (type === 'mention') {
      typeLabel = 'Menção';
      notifTitle = `PRUMO · Você foi mencionado no CRM`;
      message = `${assigner_name || 'Alguém'} mencionou você em um comentário sobre "${title}" no CRM do cliente "${client_name}".`;
      eventType = 'novo_cliente_crm';
    } else {
      typeLabel = 'Interação';
      notifTitle = `PRUMO · Interação delegada a você`;
      message = `${assigner_name || 'O consultor'} delegou a interação "${title}" para você no CRM do cliente "${client_name}".`;
      eventType = 'novo_cliente_crm';
    }

    // Link direto para o CRMBoard com o property_id, se disponível
    const link = property_id ? `CRMBoard?property_id=${property_id}` : 'CRMBoard';

    // Notificação in-app
    await base44.asServiceRole.entities.InAppNotification.create({
      user_email: responsible_email,
      title: notifTitle,
      message,
      event_type: eventType,
      severity: 'info',
      read: false,
      link,
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