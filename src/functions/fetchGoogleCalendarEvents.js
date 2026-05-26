// @ts-nocheck
/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timeMin, timeMax } = await req.json().catch(() => ({}));

    const now = new Date();
    const rangeStart = timeMin || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const rangeEnd   = timeMax || new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

    const result = await base44.integrations['Agenda Google - Usuário'].ListEvents({
      calendarId: 'primary',
      timeMin: rangeStart,
      timeMax: rangeEnd,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });

    const items = result?.items || [];

    const events = items.map((ev) => {
      const startRaw = ev.start?.dateTime || ev.start?.date || '';
      const endRaw   = ev.end?.dateTime   || ev.end?.date   || '';
      return {
        id: `gcal_${ev.id}`,
        title: ev.summary || '(sem título)',
        start_datetime: startRaw,
        end_datetime: endRaw,
        description: ev.description || '',
        location: ev.location || '',
        _source: 'google',
        gcal_id: ev.id,
        html_link: ev.htmlLink || '',
      };
    });

    return Response.json({ events });
  } catch (error) {
    console.error('Erro ao buscar eventos do Google Calendar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
