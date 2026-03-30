import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Gera o link de autorização do Google Calendar
    const connection = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    
    // Retorna informações para o frontend gerar o link de autorização
    return Response.json({
      success: true,
      user_email: user.email,
      message: 'Use o link no Google Calendar para autorizar',
    });
  } catch (error) {
    console.error('Erro ao gerar auth:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});