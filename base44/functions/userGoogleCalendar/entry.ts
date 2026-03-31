import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function refreshAccessToken(base44, tokenRecord) {
  const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: tokenRecord.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error('Erro ao renovar token: ' + data.error);

  const expiry = new Date(Date.now() + (data.expires_in * 1000)).toISOString();
  await base44.asServiceRole.entities.UserGoogleToken.update(tokenRecord.id, {
    access_token: data.access_token,
    token_expiry: expiry,
  });

  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, event, eventId } = body;

    // Get user's token
    const tokens = await base44.asServiceRole.entities.UserGoogleToken.filter({ user_email: user.email });
    if (!tokens || tokens.length === 0) {
      return Response.json({ error: 'NOT_CONNECTED', message: 'Google Calendar não conectado' }, { status: 403 });
    }

    let tokenRecord = tokens[0];
    let accessToken = tokenRecord.access_token;

    // Refresh if expired
    const isExpired = new Date(tokenRecord.token_expiry) <= new Date(Date.now() + 60000);
    if (isExpired) {
      accessToken = await refreshAccessToken(base44, tokenRecord);
    }

    const baseUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    if (action === 'list') {
      const now = new Date();
      const timeMin = event?.timeMin || new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const timeMax = event?.timeMax || new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();
      const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
      const res = await fetch(`${baseUrl}?${params}`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    if (action === 'create') {
      const res = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(event) });
      const data = await res.json();
      return Response.json(data);
    }

    if (action === 'update') {
      const res = await fetch(`${baseUrl}/${eventId}`, { method: 'PUT', headers, body: JSON.stringify(event) });
      const data = await res.json();
      return Response.json(data);
    }

    if (action === 'delete') {
      await fetch(`${baseUrl}/${eventId}`, { method: 'DELETE', headers });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});