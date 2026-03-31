import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { code } = body;

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
    const appUrl = 'https://hub.prumo.site';
    const redirectUri = `${appUrl}/GoogleCalendarCallback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return Response.json({ error: tokenData.error_description || tokenData.error }, { status: 400 });
    }

    // Get user's Google email
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    const expiry = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Save or update token for this user
    const existing = await base44.asServiceRole.entities.UserGoogleToken.filter({ user_email: user.email });
    
    const tokenRecord = {
      user_email: user.email,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: expiry,
      google_email: userInfo.email,
      connected: true,
    };

    if (existing.length > 0) {
      await base44.asServiceRole.entities.UserGoogleToken.update(existing[0].id, tokenRecord);
    } else {
      await base44.asServiceRole.entities.UserGoogleToken.create(tokenRecord);
    }

    return Response.json({ success: true, google_email: userInfo.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});