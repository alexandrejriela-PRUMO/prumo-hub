import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const N8N_WHATSAPP_WEBHOOK = 'https://n8n-2ud7.srv1837546.hstgr.cloud/webhook/prumo-whatsapp';
const APP_BASE_URL = 'https://hub.prumo.site';

/**
 * sendMeetingConfirmationRequest — Envia ao cliente o link público de confirmação
 * de presença (Reunião/Visita), via WhatsApp e/ou Email, conforme o
 * confirmation_channel escolhido na interação.
 *
 * Chamada pelo frontend (ClientCRMPanel.jsx) logo após salvar uma interação
 * do tipo Reunião/Visita com request_confirmation: true.
 *
 * Recebe: { crm_id, token }
 * Retorna: { success, sent_whatsapp, sent_email }
 */
// ─── Log de envio (não deve derrubar a resposta principal em caso de falha) ─────────
async function logSend(base44, data) {
  try {
    await base44.asServiceRole.entities.WhatsAppSendLog.create(data);
  } catch (e) {
    console.error('[sendMeetingConfirmationRequest] Erro ao gravar WhatsAppSendLog:', e.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { crm_id, token } = await req.json();
    if (!crm_id || !token) {
      return Response.json({ error: 'crm_id e token são obrigatórios' }, { status: 400 });
    }

    const crm = await base44.entities.ClientCRM.get(crm_id);
    if (!crm) return Response.json({ error: 'Cliente não encontrado' }, { status: 404 });
    if (crm.consultor_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const interaction = (crm.interactions || []).find(i => i.confirmation_token === token);
    if (!interaction) return Response.json({ error: 'Interação não encontrada' }, { status: 404 });

    const link = `${APP_BASE_URL}/ConfirmPresence/${token}`;
    const dt = interaction.meeting_datetime ? new Date(interaction.meeting_datetime) : null;
    const dtLabel = dt && !isNaN(dt)
      ? dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : null;
    const tipoLabel = interaction.type === 'Visita' ? 'visita' : 'reunião';
    const titulo = interaction.title ? ` "${interaction.title}"` : '';

    const message = `Olá${crm.client_name ? `, ${crm.client_name}` : ''}! ` +
      `Gostaríamos de confirmar sua presença na ${tipoLabel}${titulo}` +
      `${dtLabel ? ` marcada para ${dtLabel}` : ''}. ` +
      `Por favor, confirme através do link: ${link}`;

    let sentWhatsapp = false;
    let sentEmail = false;
    const logBase = {
      doc_type: 'meeting_confirmation',
      doc_id: crm_id,
      consultor_email: crm.consultor_email,
      client_name: crm.client_name || '',
      message,
      sent_at: new Date().toISOString(),
    };

    if (['whatsapp', 'both'].includes(interaction.confirmation_channel) && crm.client_phone) {
      const digits = crm.client_phone.replace(/\D/g, '');
      const phoneWithCountry = digits.startsWith('55') ? digits : `55${digits}`;
      try {
        const waRes = await fetch(N8N_WHATSAPP_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneWithCountry, message }),
        });
        if (!waRes.ok) {
          const errText = await waRes.text();
          throw new Error(`Falha no WhatsApp: ${waRes.status} ${errText}`);
        }
        const waJson = await waRes.json().catch(() => null);
        sentWhatsapp = true;
        await logSend(base44, {
          ...logBase, channel: 'whatsapp', to_phone: phoneWithCountry,
          zapi_message_id: waJson?.messageId || null, status: 'sent',
        });
      } catch (e) {
        console.error('[MeetingConfirm] Erro ao enviar WhatsApp:', e.message);
        await logSend(base44, {
          ...logBase, channel: 'whatsapp', to_phone: phoneWithCountry, status: 'error', error_message: e.message,
        });
      }
    }

    if (['email', 'both'].includes(interaction.confirmation_channel) && crm.client_email) {
      try {
        await base44.integrations.Core.SendEmail({
          from_name: 'PRUMO Hub',
          to: crm.client_email,
          subject: `Confirme sua presença: ${tipoLabel}${titulo}`,
          body: `<p>Olá${crm.client_name ? `, ${crm.client_name}` : ''},</p>` +
            `<p>Gostaríamos de confirmar sua presença na <strong>${tipoLabel}</strong>${titulo}` +
            `${dtLabel ? ` marcada para <strong>${dtLabel}</strong>` : ''}.</p>` +
            `<p><a href="${link}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Confirmar Presença</a></p>` +
            `<p>Equipe PRUMO Hub</p>`,
        });
        sentEmail = true;
        await logSend(base44, { ...logBase, channel: 'email', to_email: crm.client_email, status: 'sent' });
      } catch (e) {
        console.error('[MeetingConfirm] Erro ao enviar email:', e.message);
        await logSend(base44, {
          ...logBase, channel: 'email', to_email: crm.client_email, status: 'error', error_message: e.message,
        });
      }
    }

    return Response.json({ success: true, sent_whatsapp: sentWhatsapp, sent_email: sentEmail });
  } catch (error) {
    console.error('[sendMeetingConfirmationRequest] Erro:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
