import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { budget_id, client_email, client_name, document_html } = await req.json();

    if (!budget_id || !client_email || !client_name || !document_html) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Buscar orçamento
    const budget = await base44.entities.Budget.get(budget_id);

    if (!budget) {
      return Response.json({ error: 'Budget not found' }, { status: 404 });
    }

    if (budget.consultor_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Preparar corpo do email com HTML
    const emailBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 900px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #1B4332 0%, #40916C 100%); color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Novo Orçamento Recebido</h2>
              <p>Orçamento nº ${budget.budget_number}</p>
            </div>
            
            <p>Prezado(a) ${client_name},</p>
            
            <p>Segue em anexo o orçamento referente aos serviços de <strong>${budget.title}</strong>.</p>
            
            <p>Informações principais:</p>
            <ul>
              <li><strong>Número:</strong> ${budget.budget_number}</li>
              <li><strong>Valor Total:</strong> R$ ${budget.total_amount?.toFixed(2) || '0.00'}</li>
              <li><strong>Validade:</strong> ${budget.validity_days} dias</li>
              <li><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</li>
            </ul>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              ${document_html}
            </div>

            <div class="footer">
              <p>Este é um email automático. Por favor, não responda diretamente a este endereço.</p>
              <p>Para dúvidas ou informações adicionais, entre em contato com ${user.full_name || user.email}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Enviar email
    await base44.integrations.Core.SendEmail({
      to: client_email,
      subject: `Orçamento ${budget.budget_number} - ${budget.title}`,
      body: emailBody,
      from_name: user.full_name || 'Consultor'
    });

    return Response.json({
      success: true,
      message: 'Email enviado com sucesso',
      budget_id
    });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return Response.json({
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});