import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { event, data, old_data } = payload;
    
    // Detectar tipo de notificação
    let notificationType = null;
    let notificationTitle = '';
    let notificationMessage = '';
    let affectedUserEmail = null;
    let severity = 'info';

    // Novo documento
    if (event.entity_name === 'Document' && event.type === 'create') {
      notificationType = 'novo_documento';
      notificationTitle = 'Novo Documento Adicionado';
      notificationMessage = `Documento "${data.document_name || 'sem nome'}" foi adicionado ao sistema.`;
      affectedUserEmail = data.owner_email;
      severity = 'info';
    }

    // Novo andamento em Licença
    if (event.entity_name === 'License' && event.type === 'update') {
      const oldUpdates = old_data?.updates || [];
      const newUpdates = data?.updates || [];
      
      if (newUpdates.length > oldUpdates.length) {
        notificationType = 'novo_andamento_licenca';
        const latestUpdate = newUpdates[newUpdates.length - 1];
        notificationTitle = 'Novo Andamento em Licença';
        notificationMessage = `Nova movimentação adicionada: ${latestUpdate.description?.substring(0, 100) || 'Sem descrição'}`;
        affectedUserEmail = data.owner_email;
        severity = 'info';
        
        // Verificar prazo
        if (latestUpdate.deadline) {
          const deadline = new Date(latestUpdate.deadline);
          const now = new Date();
          const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
          
          if (daysUntil <= 7 && daysUntil > 0) {
            severity = 'warning';
            notificationMessage += ` | ⚠️ Prazo: ${daysUntil} dias`;
          } else if (daysUntil <= 0) {
            severity = 'error';
            notificationMessage += ` | 🚨 PRAZO VENCIDO`;
          }
        }
      }
    }

    // Novo andamento em Processo
    if (event.entity_name === 'Process' && event.type === 'update') {
      const oldUpdates = old_data?.updates || [];
      const newUpdates = data?.updates || [];
      
      if (newUpdates.length > oldUpdates.length) {
        notificationType = 'novo_andamento_processo';
        const latestUpdate = newUpdates[newUpdates.length - 1];
        notificationTitle = 'Novo Andamento em Processo';
        notificationMessage = `Nova movimentação processual: ${latestUpdate.description?.substring(0, 100) || 'Sem descrição'}`;
        affectedUserEmail = data.client_email;
        severity = 'info';
        
        // Verificar prazo
        if (latestUpdate.deadline) {
          const deadline = new Date(latestUpdate.deadline);
          const now = new Date();
          const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
          
          if (daysUntil <= 7 && daysUntil > 0) {
            severity = 'warning';
            notificationMessage += ` | ⚠️ Prazo: ${daysUntil} dias`;
          } else if (daysUntil <= 0) {
            severity = 'error';
            notificationMessage += ` | 🚨 PRAZO VENCIDO`;
          }
        }
      }
    }

    // Se não identificou nenhum evento relevante, retornar
    if (!notificationType || !affectedUserEmail) {
      return Response.json({ 
        success: true, 
        message: 'Evento não requer notificação' 
      });
    }

    // Criar notificação in-app
    await base44.asServiceRole.entities.InAppNotification.create({
      user_email: affectedUserEmail,
      title: notificationTitle,
      message: notificationMessage,
      event_type: notificationType,
      severity: severity,
      read: false,
      metadata: {
        entity_name: event.entity_name,
        entity_id: event.entity_id,
        timestamp: new Date().toISOString()
      }
    });

    // Buscar ou criar preferências de notificação
    let preferences = await base44.asServiceRole.entities.NotificationPreference.filter({
      user_email: affectedUserEmail,
      event_type: notificationType
    });

    // Se não existe preferência, criar com valores padrão habilitados
    if (preferences.length === 0) {
      try {
        await base44.asServiceRole.entities.NotificationPreference.create({
          user_email: affectedUserEmail,
          event_type: notificationType,
          email_enabled: true,
          push_enabled: true,
          sms_enabled: false
        });
      } catch (prefError) {
        console.error('Erro ao criar preferência:', prefError);
      }
    }

    const userPref = preferences[0];

    // SEMPRE enviar email para esses eventos críticos
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: affectedUserEmail,
        subject: notificationTitle,
        body: `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
              <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #1B4332;">${notificationTitle}</h2>
                <p style="font-size: 16px; color: #333; line-height: 1.6;">${notificationMessage}</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
                <p style="font-size: 14px; color: #666;">
                  Esta é uma notificação automática do sistema Santa Rute.
                </p>
              </div>
            </body>
          </html>
        `
      });
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
    }

    return Response.json({ 
      success: true, 
      notification_type: notificationType,
      user_email: affectedUserEmail 
    });

  } catch (error) {
    console.error('Erro ao processar notificação:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});