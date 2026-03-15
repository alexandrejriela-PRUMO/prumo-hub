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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const mode = body.mode || 'sync';

    const token = await signIn();

    // Mode: explore — list all query fields (names only)
    if (mode === 'explore') {
      const data = await gql(token, `{
        __schema {
          queryType {
            fields { name description args { name type { name kind ofType { name } } } }
          }
        }
      }`);
      const fields = data.data.__schema.queryType.fields.map(f => ({
        name: f.name,
        args: f.args.map(a => a.name)
      }));
      return Response.json({ fields });
    }

    // Mode: test_alerts_by_date
    if (mode === 'test_alerts_by_date') {
      const data = await gql(token, `
        query {
          alertsByPublishDate(startDate: "2025-01-01", endDate: "2026-03-15") {
            alertCode
            areaHa
            publishedAt
            detectedAt
            source
          }
        }
      `);
      return Response.json(data);
    }

    // Mode: test_property_query — try alertsByPublishDate with propertyCode
    if (mode === 'test_property_query') {
      const carCode = body.car || 'RS-4318408-7C3F9C94C26940E9B84DE5E6F6C11B36';
      const data = await gql(token, `
        query($propertyCode: String!, $startDate: BaseDate!, $endDate: BaseDate!) {
          alertsByPublishDate(propertyCode: $propertyCode, startDate: $startDate, endDate: $endDate) {
            alertCode
            areaHa
            publishedAt
            detectedAt
            source
          }
        }
      `, { propertyCode: carCode, startDate: '2024-01-01', endDate: '2026-03-15' });
      return Response.json(data);
    }

    // Mode: explore_type — introspect a specific type
    if (mode === 'explore_type') {
      const typeName = body.type || 'AlertsByPublishDate';
      const data = await gql(token, `
        query($name: String!) {
          __type(name: $name) {
            name
            fields { name type { name kind ofType { name kind } } }
          }
        }
      `, { name: typeName });
      return Response.json(data);
    }

    // Mode: sync — actual sync logic
    const filter = user.role === 'admin' ? {} : { owner_email: user.email };
    const properties = await base44.entities.Property.filter(filter);
    const propertiesWithCAR = properties.filter(p => p.car_number);

    if (propertiesWithCAR.length === 0) {
      return Response.json({ message: 'Nenhum CAR cadastrado.', synced: 0 });
    }

    let totalNew = 0;

    for (const property of propertiesWithCAR) {
      const carCode = property.car_number.trim();

      const data = await gql(token, `
        query($propertyCode: String!, $startDate: BaseDate!, $endDate: BaseDate!) {
          alertsByPublishDate(propertyCode: $propertyCode, startDate: $startDate, endDate: $endDate) {
            alertCode
            areaHa
            publishedAt
            detectedAt
            source
          }
        }
      `, {
        propertyCode: carCode,
        startDate: '2024-01-01',
        endDate: new Date().toISOString().split('T')[0]
      });

      if (data.errors || !data.data) continue;

      const alerts = data.data.alertsByPublishDate || [];

      for (const alert of alerts) {
        const alertTitle = `Alerta MapBiomas #${alert.alertCode}`;
        const existing = await base44.entities.EnvironmentalAlert.filter({
          title: alertTitle,
          property_id: property.id
        });
        if (existing.length > 0) continue;

        const areaHa = parseFloat(alert.areaHa || 0);

        await base44.entities.EnvironmentalAlert.create({
          property_id: property.id,
          alert_type: 'Desmatamento',
          severity: areaHa > 50 ? 'Crítica' : areaHa > 10 ? 'Alta' : areaHa > 3 ? 'Média' : 'Baixa',
          title: alertTitle,
          description: `Área: ${areaHa.toFixed(2)} ha | Fonte: ${alert.source || 'MapBiomas'} | CAR: ${carCode}`,
          affected_area_hectares: areaHa,
          detection_date: (alert.detectedAt || alert.publishedAt || new Date().toISOString()).split('T')[0],
          status: 'Aberto',
          data_source: 'MapBiomas',
          responsible_email: property.owner_email || property.consultor_email || user.email,
          notification_sent: false,
        });

        totalNew++;
      }
    }

    return Response.json({
      success: true,
      synced: totalNew,
      cars_monitored: propertiesWithCAR.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});