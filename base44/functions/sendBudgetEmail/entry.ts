import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendEmailViaResend({ to, subject, html, fromName, replyTo }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <noreply@hub.prumo.site>`,
      to: [to],
      subject,
      html,
      reply_to: replyTo,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }

  return await res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { budget_id, to, subject, message, pdf_url } = body;

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

    // Calcular valores para o resumo financeiro
    const services = Array.isArray(budget.services) ? budget.services : [];
    const fees = Array.isArray(budget.additional_fees) ? budget.additional_fees : [];
    const travelCost = parseFloat(budget.travel_cost) || 0;
    const fuelCost = parseFloat(budget.fuel_cost) || 0;
    const discount = parseFloat(budget.discount_percentage) || 0;
    const servicesTotal = services.reduce((acc, s) => acc + ((parseFloat(s.hours) || 0) * (parseFloat(s.hourly_rate) || 0)), 0);
    const feesTotal = fees.reduce((acc, f) => acc + (parseFloat(f.amount) || 0), 0);
    const subtotal = servicesTotal + travelCost + fuelCost + feesTotal;
    const discountValue = subtotal * (discount / 100);
    const total = subtotal - discountValue;

    const emailBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial,sans-serif;">
<div style="max-width:640px; margin:0 auto; padding:24px 16px;">

  <!-- CABEÇALHO -->
  <div style="background:linear-gradient(135deg,#064e3b,#1B4332); color:#fff; padding:28px 32px; border-radius:12px 12px 0 0;">
    <p style="margin:0 0 4px 0; font-size:10px; letter-spacing:3px; text-transform:uppercase; color:#6ee7b7; font-weight:700;">PRUMO HUB</p>
    <h1 style="margin:0 0 6px 0; font-size:22px; font-weight:800;">Orçamento de Serviços</h1>
    <p style="margin:0; font-size:13px; color:#a7f3d0;">Nº ${budget.budget_number || '—'} · ${budget.title || ''}</p>
  </div>

  <!-- CORPO -->
  <div style="background:#fff; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 12px 12px; padding:28px 32px;">

    <!-- Mensagem personalizada -->
    <p style="font-size:15px; line-height:1.8; color:#374151; margin:0 0 24px 0; padding-bottom:20px; border-bottom:1px solid #f0f0f0;">${customMessage}</p>

    <!-- Resumo do orçamento -->
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:20px 24px; margin-bottom:28px;">
      <p style="margin:0 0 14px 0; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:1.5px;">Resumo do Orçamento</p>
      <table style="width:100%; border-collapse:collapse;">
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0; font-size:13px; color:#64748b;">Número</td>
          <td style="padding:10px 0; font-size:13px; font-weight:600; color:#1e293b; text-align:right;">${budget.budget_number || '—'}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0; font-size:13px; color:#64748b;">Cliente</td>
          <td style="padding:10px 0; font-size:13px; font-weight:600; color:#1e293b; text-align:right;">${budget.client_name || '—'}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0; font-size:13px; color:#64748b;">Validade</td>
          <td style="padding:10px 0; font-size:13px; font-weight:600; color:#1e293b; text-align:right;">${budget.validity_days || 30} dias</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0; font-size:13px; color:#64748b;">Emissão</td>
          <td style="padding:10px 0; font-size:13px; font-weight:600; color:#1e293b; text-align:right;">${new Date().toLocaleDateString('pt-BR')}</td>
        </tr>
        <tr>
          <td style="padding:14px 0 6px 0; font-size:15px; font-weight:700; color:#064e3b;">VALOR TOTAL</td>
          <td style="padding:14px 0 6px 0; font-size:20px; font-weight:800; color:#064e3b; text-align:right;">R$ ${fmt(total)}</td>
        </tr>
      </table>
    </div>

    <!-- Serviços -->
    ${services.length > 0 ? `
    <div style="margin-bottom:28px;">
      <p style="margin:0 0 12px 0; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:1.5px;">Serviços</p>
      <table style="width:100%; border-collapse:collapse; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0;">
        <thead>
          <tr style="background:#1B4332;">
            <th style="text-align:left; padding:11px 14px; font-size:11px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:0.5px;">Serviço</th>
            <th style="text-align:center; padding:11px 10px; font-size:11px; font-weight:700; color:#fff; width:70px;">Horas</th>
            <th style="text-align:right; padding:11px 10px; font-size:11px; font-weight:700; color:#fff; width:110px;">Valor/h</th>
            <th style="text-align:right; padding:11px 14px; font-size:11px; font-weight:700; color:#fff; width:110px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${services.map((s, i) => {
            const hrs = parseFloat(s.hours) || 0;
            const rate = parseFloat(s.hourly_rate) || 0;
            const sub = hrs * rate;
            return `<tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'}; border-bottom:1px solid #e2e8f0;">
              <td style="padding:12px 14px; font-size:13px; color:#1e293b; font-weight:600;">${s.name || 'Serviço'}${s.description ? `<div style="font-size:12px;color:#94a3b8;font-weight:400;margin-top:2px;">${s.description}</div>` : ''}</td>
              <td style="text-align:center; padding:12px 10px; font-size:13px; color:#475569;">${hrs > 0 ? hrs + 'h' : '—'}</td>
              <td style="text-align:right; padding:12px 10px; font-size:13px; color:#475569;">${rate > 0 ? 'R$ ' + fmt(rate) : '—'}</td>
              <td style="text-align:right; padding:12px 14px; font-size:13px; font-weight:700; color:#064e3b;">R$ ${fmt(sub)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <!-- Custos adicionais e desconto -->
    ${(travelCost > 0 || fuelCost > 0 || fees.length > 0 || discount > 0) ? `
    <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:18px 24px; margin-bottom:28px;">
      <p style="margin:0 0 12px 0; font-size:11px; font-weight:700; color:#92400e; text-transform:uppercase; letter-spacing:1.5px;">Ajustes de Valor</p>
      <table style="width:100%; border-collapse:collapse;">
        ${travelCost > 0 ? `<tr style="border-bottom:1px solid #fde68a;"><td style="padding:9px 0; font-size:13px; color:#78350f;">Deslocamento</td><td style="text-align:right; font-size:13px; font-weight:600; color:#78350f;">+ R$ ${fmt(travelCost)}</td></tr>` : ''}
        ${fuelCost > 0 ? `<tr style="border-bottom:1px solid #fde68a;"><td style="padding:9px 0; font-size:13px; color:#78350f;">Combustível</td><td style="text-align:right; font-size:13px; font-weight:600; color:#78350f;">+ R$ ${fmt(fuelCost)}</td></tr>` : ''}
        ${fees.map(f => `<tr style="border-bottom:1px solid #fde68a;"><td style="padding:9px 0; font-size:13px; color:#78350f;">${f.name || 'Taxa'}</td><td style="text-align:right; font-size:13px; font-weight:600; color:#78350f;">+ R$ ${fmt(f.amount)}</td></tr>`).join('')}
        ${discount > 0 ? `<tr><td style="padding:9px 0; font-size:13px; color:#dc2626; font-weight:600;">Desconto aplicado (${discount}%)</td><td style="text-align:right; font-size:13px; font-weight:700; color:#dc2626;">− R$ ${fmt(discountValue)}</td></tr>` : ''}
      </table>
    </div>` : ''}

    <!-- Botão PDF -->
    ${pdf_url ? `
    <div style="text-align:center; margin:28px 0;">
      <a href="${pdf_url}" target="_blank" style="display:inline-block; background:#064e3b; color:#fff; padding:15px 36px; border-radius:8px; font-size:15px; font-weight:700; text-decoration:none; letter-spacing:0.3px;">
        📄 Abrir Orçamento Completo (PDF)
      </a>
      <p style="margin:10px 0 0 0; font-size:12px; color:#94a3b8;">Clique para visualizar ou baixar o documento completo</p>
    </div>` : ''}

    <!-- Aviso de validade -->
    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:14px 18px; margin-bottom:24px;">
      <p style="margin:0; font-size:13px; color:#065f46;">
        ⏱ Este orçamento é válido por <strong>${budget.validity_days || 30} dias</strong> a partir de ${new Date().toLocaleDateString('pt-BR')}. Para aceitar ou tirar dúvidas, responda diretamente a este e-mail.
      </p>
    </div>

    <!-- Rodapé -->
    <div style="padding-top:20px; border-top:1px solid #f1f5f9; text-align:center;">
      <p style="margin:0 0 4px 0; font-size:13px; color:#475569;">Enviado por <strong style="color:#064e3b;">${user.full_name || user.email}</strong></p>
      <p style="margin:0; font-size:12px; color:#94a3b8;">${user.email} · via PRUMO HUB</p>
    </div>

  </div>
</div>
</body>
</html>`;

    let emailSent = false;
    let sendError = null;
    try {
      await sendEmailViaResend({
        to,
        subject,
        html: emailBody,
        fromName: user.full_name || 'Consultor PRUMO',
        replyTo: user.email,
      });
      emailSent = true;
    } catch (emailErr) {
      sendError = emailErr.message || 'Erro ao enviar e-mail';
      console.error('Erro no sendEmailViaResend:', sendError);
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