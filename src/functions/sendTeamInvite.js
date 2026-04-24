// @ts-nocheck
// deno-lint-ignore no-undef
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, name, member_role, target_user_type, invite_link } = await req.json();

    if (!email || !invite_link) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const subject = 'Convite para Equipe - PRUMO Hub';
    const userType = target_user_type === 'client_consultor' ? 'Visualizador de Propriedade' : 'Membro da Equipe';

    const body = `
Olá ${name || 'Usuário'},

Você foi convidado para ser um ${userType} na plataforma PRUMO Hub!

Função: ${member_role || 'Sem função definida'}

Para aceitar o convite, clique no link abaixo:
${invite_link}

Este link expira em 7 dias. Se não conseguir clicar, copie e cole a URL acima no seu navegador.

Qualquer dúvida, entre em contato com o suporte.

Atenciosamente,
PRUMO Hub
    `.trim();

    // Usar SendEmail da integração Core com to em vez de email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: subject,
      body: body,
      from_name: 'PRUMO Hub'
    });

    return Response.json({ success: true, message: 'Email enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar convite:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});