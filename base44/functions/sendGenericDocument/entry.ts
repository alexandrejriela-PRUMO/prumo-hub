import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const N8N_WHATSAPP_WEBHOOK = 'https://n8n-2ud7.srv1837546.hstgr.cloud/webhook/prumo-whatsapp';

/**
 * sendGenericDocument — Envia um documento JÁ HOSPEDADO (Documentos, Licenças,
 * CAR, Processos, PRAD, Georreferenciamento) via WhatsApp ou Email.
 *
 * Diferente das functions específicas (sendReceiptWhatsApp etc.), esta não está
 * ligada a nenhuma entidade de negócio — só recebe uma URL de arquivo já pronta
 * e repassa para o canal escolhido. Usada pelo componente reutilizável
 * DocumentSendButton.jsx em várias telas de "Central da Propriedade".
 *
 * Recebe: { channel: 'whatsapp'|'email', phone?, email?, file_url, file_name, message,
 *           doc_type?, doc_id?, client_name? }
 * doc_type: 'document' (default) | 'license' | 'car' | 'process' | 'prad' | 'georeferencing'
 * Retorna: { success }
 */
// ─── Log de envio (não deve derrubar a resposta principal em caso de falha) ─────────
async function logSend(base44, data) {
  try {
    await base44.asServiceRole.entities.WhatsAppSendLog.create(data);
  } catch (e) {
    console.error('[sendGenericDocument] Erro ao gravar WhatsAppSendLog:', e.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      channel, phone, email, file_url, file_name, message,
      doc_type, doc_id, client_name,
    } = await req.json();
    if (!channel || !['whatsapp', 'email'].includes(channel)) {
      return Response.json({ error: 'channel deve ser "whatsapp" ou "email"' }, { status: 400 });
    }
    if (!file_url) return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });

    const finalMessage = message || `Segue o documento: ${file_name || 'anexo'}.`;
    const logBase = {
      doc_type: doc_type || 'document',
      doc_id: doc_id || file_name || 'documento',
      consultor_email: user.email,
      client_name: client_name || '',
      channel,
      message: finalMessage,
      file_name: file_name || '',
      sent_at: new Date().toISOString(),
    };

    if (channel === 'whatsapp') {
      if (!phone) return Response.json({ error: 'phone é obrigatório para WhatsApp' }, { status: 400 });
      try {
        const waRes = await fetch(N8N_WHATSAPP_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            document_url: file_url,
            file_name: file_name || 'documento.pdf',
            message: finalMessage,
          }),
        });
        if (!waRes.ok) {
          const errText = await waRes.text();
          throw new Error(`Falha ao enviar WhatsApp: ${waRes.status} ${errText}`);
        }
        const waJson = await waRes.json().catch(() => null);
        await logSend(base44, {
          ...logBase, to_phone: phone, zapi_message_id: waJson?.messageId || null, status: 'sent',
        });
      } catch (err) {
        await logSend(base44, { ...logBase, to_phone: phone, status: 'error', error_message: err.message });
        throw err;
      }
    } else {
      if (!email) return Response.json({ error: 'email é obrigatório para Email' }, { status: 400 });
      try {
        await base44.integrations.Core.SendEmail({
          from_name: 'PRUMO Hub',
          to: email,
          subject: `Documento: ${file_name || 'Anexo'}`,
          body: `<p>${finalMessage.replace(/\n/g, '<br/>')}</p>` +
            `<p><a href="${file_url}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Abrir Documento</a></p>` +
            `<p>Equipe PRUMO Hub</p>`,
        });
        await logSend(base44, { ...logBase, to_email: email, status: 'sent' });
      } catch (err) {
        await logSend(base44, { ...logBase, to_email: email, status: 'error', error_message: err.message });
        throw err;
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[sendGenericDocument] Erro:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
