import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const N8N_WHATSAPP_WEBHOOK = 'https://n8n-2ud7.srv1837546.hstgr.cloud/webhook/prumo-whatsapp';

/**
 * sendContractWhatsApp — Envia o contrato via WhatsApp (n8n → Z-API send-document/pdf).
 *
 * Segue o mesmo padrão de sendBudgetWhatsApp: o PDF já vem PRONTO do frontend
 * (gerado via buildPdfFromHtml + jsPDF e hospedado via base44.integrations.Core.UploadFile,
 * o mesmo mecanismo já usado pelo fluxo de email). Esta function só valida a permissão,
 * dispara o webhook e atualiza o status do contrato.
 *
 * Recebe: { contract_id, phone, pdf_url, file_name, message }
 * Retorna: { success, sent_to }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { contract_id, phone, pdf_url, file_name, message } = await req.json();
    if (!contract_id) return Response.json({ error: 'contract_id é obrigatório' }, { status: 400 });
    if (!phone) return Response.json({ error: 'phone é obrigatório' }, { status: 400 });
    if (!pdf_url) return Response.json({ error: 'pdf_url é obrigatório' }, { status: 400 });

    const contract = await base44.entities.ClientContract.get(contract_id);
    if (!contract) return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });
    if (contract.consultor_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const defaultMessage = `Olá ${contract.client_name || 'Cliente'}, segue o contrato referente ao serviço de "${contract.contract_type || 'consultoria'}". Qualquer dúvida, estou à disposição.`;

    const waResponse = await fetch(N8N_WHATSAPP_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        document_url: pdf_url,
        file_name: file_name || `Contrato_${contract.client_name || contract_id}.pdf`,
        message: message || defaultMessage,
      }),
    });
    if (!waResponse.ok) {
      const errText = await waResponse.text();
      throw new Error(`Falha ao acionar webhook WhatsApp: ${waResponse.status} ${errText}`);
    }

    // Nota: ClientContract não possui campo sent_at/status de envio (o status é sobre
    // o ciclo de vida do contrato: Proposta, Ativo, etc). Não atualizamos nada aqui,
    // mesmo comportamento do sendContractEmail existente.

    return Response.json({ success: true, sent_to: phone });
  } catch (error) {
    console.error('[sendContractWhatsApp] Erro:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
