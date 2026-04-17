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
    const { property_name, viewer_email, viewer_name, property_id } = body;

    if (!viewer_email || !property_name || !property_id) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Enviar email para o visualizador
    const subject = `Você foi adicionado como visualizador de ${property_name} na PRUMO Hub`;
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
          .button { display: inline-block; background-color: #40916C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bem-vindo à PRUMO Hub</h1>
          </div>
          <div class="content">
            <p>Olá ${viewer_name || 'usuário'},</p>
            <p>Você foi adicionado como <strong>visualizador</strong> da propriedade <strong>"${property_name}"</strong> na PRUMO Hub.</p>
            <p>Como visualizador, você terá acesso a:</p>
            <ul>
              <li>Documentos da propriedade</li>
              <li>Licenças e processos</li>
              <li>Alertas ambientais</li>
              <li>Mapa interativo</li>
            </ul>
            <p>Acesse a plataforma para visualizar todos os detalhes:</p>
            <a href="https://prumo.base44.app/" class="button">Acessar PRUMO Hub</a>
            <p style="margin-top: 20px; font-size: 12px;">Se tiver dúvidas, entre em contato com o consultor responsável.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 PRUMO Hub. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await base44.integrations.Core.SendEmail({
      to: viewer_email,
      subject: subject,
      body: htmlBody,
      from_name: 'PRUMO Hub'
    });

    return Response.json({ success: true, message: 'Email enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});