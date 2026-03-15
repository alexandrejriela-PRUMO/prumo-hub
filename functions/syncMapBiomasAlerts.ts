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
  if (data.errors) throw new Error('MapBiomas auth failed: ' + JSON.stringify(data.errors));
  return data.data.signIn.token;
}

async function fetchAlertsByCAR(token, carCode) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query: `
        query getAlerts($carCode: String!) {
          allAlerts(filters: { carCode: $carCode }) {
            alertCode
            source
            detectedAt
            confirmedAt
            areaHa
            carCode
            state
            municipality
            type
            status
          }
        }
      `,
      variables: { carCode }
    })
  });

  const data = await res.json();
  if (data.errors) throw new Error('MapBiomas query failed: ' + JSON.stringify(data.errors));
  return data.data.allAlerts || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all properties with CAR numbers for this user
    const properties = await base44.entities.Property.filter(
      user.role === 'admin'
        ? { car_number: { $exists: true } }
        : { owner_email: user.email }
    );

    const carNumbers = properties
      .map(p => p.car_number)
      .filter(Boolean);

    if (carNumbers.length === 0) {
      return Response.json({ message: 'Nenhum CAR encontrado para monitorar.', synced: 0 });
    }

    const token = await signIn();

    let totalNew = 0;
    const errors = [];

    for (const carCode of carNumbers) {
      try {
        const alerts = await fetchAlertsByCAR(token, carCode);

        for (const alert of alerts) {
          // Check if alert already exists
          const existing = await base44.entities.EnvironmentalAlert.filter({
            'metadata.alert_code': alert.alertCode
          });

          if (existing.length > 0) continue;

          // Find matching property
          const property = properties.find(p => p.car_number === carCode);

          await base44.entities.EnvironmentalAlert.create({
            property_id: property?.id || '',
            alert_type: 'Desmatamento',
            severity: alert.areaHa > 10 ? 'Alta' : alert.areaHa > 3 ? 'Média' : 'Baixa',
            title: `Alerta MapBiomas - ${alert.alertCode}`,
            description: `Tipo: ${alert.type || 'N/A'} | Fonte: ${alert.source} | Município: ${alert.municipality}, ${alert.state}`,
            affected_area_hectares: alert.areaHa,
            detection_date: alert.detectedAt ? alert.detectedAt.split('T')[0] : new Date().toISOString().split('T')[0],
            status: 'Aberto',
            data_source: 'MapBiomas',
            responsible_email: property?.owner_email || user.email,
            notification_sent: false,
            metadata: {
              alert_code: alert.alertCode,
              car_code: carCode,
              mapbiomas_status: alert.status
            }
          });

          totalNew++;
        }
      } catch (err) {
        errors.push({ carCode, error: err.message });
      }
    }

    return Response.json({
      success: true,
      synced: totalNew,
      cars_checked: carNumbers.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});