import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── EE expression helpers ──────────────────────────────────────────────────
const c = (val) => ({ constantValue: val });
const fn = (name, args = {}) => ({ functionInvocationValue: { functionName: name, arguments: args } });

function buildGeometry(geom) {
  return fn('Geometry', { geoJson: c(geom), geodesic: c(false) });
}

function buildNDVIImage(geomExpr, start, end, dataset) {
  const isLandsat = dataset === 'landsat8';
  const colId = isLandsat ? 'LANDSAT/LC08/C02/T1_L2' : 'COPERNICUS/S2_SR_HARMONIZED';
  const nir = isLandsat ? 'SR_B5' : 'B8';
  const red = isLandsat ? 'SR_B4' : 'B4';

  return fn('Image.normalizedDifference', {
    input: fn('ImageCollection.median', {
      collection: fn('ImageCollection.select', {
        input: fn('ImageCollection.filterDate', {
          collection: fn('ImageCollection.filterBounds', {
            collection: fn('ImageCollection.load', { id: c(colId) }),
            geometry: geomExpr
          }),
          start: c(start),
          end: c(end)
        }),
        bandSelectors: c([nir, red])
      })
    }),
    bandNames: c([nir, red])
  });
}

function buildStatsExpr(geojsonGeom, start, end, dataset) {
  const scale = dataset === 'landsat8' ? 30 : 10;
  const geomExpr = buildGeometry(geojsonGeom);
  const ndvi = fn('Image.rename', { input: buildNDVIImage(geomExpr, start, end, dataset), names: c(['NDVI']) });

  const reducer = fn('Reducer.combine', {
    reducer1: fn('Reducer.combine', {
      reducer1: fn('Reducer.combine', {
        reducer1: fn('Reducer.mean', {}),
        reducer2: fn('Reducer.min', {}),
        sharedInputs: c(true)
      }),
      reducer2: fn('Reducer.max', {}),
      sharedInputs: c(true)
    }),
    reducer2: fn('Reducer.stdDev', {}),
    sharedInputs: c(true)
  });

  return fn('Image.reduceRegion', {
    image: ndvi, reducer,
    geometry: geomExpr,
    scale: c(scale),
    maxPixels: c(1e10),
    bestEffort: c(true),
    tileScale: c(4)
  });
}

function buildMapExpr(geojsonGeom, start, end, dataset) {
  const geomExpr = buildGeometry(geojsonGeom);
  const ndvi = buildNDVIImage(geomExpr, start, end, dataset);
  return fn('Image.visualize', {
    input: ndvi,
    bands: c(['nd']),
    min: c(-0.2), max: c(0.8),
    palette: c(['a50026','d73027','f46d43','fdae61','fee08b','ffffbf','d9ef8b','a6d96a','66bd63','1a9850','006837'])
  });
}

// ── JWT / OAuth ────────────────────────────────────────────────────────────
async function getAccessToken(email, pemRaw) {
  // Normalize: handle both literal \n and actual newlines
  const pem = pemRaw.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);

  const b64u = (obj) => {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    const bytes = new TextEncoder().encode(str);
    let b = '';
    for (const byte of bytes) b += String.fromCharCode(byte);
    return btoa(b).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };

  const header = b64u({ alg: 'RS256', typ: 'JWT' });
  const payload = b64u({
    iss: email,
    scope: 'https://www.googleapis.com/auth/earthengine https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  });
  const sigInput = `${header}.${payload}`;

  // Strip PEM headers and all whitespace to get pure base64
  const pemBody = pem.replace(/-----BEGIN[^-]+-----/g, '').replace(/-----END[^-]+-----/g, '').replace(/\s+/g, '');
  const keyBytes = Uint8Array.from(atob(pemBody), ch => ch.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8', keyBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(sigInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${sigInput}.${sigB64}`;
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error(`GEE auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function parseStats(data) {
  if (!data?.result) return null;
  const vals = data.result.dictionaryValue?.values || {};
  const num = (k) => {
    const v = vals[k];
    if (!v) return null;
    return v.floatValue ?? v.doubleValue ?? v.integerValue ?? v.constantValue ?? null;
  };
  return { mean: num('NDVI_mean'), min: num('NDVI_min'), max: num('NDVI_max'), std: num('NDVI_stdDev') };
}

function getPast6Quarters() {
  const qs = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const end = new Date(now);
    end.setMonth(end.getMonth() - i * 3);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 3);
    qs.push({
      label: start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }
  return qs;
}

function normalizeGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'FeatureCollection') return geometry.features?.[0]?.geometry ?? null;
  if (geometry.type === 'Feature') return geometry.geometry;
  return geometry;
}

// ── Main handler ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { geometry, start_date, end_date, dataset = 'sentinel2', include_history = false } = await req.json();
    if (!geometry || !start_date || !end_date)
      return Response.json({ error: 'geometry, start_date e end_date são obrigatórios' }, { status: 400 });

    const email = Deno.env.get('GEE_SERVICE_ACCOUNT_EMAIL');
    const pkRaw = Deno.env.get('GEE_PRIVATE_KEY');
    if (!email || !pkRaw) return Response.json({ error: 'Credenciais GEE não configuradas' }, { status: 500 });

    let privateKey = pkRaw;
    let projectId;
    try {
      const parsed = JSON.parse(pkRaw);
      if (parsed.private_key) { privateKey = parsed.private_key; projectId = parsed.project_id; }
    } catch {}

    if (!projectId) {
      const m = email.match(/@(.+)\.iam\.gserviceaccount\.com/);
      projectId = m ? m[1] : null;
    }
    if (!projectId) projectId = Deno.env.get('GEE_PROJECT_ID') || null;
    if (!projectId) return Response.json({ error: 'Não foi possível determinar o project_id do GEE' }, { status: 500 });

    const geomObj = normalizeGeometry(geometry);
    if (!geomObj) return Response.json({ error: 'Geometria inválida' }, { status: 400 });

    const accessToken = await getAccessToken(email, privateKey);
    const base = `https://earthengine.googleapis.com/v1/projects/${projectId}`;
    const hdrs = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Stats + tile URL in parallel
    const [statsResp, mapResp] = await Promise.all([
      fetch(`${base}/value:compute`, {
        method: 'POST', headers: hdrs,
        body: JSON.stringify({ expression: buildStatsExpr(geomObj, start_date, end_date, dataset) })
      }),
      fetch(`${base}/maps`, {
        method: 'POST', headers: hdrs,
        body: JSON.stringify({ expression: buildMapExpr(geomObj, start_date, end_date, dataset) })
      })
    ]);

    const [statsData, mapData] = await Promise.all([statsResp.json(), mapResp.json()]);
    const stats = parseStats(statsData);
    const tileUrl = mapData.name ? `https://earthengine.googleapis.com/v1/${mapData.name}/tiles/{z}/{x}/{y}` : null;

    // Optional historical quarters
    let history = null;
    if (include_history) {
      const quarters = getPast6Quarters();
      history = await Promise.all(
        quarters.map(q =>
          fetch(`${base}/value:compute`, {
            method: 'POST', headers: hdrs,
            body: JSON.stringify({ expression: buildStatsExpr(geomObj, q.start, q.end, dataset) })
          })
            .then(r => r.json())
            .then(d => ({ label: q.label, period: `${q.start} → ${q.end}`, ...parseStats(d) }))
        )
      );
    }

    return Response.json({ stats, tileUrl, accessToken, history, dataset, period: { start: start_date, end: end_date } });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});