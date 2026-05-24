import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { property_id, lat, lng, days = 90 } = await req.json();

    if (!property_id || lat == null || lng == null) {
      return Response.json({ error: 'property_id, lat e lng são obrigatórios' }, { status: 400 });
    }

    // Calcular datas: últimos N dias até hoje
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const fmt = (d) => d.toISOString().split('T')[0];

    // Open-Meteo Historical API — gratuita, sem chave
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${fmt(startDate)}&end_date=${fmt(endDate)}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,relative_humidity_2m_mean&timezone=America%2FSao_Paulo`;

    const resp = await fetch(url);
    if (!resp.ok) {
      const txt = await resp.text();
      return Response.json({ error: `Open-Meteo error: ${txt}` }, { status: 502 });
    }

    const data = await resp.json();
    const daily = data.daily;

    if (!daily?.time?.length) {
      return Response.json({ error: 'Sem dados retornados pela Open-Meteo' }, { status: 502 });
    }

    // Montar array de registros históricos
    const historical_records = daily.time.map((date, i) => ({
      date,
      temperature_max: daily.temperature_2m_max?.[i] ?? null,
      temperature_min: daily.temperature_2m_min?.[i] ?? null,
      precipitation: daily.precipitation_sum?.[i] ?? 0,
      humidity_avg: daily.relative_humidity_2m_mean?.[i] ?? null,
      wind_speed_max: daily.windspeed_10m_max?.[i] ?? null,
      climate_events: []
    }));

    // Buscar TODOS os registros da propriedade e atualizar cada um
    const existing = await base44.entities.ClimateMonitoring.filter({ property_id }, '-created_date');

    if (!existing || existing.length === 0) {
      return Response.json({ error: 'Nenhum registro climático encontrado para esta propriedade. Atualize os dados atuais primeiro.' }, { status: 404 });
    }

    for (const record of existing) {
      // Preservar observações manuais já existentes (observation, divergence_type, divergence_detail)
      const existingHistory = Array.isArray(record.historical_records) ? record.historical_records : [];
      const annotationsMap = {};
      existingHistory.forEach(r => {
        if (r.observation || r.divergence_type) {
          annotationsMap[r.date] = {
            observation: r.observation,
            divergence_type: r.divergence_type,
            divergence_detail: r.divergence_detail
          };
        }
      });

      // Mesclar dados Open-Meteo com anotações existentes
      const mergedRecords = historical_records.map(r => ({
        ...r,
        ...(annotationsMap[r.date] || {})
      }));

      await base44.entities.ClimateMonitoring.update(record.id, {
        historical_records: mergedRecords,
        data_source: 'Open-Meteo (ERA5)'
      });
    }

    return Response.json({
      success: true,
      days_imported: historical_records.length,
      records_updated: existing.length,
      start_date: fmt(startDate),
      end_date: fmt(endDate)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});