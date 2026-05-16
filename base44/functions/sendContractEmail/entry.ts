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

    const { contract_id, to, subject, message, pdf_url } = await req.json();

    if (!contract_id || !to || !subject) {
      return Response.json({ error: 'Campos obrigatórios: contract_id, to, subject' }, { status: 400 });
    }

    const contract = await base44.entities.ClientContract.get(contract_id);
    if (!contract) {
      return Response.json({ error: 'Contrato não encontrado' }, { status: 404 });
    }
    if (contract.consultor_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customMessage = message
      ? message.replace(/\n/g, '<br>')
      : `Prezado(a) ${contract.client_name || 'Cliente'},<br><br>Segue o contrato referente ao serviço de <strong>${contract.contract_type}</strong>.`;

    const pdfSection = pdf_url
      ? `<div style="margin:24px 0; text-align:center;">
          <a href="${pdf_url}" target="_blank" style="display:inline-block; background:#1B4332; color:#fff; padding:14px 32px; border-radius:8px; font-weight:700; font-size:15px; text-decoration:none;">
            📄 Visualizar / Baixar Contrato (PDF)
          </a>
        </div>`
      : '';

    const emailBody = `
      <html><body style="font-family:Arial,sans-serif;color:#333;margin:0;padding:0;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#064e3b,#1B4332);color:#fff;padding:28px 32px;border-radius:12px 12px 0 0;">
            <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#6ee7b7;font-weight:600;">PRUMO HUB</p>
            <h2 style="margin:0;font-size:22px;font-weight:800;">Contrato Enviado</h2>
            <p style="margin:6px 0 0 0;font-size:14px;color:#a7f3d0;">${contract.contract_type}</p>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px;">
            <p style="font-size:15px;line-height:1.7;color:#374151;">${customMessage}</p>
            ${pdfSection}

            <!-- Nota reply-to -->
            <div style="background:#ecfdf5; border:1px solid #d1fae5; border-radius:8px; padding:12px 16px; margin:20px 0;">
              <p style="margin:0; font-size:13px; color:#065f46;">
                💬 Para responder a este contrato, basta responder diretamente a este e-mail — sua mensagem chegará ao consultor responsável.
              </p>
            </div>

            <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
              <p style="margin:0;">Enviado por <strong style="color:#1B4332;">${user.full_name || user.email}</strong> via PRUMO HUB</p>
              <p style="margin:4px 0 0 0;">Dúvidas? Responda este e-mail ou entre em contato: <strong>${user.email}</strong></p>
            </div>
          </div>
        </div>
      </body></html>
    `;

    await sendEmailViaResend({
      to,
      subject,
      html: emailBody,
      fromName: user.full_name || 'Consultor PRUMO',
      replyTo: user.email,
    });

    // Atualizar status do contrato para "Em Assinatura" se ainda for Proposta
    if (contract.status === 'Proposta') {
      await base44.entities.ClientContract.update(contract_id, { status: 'Em Assinatura' });
    }

    return Response.json({ success: true, message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar e-mail do contrato:', error);
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
});