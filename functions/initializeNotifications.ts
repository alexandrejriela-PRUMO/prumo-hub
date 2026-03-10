import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Função para inicializar o sistema de notificações
 * Execute uma vez para configurar as automações
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Este é um template de inicialização
    // Na prática, você precisa criar as automações via dashboard:
    // 1. Vá para Dashboard > Settings > Automations
    // 2. Crie as seguintes automações:

    const automationConfig = {
      automations: [
        {
          name: 'Verificar Prazos de Vencimento Diariamente',
          description: 'Verifica licenças, PRADs, certificados e documentos que estão vencendo',
          type: 'scheduled',
          automation_type: 'scheduled',
          function_name: 'checkExpiryAndNotify',
          schedule_type: 'cron',
          cron_expression: '0 8 * * *', // 8 AM diariamente
          is_active: true
        },
        {
          name: 'Notificar Alterações de Licença',
          description: 'Dispara notificações quando licenças são criadas ou atualizadas',
          type: 'entity',
          automation_type: 'entity',
          function_name: 'sendEntityNotification',
          entity_name: 'License',
          event_types: ['create', 'update'],
          is_active: true
        },
        {
          name: 'Notificar Alterações de PRAD',
          description: 'Dispara notificações quando PRADs são criados ou atualizados',
          type: 'entity',
          automation_type: 'entity',
          function_name: 'sendEntityNotification',
          entity_name: 'PRAD',
          event_types: ['create', 'update'],
          is_active: true
        },
        {
          name: 'Notificar Alertas Ambientais',
          description: 'Dispara notificações quando alertas ambientais são criados ou atualizados',
          type: 'entity',
          automation_type: 'entity',
          function_name: 'sendEntityNotification',
          entity_name: 'EnvironmentalAlert',
          event_types: ['create', 'update'],
          is_active: true
        },
        {
          name: 'Notificar Processos Legais',
          description: 'Dispara notificações quando processos são criados ou atualizados',
          type: 'entity',
          automation_type: 'entity',
          function_name: 'sendEntityNotification',
          entity_name: 'Process',
          event_types: ['create', 'update'],
          is_active: true
        },
        {
          name: 'Notificar Requerimentos',
          description: 'Dispara notificações quando requerimentos são criados ou atualizados',
          type: 'entity',
          automation_type: 'entity',
          function_name: 'sendEntityNotification',
          entity_name: 'Request',
          event_types: ['create', 'update'],
          is_active: true
        },
        {
          name: 'Notificar CRM do Consultor',
          description: 'Notifica consultores sobre interações e tarefas de clientes',
          type: 'entity',
          automation_type: 'entity',
          function_name: 'sendEntityNotification',
          entity_name: 'ClientCRM',
          event_types: ['update'],
          is_active: true
        }
      ]
    };

    return Response.json({
      success: true,
      message: 'Configuração de automações carregada',
      info: 'Configure as automações via dashboard (Settings > Automations)',
      automations: automationConfig.automations,
      instructions: {
        step_1: 'Acesse Dashboard > Settings > Automations',
        step_2: 'Clique em "New Automation"',
        step_3: 'Configure cada automação conforme os dados acima',
        step_4: 'Ative todas as automações',
        timezone_note: 'Observação: A automação de verificação de prazos (8 AM) usa o horário do servidor. Ajuste conforme necessário.'
      }
    });

  } catch (error) {
    console.error('Erro ao inicializar notificações:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});