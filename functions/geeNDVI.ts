import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import ee from 'npm:@google/earthengine@0.1.391';

async function getGEEToken(email, pem) {
  const b64url = (o) => btoa(JSON.stringify(o)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const now = Math.floor(Date.now() / 1000);
  const sigInput = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({
    iss: email,
    scope: 'https://www.googleapis.com/auth/earthengine.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })}`;

  const keyPem = pem.replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r/g, '');
  const keyBytes = Uint8Array.from(atob(keyPem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', keyBytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(sigInput));
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${sigInput}.${sigStr}`;
}

async function getAccessToken(email, privateKey) {
  const jwt = await getGEEToken(email, privateKey);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('GEE auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

function classify(ndvi) {
  if (ndvi >= 0.6) return { status: 'Vegetação Densa e Saudável', color: 'emerald', emoji: '🌿', desc: 'Excelente cobertura vegetal. Vegetação densa, ativa e bem estabelecida.' };
  if (ndvi >= 0.4) return { status: 'Vegetação Saudável', color: 'green', emoji: '🌱', desc: 'Boa saúde da vegetação. Pastagem ou lavoura em bom estado de desenvolvimento.' };
  if (ndvi >= 0.25) return { status: 'Vegetação Moderada', color: 'yellow', emoji: '🌾', desc: 'Cobertura moderada. Pode indicar estresse hídrico, início de ciclo ou pastagem em rebrota.' };
  if (ndvi >= 0.1) return { status: 'Vegetação Escassa', color: 'orange', emoji: '⚠️', desc: 'Pouca vegetação ativa. Possível área degradada, solo em preparo ou pastagem rala.' };
  return { status: 'Solo Exposto / Degradado', color: 'red', emoji: '🏜️', desc: 'Mínima cobertura vegetal. Área possivelmente degradada, solo exposto ou período de seca intensa.' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { boundaries_geojson, center_coordinates } = await req.json();

    const serviceEmail = Deno.env.get('GEE_SERVICE_ACCOUNT_EMAIL');
    const keyRaw = Deno.env.get('GEE_PRIVATE_KEY');
    const projectId = Deno.env.get('GEE_PROJECT_ID') || serviceEmail?.match(/@([^.]+)\.iam\.gserviceaccount\.com/)?.[1];

    if (!serviceEmail || !keyRaw) throw new Error('GEE credentials not configured');
    if (!projectId) throw new Error('GEE project ID not found');

    const accessToken = await getAccessToken(serviceEmail, keyRaw);

    // Initialize ee with the access token
    await new Promise((resolve, reject) => {
      ee.data.setAuthToken('', 'Bearer', accessToken, 3600, [], () => resolve(), false);
      ee.initialize(null, null, resolve, reject, null, `projects/${projectId}`);
    });

    let geometry;
    if (boundaries_geojson) {
      const gj = typeof boundaries_geojson === 'string' ? JSON.parse(boundaries_geojson) : boundaries_geojson;
      const geom = gj.type === 'FeatureCollection' ? gj.features[0]?.geometry : gj.type === 'Feature' ? gj.geometry : gj;
      geometry = ee.Geometry(geom);
    } else if (center_coordinates) {
      const [lat, lng] = String(center_coordinates).split(',').map(Number);
      const d = 0.045;
      geometry = ee.Geometry.Polygon([[[lng-d,lat-d],[lng+d,lat-d],[lng+d,lat+d],[lng-d,lat+d],[lng-d,lat-d]]]);
    } else {
      return Response.json({ error: 'Geometria não fornecida' }, { status: 400 });
    }

    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const startDate = new Date(now - 90 * 86400000).toISOString().split('T')[0];
    const prevEnd = new Date(now - 365 * 86400000).toISOString().split('T')[0];
    const prevStart = new Date(now - 455 * 86400000).toISOString().split('T')[0];

    const getNDVI = (start, end) => new Promise((resolve, reject) => {
      const col = ee.ImageCollection('MODIS/061/MOD13Q1')
        .filterBounds(geometry)
        .filterDate(start, end)
        .select('NDVI');

      const mean = col.mean();
      mean.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry,
        scale: 500,
        maxPixels: 1e8,
        bestEffort: true,
      }).evaluate((result, err) => {
        if (err) return reject(new Error(err));
        const raw = result?.NDVI ?? null;
        resolve(raw != null ? raw / 10000 : null);
      });
    });

    const [ndviCurrent, ndviPrev] = await Promise.all([
      getNDVI(startDate, endDate),
      getNDVI(prevStart, prevEnd),
    ]);

    if (ndviCurrent === null) {
      return Response.json({ error: 'Sem imagens MODIS disponíveis para o período/área.', ndvi_mean: null });
    }

    const classification = classify(ndviCurrent);
    const trend = ndviPrev !== null ? ndviCurrent - ndviPrev : null;

    return Response.json({
      ndvi_mean: Math.round(ndviCurrent * 1000) / 1000,
      ndvi_prev_year: ndviPrev !== null ? Math.round(ndviPrev * 1000) / 1000 : null,
      trend: trend !== null ? Math.round(trend * 1000) / 1000 : null,
      ...classification,
      date_range: { start: startDate, end: endDate },
      source: 'MODIS Terra NDVI 16-day (250m)',
      analysis_date: endDate,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});