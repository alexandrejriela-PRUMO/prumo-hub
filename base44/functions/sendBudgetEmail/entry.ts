import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { budget_id, to, subject, message, document_html, pdf_url } = await req.json();

    if (!budget_id || !to || !subject) {
      return Response.json({ error: 'Campos obrigatórios: budget_id, to, subject' }, { status: 400 });
    }

    const budget = await base44.entities.Budget.get(budget_id);
    if (!budget) {
      return Response.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }
    if (budget.consultor_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customMessage = message
      ? message.replace(/\n/g, '<br>')
      : `Prezado(a) ${budget.client_name || 'Cliente'},<br><br>Segue o orçamento referente ao serviço de <strong>${budget.title}</strong>.`;

    // Seção do botão PDF (se tiver URL)
    const pdfSection = pdf_url
      ? `<div style="margin:24px 0; text-align:center;">
          <a href="${pdf_url}" target="_blank" style="display:inline-block; background:#1B4332; color:#fff; padding:14px 32px; border-radius:8px; font-weight:700; font-size:15px; text-decoration:none;">
            📄 Visualizar / Baixar Orçamento (PDF)
          </a>
        </div>`
      : '';

    // Conteúdo do documento incorporado no e-mail
    const documentSection = document_html
      ? `<div style="margin-top:32px; padding-top:24px; border-top:2px solid #e5e7eb;">
          <p style="font-size:12px;color:#6b7280;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">CONTEÚDO DO ORÇAMENTO</p>
          <div style="border:1px solid #e5e7eb; border-radius:8px; padding:24px; background:#fafafa; font-size:13px; line-height:1.7;">
            ${document_html}
          </div>
        </div>`
      : '';

    const emailBody = `
      <html><body style="font-family:Arial,sans-serif;color:#333;margin:0;padding:0;">
        <div style="max-width:700px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#064e3b,#1B4332);color:#fff;padding:28px 32px;border-radius:12px 12px 0 0;">
            <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#6ee7b7;font-weight:600;">PRUMO HUB</p>
            <h2 style="margin:0;font-size:22px;font-weight:800;">Orçamento Recebido</h2>
            <p style="margin:6px 0 0 0;font-size:14px;color:#a7f3d0;">Nº ${budget.budget_number || ''} — ${budget.title || ''}</p>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px;">
            <p style="font-size:15px;line-height:1.7;color:#374151;">${customMessage}</p>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:20px 0;">
              <table style="width:100%;font-size:14px;border-collapse:collapse;">
                <tr><td style="padding:4px 0;color:#6b7280;">Número</td><td style="text-align:right;font-weight:600;color:#111827;">${budget.budget_number || '-'}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Valor Total</td><td style="text-align:right;font-weight:700;color:#1B4332;">R$ ${(budget.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Válido por</td><td style="text-align:right;font-weight:600;color:#111827;">${budget.validity_days || 30} dias</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Data</td><td style="text-align:right;font-weight:600;color:#111827;">${new Date().toLocaleDateString('pt-BR')}</td></tr>
              </table>
            </div>

            ${pdfSection}
            ${documentSection}

            <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
              <p style="margin:0;">Enviado por <strong style="color:#1B4332;">${user.full_name || user.email}</strong> via PRUMO HUB</p>
            </div>
          </div>
        </div>
      </body></html>
    `;

    await base44.integrations.Core.SendEmail({
      to,
      subject,
      body: emailBody,
      from_name: user.full_name || 'Consultor PRUMO',
    });

    // Atualizar status do orçamento para "Enviado"
    await base44.entities.Budget.update(budget_id, { status: 'Enviado' });

    return Response.json({ success: true, message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar e-mail do orçamento:', error);
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
});