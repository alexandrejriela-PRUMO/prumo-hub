import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const BASE_URL = 'https://plataforma.alerta.mapbiomas.org';

async function signIn() {
  const email = Deno.env.get('MAPBIOMAS_EMAIL');
  const password = Deno.env.get('MAPBIOMAS_PASSWORD');

  const res = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.token;
}

async function fetchRecentAlerts(token, monthsBack = 3) {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - monthsBack);

  const params = new URLSearchParams({
    start_year: start.getFullYear(),
    start_month: start.getMonth() + 1,
    end_year: now.getFullYear(),
    end_month: now.getMonth() + 1,
  });

  const res = await fetch(`${BASE_URL}/api/v1/validated_alerts?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) throw new Error(`Alerts fetch failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all properties with CAR numbers
    const filter = user.role === 'admin' ? {} : { owner_email: user.email };
    const properties = await base44.entities.Property.filter(filter);
    const propertiesWithCAR = properties.filter(p => p.car_number);

    if (propertiesWithCAR.length === 0) {
      return Response.json({ message: 'Nenhum CAR cadastrado para monitorar.', synced: 0 });
    }

    const carNumbers = propertiesWithCAR.map(p => p.car_number.toUpperCase().trim());

    const token = await signIn();
    const alerts = await fetchRecentAlerts(token);

    if (!Array.isArray(alerts)) {
      return Response.json({ error: 'Resposta inesperada da API MapBiomas', raw: alerts }, { status: 500 });
    }

    // Filter alerts that match any of our CAR numbers
    const matchingAlerts = alerts.filter(alert => {
      const alertCars = (alert.cars || []).map(c => (c.code || '').toUpperCase().trim());
      return alertCars.some(code => carNumbers.includes(code));
    });

    let totalNew = 0;

    for (const alert of matchingAlerts) {
      // Find which property matches
      const matchingCar = (alert.cars || []).find(c =>
        carNumbers.includes((c.code || '').toUpperCase().trim())
      );
      const property = propertiesWithCAR.find(p =>
        p.car_number.toUpperCase().trim() === (matchingCar?.code || '').toUpperCase().trim()
      );

      // Check if already synced
      const alertTitle = `Alerta MapBiomas #${alert.id}`;
      const existing = await base44.entities.EnvironmentalAlert.filter({
        title: alertTitle,
        property_id: property?.id || ''
      });

      if (existing.length > 0) continue;

      const areaHa = parseFloat(alert.geom_area_ha || 0);

      await base44.entities.EnvironmentalAlert.create({
        property_id: property?.id || '',
        alert_type: 'Desmatamento',
        severity: areaHa > 50 ? 'Crítica' : areaHa > 10 ? 'Alta' : areaHa > 3 ? 'Média' : 'Baixa',
        title: alertTitle,
        description: `Área: ${areaHa.toFixed(2)} ha | Validado: ${alert.validation ? 'Sim' : 'Não'} | CAR: ${matchingCar?.code || 'N/A'}`,
        affected_area_hectares: areaHa,
        detection_date: alert.after_image_date || alert.before_image_date || new Date().toISOString().split('T')[0],
        status: 'Aberto',
        data_source: 'MapBiomas',
        responsible_email: property?.owner_email || user.email,
        notification_sent: false,
        attachments: [
          ...(alert.before_image_url ? [{ name: 'Imagem Antes', url: alert.before_image_url, type: 'foto' }] : []),
          ...(alert.after_image_url ? [{ name: 'Imagem Depois', url: alert.after_image_url, type: 'foto' }] : []),
        ]
      });

      totalNew++;
    }

    return Response.json({
      success: true,
      synced: totalNew,
      total_alerts_found: matchingAlerts.length,
      cars_monitored: carNumbers.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});