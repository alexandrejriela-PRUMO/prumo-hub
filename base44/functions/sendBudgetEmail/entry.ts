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
      : `Prezado(a) ${budget.client_name || 'Cliente'},<br><br>Segue em anexo o orçamento completo referente ao serviço de <strong>${budget.title}</strong>.`;

    // Usar o documento HTML completo salvo, se existir
    // Caso contrário, criar um email simplificado com resumo
    let emailBody;
    if (budget.document_html) {
      // Usar o HTML completo do documento
      emailBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:20px; background:#f3f4f6; font-family:Arial,sans-serif;">
  <div style="max-width:700px; margin:0 auto; padding:20px; background:#fff;">
    <!-- Mensagem do consultor -->
    <div style="margin-bottom:30px; padding:20px; background:#ecfdf5; border-left:4px solid #10b981; border-radius:6px;">
      <p style="margin:0; font-size:15px; line-height:1.6; color:#374151;">${customMessage}</p>
    </div>
    
    <!-- Documento completo -->
    ${budget.document_html}
    
    <!-- Nota de reply -->
    <div style="margin-top:30px; padding:16px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; text-align:center; font-size:12px; color:#6b7280;">
      <p style="margin:0;">Enviado por <strong style="color:#1B4332;">${user.full_name || user.email}</strong> via PRUMO HUB</p>
      <p style="margin:6px 0 0 0;">Para responder: basta responder este e-mail</p>
    </div>
  </div>
</body>
</html>`;
    } else {
      // Fallback: email simplificado (caso document_html não exista)
      const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
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
      
      <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px 20px; margin-bottom:24px;">
        <table style="width:100%; font-size:14px;">
          <tr><td style="padding:5px 0; color:#6b7280;">Valor Total</td><td style="text-align:right; font-weight:700; color:#064e3b; font-size:16px;">R$ ${fmt(budget.total_amount)}</td></tr>
          <tr><td style="padding:5px 0; color:#6b7280;">Válido por</td><td style="text-align:right; font-weight:600; color:#111827;">${budget.validity_days || 30} dias</td></tr>
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