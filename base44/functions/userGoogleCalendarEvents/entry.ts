import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CONNECTOR_ID = '69cb271252e5869906bb2e32';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, event, eventId } = body;

    const accessToken = await base44.connectors.getCurrentAppUserAccessToken(CONNECTOR_ID);

    // Listar eventos
    if (!action || action === 'list') {
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 31).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error(`Google API error: ${res.status}`);
      const data = await res.json();
      return Response.json({ success: true, events: data.items || [] });
    }

    // Criar evento
    if (action === 'create') {
      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        }
      );
      if (!res.ok) throw new Error(`Google API error: ${res.status}`);
      const data = await res.json();
      return Response.json({ success: true, event: data });
    }

    // Atualizar evento
    if (action === 'update') {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        }
      );
      if (!res.ok) throw new Error(`Google API error: ${res.status}`);
      const data = await res.json();
      return Response.json({ success: true, event: data });
    }

    // Deletar evento
    if (action === 'delete') {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!res.ok && res.status !== 404) throw new Error(`Google API error: ${res.status}`);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('Erro userGoogleCalendarEvents:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});