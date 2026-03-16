import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, event, eventId } = await req.json();
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlecalendar");
    const BASE_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    if (action === 'create') {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(event)
      });
      const data = await res.json();
      return Response.json(data);
    }

    if (action === 'update') {
      const res = await fetch(`${BASE_URL}/${eventId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(event)
      });
      const data = await res.json();
      return Response.json(data);
    }

    if (action === 'delete') {
      await fetch(`${BASE_URL}/${eventId}`, { method: 'DELETE', headers });
      return Response.json({ success: true });
    }

    if (action === 'list') {
      const { timeMin, timeMax } = event || {};
      const params = new URLSearchParams({
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '100'
      });
      const res = await fetch(`${BASE_URL}?${params}`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});