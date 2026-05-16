import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { budget_id, to, subject, message, document_html } = body;

    if (!budget_id || !to || !subject) {
      return Response.json({ error: 'Campos obrigatórios: budget_id, to, subject' }, { status: 400 });
    }

    // Buscar orçamento
    const budget = await base44.entities.Budget.get(budget_id);
    if (!budget) {
      return Response.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    // Verificação flexível: consultor OU membro da equipe com permissão
    if (budget.consultor_email !== user.email) {
      // Verificar se é equipe com permissão
      const userMeta = await base44.entities.UserMetadata.filter({ user_email: user.email }, '-created_date', 1);
      const primaryEmail = userMeta?.[0]?.primary_consultor_email;
      if (!primaryEmail || budget.consultor_email !== primaryEmail) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const customMessage = message
      ? message.replace(/\n/g, '<br>')
      : `Prezado(a) ${budget.client_name || 'Cliente'},<br><br>Segue o orçamento referente ao serviço de <strong>${budget.title}</strong>.`;

    // Conteúdo do documento incorporado no e-mail
    const docHtml = document_html || budget.document_html || '';
    const documentSection = docHtml
      ? `<div style="margin-top:32px; padding-top:24px; border-top:2px solid #e5e7eb;">
          <p style="font-size:11px;color:#6b7280;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Conteúdo do Orçamento</p>
          <div style="border:1px solid #e5e7eb; border-radius:8px; padding:24px; background:#ffffff; font-size:13px; line-height:1.7;">
            ${docHtml}
          </div>
        </div>`
      : '';

    const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    const emailBody = `
      <html><body style="font-family:Arial,sans-serif;color:#333;margin:0;padding:0;background:#f3f4f6;">
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
                <tr><td style="padding:5px 0;color:#6b7280;">Número</td><td style="text-align:right;font-weight:600;color:#111827;">${budget.budget_number || '-'}</td></tr>
                <tr><td style="padding:5px 0;color:#6b7280;">Valor Total</td><td style="text-align:right;font-weight:700;color:#1B4332;">R$ ${fmt(budget.total_amount)}</td></tr>
                <tr><td style="padding:5px 0;color:#6b7280;">Válido por</td><td style="text-align:right;font-weight:600;color:#111827;">${budget.validity_days || 30} dias</td></tr>
                <tr><td style="padding:5px 0;color:#6b7280;">Data</td><td style="text-align:right;font-weight:600;color:#111827;">${new Date().toLocaleDateString('pt-BR')}</td></tr>
              </table>
            </div>

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

    // Salvar log do envio
    await base44.entities.BudgetEmailLog.create({
      budget_id,
      budget_number: budget.budget_number || '',
      consultor_email: user.email,
      to,
      subject,
      message: message || '',
      sent_at: new Date().toISOString(),
      status: 'sent',
    });

    // Atualizar status do orçamento para "Enviado"
    await base44.entities.Budget.update(budget_id, {
      status: 'Enviado',
      sent_at: new Date().toISOString(),
    });

    return Response.json({ success: true, message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar e-mail do orçamento:', error);
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
});