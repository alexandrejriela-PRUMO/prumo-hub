/**
 * Função para disparar notificações em tempo real quando alertas ocorrem
 * Esta função deve ser chamada quando novos alertas ambientais ou climáticos são criados
 */

async function triggerEnvironmentalAlertNotification(alert, property) {
  try {
    const { base44 } = require('@/api/base44Client');

    // Buscar preferências de notificação do usuário
    const preferences = await base44.entities.NotificationPreference.filter({
      user_email: property.owner_email,
      event_type: 'alerta_ambiental'
    });

    if (preferences.length === 0) return;
    
    const pref = preferences[0];

    // Determinar severidade
    const severityMap = {
      'Baixa': 'baixa',
      'Média': 'media',
      'Alta': 'alta',
      'Crítica': 'critica'
    };

    // Criar notificação em tempo real
    const notification = {
      user_email: property.owner_email,
      title: `Alerta Ambiental: ${alert.title}`,
      message: alert.description,
      type: 'alerta_ambiental',
      severity: severityMap[alert.severity] || 'media',
      source: property.id,
      source_id: alert.id,
      action_url: `/EnvironmentalAlerts?alert_id=${alert.id}`
    };

    // Criar registro de notificação
    await base44.entities.RealtimeNotification.create(notification);

    // Enviar email se configurado
    if (pref.email_enabled) {
      await base44.integrations.Core.SendEmail({
        to: property.owner_email,
        subject: `🚨 Alerta Ambiental: ${alert.title}`,
        body: `
          <h2>Alerta Ambiental Detectado</h2>
          <p><strong>Propriedade:</strong> ${property.property_name}</p>
          <p><strong>Tipo:</strong> ${alert.alert_type}</p>
          <p><strong>Severidade:</strong> ${alert.severity}</p>
          <p><strong>Descrição:</strong> ${alert.description}</p>
          <p><a href="https://seu-app.com/EnvironmentalAlerts?alert_id=${alert.id}">Ver Detalhes</a></p>
        `
      });
    }

    console.log('Notificação de alerta ambiental criada:', notification);
  } catch (error) {
    console.error('Erro ao disparar notificação:', error);
  }
}

async function triggerClimateAlertNotification(alert, property) {
  try {
    const { base44 } = require('@/api/base44Client');

    // Buscar preferências de notificação do usuário
    const preferences = await base44.entities.NotificationPreference.filter({
      user_email: property.owner_email,
      event_type: 'alerta_climatico'
    });

    if (preferences.length === 0) return;

    const pref = preferences[0];

    const severityMap = {
      'Baixa': 'baixa',
      'Média': 'media',
      'Alta': 'alta',
      'Crítica': 'critica'
    };

    // Criar notificação em tempo real
    const notification = {
      user_email: property.owner_email,
      title: `Alerta Climático: ${alert.type}`,
      message: alert.message,
      type: 'alerta_climatico',
      severity: severityMap[alert.severity] || 'media',
      source: property.id,
      source_id: alert.id,
      action_url: `/ClimateMonitoring`
    };

    // Criar registro de notificação
    await base44.entities.RealtimeNotification.create(notification);

    // Enviar email se configurado
    if (pref.email_enabled) {
      await base44.integrations.Core.SendEmail({
        to: property.owner_email,
        subject: `⛈️ Alerta Climático: ${alert.type}`,
        body: `
          <h2>Alerta Climático Detectado</h2>
          <p><strong>Propriedade:</strong> ${property.property_name}</p>
          <p><strong>Tipo:</strong> ${alert.type}</p>
          <p><strong>Severidade:</strong> ${alert.severity}</p>
          <p><strong>Mensagem:</strong> ${alert.message}</p>
          <p><a href="https://seu-app.com/ClimateMonitoring">Ver Monitoramento</a></p>
        `
      });
    }

    console.log('Notificação de alerta climático criada:', notification);
  } catch (error) {
    console.error('Erro ao disparar notificação climática:', error);
  }
}

module.exports = {
  triggerEnvironmentalAlertNotification,
  triggerClimateAlertNotification
};