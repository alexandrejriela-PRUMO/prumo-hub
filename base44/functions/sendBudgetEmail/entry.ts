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
      : `Prezado(a) ${budget.client_name || 'Cliente'},<br><br>Segue o orçamento completo referente ao serviço de <strong>${budget.title}</strong>.`;

    const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    // Se houver document_html e não estiver vazio, usar ele completo
    let emailBody;
    if (budget.document_html && budget.document_html.trim().length > 0) {
      emailBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:20px; background:#f3f4f6; font-family:Arial,sans-serif;">
  <div style="max-width:900px; margin:0 auto;">
    <!-- Mensagem do consultor -->
    <div style="margin-bottom:20px; padding:20px; background:#ecfdf5; border-left:4px solid #10b981; border-radius:6px;">
      <p style="margin:0; font-size:15px; line-height:1.6; color:#374151;">${customMessage}</p>
    </div>
    
    <!-- Documento completo -->
    ${budget.document_html}
    
    <!-- Nota de reply -->
    <div style="margin-top:30px; padding:16px; background:#fff; border:1px solid #e5e7eb; border-radius:6px; text-align:center; font-size:12px; color:#6b7280;">
      <p style="margin:0;">Enviado por <strong style="color:#1B4332;">${user.full_name || user.email}</strong> via PRUMO HUB</p>
      <p style="margin:6px 0 0 0;">Para responder: basta responder este e-mail</p>
    </div>
  </div>
</body>
</html>`;
    } else {
      // Fallback: se não houver document_html, construir email detalhado com serviços
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

      emailBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:20px; background:#f3f4f6; font-family:Arial,sans-serif;">
  <div style="max-width:700px; margin:0 auto; padding:20px; background:#fff;">
    <div style="background:linear-gradient(135deg,#064e3b,#1B4332); color:#fff; padding:24px 32px; border-radius:8px 8px 0 0;">
      <h2 style="margin:0; font-size:20px; font-weight:800;">Orçamento Nº ${budget.budget_number || ''}</h2>
      <p style="margin:6px 0 0 0; font-size:13px; color:#a7f3d0;">${budget.title || ''}</p>
    </div>
    
    <div style="padding:24px 32px; border:1px solid #e5e7eb; border-top:none;">
      <p style="font-size:15px; line-height:1.6; color:#374151; margin:0 0 20px 0;">${customMessage}</p>
      
      ${services.length > 0 ? `
      <div style="margin-bottom:20px;">
        <p style="font-size:12px; color:#6b7280; margin:0 0 12px 0; text-transform:uppercase; font-weight:700;">Serviços</p>
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:#1B4332; color:#fff;">
              <th style="text-align:left; padding:10px 12px; font-weight:600;">Serviço</th>
              <th style="text-align:center; padding:10px 8px; font-weight:600; width:60px;">Horas</th>
              <th style="text-align:right; padding:10px 8px; font-weight:600; width:100px;">Valor/h</th>
              <th style="text-align:right; padding:10px 12px; font-weight:600; width:100px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${services.map((s, i) => {
              const hrs = parseFloat(s.hours) || 0;
              const rate = parseFloat(s.hourly_rate) || 0;
              const sub = hrs * rate;
              const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
              return `<tr style="background:${bg}; border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px 12px; font-size:13px; color:#111827;"><strong>${s.name || 'Serviço'}</strong></td>
                <td style="text-align:center; padding:10px 8px; color:#374151;">${hrs > 0 ? hrs + 'h' : '—'}</td>
                <td style="text-align:right; padding:10px 8px; color:#374151;">${rate > 0 ? 'R$ ' + fmt(rate) : '—'}</td>
                <td style="text-align:right; padding:10px 12px; font-weight:700; color:#1B4332;">R$ ${fmt(sub)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : ''}
      
      <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px 20px; margin-bottom:24px;">
        <table style="width:100%; font-size:14px;">
          ${travelCost > 0 ? `<tr><td style="padding:5px 0; color:#6b7280;">Deslocamento</td><td style="text-align:right; font-weight:600; color:#111827;">R$ ${fmt(travelCost)}</td></tr>` : ''}
          ${fuelCost > 0 ? `<tr><td style="padding:5px 0; color:#6b7280;">Combustível</td><td style="text-align:right; font-weight:600; color:#111827;">R$ ${fmt(fuelCost)}</td></tr>` : ''}
          ${fees.map(f => `<tr><td style="padding:5px 0; color:#6b7280;">${f.name || 'Taxa'}</td><td style="text-align:right; font-weight:600; color:#111827;">R$ ${fmt(f.amount)}</td></tr>`).join('')}
          <tr style="border-top:1px solid #e5e7eb;"><td style="padding:8px 0; color:#6b7280;"><strong>Subtotal</strong></td><td style="text-align:right; font-weight:600; color:#111827;"><strong>R$ ${fmt(subtotal)}</strong></td></tr>
          ${discount > 0 ? `<tr><td style="padding:5px 0; color:#dc2626;"><strong>Desconto (${discount}%)</strong></td><td style="text-align:right; font-weight:600; color:#dc2626;">- R$ ${fmt(discountValue)}</td></tr>` : ''}
          <tr style="background:#064e3b; color:#fff;"><td style="padding:10px 0; font-weight:700;">TOTAL</td><td style="text-align:right; font-weight:700; font-size:16px;">R$ ${fmt(total)}</td></tr>
        </table>
      </div>
      
      <p style="margin:0; font-size:12px; color:#9ca3af; text-align:center;">Enviado por <strong style="color:#1B4332;">${user.full_name || user.email}</strong> via PRUMO HUB</p>
    </div>
  </div>
</body>
</html>`;
    }

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