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
  
  console.log('[GEE] Input geometry type:', geometry.type);
  console.log('[GEE] Input coordinates:', JSON.stringify(coords));
  
  if (geometry.type === 'Polygon') {
    // Polygon: coordinates = [[[lng, lat], ...]]
    // coords[0] é o exterior ring: [[lng, lat], [lng, lat], ...]
    const normalized = normalizeCoordinatesForGEE(coords[0]);
    console.log('[GEE] Normalized ring length:', normalized?.length);
    console.log('[GEE] Normalized ring:', JSON.stringify(normalized));
    
    if (!normalized || normalized.length < 3) {
      throw new Error(`LinearRing requer pelo menos 3 pontos. Recebido: ${normalized?.length || 0}`);
    }
    
    // GEE espera: [[[[lng, lat], [lng, lat], ...]]]  para Polygon
    coords = [normalized];
  } else if (geometry.type === 'MultiPolygon') {
    // MultiPolygon: coordinates = [[[[lng, lat], ...]]]
    coords = coords.map(ring => {
      const normalized = normalizeCoordinatesForGEE(ring[0] || ring);
      if (!normalized || normalized.length < 3) {
        throw new Error(`LinearRing requer pelo menos 3 pontos. Recebido: ${normalized?.length || 0}`);
      }
      return normalized;
    });
  }
  
  console.log('[GEE] Final coords structure:', JSON.stringify(coords));
  
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
  try {
    console.log('[GEE:computeNDVI] Iniciando computação para período:', { startDate, endDate });

    const expr = buildExpr(geometry, startDate, endDate);
    console.log('[GEE:computeNDVI] Expression geo node:', JSON.stringify(expr.values.geo, null, 2));

    console.log('[GEE:computeNDVI] Enviando request para GEE...');

    // AbortController com timeout de 60 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let res;
    try {
      res = await fetch(`https://earthengine.googleapis.com/v1/projects/${projectId}/value:compute`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: expr }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('[GEE:computeNDVI] Response status:', res.status);
    console.log('[GEE:computeNDVI] Response headers:', Object.fromEntries(res.headers));

    // Verifica se response é válida antes de parsear JSON
    if (!res.ok) {
      console.error('[GEE:computeNDVI] HTTP Error:', res.status, res.statusText);
      let errorText = '';
      try {
        errorText = await res.text();
        console.error('[GEE:computeNDVI] Response body:', errorText);
      } catch (e) {
        console.error('[GEE:computeNDVI] Erro ao ler response body:', e.message);
      }
      throw new Error(`GEE HTTP Error ${res.status}: ${res.statusText} - ${errorText}`);
    }

    let data;
    try {
      const text = await res.text();
      console.log('[GEE:computeNDVI] Response text length:', text.length);
      if (!text) throw new Error('Response body vazio');
      data = JSON.parse(text);
      console.log('[GEE:computeNDVI] Response parsed:', JSON.stringify(data).substring(0, 500));
    } catch (e) {
      console.error('[GEE:computeNDVI] Erro ao parsear JSON:', e.message);
      throw new Error(`Erro ao parsear resposta GEE: ${e.message}`);
    }

    if (data.error) {
      console.error('[GEE:computeNDVI] GEE API returned error:');
      console.error('[GEE:computeNDVI] - Error code:', data.error.code);
      console.error('[GEE:computeNDVI] - Error message:', data.error.message);
      console.error('[GEE:computeNDVI] - Full error:', JSON.stringify(data.error, null, 2));

      const errorMsg = data.error.message || data.error.code || JSON.stringify(data.error);
      throw new Error(`GEE API Error: ${errorMsg}`);
    }

    // GEE returns raw NDVI * 10000 for MODIS MOD13Q1
    const raw = data.result?.NDVI ?? data.result?.values?.NDVI ?? null;

    if (raw === null || raw === undefined) {
      console.warn('[GEE:computeNDVI] Sem valor NDVI na resposta');
      console.warn('[GEE:computeNDVI] Data.result:', JSON.stringify(data.result));
      return null;
    }

    const ndvi = Number(raw) / 10000;
    console.log('[GEE:computeNDVI] NDVI calculado:', ndvi);

    return ndvi;
  } catch (err) {
    console.error('[GEE:computeNDVI] Erro crítico:', err.message);
    console.error('[GEE:computeNDVI] Stack:', err.stack);
    throw err;
  }
}

