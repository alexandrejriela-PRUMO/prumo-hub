/**
 * checkExpiryNotifications — Verifica vencimentos e notifica responsáveis + equipe.
 * Canais: push (in-app) + email. SMS: não implementado.
 *
 * v3 — Adicionado envio de emails para tarefas vencidas, licenças, processos e prazos críticos.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let totalPush = 0;
    let totalEmail = 0;

    // ─── Cache local por execução ────────────────────────────────────────
    const teamCache = {};
    const userDataCache = {};
    const propConsultorCache = {};
    const emailDedupeMap = new Map(); // evita email duplicado na mesma execução

    // ─── Regras de notificação por plano ─────────────────────────────────
    function canReceiveNotification(recipient, consultor) {
      const type = recipient?.user_type || 'produtor';
      if (['produtor', 'consultor', 'equipe'].includes(type)) return true;
      if (type === 'client_consultor') {
        return (consultor?.plan || '').toLowerCase() === 'enterprise';
      }
      return true;
    }

    const getDays = (dateStr) => {
      if (!dateStr) return null;
      return Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));
    };

    const getTeamEmails = async (consultorEmail) => {
      if (!consultorEmail) return [];
      if (teamCache[consultorEmail]) return teamCache[consultorEmail];
      try {
        const team = await base44.asServiceRole.entities.TeamMember.filter({
          consultor_email: consultorEmail, status: 'Ativo'
        });
        const emails = team.map(m => m.member_email).filter(Boolean);
        teamCache[consultorEmail] = emails;
        return emails;
      } catch (e) { return []; }
    };

    const getUserData = async (email) => {
      if (!email) return null;
      if (userDataCache[email]) return userDataCache[email];
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        userDataCache[email] = users[0] || { user_type: 'produtor' };
        return userDataCache[email];
      } catch (e) { return { user_type: 'produtor' }; }
    };

    const shouldNotify = async (email, consultorEmail) => {
      if (!email) return false;
      const recipient = await getUserData(email);
      const consultor = await getUserData(consultorEmail);
      return canReceiveNotification(recipient, consultor);
    };

    // ─── Push in-app com deduplicação por dia ────────────────────────────
    // Usa todayStr para garantir que não crie duplicata no mesmo dia de execução,
    // mesmo que a notificação anterior tenha sido deletada pelo usuário.
    // A deduplicação é baseada em metadata.checked_date === todayStr.
    const createNotif = async (userEmail, title, message, eventType, severity, link) => {
      if (!userEmail) return;
      try {
        // Busca notificações recentes (últimas 200) para verificar se já foi criada hoje
        const recent = await base44.asServiceRole.entities.InAppNotification.filter(
          { user_email: userEmail }, '-created_date', 200
        );
        // Verifica se já existe notificação com mesmo título E checked_date de hoje
        const alreadySentToday = recent.some(n =>
          n.title === title &&
          n.metadata?.checked_date === todayStr
        );
        if (alreadySentToday) return;

        await base44.asServiceRole.entities.InAppNotification.create({
          user_email: userEmail, title, message, event_type: eventType,
          severity, read: false, link,
          metadata: { type: 'expiry_check', checked_at: today.toISOString(), checked_date: todayStr }
        });
        totalPush++;
      } catch (e) {
        console.error('[Expiry] Erro ao criar push para', userEmail, ':', e.message);
      }
    };

    // ─── Email com deduplicação (uma vez por execução por destinatário+assunto) ─
    const sendEmail = async (to, subject, body) => {
      if (!to) return;
      const key = `${to}:${subject}`;
      if (emailDedupeMap.has(key)) return;
      emailDedupeMap.set(key, true);
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'PRUMO Hub', to, subject, body
        });
        totalEmail++;
        console.log(`[Expiry] Email → ${to}: "${subject}"`);
      } catch (e) {
        console.error('[Expiry] Erro ao enviar email para', to, ':', e.message);
      }
    };

    // ─── Notifica owner + consultor + equipe (push) ──────────────────────
    const notifyWithTeam = async (ownerEmail, consultorEmail, title, message, eventType, severity, link) => {
      if (ownerEmail) await createNotif(ownerEmail, title, message, eventType, severity, link);
      if (consultorEmail && consultorEmail !== ownerEmail) {
        await createNotif(consultorEmail, title, message, eventType, severity, link);
        const consultorData = await getUserData(consultorEmail);
        const plan = (consultorData?.plan || '').toLowerCase();
        if (['pro', 'enterprise'].includes(plan)) {
          const teamEmails = await getTeamEmails(consultorEmail);
          for (const m of teamEmails) {
            if (m !== ownerEmail && m !== consultorEmail) {
              await createNotif(m, title, message, eventType, severity, link);
            }
          }
        }
      }
    };

    // ─── Notifica push + email ────────────────────────────────────────────
    const notifyWithEmail = async (ownerEmail, consultorEmail, title, message, eventType, severity, link, emailSubject, emailBody) => {
      await notifyWithTeam(ownerEmail, consultorEmail, title, message, eventType, severity, link);
      if (ownerEmail) await sendEmail(ownerEmail, emailSubject, emailBody);
      if (consultorEmail && consultorEmail !== ownerEmail) {
        await sendEmail(consultorEmail,
          `[Equipe] ${emailSubject}`,
          `<p><strong>Notificação sobre cliente:</strong></p>${emailBody}`
        );
      }
    };

    const getConsultor = async (propertyId) => {
      if (!propertyId) return null;
      if (propConsultorCache[propertyId] !== undefined) return propConsultorCache[propertyId];
      try {
        const props = await base44.asServiceRole.entities.Property.filter({ id: propertyId });
        propConsultorCache[propertyId] = props[0]?.consultor_email || null;
        return propConsultorCache[propertyId];
      } catch (e) { return null; }
    };

    // ─── LICENSES ────────────────────────────────────────────────────────
    const licenses = await base44.asServiceRole.entities.License.list();
    for (const lic of licenses) {
      if (!lic.expiry_date || !lic.owner_email || lic.status === 'Vencida') continue;
      const days = getDays(lic.expiry_date);
      if (days === null) continue;
      const consultorEmail = await getConsultor(lic.property_id);
      const licLabel = `${lic.license_type}${lic.license_number ? ` nº ${lic.license_number}` : ''}`;

      if (days <= 0) {
        const title = `Licença VENCIDA: ${lic.license_type}`;
        await notifyWithEmail(lic.owner_email, consultorEmail,
          title,
          `Licença ${licLabel} está VENCIDA há ${Math.abs(days)} dia(s).`,
          'licenca_vencida', 'error', '/Licenses',
          `[PRUMO Hub] ⛔ ${title}`,
          `<p>Olá,</p><p>A licença <strong>${licLabel}</strong> está <strong>VENCIDA</strong> há ${Math.abs(days)} dia(s).</p><p>Renove imediatamente para evitar penalidades.</p><p>Equipe PRUMO Hub</p>`
        );
      } else if ([1, 7, 15, 30].includes(days)) {
        const title = `Licença vencendo em ${days} dia${days > 1 ? 's' : ''}`;
        await notifyWithEmail(lic.owner_email, consultorEmail,
          title,
          `Licença ${licLabel} vence em ${days} dia${days > 1 ? 's' : ''}.`,
          'licenca_vencendo', days <= 7 ? 'error' : 'warning', '/Licenses',
          `[PRUMO Hub] ⚠️ ${title}: ${lic.license_type}`,
          `<p>Olá,</p><p>A licença <strong>${licLabel}</strong> vencerá em <strong>${days} dia${days > 1 ? 's' : ''}</strong>.</p><p>Providencie a renovação com antecedência.</p><p>Equipe PRUMO Hub</p>`
        );
      }
    }

    // ─── LICENSE CONDITIONS (condicionantes com prazo) ───────────────────
    for (const lic of licenses) {
      if (!lic.owner_email || !lic.conditions?.length) continue;
      const consultorEmail = await getConsultor(lic.property_id);
      for (const cond of lic.conditions) {
        if (typeof cond === 'string' || !cond?.due_date) continue;
        const days = getDays(cond.due_date);
        if (days === null) continue;
        const condText = cond.text || 'Condicionante';
        const licLabel = `${lic.license_type}${lic.license_number ? ` nº ${lic.license_number}` : ''}`;

        if (days <= 0) {
          await notifyWithEmail(lic.owner_email, consultorEmail,
            'Prazo de Condicionante Vencido',
            `Condicionante "${condText}" da ${licLabel} está VENCIDA.`,
            'licenca_vencida', 'error', '/Licenses',
            `[PRUMO Hub] ⛔ Condicionante VENCIDA: ${condText}`,
            `<p>Olá,</p><p>A condicionante <strong>"${condText}"</strong> da licença <strong>${licLabel}</strong> está <strong>VENCIDA</strong>.</p><p>Equipe PRUMO Hub</p>`
          );
        } else if ([1, 7, 15, 30].includes(days)) {
          await notifyWithEmail(lic.owner_email, consultorEmail,
            `Condicionante vence em ${days} dia${days > 1 ? 's' : ''}`,
            `"${condText}" (${licLabel}) vence em ${days} dia${days > 1 ? 's' : ''}.`,
            'licenca_vencendo', days <= 7 ? 'error' : 'warning', '/Licenses',
            `[PRUMO Hub] ⚠️ Condicionante vencendo em ${days} dia${days > 1 ? 's' : ''}`,
            `<p>Olá,</p><p>A condicionante <strong>"${condText}"</strong> da licença <strong>${licLabel}</strong> vence em <strong>${days} dia${days > 1 ? 's' : ''}</strong>.</p><p>Equipe PRUMO Hub</p>`
          );
        }
      }
    }

    // ─── PROCESSES ───────────────────────────────────────────────────────
    const processes = await base44.asServiceRole.entities.Process.list();
    for (const proc of processes) {
      if (!proc.client_email || proc.status === 'Finalizado' || proc.status === 'Arquivado') continue;
      const consultorEmail = await getConsultor(proc.property_id);
      for (const upd of (proc.updates || [])) {
        if (!upd.deadline) continue;
        const days = getDays(upd.deadline);
        if (days === null) continue;
        if (days <= 0) {
          await notifyWithEmail(proc.client_email, consultorEmail,
            'Prazo de Processo Vencido',
            `Processo ${proc.process_number}: prazo de etapa vencido.`,
            'atualizacao_processo', 'error', '/Processes',
            `[PRUMO Hub] ⛔ Prazo Vencido — Processo ${proc.process_number}`,
            `<p>Olá,</p><p>Um prazo do processo <strong>${proc.process_number}</strong> está <strong>vencido</strong>.</p><p>Acesse a plataforma para detalhes.</p><p>Equipe PRUMO Hub</p>`
          );
        } else if ([1, 7].includes(days)) {
          await notifyWithEmail(proc.client_email, consultorEmail,
            `Prazo de Processo em ${days} dia${days > 1 ? 's' : ''}`,
            `Processo ${proc.process_number}: prazo em ${days} dia${days > 1 ? 's' : ''}.`,
            'atualizacao_processo', 'warning', '/Processes',
            `[PRUMO Hub] ⚠️ Prazo de Processo em ${days} dia${days > 1 ? 's' : ''}`,
            `<p>Olá,</p><p>O processo <strong>${proc.process_number}</strong> possui um prazo que vence em <strong>${days} dia${days > 1 ? 's' : ''}</strong>.</p><p>Equipe PRUMO Hub</p>`
          );
        }
      }
    }

    // ─── PRAD DEADLINES ──────────────────────────────────────────────────
    const prads = await base44.asServiceRole.entities.PRAD.list();
    for (const prad of prads) {
      if (!prad.owner_email || prad.status === 'Concluído') continue;
      // Ignorar PRADs órfãos (sem propriedade válida)
      if (prad.property_id) {
        try {
          await base44.asServiceRole.entities.Property.get(prad.property_id);
        } catch (e) {
          console.warn(`[Expiry] PRAD "${prad.project_name}" ignorado — propriedade ${prad.property_id} não encontrada.`);
          continue;
        }
      }
      const consultorEmail = await getConsultor(prad.property_id);
      for (const stage of (prad.execution_schedule || [])) {
        if (stage.status === 'Concluído' || !stage.deadline) continue;
        const days = getDays(stage.deadline);
        if (days === null) continue;
        if (days <= 0) {
          await notifyWithEmail(prad.owner_email, consultorEmail,
            `Etapa do PRAD Atrasada`,
            `"${prad.project_name}" – etapa "${stage.stage}" está atrasada.`,
            'outro', 'error', '/PRAD',
            `[PRUMO Hub] ⛔ Etapa do PRAD Atrasada: ${prad.project_name}`,
            `<p>Olá,</p><p>A etapa <strong>"${stage.stage}"</strong> do PRAD <strong>"${prad.project_name}"</strong> está <strong>atrasada</strong>.</p><p>Equipe PRUMO Hub</p>`
          );
        } else if ([1, 7, 15].includes(days)) {
          await notifyWithTeam(prad.owner_email, consultorEmail,
            `Prazo do PRAD em ${days} dia${days > 1 ? 's' : ''}`,
            `"${prad.project_name}" – etapa "${stage.stage}" vence em ${days} dia${days > 1 ? 's' : ''}.`,
            'outro', days <= 7 ? 'warning' : 'info', '/PRAD');
        }
      }
    }

    // ─── CLIENT CONTRACTS (vencimento) ───────────────────────────────────
    const contracts = await base44.asServiceRole.entities.ClientContract.list();
    for (const contract of contracts) {
      if (!contract.end_date || contract.status === 'Cancelado' || contract.status === 'Encerrado') continue;
      const days = getDays(contract.end_date);
      if (days === null) continue;
      const consultorEmail = contract.consultor_email;
      const clientEmail = contract.client_email;

      if (days <= 0) {
        await notifyWithEmail(clientEmail, consultorEmail,
          `Contrato Vencido: ${contract.contract_type}`,
          `Contrato "${contract.contract_type}" expirou.`,
          'atualizacao_contrato', 'error', '/Contracts',
          `[PRUMO Hub] ⛔ Contrato Vencido: ${contract.contract_type}`,
          `<p>Olá,</p><p>O contrato <strong>${contract.contract_type}</strong> está <strong>vencido</strong>. Verifique a necessidade de renovação.</p><p>Equipe PRUMO Hub</p>`
        );
      } else if ([7, 30].includes(days)) {
        await notifyWithEmail(clientEmail, consultorEmail,
          `Contrato vencendo em ${days} dia${days > 1 ? 's' : ''}`,
          `Contrato "${contract.contract_type}" vence em ${days} dia${days > 1 ? 's' : ''}.`,
          'atualizacao_contrato', days <= 7 ? 'error' : 'warning', '/Contracts',
          `[PRUMO Hub] ⚠️ Contrato vencendo em ${days} dia${days > 1 ? 's' : ''}`,
          `<p>Olá,</p><p>O contrato <strong>${contract.contract_type}</strong> vencerá em <strong>${days} dia${days > 1 ? 's' : ''}</strong>.</p><p>Equipe PRUMO Hub</p>`
        );
      }
    }

    // ─── CARBON CREDITS ──────────────────────────────────────────────────
    const carbonCredits = await base44.asServiceRole.entities.CarbonCredit.list();
    for (const cc of carbonCredits) {
      const endDate = cc.end_date || cc.expiry_date || cc.validity_end;
      if (!endDate || !cc.owner_email) continue;
      const days = getDays(endDate);
      if (days === null) continue;
      if (days <= 0) {
        await createNotif(cc.owner_email, 'Crédito de Carbono Vencido',
          `"${cc.project_name || 'sem nome'}" – prazo encerrado.`, 'outro', 'error', '/CarbonCredits');
      } else if ([1, 7, 30].includes(days)) {
        await createNotif(cc.owner_email, `Crédito de Carbono Vencendo em ${days} dia${days > 1 ? 's' : ''}`,
          `"${cc.project_name || 'sem nome'}" vence em ${days} dia${days > 1 ? 's' : ''}.`,
          'outro', days <= 7 ? 'error' : 'warning', '/CarbonCredits');
      }
    }

    // ─── PSA CONTRACTS ───────────────────────────────────────────────────
    const psaContracts = await base44.asServiceRole.entities.PSAContract.list();
    for (const c of psaContracts) {
      const endDate = c.end_date || c.expiry_date || c.validity_end;
      if (!endDate || !c.owner_email) continue;
      const days = getDays(endDate);
      if (days === null) continue;
      if (days <= 0) {
        await createNotif(c.owner_email, 'Contrato PSA Vencido',
          `"${c.contract_name || 'sem nome'}" – prazo encerrado.`, 'outro', 'error', '/PSAContracts');
      } else if ([1, 7, 30].includes(days)) {
        await createNotif(c.owner_email, `Contrato PSA Vencendo em ${days} dia${days > 1 ? 's' : ''}`,
          `"${c.contract_name || 'sem nome'}" vence em ${days} dia${days > 1 ? 's' : ''}.`,
          'outro', days <= 7 ? 'error' : 'warning', '/PSAContracts');
      }
    }

    // ─── ENVIRONMENTAL EASEMENTS ─────────────────────────────────────────
    const easements = await base44.asServiceRole.entities.EnvironmentalEasement.list();
    for (const e of easements) {
      const endDate = e.end_date || e.expiry_date || e.validity_end;
      if (!endDate || !e.owner_email) continue;
      const days = getDays(endDate);
      if (days === null) continue;
      if (days <= 0) {
        await createNotif(e.owner_email, 'Servidão Ambiental Vencida',
          'Servidão ambiental – prazo encerrado.', 'outro', 'error', '/EnvironmentalEasements');
      } else if ([1, 7, 30].includes(days)) {
        await createNotif(e.owner_email, `Servidão Ambiental Vencendo em ${days} dia${days > 1 ? 's' : ''}`,
          `Servidão ambiental vence em ${days} dia${days > 1 ? 's' : ''}.`,
          'outro', days <= 7 ? 'error' : 'warning', '/EnvironmentalEasements');
      }
    }

    // ─── INVOICES ────────────────────────────────────────────────────────
    const invoices = await base44.asServiceRole.entities.Invoice.list();
    for (const inv of invoices) {
      if (inv.status === 'Pago' || inv.status === 'Cancelado') continue;
      const days = getDays(inv.due_date);
      if (days === null) continue;
      const val = inv.amount ? `R$ ${Number(inv.amount).toLocaleString('pt-BR')}` : '';
      if (days <= 0) {
        await createNotif(inv.client_email, 'Fatura Vencida',
          `Fatura ${val} está VENCIDA.`, 'fatura_vencendo', 'error', '/Invoices');
        await sendEmail(inv.client_email,
          `[PRUMO Hub] ⛔ Fatura Vencida: ${val}`,
          `<p>Olá,</p><p>Sua fatura de <strong>${val}</strong> está <strong>vencida</strong>. Regularize o quanto antes.</p><p>Equipe PRUMO Hub</p>`
        );
      } else if ([1, 3, 7].includes(days)) {
        await createNotif(inv.client_email, `Fatura Vencendo em ${days} dia${days > 1 ? 's' : ''}`,
          `Fatura ${val} vence em ${days} dia${days > 1 ? 's' : ''}.`, 'fatura_vencendo', 'warning', '/Invoices');
        if (days === 1) {
          await sendEmail(inv.client_email,
            `[PRUMO Hub] ⚠️ Fatura vence amanhã: ${val}`,
            `<p>Olá,</p><p>Sua fatura de <strong>${val}</strong> vence <strong>amanhã</strong>. Efetue o pagamento para evitar bloqueio de acesso.</p><p>Equipe PRUMO Hub</p>`
          );
        }
      }
    }

    // ─── CRM TASKS ───────────────────────────────────────────────────────
    const crmList = await base44.asServiceRole.entities.ClientCRM.list();
    for (const crm of crmList) {
      if (!crm.consultor_email) continue;
      const tasks = crm.tasks || [];
      let crmChanged = false;
      const updatedTasks = [];
      const consultorData = await getUserData(crm.consultor_email);

      for (const task of tasks) {
        let t = { ...task };
        // Marca como overdue automaticamente
        if (!t.done && t.status !== 'done' && t.due_date && t.due_date < todayStr && t.status !== 'overdue') {
          t.status = 'overdue';
          crmChanged = true;
        }
        updatedTasks.push(t);

        if (t.done || t.status === 'done' || !t.due_date) continue;
        const responsible = t.assigned_to_email || t.responsible_email || crm.consultor_email;
        const days = getDays(t.due_date);
        if (days === null) continue;

        if (days <= 0) {
          if (await shouldNotify(responsible, crm.consultor_email)) {
            await createNotif(responsible, '⚠️ Tarefa de CRM Vencida',
              `Tarefa "${t.title}" do cliente "${crm.client_name || 'N/A'}" está VENCIDA.`,
              'task_overdue', 'error', '/ConsultorClients');
            await sendEmail(responsible,
              `[PRUMO Hub] ⚠️ Tarefa Vencida: ${t.title}`,
              `<p>Olá,</p><p>A tarefa <strong>"${t.title}"</strong> do cliente <strong>${crm.client_name || 'N/A'}</strong> está <strong>vencida</strong>.</p><p>Acesse o CRM para atualizar o status.</p><p>Equipe PRUMO Hub</p>`
            );
          }
          // Notifica demais membros da equipe (plano pro/enterprise)
          const plan = (consultorData?.plan || '').toLowerCase();
          if (['pro', 'enterprise'].includes(plan)) {
            const team = await getTeamEmails(crm.consultor_email);
            for (const memberEmail of team) {
              if (memberEmail === responsible) continue;
              await createNotif(memberEmail, '⚠️ Tarefa de CRM Vencida',
                `Tarefa "${t.title}" do cliente "${crm.client_name || 'N/A'}" está VENCIDA (resp: ${responsible}).`,
                'task_overdue', 'error', '/ConsultorClients');
            }
          }
        } else if ([1, 3].includes(days)) {
          if (await shouldNotify(responsible, crm.consultor_email)) {
            await createNotif(responsible,
              `Tarefa vence em ${days} dia${days > 1 ? 's' : ''}`,
              `"${t.title}" — cliente "${crm.client_name || 'N/A'}" vence em ${days} dia${days > 1 ? 's' : ''}.`,
              'task_due_soon', days === 1 ? 'warning' : 'info', '/ConsultorClients');
            if (days === 1) {
              await sendEmail(responsible,
                `[PRUMO Hub] Tarefa vence amanhã: ${t.title}`,
                `<p>Olá,</p><p>A tarefa <strong>"${t.title}"</strong> do cliente <strong>${crm.client_name || 'N/A'}</strong> vence <strong>amanhã</strong>.</p><p>Equipe PRUMO Hub</p>`
              );
            }
          }
        }
      }

      if (crmChanged) {
        try {
          await base44.asServiceRole.entities.ClientCRM.update(crm.id, { tasks: updatedTasks });
        } catch (e) {
          console.warn(`[Expiry] Erro ao atualizar overdue no CRM ${crm.id}:`, e.message);
        }
      }
    }

    // ─── GEOREFERENCIAMENTO IRREGULAR ────────────────────────────────────
    const geos = await base44.asServiceRole.entities.Georeferencing.list();
    for (const geo of geos) {
      if (!geo.owner_email || geo.status !== 'Irregular') continue;
      const consultorEmail = await getConsultor(geo.property_id);
      await notifyWithTeam(geo.owner_email, consultorEmail,
        'Georreferenciamento Irregular',
        'Há uma irregularidade no georreferenciamento da propriedade.',
        'outro', 'error', '/Georeferencing');
    }

    console.log(`[Expiry] Concluído. Push: ${totalPush} | Email: ${totalEmail} | SMS: 0`);
    return Response.json({ success: true, notifications_push: totalPush, notifications_email: totalEmail, sms: 0 });

  } catch (error) {
    console.error('[Expiry] Erro:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});