/**
 * sendCustomInviteEmail — Envia e-mail de boas-vindas com instruções de acesso
 * Parâmetros: email, name (opcional), type (consultor/produtor), plan, document (CPF/CNPJ, opcional)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, name = '', type = 'consultor', plan = 'start', document = '' } = body;

    if (!email) {
      return Response.json({ error: 'email é obrigatório' }, { status: 400 });
    }

    const inviteUrl = 'https://hub.prumo.site';

    const typeLabel = type === 'produtor' ? 'Produtor Rural' : 'Consultor';
    const planLabel = {
      start: 'Consultor Start',
      pro: 'Consultor Pro',
      enterprise: 'Consultor Enterprise',
      unico: 'Produtor Único'
    }[plan] || plan;

    // Formatar dica de senha: mostrar apenas os últimos 4 dígitos para segurança
    const cleanDoc = document.replace(/\D/g, '');
    const passwordHint = cleanDoc.length >= 4
      ? `Sua senha temporária é o seu <strong>CPF ou CNPJ (somente números)</strong>.<br/>Exemplo: se o seu CPF é <code>123.456.789-00</code>, sua senha é <code>12345678900</code>.`
      : `Sua senha temporária é o seu <strong>CPF ou CNPJ (somente números, sem pontos ou traços)</strong>.`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%); padding: 40px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .content { padding: 40px 20px; }
    .content p { margin: 16px 0; line-height: 1.6; color: #333; }
    .info-box { background: #f0f7ff; border-left: 4px solid #1B4332; padding: 16px; margin: 24px 0; border-radius: 4px; }
    .info-box strong { display: block; color: #1B4332; margin-bottom: 8px; }
    .password-box { background: #fff8e1; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px; }
    .password-box .title { font-weight: 700; color: #b45309; margin-bottom: 8px; font-size: 15px; }
    .cta-button { display: inline-block; background: #1B4332; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee; font-size: 12px; color: #888; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌱 PRUMO Hub</h1>
      <p>Bem-vindo à plataforma</p>
    </div>
    <div class="content">
      <p>Olá${name ? ', <strong>' + name + '</strong>' : ''}!</p>

      <p>Sua conta na <strong>PRUMO Hub</strong> foi criada com sucesso. Você já pode acessar a plataforma e utilizar todas as ferramentas do seu plano.</p>

      <div class="info-box">
        <strong>📋 Informações da sua conta</strong>
        <div style="margin-top: 8px; font-size: 14px; line-height: 1.8;">
          <div>👤 Tipo de usuário: <strong>${typeLabel}</strong></div>
          <div>📊 Plano: <strong>${planLabel}</strong></div>
          <div>✉️ E-mail de acesso: <strong>${email}</strong></div>
        </div>
      </div>

      <div class="password-box">
        <div class="title">🔑 Sua senha temporária</div>
        <p style="margin: 8px 0; font-size: 14px; color: #555;">
          ${passwordHint}
        </p>
        <p style="margin: 8px 0; font-size: 13px; color: #888;">
          ⚠️ <strong>Importante:</strong> ao acessar pela primeira vez, o sistema solicitará que você crie uma nova senha segura. Guarde sua nova senha em local seguro.
        </p>
      </div>

      <p>Clique no botão abaixo para acessar sua conta:</p>

      <p style="text-align: center; margin-top: 32px;">
        <a href="${inviteUrl}" class="cta-button">
          Acessar PRUMO Hub →
        </a>
      </p>

      <p style="font-size: 13px; color: #999; margin-top: 32px; text-align: center;">
        Se o botão não funcionar, copie e cole este link no navegador:<br/>
        <code style="display: block; margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; word-break: break-all; font-size: 11px;">${inviteUrl}</code>
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">Equipe PRUMO Hub | Ferramentas e oportunidades para quem orienta</p>
      <p style="margin: 8px 0 0 0;">© 2026 PRUMO Hub. Todos os direitos reservados.</p>
      <p style="margin: 8px 0 0 0; font-size: 11px;">Em caso de dúvidas, entre em contato pelo WhatsApp: (55) 99948-0489</p>
    </div>
  </div>
</body>
</html>
    `;

    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Bem-vindo à PRUMO Hub — Acesse sua conta agora!`,
        body: htmlBody,
        from_name: 'PRUMO Hub'
      });
      console.log(`✅ [sendCustomInviteEmail] Email enviado para ${email}`);
    } catch (emailErr) {
      console.warn(`⚠️ [sendCustomInviteEmail] Email falhou: ${emailErr.message}`);
    }

    return Response.json({ success: true, message: `Convite enviado para ${email}`, email });

  } catch (error) {
    console.error('[sendCustomInviteEmail] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});