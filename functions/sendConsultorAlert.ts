import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.user_type !== 'consultor') {
      return Response.json({ error: 'Apenas consultores podem enviar alertas' }, { status: 403 });
    }

    const payload = await req.json();
    const {
      property_id,
      viewer_email,
      alert_type, // 'license', 'prad', 'document', 'custom'
      title,
      message,
      severity = 'info',
      link = null,
      send_email = true
    } = payload;

    // Validação básica
    if (!property_id || !viewer_email || !alert_type || !title || !message) {
      return Response.json({
        error: 'Campos obrigatórios: property_id, viewer_email, alert_type, title, message'
      }, { status: 400 });
    }

    // Verifica se o consultor é responsável pela propriedade
    const property = await base44.asServiceRole.entities.Property.filter({ id: property_id });
    if (property.length === 0 || property[0].consultor_email !== user.email) {
      return Response.json({ error: 'Não autorizado para esta propriedade' }, { status: 403 });
    }

    // Cria notificação in-app
    const notification = await base44.asServiceRole.entities.InAppNotification.create({
      user_email: viewer_email,
      title,
      message,
      event_type: alert_type === 'license' ? 'licenca_vencendo' : 
                  alert_type === 'prad' ? 'outro' :
                  alert_type === 'document' ? 'documento_vencendo' : 'outro',
      severity,
      link,
      read: false,
      metadata: {
        sent_by: user.email,
        sent_by_name: user.full_name || user.email,
        property_id,
        alert_type,
        timestamp: new Date().toISOString(),
        manual_alert: true
      }
    });

    // Envia email se habilitado
    if (send_email) {
      await base44.integrations.Core.SendEmail({
        to: viewer_email,
        subject: `📬 Alerta do Consultor: ${title}`,
        body: `Olá,\n\n${user.full_name || 'Seu consultor'} enviou um alerta para você:\n\n${title}\n\n${message}\n\nPor favor, verifique a plataforma para mais detalhes.\n\nAtenciosamente,\nPRUMO Hub`
      });
    }

    // Log da ação
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      user_full_name: user.full_name,
      action: 'create',
      entity_name: 'ConsultorAlert',
      entity_id: notification.id,
      entity_label: `Alerta: ${title}`,
      description: `Consultor ${user.email} enviou alerta manual para ${viewer_email}`,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      notification_id: notification.id,
      message: 'Alerta enviado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao enviar alerta:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});