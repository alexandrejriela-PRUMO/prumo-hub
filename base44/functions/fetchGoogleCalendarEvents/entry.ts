import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = '6a162a2643253d1b5412e449';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[GCal] user:', user.email, 'connector_id:', CONNECTOR_ID);

    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
      console.log('[GCal] connection found for', CONNECTOR_ID);
    } catch (connErr) {
      console.error('[GCal] No connection on', CONNECTOR_ID, '-', connErr.message);
      // Try fallback connectors
      const FALLBACKS = ['69cb271252e5869906bb2e32', '69cb25ebd88e121c980a50c0'];
      let found = false;
      for (const fbId of FALLBACKS) {
        try {
          const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(fbId);
          accessToken = conn.accessToken;
          console.log('[GCal] found connection on fallback connector:', fbId);
          found = true;
          break;
        } catch (e) {
          console.warn('[GCal] No connection on fallback', fbId, '-', e.message);
        }
      }
      if (!found) {
        return Response.json({ error: 'No active connection found for this connector' }, { status: 404 });
      }
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