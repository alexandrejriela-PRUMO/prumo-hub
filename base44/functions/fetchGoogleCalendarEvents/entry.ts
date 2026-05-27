import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = '6a162a2643253d1b5412e449';
const FALLBACKS = ['69cb271252e5869906bb2e32', '69cb25ebd88e121c980a50c0'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[GCal] user:', user.email, 'connector_id:', CONNECTOR_ID);

    let accessToken;

    // Use base44.connectors (user-scoped), NOT asServiceRole
    const allIds = [CONNECTOR_ID, ...FALLBACKS];
    for (const id of allIds) {
      try {
        const conn = await base44.connectors.getCurrentAppUserConnection(id);
        if (conn?.accessToken) {
          accessToken = conn.accessToken;
          console.log('[GCal] connection found on connector:', id);
          break;
        }
      } catch (e) {
        console.warn('[GCal] No connection on connector', id, '-', e.message);
      }
    }

    if (!accessToken) {
      return Response.json({ error: 'No active Google Calendar connection found' }, { status: 404 });
    }

    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=250&singleEvents=true&orderBy=startTime`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: err.error?.message || 'Google API error' }, { status: res.status });
    }

    const data = await res.json();
    return Response.json({ events: data.items || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});