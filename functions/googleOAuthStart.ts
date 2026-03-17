import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://prumo.base44.app';
    const redirectUri = `${appUrl}/GoogleCalendarCallback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email',
      access_type: 'offline',
      prompt: 'consent',
      state: user.email,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return Response.json({ url: authUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});