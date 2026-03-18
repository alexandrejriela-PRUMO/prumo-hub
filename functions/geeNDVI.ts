import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── JWT / OAuth ────────────────────────────────────────────────────────────
async function getGEEToken(email, pemRaw) {
  // Normalize: convert literal \n to actual newlines
  let pem = pemRaw.indexOf('\\n') !== -1 ? pemRaw.replace(/\\n/g, '\n') : pemRaw;

  // Extract only valid base64 chars (strip all whitespace, headers, etc.)
  const pemBody = pem.replace(/[^A-Za-z0-9+/=]/g, '');
  // Add padding if needed
  const padded = pemBody + '==='.slice(0, (4 - (pemBody.length % 4)) % 4);

  let keyBytes;
  try {
    keyBytes = Uint8Array.from(atob(padded), ch => ch.charCodeAt(0));
  } catch (e) {
    throw new Error(`Falha ao decodificar chave PEM (base64). Verifique o formato da GEE_PRIVATE_KEY. Detalhes: ${e.message}. KeyLen:${pemBody.length}`);
  }
  const key = await crypto.subtle.importKey(
    'pkcs8', keyBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );

  const now = Math.floor(Date.now() / 1000);
  const toB64u = (obj) => {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    let s = '';
    bytes.forEach(b => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const h = toB64u({ alg: 'RS256', typ: 'JWT' });
  const p = toB64u({
    iss: email,
    scope: 'https://www.googleapis.com/auth/earthengine https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  });
  const sigInput = `${h}.${p}`;
  const sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(sigInput));
  const sigArr = Array.from(new Uint8Array(sigBuf));
  const sig = btoa(sigArr.map(b => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const jwt = `${sigInput}.${sig}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const d = await r.json();
  if (!d.access_token) throw new Error(`GEE auth failed: ${JSON.stringify(d)}`);
  return d.access_token;
}

// ── EE expression helpers ──────────────────────────────────────────────────
function eeConst(val) { return { constantValue: val }; }
function eeFunc(name, args) { return { functionInvocationValue: { functionName: name, arguments: args || {} } }; }

function buildGeometry(geom) {
  return eeFunc('Geometry', { geoJson: eeConst(geom), geodesic: eeConst(false) });
}

function buildNDVIImage(geomExpr, start, end, dataset) {
  const isLandsat = dataset === 'landsat8';
  const colId = isLandsat ? 'LANDSAT/LC08/C02/T1_L2' : 'COPERNICUS/S2_SR_HARMONIZED';
  const nir = isLandsat ? 'SR_B5' : 'B8';
  const red = isLandsat ? 'SR_B4' : 'B4';

  return eeFunc('Image.normalizedDifference', {
    input: eeFunc('ImageCollection.median', {
      collection: eeFunc('ImageCollection.select', {
        input: eeFunc('ImageCollection.filterDate', {
          collection: eeFunc('ImageCollection.filterBounds', {
            collection: eeFunc('ImageCollection.load', { id: eeConst(colId) }),
            geometry: geomExpr
          }),
          start: eeConst(start), end: eeConst(end)
        }),
        bandSelectors: eeConst([nir, red])
      })
    }),
    bandNames: eeConst([nir, red])
  });
}

function buildStatsExpr(geojsonGeom, start, end, dataset) {
  const scale = dataset === 'landsat8' ? 30 : 10;
  const geomExpr = buildGeometry(geojsonGeom);
  const ndvi = eeFunc('Image.rename', { input: buildNDVIImage(geomExpr, start, end, dataset), names: eeConst(['NDVI']) });

  const reducer = eeFunc('Reducer.combine', {
    reducer1: eeFunc('Reducer.combine', {
      reducer1: eeFunc('Reducer.combine', {
        reducer1: eeFunc('Reducer.mean', {}),
        reducer2: eeFunc('Reducer.min', {}),
        sharedInputs: eeConst(true)
      }),
      reducer2: eeFunc('Reducer.max', {}),
      sharedInputs: eeConst(true)
    }),
    reducer2: eeFunc('Reducer.stdDev', {}),
    sharedInputs: eeConst(true)
  });

  return eeFunc('Image.reduceRegion', {
    image: ndvi, reducer,
    geometry: geomExpr,
    scale: eeConst(scale),
    maxPixels: eeConst(1e10),
    bestEffort: eeConst(true),
    tileScale: eeConst(4)
  });
}

function buildMapExpr(geojsonGeom, start, end, dataset) {
  const geomExpr = buildGeometry(geojsonGeom);
  const ndvi = buildNDVIImage(geomExpr, start, end, dataset);
  return eeFunc('Image.visualize', {
    input: ndvi,
    bands: eeConst(['nd']),
    min: eeConst(-0.2), max: eeConst(0.8),
    palette: eeConst(['a50026','d73027','f46d43','fdae61','fee08b','ffffbf','d9ef8b','a6d96a','66bd63','1a9850','006837'])
  });
}

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

    const body = await req.json();
    const { geometry, start_date, end_date, dataset = 'sentinel2', include_history = false } = body;
    if (!geometry || !start_date || !end_date)
      return Response.json({ error: 'geometry, start_date e end_date são obrigatórios' }, { status: 400 });

    const email = Deno.env.get('GEE_SERVICE_ACCOUNT_EMAIL');
    const pkRaw = Deno.env.get('GEE_PRIVATE_KEY');
    if (!email || !pkRaw) return Response.json({ error: 'Credenciais GEE não configuradas' }, { status: 500 });

    let privateKey = pkRaw;
    let projectId = Deno.env.get('GEE_PROJECT_ID') || null;

    // If pkRaw is a JSON service account file
    try {
      const parsed = JSON.parse(pkRaw);
      if (parsed.private_key) privateKey = parsed.private_key;
      if (parsed.project_id && !projectId) projectId = parsed.project_id;
    } catch (_) {
      // pkRaw is already a raw PEM
    }

    if (!projectId) {
      const m = email.match(/@([^.]+)/);
      if (m) projectId = m[1];
    }
    if (!projectId) return Response.json({ error: 'Não foi possível determinar o project_id' }, { status: 500 });

    console.log('[GEE] project:', projectId, 'email:', email, 'keyLen:', privateKey?.length);

    const geomObj = normalizeGeometry(geometry);
    if (!geomObj) return Response.json({ error: 'Geometria inválida' }, { status: 400 });

    const accessToken = await getGEEToken(email, privateKey);
    const base = `https://earthengine.googleapis.com/v1/projects/${projectId}`;
    const hdrs = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

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
    console.log('[GEE] statsData:', JSON.stringify(statsData).substring(0, 200));
    console.log('[GEE] mapData:', JSON.stringify(mapData).substring(0, 200));

    const stats = parseStats(statsData);
    const tileUrl = mapData.name ? `https://earthengine.googleapis.com/v1/${mapData.name}/tiles/{z}/{x}/{y}` : null;

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
    console.error('[GEE] Error:', err.message, err.stack);
    return Response.json({ error: err.message }, { status: 500 });
  }
});