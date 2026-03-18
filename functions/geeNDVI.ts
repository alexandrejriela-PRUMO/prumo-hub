import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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
  const jwt = `${sigInput}.${sigStr}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('GEE auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

function buildExpr(geometry, startDate, endDate) {
  return {
    result: '4',
    values: {
      '0': { functionInvocationValue: { functionName: 'ImageCollection.load', arguments: { id: { constantValue: 'MODIS/061/MOD13Q1' } } } },
      '1': { functionInvocationValue: { functionName: 'Collection.filterBounds', arguments: { collection: { valueReference: '0' }, geometry: { constantValue: geometry } } } },
      '2': { functionInvocationValue: { functionName: 'Collection.filterDate', arguments: { collection: { valueReference: '1' }, start_time: { constantValue: startDate }, end_time: { constantValue: endDate } } } },
      '3': { functionInvocationValue: { functionName: 'ImageCollection.reduce', arguments: { collection: { valueReference: '2' }, reducer: { functionInvocationValue: { functionName: 'Reducer.mean', arguments: {} } } } } },
      '4': { functionInvocationValue: { functionName: 'Image.reduceRegion', arguments: {
        image: { valueReference: '3' },
        reducer: { functionInvocationValue: { functionName: 'Reducer.mean', arguments: {} } },
        geometry: { constantValue: geometry },
        scale: { constantValue: 500 },
        maxPixels: { constantValue: 100000000 },
        bestEffort: { constantValue: true }
      }}}
    }
  };
}

async function computeNDVI(projectId, token, geometry, startDate, endDate) {
  const res = await fetch(`https://earthengine.googleapis.com/v1/projects/${projectId}/value:compute`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression: buildExpr(geometry, startDate, endDate) }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  const raw = data.result?.NDVI ?? data.result?.values?.NDVI ?? null;
  return raw != null ? raw / 10000 : null;
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

    let privateKey;
    try {
      const parsed = JSON.parse(keyRaw);
      privateKey = parsed.private_key || keyRaw;
    } catch {
      privateKey = keyRaw;
    }

    console.log('KEY_START:', JSON.stringify(privateKey?.substring(0, 80)));
    console.log('KEY_HAS_LITERAL_SLASH_N:', privateKey?.includes('\\n'));
    console.log('KEY_HAS_REAL_NEWLINE:', privateKey?.includes('\n'));

    let geometry;
    if (boundaries_geojson) {
      const gj = typeof boundaries_geojson === 'string' ? JSON.parse(boundaries_geojson) : boundaries_geojson;
      geometry = gj.type === 'FeatureCollection' ? gj.features[0]?.geometry :
                 gj.type === 'Feature' ? gj.geometry : gj;
    } else if (center_coordinates) {
      const [lat, lng] = String(center_coordinates).split(',').map(Number);
      const d = 0.045;
      geometry = { type: 'Polygon', coordinates: [[[lng-d,lat-d],[lng+d,lat-d],[lng+d,lat+d],[lng-d,lat+d],[lng-d,lat-d]]] };
    } else {
      return Response.json({ error: 'Geometria não fornecida' }, { status: 400 });
    }

    let projectId = serviceEmail?.match(/@([^.]+)\.iam\.gserviceaccount\.com/)?.[1];
    if (!projectId) projectId = Deno.env.get('GEE_PROJECT_ID') || null;
    if (!projectId) throw new Error('Não foi possível extrair o Project ID. Configure GEE_PROJECT_ID.');

    const token = await getGEEToken(serviceEmail, privateKey);

    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const startDate = new Date(now - 90 * 86400000).toISOString().split('T')[0];
    const prevEnd = new Date(now - 365 * 86400000).toISOString().split('T')[0];
    const prevStart = new Date(now - 455 * 86400000).toISOString().split('T')[0];

    const [ndviCurrent, ndviPrev] = await Promise.all([
      computeNDVI(projectId, token, geometry, startDate, endDate),
      computeNDVI(projectId, token, geometry, prevStart, prevEnd),
    ]);

    if (ndviCurrent === null) {
      return Response.json({ error: 'Sem imagens MODIS disponíveis para o período/área selecionado.', ndvi_mean: null });
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