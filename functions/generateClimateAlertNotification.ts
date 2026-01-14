// Função backend para notificar sobre alertas climáticos
// Será acionada quando um novo alerta climático é criado

export async function generateClimateAlertNotification(event) {
  const { data } = event;
  const climateData = data;

  if (!climateData.alerts || climateData.alerts.length === 0) return;

  // Buscar proprietário da propriedade
  const properties = await base44.entities.Property.filter({
    id: climateData.property_id
  });

  if (!properties || properties.length === 0) return;

  const property = properties[0];
  const ownerEmail = property.owner_email;

  // Buscar preferências de notificação
  const preferences = await base44.entities.NotificationPreference.filter({
    user_email: ownerEmail
  });

  const hasAlertPreference = preferences?.some(p => 
    p.event_type === 'novo_alerta_ambiental' || p.event_type === 'todos'
  );

  if (!hasAlertPreference) return;

  const preference = preferences?.find(p => 
    p.event_type === 'novo_alerta_ambiental' || p.event_type === 'todos'
  );

  const severityMap = {
    'Baixa': 'info',
    'Média': 'warning',
    'Alta': 'error',
    'Crítica': 'error'
  };

  // Processar cada alerta
  for (const alert of climateData.alerts) {
    // Criar notificação in-app
    if (preference?.push_enabled !== false) {
      await base44.entities.InAppNotification.create({
        user_email: ownerEmail,
        title: `Alerta Climático: ${alert.type}`,
        message: `${alert.message} - ${climateData.location_name}`,
        event_type: 'novo_alerta_ambiental',
        severity: severityMap[alert.severity],
        read: false,
        link: `/ClimateMonitoring?location=${climateData.location_name}`,
        metadata: { 
          climate_location_id: climateData.id,
          alert_type: alert.type
        }
      });
    }

    // Enviar email
    if (preference?.email_enabled) {
      await base44.integrations.Core.SendEmail({
        to: ownerEmail,
        subject: `Alerta Climático: ${alert.type} em ${climateData.location_name}`,
        body: `
          <h2>Alerta Climático Detectado</h2>
          <p><strong>Tipo:</strong> ${alert.type}</p>
          <p><strong>Localização:</strong> ${climateData.location_name}</p>
          <p><strong>Gravidade:</strong> ${alert.severity}</p>
          <p><strong>Mensagem:</strong> ${alert.message}</p>
          <p><strong>Temperatura Atual:</strong> ${climateData.temperature_current}°C</p>
          <p><strong>Umidade:</strong> ${climateData.humidity}%</p>
          <p><a href="https://seu-app.com/ClimateMonitoring?location=${encodeURIComponent(climateData.location_name)}">Ver detalhes climáticos</a></p>
        `
      });
    }
  }
}