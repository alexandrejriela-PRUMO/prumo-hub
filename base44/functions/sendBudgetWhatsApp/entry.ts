import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const N8N_WHATSAPP_WEBHOOK = 'https://n8n-2ud7.srv1837546.hstgr.cloud/webhook/prumo-whatsapp';

/**
 * sendBudgetWhatsApp — Envia o orçamento via WhatsApp (n8n → Z-API send-document/pdf).
 *
 * Diferente do sendReceiptWhatsApp, aqui o PDF já vem PRONTO do frontend
 * (gerado via html2canvas + jsPDF e hospedado via base44.integrations.Core.UploadFile,
 * o mesmo mecanismo já usado pelo fluxo de email). Esta function só valida a permissão,
 * dispara o webhook e atualiza o status do orçamento.
 *
 * Recebe: { budget_id, phone, pdf_url, file_name, message }
 * Retorna: { success, sent_to }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { budget_id, phone, pdf_url, file_name, message } = await req.json();
    if (!budget_id) return Response.json({ error: 'budget_id é obrigatório' }, { status: 400 });
    if (!phone) return Response.json({ error: 'phone é obrigatório' }, { status: 400 });
    if (!pdf_url) return Response.json({ error: 'pdf_url é obrigatório' }, { status: 400 });

    const budget = await base44.entities.Budget.get(budget_id);
    if (!budget) return Response.json({ error: 'Orçamento não encontrado' }, { status: 404 });

    if (budget.consultor_email !== user.email) {
      const userMeta = await base44.entities.UserMetadata.filter({ user_email: user.email }, '-created_date', 1);
      const primaryEmail = userMeta?.[0]?.primary_consultor_email;
      if (!primaryEmail || budget.consultor_email !== primaryEmail) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const defaultMessage = `Olá ${budget.client_name || ''}, segue o orçamento${budget.budget_number ? ` Nº ${budget.budget_number}` : ''} referente a "${budget.title || 'Serviços'}", no valor de R$ ${fmt(budget.total_amount)}. Válido por ${budget.validity_days || 30} dias.`;

    const waResponse = await fetch(N8N_WHATSAPP_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        document_url: pdf_url,
        file_name: file_name || `Orcamento_${budget.budget_number || budget_id}.pdf`,
        message: message || defaultMessage,
      }),
    });
    if (!waResponse.ok) {
      const errText = await waResponse.text();
      throw new Error(`Falha ao acionar webhook WhatsApp: ${waResponse.status} ${errText}`);
    }

    await base44.entities.Budget.update(budget_id, {
      status: 'Enviado',
      sent_at: new Date().toISOString(),
    });

    return Response.json({ success: true, sent_to: phone });
  } catch (error) {
    console.error('[sendBudgetWhatsApp] Erro:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
