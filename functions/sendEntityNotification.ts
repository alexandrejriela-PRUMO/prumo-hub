import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;

    const notifications = [];
    const today = new Date();

    function daysUntil(dateStr) {
      return Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));
    }

    function push(user_email, title, message, event_type, severity, link) {
      if (user_email) notifications.push({ user_email, title, message, event_type, severity: severity || 'info', link });
    }

    // === LICENÇA ===
    if (event.entity_name === 'License') {
      const email = data?.owner_email;
      if (event.type === 'create') {
        push(email, 'Nova Licença Cadastrada',
          `Licença ${data.license_type} ${data.license_number ? `Nº ${data.license_number}` : ''} foi cadastrada.`,
          'nova_licenca', 'info', 'Licenses');
      } else if (event.type === 'update') {
        const oldUpdates = old_data?.updates || [];
        const newUpdates = data?.updates || [];
        if (newUpdates.length > oldUpdates.length) {
          const latest = newUpdates[newUpdates.length - 1];
          push(email, 'Novo Andamento em Licença',
            `Licença ${data.license_type}: ${latest.description?.substring(0, 120) || 'Sem descrição'}`,
            'novo_andamento_licenca', 'info', 'Licenses');
        }
        if (old_data?.status !== data?.status) {
          const isVencida = data.status === 'Vencida';
          push(email, `Licença: Status atualizado para "${data.status}"`,
            `Licença ${data.license_type} ${data.license_number ? `Nº ${data.license_number}` : ''} agora está como "${data.status}".`,
            'licenca_status', isVencida ? 'error' : 'info', 'Licenses');
        }
        if (data.expiry_date) {
          const days = daysUntil(data.expiry_date);
          if (days <= 30 && days > 0) {
            push(email, `⚠️ Licença vencendo em ${days} dia(s)`,
              `Licença ${data.license_type} ${data.license_number ? `Nº ${data.license_number}` : ''} vence em ${days} dias. Providencie a renovação.`,
              'licenca_vencendo', days <= 7 ? 'error' : 'warning', 'Licenses');
          }
        }
      }
    }

    // === PROCESSO ===
    if (event.entity_name === 'Process') {
      const email = data?.client_email;
      if (event.type === 'create') {
        push(email, 'Novo Processo Cadastrado',
          `Processo ${data.process_type} - "${data.subject}" foi cadastrado.`,
          'novo_processo', 'info', 'Processes');
      } else if (event.type === 'update') {
        const oldUpdates = old_data?.updates || [];
        const newUpdates = data?.updates || [];
        if (newUpdates.length > oldUpdates.length) {
          const latest = newUpdates[newUpdates.length - 1];
          push(email, 'Novo Andamento em Processo',
            `Processo ${data.process_type}: ${latest.description?.substring(0, 120) || 'Sem descrição'}`,
            'novo_andamento_processo', 'info', 'Processes');
        }
        if (old_data?.status !== data?.status) {
          push(email, `Processo: Status atualizado para "${data.status}"`,
            `Processo ${data.process_type} - "${data.subject}" agora está como "${data.status}".`,
            'atualizacao_processo', 'info', 'Processes');
        }
      }
    }

    // === DOCUMENTO ===
    if (event.entity_name === 'Document') {
      const email = data?.owner_email;
      if (event.type === 'create') {
        push(email, 'Novo Documento Adicionado',
          `Documento "${data.document_name || 'sem nome'}" (${data.document_type}) foi adicionado ao sistema.`,
          'novo_documento', 'info', 'DocumentsHub');
      }
    }

    // === ALERTA AMBIENTAL ===
    if (event.entity_name === 'EnvironmentalAlert') {
      if (data?.property_id) {
        try {
          const props = await base44.asServiceRole.entities.Property.filter({ id: data.property_id });
          const prop = props[0];
          if (prop) {
            const sev = (data.severity === 'Crítica' || data.severity === 'Alta') ? 'error' : 'warning';
            if (event.type === 'create') {
              push(prop.owner_email, `⚠️ Alerta Ambiental: ${data.title}`,
                `${data.alert_type} - Severidade: ${data.severity}. ${data.description?.substring(0, 100) || ''}`,
                'novo_alerta_ambiental', sev, 'EnvironmentalAlerts');
              if (prop.consultor_email && prop.consultor_email !== prop.owner_email) {
                push(prop.consultor_email, `⚠️ Alerta Ambiental: ${data.title}`,
                  `Propriedade "${prop.property_name}" - ${data.alert_type} - Severidade: ${data.severity}`,
                  'novo_alerta_ambiental', sev, 'EnvironmentalAlerts');
              }
            } else if (event.type === 'update' && old_data?.status !== data?.status) {
              push(prop.owner_email, `Alerta Ambiental Atualizado`,
                `"${data.title}": status alterado para "${data.status}".`,
                'alerta_resolvido', data.status === 'Resolvido' ? 'success' : 'info', 'EnvironmentalAlerts');
            }
          }
        } catch (e) {
          console.error('Erro ao buscar propriedade para alerta ambiental:', e.message);
        }
      }
    }

    // === GEORREFERENCIAMENTO ===
    if (event.entity_name === 'Georeferencing') {
      const email = data?.owner_email;
      if (event.type === 'create') {
        push(email, 'Georreferenciamento Iniciado',
          `Um novo georreferenciamento foi cadastrado para sua propriedade.`,
          'novo_georreferenciamento', 'info', 'Georeferencing');
      } else if (event.type === 'update') {
        if (old_data?.status !== data?.status) {
          push(email, `Georreferenciamento: ${data.status}`,
            `Status do georreferenciamento atualizado para "${data.status}".`,
            'atualizacao_georreferenciamento', data.status === 'Irregular' ? 'error' : 'info', 'Georeferencing');
        }
        if (old_data?.sigef_status !== data?.sigef_status && data?.sigef_status) {
          push(email, `SIGEF: ${data.sigef_status}`,
            `Status no SIGEF atualizado para "${data.sigef_status}".`,
            'atualizacao_georreferenciamento', 'info', 'Georeferencing');
        }
      }
    }

    // === PRAD ===
    if (event.entity_name === 'PRAD') {
      const email = data?.owner_email;
      if (event.type === 'create') {
        push(email, 'Novo PRAD Cadastrado',
          `Projeto "${data.project_name}" de Recuperação de Área Degradada foi cadastrado.`,
          'novo_prad', 'info', 'PRAD');
      } else if (event.type === 'update') {
        if (old_data?.status !== data?.status) {
          push(email, `PRAD: Status Atualizado para "${data.status}"`,
            `Projeto "${data.project_name}" agora está como "${data.status}".`,
            'atualizacao_prad', 'info', 'PRAD');
        }
        const oldPipeline = old_data?.pipeline_status || [];
        const newPipeline = data?.pipeline_status || [];
        if (JSON.stringify(newPipeline) !== JSON.stringify(oldPipeline)) {
          const concluded = newPipeline.find((s, i) =>
            s.current_status === 'Concluído' && (oldPipeline[i]?.current_status !== 'Concluído')
          );
          if (concluded) {
            push(email, `PRAD: Etapa Concluída ✅`,
              `Etapa "${concluded.stage_name}" do projeto "${data.project_name}" foi concluída.`,
              'atualizacao_prad', 'success', 'PRAD');
          } else {
            push(email, `PRAD: Etapa Atualizada`,
              `O projeto "${data.project_name}" teve uma atualização de etapa.`,
              'atualizacao_prad', 'info', 'PRAD');
          }
        }
        const oldReports = old_data?.annual_reports || [];
        const newReports = data?.annual_reports || [];
        newReports.forEach((report, i) => {
          const old = oldReports[i];
          if (old && old.status !== report.status && report.status === 'Atrasado') {
            push(email, `PRAD: Relatório Anual Atrasado ⚠️`,
              `Relatório do Ano ${report.year} do projeto "${data.project_name}" está atrasado.`,
              'atualizacao_prad', 'error', 'PRAD');
          }
        });
      }
    }

    // === MAPEAMENTO (Agricultura de Precisão) ===
    if (event.entity_name === 'Mapping') {
      const email = data?.user_email;
      if (event.type === 'create') {
        push(email, 'Novo Mapeamento Cadastrado',
          `Mapeamento "${data.title}" (${data.mapping_type}) foi adicionado.`,
          'novo_mapeamento', 'info', 'Mappings');
      } else if (event.type === 'update' && old_data?.status !== data?.status) {
        push(email, `Mapeamento: ${data.status}`,
          `Mapeamento "${data.title}" está agora como "${data.status}".`,
          'atualizacao_mapeamento', data.status === 'Concluído' ? 'success' : 'info', 'Mappings');
      }
    }

    // === CRÉDITOS DE CARBONO ===
    if (event.entity_name === 'CarbonCredit') {
      const email = data?.owner_email;
      if (event.type === 'create') {
        push(email, 'Novo Crédito de Carbono Cadastrado',
          `Projeto "${data.project_name || 'sem nome'}" de crédito de carbono foi registrado.`,
          'ativo_ambiental', 'info', 'CarbonCredits');
      } else if (event.type === 'update' && old_data?.status !== data?.status) {
        push(email, `Crédito de Carbono: ${data.status}`,
          `Projeto "${data.project_name}" atualizado para "${data.status}".`,
          'ativo_ambiental', 'info', 'CarbonCredits');
      }
    }

    // === PSA ===
    if (event.entity_name === 'PSAContract') {
      const email = data?.owner_email;
      if (event.type === 'create') {
        push(email, 'Novo Contrato PSA Cadastrado',
          `Contrato PSA "${data.contract_name || 'sem nome'}" foi registrado.`,
          'ativo_ambiental', 'info', 'PSAContracts');
      } else if (event.type === 'update') {
        if (old_data?.status !== data?.status) {
          push(email, `PSA: Status atualizado para "${data.status}"`,
            `Contrato PSA "${data.contract_name}" atualizado para "${data.status}".`,
            'ativo_ambiental', 'info', 'PSAContracts');
        }
        if (data.end_date) {
          const days = daysUntil(data.end_date);
          if (days <= 30 && days > 0) {
            push(email, `⚠️ Contrato PSA vencendo em ${days} dia(s)`,
              `Contrato PSA "${data.contract_name}" vence em ${days} dias.`,
              'ativo_ambiental_vencendo', days <= 7 ? 'error' : 'warning', 'PSAContracts');
          }
        }
      }
    }

    // === SERVIDÃO AMBIENTAL ===
    if (event.entity_name === 'EnvironmentalEasement') {
      const email = data?.owner_email;
      if (event.type === 'create') {
        push(email, 'Nova Servidão Ambiental Cadastrada',
          `Servidão ambiental foi cadastrada para sua propriedade.`,
          'ativo_ambiental', 'info', 'EnvironmentalEasements');
      } else if (event.type === 'update' && old_data?.status !== data?.status) {
        push(email, `Servidão Ambiental: ${data.status}`,
          `Servidão ambiental atualizada para "${data.status}".`,
          'ativo_ambiental', 'info', 'EnvironmentalEasements');
      }
    }

    // === REQUERIMENTO (Consultoria) ===
    if (event.entity_name === 'Request') {
      const email = data?.client_email;
      if (event.type === 'create') {
        push(email, 'Requerimento Registrado',
          `Seu requerimento "${data.subject}" foi registrado com sucesso.`,
          'novo_requerimento', 'info', 'Requests');
      } else if (event.type === 'update') {
        const oldConv = old_data?.conversation || [];
        const newConv = data?.conversation || [];
        if (newConv.length > oldConv.length) {
          const latest = newConv[newConv.length - 1];
          if (latest?.sender_type === 'team') {
            push(email, 'Resposta no seu Requerimento',
              `A equipe respondeu ao requerimento "${data.subject}".`,
              'resposta_requerimento', 'info', 'Requests');
          }
        }
        if (old_data?.status !== data?.status) {
          push(email, `Requerimento: Status atualizado para "${data.status}"`,
            `Seu requerimento "${data.subject}" está agora como "${data.status}".`,
            'atualizacao_requerimento', 'info', 'Requests');
        }
      }
    }

    // === EQUIPE (TeamMember) ===
    if (event.entity_name === 'TeamMember') {
      const email = data?.primary_user_email;
      if (event.type === 'create') {
        push(email, 'Novo Membro Convidado para a Equipe',
          `${data.member_name || data.member_email} foi convidado como ${data.member_role || 'membro'}.`,
          'equipe_alterada', 'info', 'MyTeam');
      } else if (event.type === 'update' && old_data?.status !== data?.status) {
        push(email, `Equipe: ${data.member_name || data.member_email} - ${data.status}`,
          `${data.member_name || data.member_email} agora está "${data.status}" na sua equipe.`,
          'equipe_alterada', 'info', 'MyTeam');
      }
    }

    // === CRM DO CLIENTE (para consultor) ===
    if (event.entity_name === 'ClientCRM') {
      const email = data?.consultor_email;
      if (event.type === 'update') {
        const oldInteractions = old_data?.interactions || [];
        const newInteractions = data?.interactions || [];
        if (newInteractions.length > oldInteractions.length) {
          const latest = newInteractions[newInteractions.length - 1];
          push(email, 'Nova Interação no CRM',
            `${latest.type || 'Interação'}: "${latest.title || 'sem título'}" registrada no CRM do cliente.`,
            'crm_interacao', 'info', 'ConsultorClients');
        }
        const oldTasks = old_data?.tasks || [];
        const newTasks = data?.tasks || [];
        if (newTasks.length > oldTasks.length) {
          const latest = newTasks[newTasks.length - 1];
          push(email, 'Nova Tarefa no CRM',
            `Tarefa "${latest.title}" foi adicionada ao cliente.`,
            'crm_tarefa', 'info', 'ConsultorClients');
        }
        const oldServices = old_data?.services || [];
        const newServices = data?.services || [];
        newServices.forEach((svc, i) => {
          const oldSvc = oldServices[i];
          if (oldSvc && oldSvc.status !== svc.status) {
            push(email, `Serviço Atualizado: ${svc.name}`,
              `Serviço "${svc.name}" foi atualizado para "${svc.status}".`,
              'crm_servico', 'info', 'ConsultorClients');
          }
        });
      }
    }

    // === PROPRIEDADE (vencimento) ===
    if (event.entity_name === 'Property' && event.type === 'update') {
      // Notify consultor about property changes to their clients
      if (data?.consultor_email && old_data?.consultor_email !== data?.consultor_email) {
        push(data.consultor_email, 'Propriedade Vinculada',
          `A propriedade "${data.property_name}" foi vinculada a você como consultor.`,
          'outro', 'info', 'Properties');
      }
    }

    // Enviar todas as notificações
    const results = [];
    for (const notif of notifications) {
      if (!notif.user_email) continue;
      try {
        await base44.asServiceRole.entities.InAppNotification.create({
          user_email: notif.user_email,
          title: notif.title,
          message: notif.message,
          event_type: notif.event_type || 'outro',
          severity: notif.severity || 'info',
          read: false,
          link: notif.link || null,
          metadata: {
            entity_name: event.entity_name,
            entity_id: event.entity_id,
            timestamp: new Date().toISOString()
          }
        });
        results.push({ user: notif.user_email, title: notif.title });
        console.log(`Notificação criada: [${notif.event_type}] para ${notif.user_email}`);
      } catch (e) {
        console.error('Erro ao criar notificação:', e.message);
      }
    }

    return Response.json({
      success: true,
      notifications_sent: results.length,
      results
    });

  } catch (error) {
    console.error('Erro ao processar notificação:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});