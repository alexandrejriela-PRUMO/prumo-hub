import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { code } = payload;

    if (!code) {
      return Response.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    // Troca o código por um access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/GoogleCalendarCallback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new Error(`Token exchange failed: ${error.error_description}`);
    }

    const tokenData = await tokenResponse.json();

    // Busca informações do usuário Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const googleUserInfo = await userInfoResponse.json();

    // Salva ou atualiza o token no banco de dados
    const existingTokens = await base44.asServiceRole.entities.UserGoogleToken.filter({
      user_email: user.email,
    });

    if (existingTokens.length > 0) {
      // Atualiza token existente
      await base44.asServiceRole.entities.UserGoogleToken.update(existingTokens[0].id, {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || existingTokens[0].refresh_token,
        token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        google_email: googleUserInfo.email,
        connected: true,
      });
    } else {
      // Cria novo token
      await base44.asServiceRole.entities.UserGoogleToken.create({
        user_email: user.email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        google_email: googleUserInfo.email,
        connected: true,
      });
    }

    return Response.json({
      success: true,
      message: 'Google Calendar connected successfully',
      google_email: googleUserInfo.email,
    });
  } catch (error) {
    console.error('Google Calendar callback error:', error);
    return Response.json(
      { error: error.message || 'Failed to authorize Google Calendar' },
      { status: 500 }
    );
  }
});