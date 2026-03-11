import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;

    const notifications = [];
    const emailsToSend = []; // { to, subject, body }

    // Cache de preferências por email
    const prefCache = {};
    const getUserPrefs = async (email) => {
      if (!email) return {};
      if (prefCache[email]) return prefCache[email];
      try {
        const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ user_email: email });
        const map = {};
        prefs.forEach(p => { map[p.event_type] = p; });
        prefCache[email] = map;
        return map;
      } catch (e) { return {}; }
    };

    const addNotif = (userEmail, title, message, eventType, severity = 'info', link = null) => {
      if (userEmail) notifications.push({ user_email: userEmail, title, message, event_type: eventType, severity, link });
    };

    const addEmail = async (userEmail, subject, body, eventType) => {
      if (!userEmail) return;
      const prefs = await getUserPrefs(userEmail);
      const pref = prefs[eventType] || prefs['todos'];
      // Envia email se não há preferência salva (default true) ou se email_enabled = true
      if (!pref || pref.email_enabled !== false) {
        emailsToSend.push({ to: userEmail, subject, body });
      }
    };

    // ─── LICENSE ─────────────────────────────────────────────────────────
     if (event.entity_name === 'License') {
       const owner = data.owner_email;
       let consultorEmail = null;

       if (data.property_id) {
         try {
           const props = await base44.asServiceRole.entities.Property.filter({ id: data.property_id });
           if (props.length > 0) consultorEmail = props[0].consultor_email;
         } catch (e) { /* ignore */ }
       }

       if (event.type === 'create') {
         const msgCreate = `Licença ${data.license_type}${data.license_number ? ` nº ${data.license_number}` : ''} foi registrada.`;
         addNotif(owner, 'Nova Licença Cadastrada', msgCreate, 'licenca_vencendo', 'info', '/Licenses');
         await addEmail(owner,
           `[PRUMO Hub] Nova Licença Cadastrada: ${data.license_type}`,
           `<p>Olá,</p><p>Uma nova licença foi cadastrada na plataforma PRUMO Hub:</p><ul><li><strong>Tipo:</strong> ${data.license_type}</li>${data.license_number ? `<li><strong>Número:</strong> ${data.license_number}</li>` : ''}<li><strong>Status:</strong> ${data.status || 'N/A'}</li></ul><p>Acesse a plataforma para mais detalhes.</p><p>Equipe PRUMO Hub</p>`,
           'licenca_vencendo'
         );
         if (consultorEmail) addNotif(consultorEmail, 'Nova Licença - Cliente', msgCreate, 'licenca_vencendo', 'info', '/Licenses');
       }

       if (event.type === 'update') {
         const oldU = old_data?.updates || [], newU = data?.updates || [];
         if (newU.length > oldU.length) {
           const latest = newU[newU.length - 1];
           const andamentoMsg = `Licença ${data.license_type}${data.license_number ? ` nº ${data.license_number}` : ''}: ${latest.description?.substring(0, 120) || 'Nova movimentação registrada'}`;
           addNotif(owner, 'Novo Andamento em Licença', andamentoMsg, 'atualizacao_licenca', 'info', '/Licenses');
           await addEmail(owner,
             `[PRUMO Hub] Novo Andamento na Licença ${data.license_type}${data.license_number ? ` nº ${data.license_number}` : ''}`,
             `<p>Olá,</p><p>Houve uma nova movimentação na licença <strong>${data.license_type}${data.license_number ? ` nº ${data.license_number}` : ''}</strong>:</p><blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #2d6a4f;">${latest.description || 'Nova movimentação registrada'}</blockquote>${latest.date ? `<p><strong>Data:</strong> ${latest.date}</p>` : ''}${latest.responsible ? `<p><strong>Responsável:</strong> ${latest.responsible}</p>` : ''}<p>Acesse a plataforma para mais detalhes.</p><p>Equipe PRUMO Hub</p>`,
             'atualizacao_licenca'
           );
           if (consultorEmail) addNotif(consultorEmail, 'Andamento em Licença - Cliente', andamentoMsg, 'atualizacao_licenca', 'info', '/Licenses');
         }
         if (old_data?.status && old_data.status !== data.status) {
           const sev = data.status === 'Vencida' ? 'error' : 'warning';
           const statusMsg = `Licença ${data.license_type}: ${old_data.status} → ${data.status}`;
           addNotif(owner, 'Status de Licença Alterado', statusMsg, 'licenca_vencida', sev, '/Licenses');
           await addEmail(owner,
             `[PRUMO Hub] Status da Licença ${data.license_type} Alterado`,
             `<p>Olá,</p><p>O status da licença <strong>${data.license_type}${data.license_number ? ` nº ${data.license_number}` : ''}</strong> foi alterado:</p><p><strong>${old_data.status}</strong> → <strong>${data.status}</strong></p><p>Acesse a plataforma para mais detalhes.</p><p>Equipe PRUMO Hub</p>`,
             'licenca_vencida'
           );
           if (consultorEmail) addNotif(consultorEmail, 'Status de Licença Alterado - Cliente', statusMsg, 'licenca_vencida', sev, '/Licenses');
         }
       }
     }

    // ─── PROCESS ─────────────────────────────────────────────────────────
    if (event.entity_name === 'Process') {
      const client = data.client_email;
      let consultorEmail = null;

      // Buscar consultor responsável pela propriedade
      if (data.property_id) {
        try {
          const props = await base44.asServiceRole.entities.Property.filter({ id: data.property_id });
          if (props.length > 0) consultorEmail = props[0].consultor_email;
        } catch (e) { /* ignore */ }
      }

      if (event.type === 'create') {
        const title = 'Novo Processo Registrado';
        const message = `Processo ${data.process_number} (${data.process_type}): ${data.subject}`;
        addNotif(client, title, message, 'novo_processo', 'info', '/Processes');
        if (consultorEmail) addNotif(consultorEmail, `Novo Processo - Cliente`, message, 'novo_processo', 'info', '/Processes');

        // Email para o produtor
        if (client) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: client,
              subject: `[PRUMO Hub] Novo Processo Registrado: ${data.process_number}`,
              body: `<p>Olá,</p>
<p>Um novo processo foi cadastrado na plataforma PRUMO Hub:</p>
<ul>
  <li><strong>Número:</strong> ${data.process_number}</li>
  <li><strong>Tipo:</strong> ${data.process_type}</li>
  <li><strong>Matéria:</strong> ${data.subject}</li>
  <li><strong>Status:</strong> ${data.status}</li>
  ${data.parties ? `<li><strong>Partes:</strong> ${data.parties}</li>` : ''}
  ${data.location ? `<li><strong>Localização:</strong> ${data.location}</li>` : ''}
</ul>
<p>Acesse a plataforma para mais detalhes.</p>
<p>Equipe PRUMO Hub</p>`
            });
          } catch (e) { console.error('Erro ao enviar email de processo:', e); }
        }
      }

      if (event.type === 'update') {
        const oldU = old_data?.updates || [], newU = data?.updates || [];
        if (newU.length > oldU.length) {
          const latest = newU[newU.length - 1];
          const movMessage = `Processo ${data.process_number}: ${latest.description?.substring(0, 120) || 'Nova movimentação'}`;
          addNotif(client, 'Novo Andamento em Processo', movMessage, 'atualizacao_processo', 'info', '/Processes');
          if (consultorEmail) addNotif(consultorEmail, 'Andamento em Processo - Cliente', movMessage, 'atualizacao_processo', 'info', '/Processes');

          // Email para o produtor
          if (client) {
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: client,
                subject: `[PRUMO Hub] Novo Andamento no Processo ${data.process_number}`,
                body: `<p>Olá,</p>
<p>Houve uma nova movimentação no processo <strong>${data.process_number}</strong>:</p>
<blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #2d6a4f;">${latest.description || 'Nova movimentação registrada'}</blockquote>
${latest.date ? `<p><strong>Data:</strong> ${latest.date}</p>` : ''}
${latest.responsible ? `<p><strong>Responsável:</strong> ${latest.responsible}</p>` : ''}
<p>Acesse a plataforma para mais detalhes.</p>
<p>Equipe PRUMO Hub</p>`
              });
            } catch (e) { console.error('Erro ao enviar email de andamento:', e); }
          }
        }
        if (old_data?.status && old_data.status !== data.status) {
          const statusMsg = `Processo ${data.process_number}: ${old_data.status} → ${data.status}`;
          addNotif(client, 'Status de Processo Alterado', statusMsg, 'atualizacao_processo', 'warning', '/Processes');
          if (consultorEmail) addNotif(consultorEmail, 'Status de Processo Alterado - Cliente', statusMsg, 'atualizacao_processo', 'warning', '/Processes');

          // Email para o produtor
          if (client) {
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: client,
                subject: `[PRUMO Hub] Status do Processo ${data.process_number} Alterado`,
                body: `<p>Olá,</p>
<p>O status do processo <strong>${data.process_number}</strong> foi alterado:</p>
<p><strong>${old_data.status}</strong> → <strong>${data.status}</strong></p>
<p>Acesse a plataforma para mais detalhes.</p>
<p>Equipe PRUMO Hub</p>`
              });
            } catch (e) { console.error('Erro ao enviar email de status:', e); }
          }
        }
      }
    }

    // ─── ENVIRONMENTAL ALERT ─────────────────────────────────────────────
    if (event.entity_name === 'EnvironmentalAlert') {
      let ownerEmail = data.responsible_email;
      let consultorEmail = null;

      if (data.property_id) {
        try {
          const props = await base44.asServiceRole.entities.Property.filter({ id: data.property_id });
          if (props.length > 0) {
            ownerEmail = ownerEmail || props[0].owner_email;
            consultorEmail = props[0].consultor_email;
          }
        } catch (e) { /* ignore */ }
      }

      const sev = (data.severity === 'Crítica' || data.severity === 'Alta') ? 'error' : 'warning';

      if (event.type === 'create') {
        addNotif(ownerEmail, 'Novo Alerta Ambiental',
          `${data.alert_type}: ${data.title}`, 'novo_alerta_ambiental', sev, '/EnvironmentalAlerts');
        if (consultorEmail) addNotif(consultorEmail, 'Novo Alerta Ambiental',
          `${data.alert_type}: ${data.title}`, 'novo_alerta_ambiental', sev, '/EnvironmentalAlerts');
      }
      if (event.type === 'update' && old_data?.status !== data.status) {
        if (data.status === 'Resolvido') {
          addNotif(ownerEmail, 'Alerta Ambiental Resolvido',
            `O alerta "${data.title}" foi resolvido.`, 'alerta_resolvido', 'success', '/EnvironmentalAlerts');
        } else {
          addNotif(ownerEmail, 'Alerta Ambiental Atualizado',
            `"${data.title}": ${old_data?.status} → ${data.status}`, 'novo_alerta_ambiental', sev, '/EnvironmentalAlerts');
        }
      }
    }

    // ─── PRAD ────────────────────────────────────────────────────────────
     if (event.entity_name === 'PRAD') {
       const owner = data.owner_email;
       let consultorEmail = null;

       // Buscar consultor responsável pela propriedade
       if (data.property_id) {
         try {
           const props = await base44.asServiceRole.entities.Property.filter({ id: data.property_id });
           if (props.length > 0) consultorEmail = props[0].consultor_email;
         } catch (e) { /* ignore */ }
       }

       if (event.type === 'create') {
         addNotif(owner, 'Novo PRAD Criado',
           `Projeto "${data.project_name}" foi registrado.`, 'outro', 'info', '/PRAD');
         if (consultorEmail) {
           addNotif(consultorEmail, 'Novo PRAD - Cliente',
             `Projeto "${data.project_name}" foi criado.`, 'outro', 'info', '/PRAD');
         }
       }
       if (event.type === 'update') {
         if (old_data?.status && old_data.status !== data.status) {
           const sev = data.status === 'Concluído' ? 'success' : 'info';
           addNotif(owner, 'Status do PRAD Alterado',
             `"${data.project_name}": ${old_data.status} → ${data.status}`,
             'outro', sev, '/PRAD');
           if (consultorEmail) {
             addNotif(consultorEmail, 'Status do PRAD Alterado - Cliente',
               `"${data.project_name}": ${old_data.status} → ${data.status}`,
               'outro', sev, '/PRAD');
           }
         }
         const oldP = old_data?.pipeline_status || [], newP = data?.pipeline_status || [];
         for (let i = 0; i < newP.length; i++) {
           if (oldP[i] && oldP[i].current_status !== newP[i].current_status) {
             const sev = newP[i].current_status === 'Concluído' ? 'success' : 'info';
             addNotif(owner, 'Andamento no PRAD',
               `Etapa "${newP[i].stage_name}": ${oldP[i].current_status} → ${newP[i].current_status}`,
               'outro', sev, '/PRAD');
             if (consultorEmail) {
               addNotif(consultorEmail, 'Andamento no PRAD - Cliente',
                 `Etapa "${newP[i].stage_name}" progrediu.`,
                 'outro', sev, '/PRAD');
             }
           }
         }
         const oldR = old_data?.annual_reports || [], newR = data?.annual_reports || [];
         for (let i = 0; i < newR.length; i++) {
           if (oldR[i] && oldR[i].status !== newR[i].status) {
             addNotif(owner, 'Relatório Anual do PRAD Atualizado',
               `Relatório Ano ${newR[i].year}: ${oldR[i].status} → ${newR[i].status}`,
               'outro', 'info', '/PRAD');
             if (consultorEmail) {
               addNotif(consultorEmail, 'Relatório Anual do PRAD - Cliente',
                 `Relatório Ano ${newR[i].year} atualizado.`,
                 'outro', 'info', '/PRAD');
             }
           }
         }
       }
     }

    // ─── MAPPING (Agricultura de Precisão) ───────────────────────────────
    if (event.entity_name === 'Mapping') {
      const userEmail = data.user_email;
      if (event.type === 'create') {
        addNotif(userEmail, 'Novo Mapeamento Criado',
          `${data.mapping_type}: "${data.title}" foi criado.`, 'outro', 'info', '/Mappings');
      }
      if (event.type === 'update' && old_data?.status !== data.status) {
        addNotif(userEmail, 'Status do Mapeamento Alterado',
          `"${data.title}": ${old_data?.status} → ${data.status}`,
          'outro', data.status === 'Concluído' ? 'success' : 'info', '/Mappings');
      }
    }

    // ─── GEOREFERENCING ──────────────────────────────────────────────────
    if (event.entity_name === 'Georeferencing') {
      const owner = data.owner_email;
      if (event.type === 'create') {
        addNotif(owner, 'Georreferenciamento Registrado',
          `Novo processo de georreferenciamento iniciado.`, 'outro', 'info', '/Georeferencing');
      }
      if (event.type === 'update') {
        if (old_data?.status !== data.status) {
          addNotif(owner, 'Status do Georreferenciamento Alterado',
            `Status: ${old_data?.status} → ${data.status}`,
            'outro', data.status === 'Regular' ? 'success' : 'warning', '/Georeferencing');
        }
        if (old_data?.sigef_status !== data.sigef_status) {
          addNotif(owner, 'Status SIGEF Atualizado',
            `SIGEF: ${old_data?.sigef_status || '—'} → ${data.sigef_status}`,
            'outro', data.sigef_status === 'Aprovado' ? 'success' : 'info', '/Georeferencing');
        }
      }
    }

    // ─── CLIENT CRM (para consultor) ─────────────────────────────────────
    if (event.entity_name === 'ClientCRM') {
      const consultor = data.consultor_email;
      if (event.type === 'update') {
        const oldI = old_data?.interactions || [], newI = data?.interactions || [];
        if (newI.length > oldI.length) {
          const latest = newI[newI.length - 1];
          addNotif(consultor, 'Nova Interação com Cliente',
            `${latest.type}: ${latest.title || latest.description?.substring(0, 100) || 'Nova interação'}`,
            'outro', 'info', '/ConsultorClients');
        }
        const oldT = old_data?.tasks || [], newT = data?.tasks || [];
        if (newT.length > oldT.length) {
          const latest = newT[newT.length - 1];
          addNotif(consultor, 'Nova Tarefa de CRM',
            `${latest.title} | Vence: ${latest.due_date || 'sem data'} | Prioridade: ${latest.priority}`,
            'outro', latest.priority === 'Alta' ? 'warning' : 'info', '/ConsultorClients');
        }
        const oldS = old_data?.services || [], newS = data?.services || [];
        for (let i = 0; i < newS.length; i++) {
          if (oldS[i] && oldS[i].status !== newS[i].status) {
            const val = newS[i].value ? ` (R$ ${Number(newS[i].value).toLocaleString('pt-BR')})` : '';
            addNotif(consultor, 'Status de Serviço Alterado',
              `${newS[i].name}${val}: ${oldS[i].status} → ${newS[i].status}`,
              'outro', newS[i].status === 'Cancelado' ? 'error' : newS[i].status === 'Concluído' ? 'success' : 'info',
              '/ConsultorClients');
          }
        }
      }
    }

    // ─── REQUEST (Consultoria e Requerimentos) ────────────────────────────
    if (event.entity_name === 'Request') {
      const client = data.client_email;

      const findConsultores = async () => {
        try {
          const props = await base44.asServiceRole.entities.Property.filter({ owner_email: client });
          return [...new Set(props.filter(p => p.consultor_email).map(p => p.consultor_email))];
        } catch (e) { return []; }
      };

      if (event.type === 'create') {
        const consultores = await findConsultores();
        const sev = (data.priority === 'Urgente' || data.priority === 'Alta') ? 'warning' : 'info';
        for (const c of consultores) {
          addNotif(c, 'Novo Requerimento Recebido',
            `[${data.category}] ${data.subject}`, 'novo_requerimento', sev, '/Requests');
        }
      }

      if (event.type === 'update') {
        const oldC = old_data?.conversation || [], newC = data?.conversation || [];
        if (newC.length > oldC.length) {
          const latest = newC[newC.length - 1];
          if (latest.sender_type === 'team') {
            addNotif(client, 'Nova Resposta ao seu Requerimento',
              `"${data.subject}": ${latest.message?.substring(0, 120) || 'Nova mensagem da equipe'}`,
              'resposta_requerimento', 'info', '/Requests');
          } else {
            const consultores = await findConsultores();
            for (const c of consultores) {
              addNotif(c, 'Nova Mensagem de Cliente',
                `"${data.subject}": ${latest.message?.substring(0, 120) || 'Nova mensagem'}`,
                'novo_requerimento', 'info', '/Requests');
            }
          }
        }
        if (old_data?.status && old_data.status !== data.status) {
          addNotif(client, 'Status do Requerimento Alterado',
            `"${data.subject}": ${old_data.status} → ${data.status}`,
            'resposta_requerimento', data.status === 'Respondido' ? 'success' : 'info', '/Requests');
        }
      }
    }

    // ─── PROPERTY ────────────────────────────────────────────────────────
    if (event.entity_name === 'Property') {
      if (event.type === 'create' && data.consultor_email) {
        addNotif(data.consultor_email, 'Nova Propriedade Cadastrada',
          `"${data.property_name}" vinculada ao cliente ${data.client_name || data.owner_email}.`,
          'outro', 'info', '/Properties');
      }
    }

    // ─── CARBON CREDIT ───────────────────────────────────────────────────
    if (event.entity_name === 'CarbonCredit') {
      const owner = data.owner_email;
      if (event.type === 'create') {
        addNotif(owner, 'Novo Crédito de Carbono Registrado',
          `Projeto "${data.project_name || 'sem nome'}" registrado.`, 'outro', 'info', '/CarbonCredits');
      }
      if (event.type === 'update' && old_data?.status !== data.status) {
        addNotif(owner, 'Status de Crédito de Carbono Alterado',
          `"${data.project_name}": ${old_data?.status} → ${data.status}`,
          'outro', data.status === 'Certificado' ? 'success' : 'info', '/CarbonCredits');
      }
    }

    // ─── PSA CONTRACT ────────────────────────────────────────────────────
    if (event.entity_name === 'PSAContract') {
      const owner = data.owner_email;
      if (event.type === 'create') {
        addNotif(owner, 'Novo Contrato PSA Registrado',
          `Contrato "${data.contract_name || 'sem nome'}" registrado.`, 'outro', 'info', '/PSAContracts');
      }
      if (event.type === 'update' && old_data?.status !== data.status) {
        addNotif(owner, 'Status de Contrato PSA Alterado',
          `"${data.contract_name || 'sem nome'}": ${old_data?.status} → ${data.status}`,
          'outro', 'info', '/PSAContracts');
      }
    }

    // ─── ENVIRONMENTAL EASEMENT ──────────────────────────────────────────
    if (event.entity_name === 'EnvironmentalEasement') {
      const owner = data.owner_email;
      if (event.type === 'create') {
        addNotif(owner, 'Nova Servidão Ambiental Registrada',
          `Servidão ambiental registrada.`, 'outro', 'info', '/EnvironmentalEasements');
      }
      if (event.type === 'update' && old_data?.status !== data.status) {
        addNotif(owner, 'Status de Servidão Ambiental Alterado',
          `${old_data?.status} → ${data.status}`, 'outro', 'info', '/EnvironmentalEasements');
      }
    }

    // ─── AUDIT LOG (Modificações pela Equipe) ────────────────────────────
    if (event.entity_name === 'AuditLog' && event.type === 'create') {
      const actorEmail = data.user_email;
      try {
        const memberships = await base44.asServiceRole.entities.TeamMember.filter({
          member_email: actorEmail,
          status: 'Ativo'
        });
        if (memberships.length > 0) {
          const primaryEmail = memberships[0].primary_user_email;
          if (primaryEmail && primaryEmail !== actorEmail) {
            const verb = data.action === 'create' ? 'criou' : data.action === 'update' ? 'atualizou' : 'excluiu';
            addNotif(primaryEmail, 'Modificação pela Equipe',
              `${data.user_full_name || actorEmail} ${verb} ${data.entity_label || data.entity_name}.`,
              'outro', 'info', null);
          }
        }
      } catch (e) { /* ignore */ }
    }

    // ─── SAVE ALL NOTIFICATIONS ──────────────────────────────────────────
    if (notifications.length === 0) {
      return Response.json({ success: true, message: 'Evento não requer notificação' });
    }

    for (const notif of notifications) {
      await base44.asServiceRole.entities.InAppNotification.create({
        user_email: notif.user_email,
        title: notif.title,
        message: notif.message,
        event_type: notif.event_type,
        severity: notif.severity,
        read: false,
        link: notif.link,
        metadata: {
          entity_name: event.entity_name,
          entity_id: event.entity_id,
          timestamp: new Date().toISOString()
        }
      });
    }

    return Response.json({ success: true, notifications_sent: notifications.length });

  } catch (error) {
    console.error('Erro ao processar notificação:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});