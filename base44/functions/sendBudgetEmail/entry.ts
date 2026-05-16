import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { budget_id, to, subject, message } = body;

    if (!budget_id || !to || !subject) {
      return Response.json({ error: 'Campos obrigatórios: budget_id, to, subject' }, { status: 400 });
    }

    // Buscar orçamento no banco
    const budget = await base44.entities.Budget.get(budget_id);
    if (!budget) {
      return Response.json({ error: 'Orçamento não encontrado' }, { status: 404 });
    }

    // Verificação: consultor dono OU membro da equipe
    if (budget.consultor_email !== user.email) {
      const userMeta = await base44.entities.UserMetadata.filter({ user_email: user.email }, '-created_date', 1);
      const primaryEmail = userMeta?.[0]?.primary_consultor_email;
      if (!primaryEmail || budget.consultor_email !== primaryEmail) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const customMessage = message
      ? message.replace(/\n/g, '<br>')
      : `Prezado(a) ${budget.client_name || 'Cliente'},<br><br>Segue o orçamento referente ao serviço de <strong>${budget.title}</strong>.`;

    const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    const emailBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #f3f4f6; font-family: Arial, sans-serif; }
    .ql-align-center { text-align: center !important; }
    .ql-align-right { text-align: right !important; }
    .ql-align-justify { text-align: justify !important; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
  <div style="max-width:700px; margin:0 auto; padding:20px;">

    <!-- Cabeçalho do email -->
    <div style="background:linear-gradient(135deg,#064e3b,#1B4332); color:#fff; padding:24px 32px; border-radius:12px 12px 0 0;">
      <p style="margin:0 0 4px 0; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#6ee7b7; font-weight:600;">PRUMO HUB</p>
      <h2 style="margin:0; font-size:20px; font-weight:800;">Orçamento Recebido</h2>
      <p style="margin:6px 0 0 0; font-size:13px; color:#a7f3d0;">Nº ${budget.budget_number || ''} — ${budget.title || ''}</p>
    </div>

    <!-- Mensagem personalizada -->
    <div style="background:#fff; border:1px solid #e5e7eb; border-top:none; padding:24px 32px;">
      <p style="font-size:15px; line-height:1.7; color:#374151; margin:0 0 20px 0;">${customMessage}</p>

      <!-- Resumo financeiro -->
      <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px 20px; margin-bottom:24px;">
        <table style="width:100%; font-size:14px;">
          <tr><td style="padding:5px 0; color:#6b7280;">Número do Orçamento</td><td style="text-align:right; font-weight:600; color:#111827;">${budget.budget_number || '-'}</td></tr>
          <tr><td style="padding:5px 0; color:#6b7280;">Valor Total</td><td style="text-align:right; font-weight:700; color:#064e3b; font-size:16px;">R$ ${fmt(budget.total_amount)}</td></tr>
          <tr><td style="padding:5px 0; color:#6b7280;">Válido por</td><td style="text-align:right; font-weight:600; color:#111827;">${budget.validity_days || 30} dias</td></tr>
          <tr><td style="padding:5px 0; color:#6b7280;">Data de Emissão</td><td style="text-align:right; font-weight:600; color:#111827;">${new Date().toLocaleDateString('pt-BR')}</td></tr>
        </table>
      </div>

      <!-- Serviços detalhados -->
      ${budget.services && budget.services.length > 0 ? `
      <div style="border-top:2px solid #e5e7eb; padding-top:20px; margin-top:8px; margin-bottom:20px;">
        <p style="font-size:11px; color:#6b7280; margin:0 0 12px 0; text-transform:uppercase; letter-spacing:1px; font-weight:700;">Serviços Detalhados</p>
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:#1B4332; color:#fff;">
              <th style="text-align:left; padding:10px 12px; font-weight:600;">Serviço</th>
              <th style="text-align:center; padding:10px 8px; font-weight:600; width:60px;">Horas</th>
              <th style="text-align:right; padding:10px 8px; font-weight:600; width:110px;">Valor/h</th>
              <th style="text-align:right; padding:10px 12px; font-weight:600; width:110px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${budget.services.map((s, i) => {
              const hrs = parseFloat(s.hours) || 0;
              const rate = parseFloat(s.hourly_rate) || 0;
              const sub = hrs * rate;
              const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
              return `<tr style="background:${bg}; border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px 12px; font-size:13px; color:#111827;"><strong>${s.name || 'Serviço'}</strong>${s.description ? `<br><span style="font-size:12px;color:#6b7280;">${s.description}</span>` : ''}</td>
                <td style="text-align:center; padding:10px 8px; color:#374151;">${hrs > 0 ? hrs + 'h' : '—'}</td>
                <td style="text-align:right; padding:10px 8px; color:#374151;">${rate > 0 ? 'R$ ' + fmt(rate) + '/h' : '—'}</td>
                <td style="text-align:right; padding:10px 12px; font-weight:700; color:#1B4332;">R$ ${fmt(sub)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : ''}

      <!-- Rodapé -->
      <div style="margin-top:28px; padding-top:20px; border-top:1px solid #e5e7eb; font-size:12px; color:#9ca3af; text-align:center;">
        <p style="margin:0;">Enviado por <strong style="color:#1B4332;">${user.full_name || user.email}</strong> via PRUMO HUB</p>
      </div>
    </div>

  </div>
</body>
</html>`;

    let emailSent = false;
    let sendError = null;
    try {
      await base44.integrations.Core.SendEmail({
        to,
        subject,
        body: emailBody,
        from_name: user.full_name || 'Consultor PRUMO',
      });
      emailSent = true;
    } catch (emailErr) {
      sendError = emailErr.message || 'Erro ao enviar e-mail';
      console.error('Erro no SendEmail:', sendError);
    }

    // Salvar log do envio com status real
    await base44.entities.BudgetEmailLog.create({
      budget_id,
      budget_number: budget.budget_number || '',
      consultor_email: user.email,
      to,
      subject,
      message: message || '',
      sent_at: new Date().toISOString(),
      status: emailSent ? 'sent' : 'error',
    });

    if (!emailSent) {
      return Response.json({ error: `Falha ao enviar e-mail: ${sendError}` }, { status: 500 });
    }

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