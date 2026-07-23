/**
 * confirmPresence — Endpoint público para a página de confirmação de presença.
 * Recebe um confirmation_token (e opcionalmente uma resposta) e usa asServiceRole
 * para localizar e atualizar apenas o registro de interação correspondente,
 * sem expor a listagem completa de ClientCRM ao cliente.
 *
 * Quando o cliente responde (confirmed/declined), notifica o consultor via
 * push interno (InAppNotification), email, e WhatsApp (se o consultor tiver
 * habilitado WhatsApp para o evento 'atualizacao_cliente_crm' nas preferências).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const N8N_WHATSAPP_WEBHOOK = 'https://n8n-2ud7.srv1837546.hstgr.cloud/webhook/prumo-whatsapp';

async function notifyConsultor(base44, crm, interaction, response) {
  try {
    const statusLabel = response === 'confirmed' ? 'CONFIRMOU' : 'NÃO poderá comparecer';
    const tipoLabel = interaction.type === 'Visita' ? 'visita' : 'reunião';
    const titulo = interaction.title ? ` "${interaction.title}"` : '';
    const title = `${crm.client_name || 'Cliente'} ${statusLabel.toLowerCase()} presença`;
    const message = `${crm.client_name || 'O cliente'} ${statusLabel} na ${tipoLabel}${titulo}.`;

    await base44.asServiceRole.entities.InAppNotification.create({
      user_email: crm.consultor_email,
      title,
      message,
      event_type: 'atualizacao_cliente_crm',
      severity: response === 'confirmed' ? 'info' : 'warning',
      read: false,
      link: '/CRM',
    });

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'PRUMO Hub',
      to: crm.consultor_email,
      subject: `[PRUMO Hub] ${response === 'confirmed' ? '✅' : '⚠️'} ${title}`,
      body: `<p>Olá,</p><p>${message}</p><p>Equipe PRUMO Hub</p>`,
    });

    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
      user_email: crm.consultor_email, event_type: 'atualizacao_cliente_crm',
    });
    const pref = prefs[0];
    if (pref?.sms_enabled === true && pref?.phone_number) {
      await fetch(N8N_WHATSAPP_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: pref.phone_number, message: `${title}\n${message}` }),
      });
    }
  } catch (e) {
    console.error('[ConfirmPresence] Erro ao notificar consultor:', e.message);
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ success: false, error: 'method_not_allowed' }, { status: 405 });
    }

    const { token, response } = await req.json();
    if (!token) {
      return Response.json({ success: false, error: 'missing_token' }, { status: 400 });
    }
    if (response && !['confirmed', 'declined'].includes(response)) {
      return Response.json({ success: false, error: 'invalid_response' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const crms = await base44.asServiceRole.entities.ClientCRM.list();

    let match = null;
    for (const crm of crms) {
      const interactions = crm.interactions || [];
      const found = interactions.find(i => i.confirmation_token === token);
      if (found) { match = { crm, interactions, interaction: found }; break; }
    }

    if (!match) {
      return Response.json({ success: false, error: 'not_found' }, { status: 404 });
    }

    const { crm, interactions, interaction } = match;
    const payload = {
      title: interaction.title || null,
      meeting_datetime: interaction.meeting_datetime || null,
      description: interaction.description || null,
    };

    // Já respondido: não sobrescreve, apenas informa o status atual.
    if (interaction.confirmation_status === 'confirmed' || interaction.confirmation_status === 'declined') {
      return Response.json({ success: true, status: interaction.confirmation_status, ...payload });
    }

    if (!response) {
      return Response.json({ success: true, status: 'pending', ...payload });
    }

    const updated = interactions.map(i =>
      i.confirmation_token === token
        ? { ...i, confirmation_status: response, responded_at: new Date().toISOString() }
        : i
    );
    await base44.asServiceRole.entities.ClientCRM.update(crm.id, { interactions: updated });

    // Notifica o consultor sobre a resposta (não bloqueia a resposta ao cliente se falhar)
    await notifyConsultor(base44, crm, interaction, response);

    return Response.json({ success: true, status: response, ...payload });
  } catch (error) {
    console.error('[ConfirmPresence] Erro:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
