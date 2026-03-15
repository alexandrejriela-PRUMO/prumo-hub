import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const GRAPHQL_URL = 'https://plataforma.alerta.mapbiomas.org/api/v2/graphql';

async function signIn() {
  const email = Deno.env.get('MAPBIOMAS_EMAIL');
  const password = Deno.env.get('MAPBIOMAS_PASSWORD');

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation signIn($email: String!, $password: String!) {
          signIn(email: $email, password: $password) {
            token
          }
        }
      `,
      variables: { email, password }
    })
  });

  const data = await res.json();
  if (data.errors) throw new Error('Auth failed: ' + JSON.stringify(data.errors));
  return data.data.signIn.token;
}

async function gql(token, query, variables = {}) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });
  return await res.json();
}

async function fetchAlertsByCAR(token, carCodes, startDate, endDate) {
  const data = await gql(token, `
    query($carCodes: [ID!], $startDate: BaseDate, $endDate: BaseDate) {
      alerts(carCodes: $carCodes, startDate: $startDate, endDate: $endDate, limit: 100) {
        collection {
          alertCode
          areaHa
          publishedAt
          detectedAt
          sources
          statusName
          ruralProperties {
            carCode
            areaHa
            stateAcronym
          }
        }
        metadata {
          currentPage
          limitValue
          totalCount
          totalPages
        }
      }
    }
  `, { carCodes: carCodes, startDate, endDate });

  console.log('🔗 GraphQL Response:', JSON.stringify(data, null, 2));

  if (data.errors) throw new Error('Alerts query failed: ' + JSON.stringify(data.errors));
  return data.data?.alerts?.collection || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const filter = user.role === 'admin' ? {} : { owner_email: user.email };
    const properties = await base44.entities.Property.filter(filter);
    const propertiesWithCAR = properties.filter(p => p.car_number);

    if (propertiesWithCAR.length === 0) {
      return Response.json({ message: 'Nenhum CAR cadastrado para monitorar.', synced: 0 });
    }

    const carCodes = propertiesWithCAR.map(p => p.car_number.trim());
    console.log('🔍 CARs a monitorar:', carCodes);

    // Default: last 12 months
    const endDate = new Date().toISOString().split('T')[0];
    const startDateObj = new Date();
    startDateObj.setFullYear(startDateObj.getFullYear() - 1);
    const startDate = startDateObj.toISOString().split('T')[0];

    console.log(`📅 Período de busca: ${startDate} a ${endDate}`);

    const token = await signIn();
    console.log('✅ Autenticação MapBiomas OK');
    
    const alerts = await fetchAlertsByCAR(token, carCodes, startDate, endDate);
    console.log(`📡 Alertas retornados pela API: ${alerts.length}`);

    let totalNew = 0;

    for (const alert of alerts) {
      const alertTitle = `Alerta MapBiomas #${alert.alertCode}`;

      // Find matching property by CAR code
      const matchingCarCode = (alert.ruralProperties || [])
        .map(r => r.carCode?.trim())
        .find(code => carCodes.includes(code));

      const property = matchingCarCode
        ? propertiesWithCAR.find(p => p.car_number.trim() === matchingCarCode)
        : propertiesWithCAR[0];

      if (!property) continue;

      // Skip if already synced
      const existing = await base44.entities.EnvironmentalAlert.filter({
        title: alertTitle,
        property_id: property.id
      });
      if (existing.length > 0) continue;

      const areaHa = parseFloat(alert.areaHa || 0);
      const sources = Array.isArray(alert.sources) ? alert.sources.join(', ') : (alert.sources || 'MapBiomas');
      const propertyState = (alert.ruralProperties?.[0]?.stateAcronym || '').toUpperCase();

      await base44.entities.EnvironmentalAlert.create({
        property_id: property.id,
        alert_type: 'Desmatamento',
        severity: areaHa > 50 ? 'Crítica' : areaHa > 10 ? 'Alta' : areaHa > 3 ? 'Média' : 'Baixa',
        title: alertTitle,
        description: `Área: ${areaHa.toFixed(2)} ha | Fontes: ${sources} | Estado: ${propertyState} | Status: ${alert.statusName || 'N/A'}`,
        affected_area_hectares: areaHa,
        detection_date: (alert.detectedAt || alert.publishedAt || new Date().toISOString()).split('T')[0],
        status: 'Aberto',
        data_source: 'MapBiomas',
        responsible_email: property.owner_email || property.consultor_email || user.email,
        notification_sent: false,
        recommended_actions: [
          'Verificar imagens de satélite na plataforma MapBiomas Alerta',
          'Avaliar necessidade de PRAD',
          'Consultar órgão ambiental competente se necessário'
        ]
      });

      totalNew++;
    }

    return Response.json({
      success: true,
      synced: totalNew,
      total_alerts_found: alerts.length,
      cars_monitored: carCodes.length,
      period: `${startDate} → ${endDate}`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});