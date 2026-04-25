import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Método não suportado' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { email, name, member_role, target_user_type, invite_link } = body;

    if (!email || !member_role || !target_user_type) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Determinar tipo de acesso
    const accessType = target_user_type === 'equipe' ? 'Membro da Equipe' : 'Visualizador de Propriedade';
    
    const subject = `Você foi convidado para acessar a PRUMO Hub`;
    const htmlBody = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1B4332; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px; background-color: #f9f9f9; margin-top: 20px; border-radius: 8px; }
          .button { display: inline-block; background-color: #40916C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          .highlight { background-color: #fef3c7; padding: 10px; border-left: 4px solid #f59e0b; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Convite para PRUMO Hub</h1>
          </div>
          <div class="content">
            <p>Olá ${name || 'usuário'},</p>
            <p>Você foi convidado para acessar a <strong>PRUMO Hub</strong> como <strong>${accessType}</strong>.</p>
            
            <div class="highlight">
              <strong>Função:</strong> ${member_role || 'Não especificada'}
            </div>

            <p>O que você terá acesso:</p>
            <ul>
              ${target_user_type === 'equipe' 
                ? `<li>Painel completo do escritório</li>
                   <li>Clientes e propriedades</li>
                   <li>Documentos e contratos</li>
                   <li>Financeiro (conforme permissões)</li>`
                : `<li>Visualização de propriedades</li>
                   <li>Documentos e licenças</li>
                   <li>Alertas ambientais</li>
                   <li>Mapa interativo</li>`
              }
            </ul>

            <p>Clique no botão abaixo para aceitar o convite e criar sua conta:</p>
            <a href="${invite_link}" class="button">Aceitar Convite</a>

            <p style="margin-top: 20px; font-size: 12px;">
              <strong>Importante:</strong> Este link expira em 7 dias. Se não conseguir acessar, entre em contato com o consultor que o convidou.
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2026 PRUMO Hub. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Convidar usuário na plataforma (cria conta e envia email oficial)
    // role "user" pois equipe/client_consultor não são admins da plataforma
    await base44.users.inviteUser(email, 'user');

    return Response.json({ success: true, message: 'Convite enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar convite:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});