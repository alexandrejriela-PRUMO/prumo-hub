import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { member_email, member_name, member_role, consultor_name, app_url = 'https://prumo.app' } = body;

    if (!member_email) {
      return Response.json({ error: 'member_email é obrigatório' }, { status: 400 });
    }

    console.log(`📧 [SEND_INVITE] Iniciando envio para ${member_email} | Função: ${member_role}`);

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
    .cta-button { display: inline-block; background: #1B4332; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌱 PRUMO Hub</h1>
      <p>Convite para Equipe de Consultoria</p>
    </div>
    <div class="content">
      <p>Olá${member_name ? ', <strong>' + member_name + '</strong>' : ''}!</p>
      
      <p><strong>${consultor_name || 'Um Consultor'}</strong> convidou você para fazer parte da equipe de consultoria no <strong>PRUMO Hub</strong>.</p>
      
      <div class="info-box">
        <strong>📋 Detalhes do Convite</strong>
        <div style="margin-top: 8px; font-size: 14px;">
          <div>🔧 Função: <strong>${member_role || 'Membro da Equipe'}</strong></div>
          <div>👤 Consultor: <strong>${consultor_name || 'PRUMO Hub'}</strong></div>
          <div>⏰ Válido por: <strong>7 dias</strong></div>
        </div>
      </div>
      
      <p>Ao fazer seu primeiro login no PRUMO Hub, seu perfil será configurado automaticamente com as permissões de <strong>${member_role || 'Membro'}</strong>, dando-lhe acesso às ferramentas de consultoria.</p>
      
      <p style="text-align: center; margin-top: 32px;">
        <a href="${app_url}" class="cta-button">
          Acessar PRUMO Hub →
        </a>
      </p>
      
      <p style="font-size: 13px; color: #999; margin-top: 32px; text-align: center;">
        Se o botão não funciona, copie e cole este link no navegador:<br/>
        <code style="display: block; margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; word-break: break-all; font-size: 11px;">${app_url}</code>
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">Equipe PRUMO Hub | Ferramentas e oportunidades para quem orienta</p>
      <p style="margin: 8px 0 0 0;">© 2026 PRUMO Hub. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Enviar o email via integração Base44
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: member_email,
      subject: `Você foi convidado para a equipe PRUMO Hub por ${consultor_name || 'um Consultor'}`,
      body: htmlBody,
      from_name: 'PRUMO Hub'
    });

    console.log(`✅ [SEND_INVITE] Email enviado com sucesso para ${member_email}`);

    return Response.json({
      success: true,
      message: `Convite enviado para ${member_email}`,
      email: member_email,
      role: member_role
    });

  } catch (error) {
    console.error('[sendTeamInviteEmail] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});