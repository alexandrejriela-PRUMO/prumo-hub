import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function getAccessToken(email, pem) {
  const b64url = (o) => btoa(JSON.stringify(o)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const now = Math.floor(Date.now() / 1000);
  const sigInput = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({
    iss: email,
    scope: 'https://www.googleapis.com/auth/earthengine.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })}`;

  const normalized = pem.replace(/\\n/g, '\n');
  const keyPem = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const keyBytes = Uint8Array.from(atob(keyPem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', keyBytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(sigInput));
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const jwt = `${sigInput}.${sigStr}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const email = Deno.env.get('GEE_SERVICE_ACCOUNT_EMAIL');
    const key = Deno.env.get('GEE_PRIVATE_KEY');
    const projectId = Deno.env.get('GEE_PROJECT_ID');

    const token = await getAccessToken(email, key);

    const res = await fetch(`https://earthengine.googleapis.com/v1/projects/${projectId}/algorithms`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    const algos = (data.algorithms || []);
    const names = algos
      .map(a => a.name.replace('algorithms/', ''))
      .filter(n => n.includes('Collection') || n.includes('Filter') || n.includes('Reducer') || n.includes('ImageCollection'))
      .sort();
    return Response.json({ names, total: names.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});