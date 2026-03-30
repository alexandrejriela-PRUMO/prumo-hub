import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Usa o shared connector autorizado para Google Calendar
    const connection = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const accessToken = connection.accessToken;

    // Valida o token fetching eventos do calendário do usuário
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to validate Google Calendar access');
    }

    const calendarData = await response.json();

    return Response.json({
      success: true,
      user_email: user.email,
      calendar: calendarData.summary,
      message: 'Google Calendar authorized successfully',
    });
  } catch (error) {
    console.error('Erro ao autorizar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});