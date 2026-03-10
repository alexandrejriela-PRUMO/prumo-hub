import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Esta função configura as automações de notificação que disparam:
 * - Quando licenças, PRADs, documentos, certificados são criados/atualizados
 * - Quando notificações precisam ser verificadas por prazos
 * 
 * Execute esta função UMA VEZ para configurar os triggers
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Só admin pode configurar automações
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Retorna instrução de como configurar as automações
    // (Você precisa criar via dashboard: Settings > Automations)

    return Response.json({
      success: true,
      message: 'Automações devem ser configuradas via dashboard',
      instructions: {
        automation_1: {
          name: 'Monitorar Alterações de Licenças',
          type: 'entity',
          entity_name: 'License',
          event_types: ['create', 'update'],
          function_name: 'sendEntityNotification',
          description: 'Dispara notificações quando licenças são criadas ou atualizadas'
        },
        automation_2: {
          name: 'Verificar Prazos Diários',
          type: 'scheduled',
          schedule_type: 'cron',
          cron_expression: '0 8 * * *',
          function_name: 'checkExpiryAndNotify',
          description: 'Verifica licenças, PRADs, certificados e documentos vencidos (8am daily)'
        },
        automation_3: {
          name: 'Monitorar Alterações de PRAD',
          type: 'entity',
          entity_name: 'PRAD',
          event_types: ['create', 'update'],
          function_name: 'sendEntityNotification',
          description: 'Dispara notificações quando PRADs são criados ou atualizados'
        },
        automation_4: {
          name: 'Monitorar Alertas Ambientais',
          type: 'entity',
          entity_name: 'EnvironmentalAlert',
          event_types: ['create', 'update'],
          function_name: 'sendEntityNotification',
          description: 'Notifica sobre alertas ambientais novos ou atualizados'
        }
      }
    });

  } catch (error) {
    console.error('Erro ao configurar automações:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});