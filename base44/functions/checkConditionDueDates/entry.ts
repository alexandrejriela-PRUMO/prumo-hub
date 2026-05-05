import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Fetch all licenses with conditions
    const licenses = await base44.asServiceRole.entities.License.list('-updated_date', 1000);
    
    const now = new Date();
    const alerts = [];

    for (const license of licenses) {
      if (!license.conditions || license.conditions.length === 0) continue;

      for (let i = 0; i < license.conditions.length; i++) {
        const cond = license.conditions[i];
        const dueDateStr = cond.due_date;
        
        if (!dueDateStr) continue;

        const dueDate = new Date(dueDateStr);
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        // Alert if due within 30 days or already overdue
        if (daysUntilDue <= 30 && daysUntilDue >= -365) {
          alerts.push({
            license_id: license.id,
            property_id: license.property_id,
            owner_email: license.owner_email,
            condition_index: i,
            condition_text: cond.text,
            due_date: dueDateStr,
            days_until_due: daysUntilDue,
            license_type: license.license_type,
            license_number: license.license_number,
          });
        }
      }
    }

    const todayStr = now.toISOString().split('T')[0];

    // Send notifications for each alert
    for (const alert of alerts) {
      try {
        // Get property info for notification
        const property = await base44.asServiceRole.entities.Property.get(alert.property_id);
        
        // Determine severity and message
        let severity = 'info';
        let messageTitle = `Condicionante Próxima do Prazo`;
        let messageBody = '';

        if (alert.days_until_due < 0) {
          severity = 'error';
          messageTitle = `Prazo de Condicionante Vencido`;
          messageBody = `A condicionante "${alert.condition_text}" (${alert.license_type} ${alert.license_number}) teve prazo vencido há ${Math.abs(alert.days_until_due)} dias.`;
        } else if (alert.days_until_due === 0) {
          severity = 'error';
          messageTitle = `Condicionante Vence Hoje`;
          messageBody = `A condicionante "${alert.condition_text}" (${alert.license_type} ${alert.license_number}) vence hoje!`;
        } else if (alert.days_until_due <= 7) {
          severity = 'error';
          messageTitle = `Condicionante Vence em ${alert.days_until_due} dia(s)`;
          messageBody = `A condicionante "${alert.condition_text}" (${alert.license_type} ${alert.license_number}) vence em ${alert.days_until_due} dia(s).`;
        } else {
          severity = 'warning';
          messageBody = `A condicionante "${alert.condition_text}" (${alert.license_type} ${alert.license_number}) vence em ${alert.days_until_due} dias.`;
        }

        // Deduplicação: verificar se já foi enviada notificação hoje para este license+condition
        const dedupeKey = `${alert.license_id}_${alert.condition_index}`;
        const recentNotifs = await base44.asServiceRole.entities.InAppNotification.filter(
          { user_email: alert.owner_email, event_type: 'documento_vencendo' },
          '-created_date',
          100
        );
        const alreadySentToday = recentNotifs.some(n =>
          n.metadata?.entity_id === alert.license_id &&
          n.metadata?.condition_index === alert.condition_index &&
          n.metadata?.checked_date === todayStr
        );
        if (alreadySentToday) {
          console.log(`⏭ Notificação já enviada hoje para condicionante: ${alert.condition_text}`);
          continue;
        }

        // Create internal notification
        await base44.asServiceRole.entities.InAppNotification.create({
          user_email: alert.owner_email,
          title: messageTitle,
          message: messageBody,
          event_type: 'documento_vencendo',
          severity: severity,
          read: false,
          link: `/Licenses?property_id=${alert.property_id}`,
          metadata: {
            entity_name: 'License',
            entity_id: alert.license_id,
            condition_index: alert.condition_index,
            property_name: property?.property_name || 'Propriedade',
            checked_date: todayStr,
            timestamp: new Date().toISOString(),
          }
        });

        // Send external email only once per alert (not daily for overdue)
        if (alert.days_until_due >= 0) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: alert.owner_email,
            subject: messageTitle,
            body: `
              <h2>${messageTitle}</h2>
              <p>${messageBody}</p>
              <hr/>
              <p><strong>Propriedade:</strong> ${property?.property_name || 'N/A'}</p>
              <p><strong>Licença:</strong> ${alert.license_type} ${alert.license_number || ''}</p>
              <p><strong>Data de Cumprimento:</strong> ${alert.due_date}</p>
              <p><strong>Condicionante:</strong> ${alert.condition_text}</p>
              <hr/>
              <p><a href="https://prumo.app/Licenses?property_id=${alert.property_id}">Ver Licença no Sistema</a></p>
            `
          });
        }

        console.log(`✓ Notificações enviadas para condicionante: ${alert.condition_text} (${alert.days_until_due} dias)`);
      } catch (notifError) {
        console.error(`✗ Erro ao enviar notificações para ${alert.owner_email}:`, notifError);
      }
    }

    return Response.json({
      success: true,
      alerts_checked: licenses.length,
      alerts_found: alerts.length,
      notifications_sent: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro na verificação de condicionantes:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});