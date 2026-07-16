import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

const CONNECTOR_ID = '6a162a2643253d1b5412e449';

async function getAccessToken(base44) {
  const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
  return conn?.accessToken || null;
}

Deno.serve(async (req) => {
  try {
    // Clone req before createClientFromRequest consumes the body
    const bodyText = await req.text();
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, event } = JSON.parse(bodyText);
    // action: 'create' | 'update' | 'delete'
    // event: AgendaEvent object

    let accessToken;
    try {
      accessToken = await getAccessToken(base44);
    } catch (e) {
      // No connection — skip silently
      return Response.json({ skipped: true, reason: 'no_connection' });
    }

    if (!accessToken) {
      return Response.json({ skipped: true, reason: 'no_connection' });
    }

    const BASE_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    // Build GCal event body
    const buildGCalEvent = (ev) => {
      const body = {
        summary: ev.title,
        description: ev.description || '',
        location: ev.location || '',
      };

      if (ev.all_day) {
        const date = (ev.start_datetime || '').slice(0, 10);
        const endDate = (ev.end_datetime || ev.start_datetime || '').slice(0, 10);
        body.start = { date };
        body.end = { date: endDate || date };
      } else {
        body.start = { dateTime: ev.start_datetime, timeZone: 'America/Sao_Paulo' };
        body.end = { dateTime: ev.end_datetime || ev.start_datetime, timeZone: 'America/Sao_Paulo' };
      }

      if (ev.reminder_minutes != null) {
        body.reminders = {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: Number(ev.reminder_minutes) }],
        };
      }

      return body;
    };

    if (action === 'delete') {
      const gcalId = event.google_calendar_event_id;
      if (!gcalId) return Response.json({ skipped: true, reason: 'no_gcal_id' });

      const res = await fetch(`${BASE_URL}/${gcalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 404) return Response.json({ deleted: false, reason: 'not_found_in_gcal' });
      if (!res.ok && res.status !== 204) {
        const err = await res.text();
        console.error('[GCal Sync] Delete error:', err);
        return Response.json({ error: 'GCal delete failed' }, { status: 500 });
      }

      return Response.json({ deleted: true });
    }

    if (action === 'create') {
      const body = buildGCalEvent(event);
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('[GCal Sync] Create error:', err);
        return Response.json({ error: err.error?.message }, { status: res.status });
      }

      const created = await res.json();
      return Response.json({ google_calendar_event_id: created.id });
    }

    if (action === 'update') {
      const gcalId = event.google_calendar_event_id;
      if (!gcalId) {
        // Evento não tem ID no GCal ainda — criar
        const body = buildGCalEvent(event);
        const res = await fetch(BASE_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          return Response.json({ error: err.error?.message }, { status: res.status });
        }
        const created = await res.json();
        return Response.json({ google_calendar_event_id: created.id });
      }

      const body = buildGCalEvent(event);
      const res = await fetch(`${BASE_URL}/${gcalId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 404) {
        // Evento foi deletado no GCal — recriar
        const res2 = await fetch(BASE_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const created = await res2.json();
        return Response.json({ google_calendar_event_id: created.id });
      }

      if (!res.ok) {
        const err = await res.json();
        return Response.json({ error: err.error?.message }, { status: res.status });
      }

      return Response.json({ updated: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[GCal Sync] Fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});