import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * zapiMessageStatusWebhook — Endpoint público que recebe o webhook de
 * "message-status" da Z-API (configurado no painel da Z-API em
 * Configurações da Instância → Webhooks → "Ao mudar o status da mensagem").
 *
 * A Z-API envia eventos com status: PENDING, SENT, RECEIVED, READ, PLAYED.
 * Localizamos o WhatsAppSendLog correspondente pelo zapi_message_id e
 * atualizamos o status (mapeando RECEIVED->delivered, READ/PLAYED->read).
 *
 * Não requer autenticação de usuário (é um webhook externo), mas usa
 * asServiceRole para gravar no banco.
 */
function mapZapiStatus(zapiStatus) {
  switch (zapiStatus) {
    case 'RECEIVED': return { status: 'delivered', field: 'delivered_at' };
    case 'READ':
    case 'PLAYED': return { status: 'read', field: 'read_at' };
    case 'SENT':
    case 'PENDING':
    default: return null; // já é 'sent' desde a criação do log, nada a atualizar
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ success: false, error: 'method_not_allowed' }, { status: 405 });
    }

    const body = await req.json();
    const { messageId, status: zapiStatus } = body || {};

    if (!messageId || !zapiStatus) {
      // Retorna 200 mesmo assim para a Z-API não ficar reenviando/marcando como falha
      return Response.json({ success: true, ignored: true, reason: 'missing_messageId_or_status' });
    }

    const mapped = mapZapiStatus(zapiStatus);
    if (!mapped) {
      return Response.json({ success: true, ignored: true, reason: `status_${zapiStatus}_not_tracked` });
    }

    const base44 = createClientFromRequest(req);
    const logs = await base44.asServiceRole.entities.WhatsAppSendLog.filter({
      zapi_message_id: messageId,
    });

    if (!logs.length) {
      // Mensagem não rastreada por nós (ou já processada de outra forma) — não é erro.
      return Response.json({ success: true, ignored: true, reason: 'log_not_found' });
    }

    const log = logs[0];

    // Não regredir status (ex: já está 'read', não voltar para 'delivered')
    const statusRank = { sent: 0, delivered: 1, read: 2, error: 0 };
    if ((statusRank[log.status] ?? 0) >= statusRank[mapped.status]) {
      return Response.json({ success: true, ignored: true, reason: 'status_already_advanced' });
    }

    await base44.asServiceRole.entities.WhatsAppSendLog.update(log.id, {
      status: mapped.status,
      [mapped.field]: new Date().toISOString(),
    });

    return Response.json({ success: true, updated: log.id, new_status: mapped.status });
  } catch (error) {
    console.error('[zapiMessageStatusWebhook] Erro:', error.message);
    // Sempre 200 para webhooks externos, para evitar retentativas agressivas da Z-API
    return Response.json({ success: false, error: error.message });
  }
});