function classify(ndvi) {
  if (ndvi >= 0.6) return { status: 'Vegetação Densa e Saudável', color: 'emerald', emoji: '🌿', desc: 'Excelente cobertura vegetal. Vegetação densa, ativa e bem estabelecida.' };
  if (ndvi >= 0.4) return { status: 'Vegetação Saudável', color: 'green', emoji: '🌱', desc: 'Boa saúde da vegetação. Pastagem ou lavoura em bom estado de desenvolvimento.' };
  if (ndvi >= 0.25) return { status: 'Vegetação Moderada', color: 'yellow', emoji: '🌾', desc: 'Cobertura moderada. Pode indicar estresse hídrico, início de ciclo ou pastagem em rebrota.' };
  if (ndvi >= 0.1) return { status: 'Vegetação Escassa', color: 'orange', emoji: '⚠️', desc: 'Pouca vegetação ativa. Possível área degradada, solo em preparo ou pastagem rala.' };
  return { status: 'Solo Exposto / Degradado', color: 'red', emoji: '🏜️', desc: 'Mínima cobertura vegetal. Área possivelmente degradada, solo exposto ou período de seca intensa.' };
}

Deno.serve(async (req) => {
  console.log('=== NDVI REQUEST START ===');

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      console.error('[GEE] Erro: Usuário não autenticado');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[GEE] Usuário autenticado:', user.email);

    let boundaries_geojson, center_coordinates;
    try {
      const body = await req.json();
      boundaries_geojson = body.boundaries_geojson;
      center_coordinates = body.center_coordinates;
      console.log('[GEE] Request body recebido');
      console.log('[GEE] - boundaries_geojson:', !!boundaries_geojson);
      console.log('[GEE] - center_coordinates:', center_coordinates);
    } catch (e) {
      console.error('[GEE] Erro ao parsear request body:', e.message);
      return Response.json({ error: 'Request body inválido', details: e.message }, { status: 400 });
    }

    const serviceEmail = Deno.env.get('GEE_SERVICE_ACCOUNT_EMAIL');
    const keyRaw = Deno.env.get('GEE_PRIVATE_KEY');

    if (!serviceEmail || !keyRaw) {
      console.error('[GEE] Erro: Credenciais GEE não configuradas');
      return Response.json({ error: 'GEE credentials not configured' }, { status: 500 });
    }

    let privateKey;
    try {
      const parsed = JSON.parse(keyRaw);
      privateKey = parsed.private_key || keyRaw;
    } catch {
      privateKey = keyRaw;
    }

    let geometry;
    try {
      if (boundaries_geojson) {
        const gj = typeof boundaries_geojson === 'string' ? JSON.parse(boundaries_geojson) : boundaries_geojson;
        geometry = gj.type === 'FeatureCollection' ? gj.features[0]?.geometry :
                   gj.type === 'Feature' ? gj.geometry : gj;
        console.log('[GEE] Geometria recebida (raw):', JSON.stringify(geometry));
      } else if (center_coordinates) {
        console.log('[GEE] Criando geometria a partir de coordenadas centrais:', center_coordinates);
        const coordStr = String(center_coordinates).trim();
        const coordArray = coordStr.split(/[,;]/).map(c => Number(c.trim()));

        if (coordArray.length < 2 || coordArray.some(isNaN)) {
          throw new Error(`Coordenadas centrais inválidas: "${coordStr}" não contém 2 números válidos`);
        }

        const lng = coordArray[0]; // Primeira coordenada é longitude
        const lat = coordArray[1]; // Segunda coordenada é latitude

        console.log('[GEE] Coordenadas centrais processadas:', { lng, lat });

        const d = 0.045;
        geometry = { type: 'Polygon', coordinates: [[[lng-d,lat-d],[lng+d,lat-d],[lng+d,lat+d],[lng-d,lat+d],[lng-d,lat-d]]] };
        console.log('[GEE] Geometria criada com sucesso. Center: [' + lng + ', ' + lat + ']');
      } else {
        console.error('[GEE] Erro: Nenhuma geometria fornecida');
        return Response.json({ error: 'Geometria não fornecida (boundaries_geojson ou center_coordinates obrigatórios)' }, { status: 400 });
      }
    } catch (e) {
      console.error('[GEE] Erro ao processar geometria:', e.message);
      return Response.json({ error: 'Erro ao processar geometria', details: e.message }, { status: 400 });
    }

    // Validação rigorosa da geometria
    try {
      if (!geometry) throw new Error('Geometria é nula ou indefinida');
      if (!geometry.type) throw new Error('Geometria não possui atributo "type"');
      if (!geometry.coordinates || !Array.isArray(geometry.coordinates)) throw new Error('Geometria não possui atributo "coordinates" ou não é um array');

      console.log('[GEE] Geometria validada. Type:', geometry.type);

      if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates[0])) {
        const ring = geometry.coordinates[0];
        console.log('[GEE] Polygon ring points:', ring.length);

        if (ring.length < 3) {
          throw new Error(`Polígono requer mínimo 3 pontos. Recebido: ${ring.length}`);
        }
      }
    } catch (e) {
      console.error('[GEE] Erro de validação de geometria:', e.message);
      return Response.json({ error: 'Geometria inválida', details: e.message }, { status: 400 });
    }

    let projectId;
    try {
      projectId = serviceEmail?.match(/@([^.]+)\.iam\.gserviceaccount\.com/)?.[1];
      if (!projectId) projectId = Deno.env.get('GEE_PROJECT_ID') || null;
      if (!projectId) throw new Error('Não foi possível extrair o Project ID do e-mail da conta de serviço. Configure GEE_PROJECT_ID.');
      console.log('[GEE] Project ID:', projectId);
    } catch (e) {
      console.error('[GEE] Erro ao obter Project ID:', e.message);
      return Response.json({ error: 'Erro ao obter Project ID', details: e.message }, { status: 500 });
    }

    let token;
    try {
      console.log('[GEE] Obtendo token de autenticação...');
      token = await getGEEToken(serviceEmail, privateKey);
      console.log('[GEE] Token obtido com sucesso');
    } catch (e) {
      console.error('[GEE] Erro ao obter token GEE:', e.message);
      return Response.json({ error: 'Erro de autenticação GEE', details: e.message }, { status: 500 });
    }

    let ndviCurrent, ndviPrev;
    try {
      const now = new Date();
      const endDate = now.toISOString().split('T')[0];
      const startDate = new Date(now - 90 * 86400000).toISOString().split('T')[0];
      const prevEnd = new Date(now - 365 * 86400000).toISOString().split('T')[0];
      const prevStart = new Date(now - 455 * 86400000).toISOString().split('T')[0];

      console.log('[GEE] Período atual:', { startDate, endDate });
      console.log('[GEE] Período anterior:', { prevStart, prevEnd });
      console.log('[GEE] Iniciando cálculo de NDVI (2 períodos em paralelo)...');

      [ndviCurrent, ndviPrev] = await Promise.all([
        computeNDVI(projectId, token, geometry, startDate, endDate),
        computeNDVI(projectId, token, geometry, prevStart, prevEnd),
      ]);

      console.log('[GEE] NDVI atual:', ndviCurrent);
      console.log('[GEE] NDVI ano anterior:', ndviPrev);
    } catch (e) {
      console.error('[GEE] Erro ao calcular NDVI:', e.message);
      console.error('[GEE] Stack:', e.stack);
      return Response.json({ 
        error: 'Erro ao calcular NDVI com Google Earth Engine',
        details: e.message,
        type: 'GEE_COMPUTATION_ERROR'
      }, { status: 500 });
    }

    if (ndviCurrent === null) {
      console.warn('[GEE] Aviso: NDVI atual é null (sem imagens MODIS para o período/área)');
      const classification = classify(0);
      return Response.json({ 
        ndvi_mean: null,
        ndvi_prev_year: ndviPrev !== null ? Math.round(ndviPrev * 1000) / 1000 : null,
        trend: null,
        ...classification,
        date_range: { 
          start: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        },
        source: 'MODIS Terra NDVI 16-day (250m)',
        analysis_date: new Date().toISOString().split('T')[0],
        warning: 'Sem imagens MODIS disponíveis para o período/área selecionado.'
      }, { status: 200 });
    }

    const classification = classify(ndviCurrent);
    const trend = ndviPrev !== null ? ndviCurrent - ndviPrev : null;

    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const startDate = new Date(now - 90 * 86400000).toISOString().split('T')[0];

    const result = {
      ndvi_mean: Math.round(ndviCurrent * 1000) / 1000,
      ndvi_prev_year: ndviPrev !== null ? Math.round(ndviPrev * 1000) / 1000 : null,
      trend: trend !== null ? Math.round(trend * 1000) / 1000 : null,
      ...classification,
      date_range: { start: startDate, end: endDate },
      source: 'MODIS Terra NDVI 16-day (250m)',
      analysis_date: endDate,
    };

    console.log('[GEE] Análise completa com sucesso. NDVI:', result.ndvi_mean);
    console.log('=== NDVI REQUEST END (SUCCESS) ===');

    return Response.json(result, { status: 200 });

  } catch (err) {
    console.error('[GEE] Erro não capturado:', err.message);
    console.error('[GEE] Stack trace:', err.stack);
    console.log('=== NDVI REQUEST END (ERROR) ===');

    return Response.json({ 
      error: 'Erro interno ao processar NDVI',
      details: err.message,
      type: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
});