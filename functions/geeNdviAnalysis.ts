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

  // Normaliza a chave: converte \n literal em quebra de linha real, remove headers PEM e espaços
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
  if (!data.access_token) throw new Error('GEE auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

function normalizeCoordinatesForGEE(coords) {
  // Força cast de coordenadas para [[number, number], ...]
  if (!Array.isArray(coords) || coords.length === 0) return null;
  
  return coords.map(coord => {
    if (!Array.isArray(coord)) return null;
    if (coord.length < 2) return null;
    // Cast explícito para número
    const lng = Number(coord[0]);
    const lat = Number(coord[1]);
    if (isNaN(lng) || isNaN(lat)) return null;
    return [lng, lat];
  }).filter(c => c !== null);
}

function buildGeomExpr(geometry) {
  // Build the geometry expression node based on type
  let coords = geometry.coordinates;
  
  if (geometry.type === 'Polygon') {
    // Polygon: coordinates = [[[lng, lat], ...]]
    if (Array.isArray(coords[0])) {
      coords = [normalizeCoordinatesForGEE(coords[0])];
    }
    console.log('[GEE] Polygon coordinates (normalized):', JSON.stringify(coords));
  } else if (geometry.type === 'MultiPolygon') {
    // MultiPolygon: coordinates = [[[[lng, lat], ...]]]
    coords = coords.map(ring => normalizeCoordinatesForGEE(ring[0] || ring));
    console.log('[GEE] MultiPolygon coordinates (normalized):', JSON.stringify(coords));
  }
  
  // Validação: garante que temos arrays de arrays de números
  if (!coords || coords.length === 0) {
    throw new Error('Coordenadas inválidas ou vazias após normalização');
  }
  
  return {
    functionInvocationValue: {
      functionName: geometry.type === 'MultiPolygon' ? 'GeometryConstructors.MultiPolygon' : 'GeometryConstructors.Polygon',
      arguments: { coordinates: { constantValue: coords } }
    }
  };
}

function buildExpr(geometry, startDate, endDate) {
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const geomExpr = buildGeomExpr(geometry);

  return {
    result: '6',
    values: {
      // Geometry node
      'geo': geomExpr,
      // Load collection
      '0': { functionInvocationValue: { functionName: 'ImageCollection.load', arguments: { id: { constantValue: 'MODIS/061/MOD13Q1' } } } },
      // Filter by date range on system:time_start
      'f1': { functionInvocationValue: { functionName: 'Filter.rangeContains', arguments: { field: { constantValue: 'system:time_start' }, minValue: { constantValue: startMs }, maxValue: { constantValue: endMs } } } },
      '1': { functionInvocationValue: { functionName: 'Collection.filter', arguments: { collection: { valueReference: '0' }, filter: { valueReference: 'f1' } } } },
      // Filter by bounds
      'f2': { functionInvocationValue: { functionName: 'Filter.intersects', arguments: { leftField: { constantValue: '.geo' }, rightValue: { valueReference: 'geo' } } } },
      '2': { functionInvocationValue: { functionName: 'Collection.filter', arguments: { collection: { valueReference: '1' }, filter: { valueReference: 'f2' } } } },
      // Select NDVI band via map
      '3': {
        functionInvocationValue: {
          functionName: 'Collection.map',
          arguments: {
            collection: { valueReference: '2' },
            baseAlgorithm: {
              functionDefinitionValue: { argumentNames: ['img'], body: '3a' }
            }
          }
        }
      },
      '3a': { functionInvocationValue: { functionName: 'Image.select', arguments: { input: { argumentReference: 'img' }, bandSelectors: { constantValue: ['NDVI'] } } } },
      // Reduce to mean image
      '4': { functionInvocationValue: { functionName: 'ImageCollection.reduce', arguments: { collection: { valueReference: '3' }, reducer: { functionInvocationValue: { functionName: 'Reducer.mean', arguments: {} } } } } },
      // Rename NDVI_mean -> NDVI
      '5': { functionInvocationValue: { functionName: 'Image.rename', arguments: { input: { valueReference: '4' }, names: { constantValue: ['NDVI'] } } } },
      // Reduce region
      '6': { functionInvocationValue: { functionName: 'Image.reduceRegion', arguments: {
        image: { valueReference: '5' },
        reducer: { functionInvocationValue: { functionName: 'Reducer.mean', arguments: {} } },
        geometry: { valueReference: 'geo' },
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
  // GEE returns raw NDVI * 10000 for MODIS MOD13Q1
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

    let geometry;
     if (boundaries_geojson) {
       const gj = typeof boundaries_geojson === 'string' ? JSON.parse(boundaries_geojson) : boundaries_geojson;
       geometry = gj.type === 'FeatureCollection' ? gj.features[0]?.geometry :
                  gj.type === 'Feature' ? gj.geometry : gj;
       console.log('[GEE] Geometria recebida (raw):', JSON.stringify(geometry));
     } else if (center_coordinates) {
       const [lat, lng] = String(center_coordinates).split(',').map(Number);
       const d = 0.045;
       geometry = { type: 'Polygon', coordinates: [[[lng-d,lat-d],[lng+d,lat-d],[lng+d,lat+d],[lng-d,lat+d],[lng-d,lat-d]]] };
       console.log('[GEE] Geometria criada a partir de coordenadas centrais:', JSON.stringify(geometry));
     } else {
       return Response.json({ error: 'Geometria não fornecida' }, { status: 400 });
     }

     // Validação pré-GEE
     if (!geometry || !geometry.type || !geometry.coordinates) {
       console.error('[GEE] Geometria inválida:', JSON.stringify(geometry));
       return Response.json({ error: 'Geometria inválida (ausência de type ou coordinates)' }, { status: 400 });
     }

    let projectId = serviceEmail?.match(/@([^.]+)\.iam\.gserviceaccount\.com/)?.[1];
    if (!projectId) projectId = Deno.env.get('GEE_PROJECT_ID') || null;
    if (!projectId) throw new Error('Não foi possível extrair o Project ID do e-mail da conta de serviço. Configure GEE_PROJECT_ID.');

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