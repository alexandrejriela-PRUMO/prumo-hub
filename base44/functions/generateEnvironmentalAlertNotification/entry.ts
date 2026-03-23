// Esta é uma função backend que será chamada quando um alerta ambiental é criado
// Para usar: implemente via backend functions no dashboard da Base44

export async function generateEnvironmentalAlertNotification(event) {
  const { data } = event;
  const alert = data;

  // Buscar preferências de notificação do usuário
  const preferences = await base44.entities.NotificationPreference.filter({
    user_email: alert.responsible_email,
    event_type: 'novo_alerta_ambiental'
  });

  if (!preferences || preferences.length === 0) return;

  const preference = preferences[0];

  // Mapear severidade para priority
  const severityMap = {
    'Baixa': 'info',
    'Média': 'warning',
    'Alta': 'error',
    'Crítica': 'error'
  };

  // Criar notificação in-app
  if (preference.push_enabled) {
    await base44.entities.InAppNotification.create({
      user_email: alert.responsible_email,
      title: `Novo Alerta: ${alert.title}`,
      message: `${alert.description} - Gravidade: ${alert.severity}`,
      event_type: 'novo_alerta_ambiental',
      severity: severityMap[alert.severity],
      read: false,
      link: `/EnvironmentalAlerts?alertId=${alert.id}`,
      metadata: { alert_id: alert.id }
    });
  }

  // Enviar email se habilitado
  if (preference.email_enabled) {
    await base44.integrations.Core.SendEmail({
      to: alert.responsible_email,
      subject: `Novo Alerta Ambiental: ${alert.title}`,
      body: `
        <h2>${alert.title}</h2>
        <p><strong>Descrição:</strong> ${alert.description}</p>
        <p><strong>Gravidade:</strong> ${alert.severity}</p>
        <p><strong>Área Afetada:</strong> ${alert.affected_area_hectares} hectares</p>
        <p><strong>Data de Detecção:</strong> ${new Date(alert.detection_date).toLocaleDateString('pt-BR')}</p>
        <p><strong>Ações Recomendadas:</strong></p>
        <ul>
          ${alert.recommended_actions?.map(action => `<li>${action}</li>`).join('')}
        </ul>
        <p><a href="https://seu-app.com/EnvironmentalAlerts?alertId=${alert.id}">Ver detalhes do alerta</a></p>
      `
    });
  }

  // Enviar SMS se habilitado
  if (preference.sms_enabled && preference.phone_number) {
    // Implementar integração SMS aqui
    console.log(`SMS para ${preference.phone_number}: Novo alerta - ${alert.title}`);
  }
}