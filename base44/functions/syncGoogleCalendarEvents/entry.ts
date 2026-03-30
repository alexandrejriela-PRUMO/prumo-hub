import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Busca o token do usuário
    const tokens = await base44.entities.UserGoogleToken.filter({
      user_email: user.email,
      connected: true,
    });

    if (tokens.length === 0) {
      return Response.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    const userToken = tokens[0];

    // Usa o connector autorizado para sincronizar
    const connection = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const accessToken = connection.accessToken;

    // Busca eventos do Google Calendar do mês atual
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=250`,
      {
        headers: {
          'Authorization': `Bearer ${userToken.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`);
    }

    const data = await response.json();

    return Response.json({
      success: true,
      events: data.items || [],
      count: (data.items || []).length,
    });
  } catch (error) {
    console.error('Erro ao sincronizar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});