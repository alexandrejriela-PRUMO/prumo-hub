import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_IDS = [
  '6a162a2643253d1b5412e449',
  '69cb271252e5869906bb2e32',
  '69cb25ebd88e121c980a50c0',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[GCal] user:', user.email);

    let accessToken;

    // asServiceRole.connectors.getCurrentAppUserConnection requires
    // createClientFromRequest so the runtime knows which user to look up
    for (const id of CONNECTOR_IDS) {
      try {
        const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(id);
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
      console.error('[GCal] Google API error:', err);
      return Response.json({ error: err.error?.message || 'Google API error' }, { status: res.status });
    }

    const data = await res.json();
    console.log('[GCal] events fetched:', data.items?.length || 0);
    return Response.json({ events: data.items || [] });
  } catch (error) {
    console.error('[GCal] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});