import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

/**
 * sendReceiptEmail — Busca um Receipt, monta o HTML e envia por e-mail via Resend.
 *
 * Usa asServiceRole para ler/atualizar o Receipt porque membros de equipe podem
 * enviar recibos emitidos em nome do consultor principal (mesma lógica de sendBudgetEmail,
 * mas com bypass via TeamMember em vez de UserMetadata).
 *
 * Recebe: { receipt_id, message? }
 * Retorna: { success }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { receipt_id, message } = body;
    if (!receipt_id) return Response.json({ error: 'receipt_id é obrigatório' }, { status: 400 });

    // Determinar o email efetivo do consultor
    let consultorEmail = user.email;
    if (user.role !== 'admin') {
      const memberships = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email,
        status: 'Ativo',
      });
      if (memberships.length > 0) {
        consultorEmail = memberships[0].primary_user_email;
      }
    }

    const receipt = await base44.asServiceRole.entities.Receipt.get(receipt_id);
    if (!receipt) return Response.json({ error: 'Recibo não encontrado' }, { status: 404 });

    if (receipt.consultor_email !== user.email && receipt.consultor_email !== consultorEmail) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!receipt.client_email) {
      return Response.json({ error: 'Recibo não possui e-mail do cliente' }, { status: 400 });
    }

    const customMessage = message
      ? message.replace(/\n/g, '<br>')
      : `Prezado(a) ${receipt.client_name || 'Cliente'},<br><br>Segue o recibo referente a <strong>${receipt.title || 'Recibo de Honorários'}</strong>.`;

    const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const services = Array.isArray(receipt.services) ? receipt.services : [];
    const total = Number(receipt.total_amount || 0);

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
    <h1 style="margin:0 0 6px 0; font-size:22px; font-weight:800;">${receipt.title || 'Recibo de Honorários'}</h1>
    <p style="margin:0; font-size:13px; color:#a7f3d0;">Nº ${receipt.receipt_number || '—'}</p>
  </div>

  <!-- CORPO -->
  <div style="background:#fff; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 12px 12px; padding:28px 32px;">

    <!-- Mensagem personalizada -->
    <p style="font-size:15px; line-height:1.8; color:#374151; margin:0 0 24px 0; padding-bottom:20px; border-bottom:1px solid #f0f0f0;">${customMessage}</p>

    <!-- Resumo -->
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:20px 24px; margin-bottom:28px;">
      <p style="margin:0 0 14px 0; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:1.5px;">Resumo do Recibo</p>
      <table style="width:100%; border-collapse:collapse;">
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0; font-size:13px; color:#64748b;">Número</td>
          <td style="padding:10px 0; font-size:13px; font-weight:600; color:#1e293b; text-align:right;">${receipt.receipt_number || '—'}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0; font-size:13px; color:#64748b;">Cliente</td>
          <td style="padding:10px 0; font-size:13px; font-weight:600; color:#1e293b; text-align:right;">${receipt.client_name || '—'}</td>
        </tr>
        ${receipt.client_cpf_cnpj ? `<tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0; font-size:13px; color:#64748b;">CPF/CNPJ</td>
          <td style="padding:10px 0; font-size:13px; font-weight:600; color:#1e293b; text-align:right;">${receipt.client_cpf_cnpj}</td>
        </tr>` : ''}
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0; font-size:13px; color:#64748b;">Forma de Pagamento</td>
          <td style="padding:10px 0; font-size:13px; font-weight:600; color:#1e293b; text-align:right;">${receipt.payment_method || '—'}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 0; font-size:13px; color:#64748b;">Data do Pagamento</td>
          <td style="padding:10px 0; font-size:13px; font-weight:600; color:#1e293b; text-align:right;">${receipt.payment_date ? new Date(receipt.payment_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
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
            <th style="text-align:right; padding:11px 14px; font-size:11px; font-weight:700; color:#fff; width:110px;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${services.map((s, i) => `<tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'}; border-bottom:1px solid #e2e8f0;">
              <td style="padding:12px 14px; font-size:13px; color:#1e293b; font-weight:600;">${s.name || 'Serviço'}${s.description ? `<div style="font-size:12px;color:#94a3b8;font-weight:400;margin-top:2px;">${s.description}</div>` : ''}</td>
              <td style="text-align:right; padding:12px 14px; font-size:13px; font-weight:700; color:#064e3b;">R$ ${fmt(s.amount)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <!-- Botão PDF -->
    ${receipt.pdf_url ? `
    <div style="text-align:center; margin:28px 0;">
      <a href="${receipt.pdf_url}" target="_blank" style="display:inline-block; background:#064e3b; color:#fff; padding:15px 36px; border-radius:8px; font-size:15px; font-weight:700; text-decoration:none; letter-spacing:0.3px;">
        📄 Abrir Recibo Completo (PDF)
      </a>
    </div>` : ''}

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
        to: receipt.client_email,
        subject: `Recibo Nº ${receipt.receipt_number || ''} - ${receipt.title || 'Recibo de Honorários'}`,
        html: emailBody,
        fromName: user.full_name || 'Consultor PRUMO',
        replyTo: user.email,
      });
      emailSent = true;
    } catch (emailErr) {
      sendError = emailErr.message || 'Erro ao enviar e-mail';
      console.error('Erro no sendEmailViaResend:', sendError);
    }

    if (!emailSent) {
      return Response.json({ error: `Falha ao enviar e-mail: ${sendError}` }, { status: 500 });
    }

    await base44.asServiceRole.entities.Receipt.update(receipt_id, {
      status: 'Enviado',
      sent_at: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[sendReceiptEmail] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
