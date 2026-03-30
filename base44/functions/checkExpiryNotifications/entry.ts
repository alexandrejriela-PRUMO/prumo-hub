/**
 * checkExpiryNotifications — Verifica vencimentos e notifica responsáveis + equipe.
 * SMS: ignorado silenciosamente (canal não implementado).
 *
 * CORREÇÕES v2:
 * - canReceiveNotification: produtor agora é sempre permitido
 * - notifyWithTeam: verifica plano para membros da equipe corretamente
 * - Cache movido para dentro do handler (sem dados sujos entre invocações)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    let totalSent = 0;

    // Cache local por execução
    const teamCache = {};
    const userDataCache = {};
    const propConsultorCache = {};

    // ─── Regras de notificação por plano ────────────────────────────────
    // Produtor, consultor e equipe: sempre recebem.
    // client_consultor: apenas no plano Enterprise.
    function canReceiveNotification(recipient, consultor) {
      const type = recipient?.user_type || 'produtor';
      if (['produtor', 'consultor', 'equipe'].includes(type)) return true;
      if (type === 'client_consultor') {
        const plan = (consultor?.plan || '').toLowerCase();
        return plan === 'enterprise';
      }
      return true;
    }

    // ─── Helper: dias restantes ──────────────────────────────────────────
    const getDays = (dateStr) => {
      if (!dateStr) return null;
      return Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));
    };

    // ─── Cache de emails da equipe por consultor ─────────────────────────
    const getTeamEmails = async (consultorEmail) => {
      if (!consultorEmail) return [];
      if (teamCache[consultorEmail]) return teamCache[consultorEmail];
      try {
        const team = await base44.asServiceRole.entities.TeamMember.filter({
          consultor_email: consultorEmail,
          status: 'Ativo'
        });
        const emails = team.map(m => m.member_email).filter(Boolean);
        teamCache[consultorEmail] = emails;
        return emails;
      } catch (e) {
        console.warn('[Expiry] Erro ao buscar equipe:', e.message);
        return [];
      }
    };

    // ─── Cache de dados de usuário ──────────────────────────────────────
    const getUserData = async (email) => {
      if (!email) return null;
      if (userDataCache[email]) return userDataCache[email];
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        userDataCache[email] = users[0] || { user_type: 'produtor' };
        return userDataCache[email];
      } catch (e) { return { user_type: 'produtor' }; }
    };

    // ─── Verifica se deve notificar com base no plano ───────────────────
    const shouldNotify = async (email, consultorEmail) => {
      if (!email) return false;
      const recipient = await getUserData(email);
      const consultor = await getUserData(consultorEmail);
      const allowed = canReceiveNotification(recipient, consultor);
      if (!allowed) {
        console.log(`[Expiry] Bloqueado: ${email} (${recipient?.user_type}) — plano: ${consultor?.plan || 'nenhum'}`);
      }
      return allowed;
    };

    // ─── Criação de notificação com deduplicação ─────────────────────────
    const createNotif = async (userEmail, title, message, eventType, severity, link) => {
      if (!userEmail) return;
      try {
        const recent = await base44.asServiceRole.entities.InAppNotification.filter(
          { user_email: userEmail, title }, '-created_date', 1
        );
        if (recent.length > 0) {
          const hrs = (today - new Date(recent[0].created_date)) / (1000 * 60 * 60);
          if (hrs < 20) {
            console.log(`[Expiry] Duplicada evitada para ${userEmail}: "${title}"`);
            return;
          }
        }
      } catch (e) {
        console.warn('[Expiry] Erro ao verificar duplicatas:', e.message);
      }

      try {
        await base44.asServiceRole.entities.InAppNotification.create({
          user_email: userEmail,
          title,
          message,
          event_type: eventType,
          severity,
          read: false,
          link,
          metadata: { type: 'expiry_check', checked_at: today.toISOString() }
        });
        totalSent++;
        console.log(`[Expiry] Notificação → ${userEmail}: "${title}"`);
      } catch (e) {
        console.error('[Expiry] Erro ao criar notificação:', e.message);
      }
    };

    // ─── Notifica owner + consultor + equipe do consultor ────────────────
    const notifyWithTeam = async (ownerEmail, consultorEmail, title, message, eventType, severity, link) => {
      // Owner (produtor): sempre notifica se houver email
      if (ownerEmail) {
        await createNotif(ownerEmail, title, message, eventType, severity, link);
      }

      if (consultorEmail && consultorEmail !== ownerEmail) {
        // Consultor: sempre notifica
        await createNotif(consultorEmail, title, message, eventType, severity, link);

        // Equipe do consultor: verifica plano
        const consultorData = await getUserData(consultorEmail);
        const plan = (consultorData?.plan || '').toLowerCase();
        if (['pro', 'enterprise'].includes(plan)) {
          const teamEmails = await getTeamEmails(consultorEmail);
          for (const memberEmail of teamEmails) {
            if (memberEmail === ownerEmail || memberEmail === consultorEmail) continue;
            await createNotif(memberEmail, title, message, eventType, severity, link);
          }
        }
      }
    };

    // ─── Busca consultor da propriedade ─────────────────────────────────
    const getConsultor = async (propertyId) => {
      if (!propertyId) return null;
      if (propConsultorCache[propertyId] !== undefined) return propConsultorCache[propertyId];
      try {
        const props = await base44.asServiceRole.entities.Property.filter({ id: propertyId });
        const email = props[0]?.consultor_email || null;
        propConsultorCache[propertyId] = email;
        return email;
      } catch (e) { return null; }
    };

    // ─── LICENSES ────────────────────────────────────────────────────────
    const licenses = await base44.asServiceRole.entities.License.list();
    for (const lic of licenses) {
      if (!lic.expiry_date || !lic.owner_email || lic.status === 'Vencida') continue;
      const days = getDays(lic.expiry_date);
      if (days === null) continue;
      const consultorEmail = await getConsultor(lic.property_id);

      if (days <= 0) {
        await notifyWithTeam(lic.owner_email, consultorEmail,
          'Licença Vencida',
          `Licença ${lic.license_type}${lic.license_number ? ` nº ${lic.license_number}` : ''} está VENCIDA.`,
          'licenca_vencida', 'error', '/Licenses');
      } else if ([1, 7, 15, 30].includes(days)) {
        await notifyWithTeam(lic.owner_email, consultorEmail,
          `Licença Vencendo em ${days} dia${days > 1 ? 's' : ''}`,
          `Licença ${lic.license_type} vence em ${days} dia${days > 1 ? 's' : ''}.`,
          'licenca_vencendo', days <= 7 ? 'error' : 'warning', '/Licenses');
      }
    }

    // ─── PROCESSES ───────────────────────────────────────────────────────
    const processes = await base44.asServiceRole.entities.Process.list();
    for (const proc of processes) {
      if (!proc.client_email || proc.status === 'Finalizado' || proc.status === 'Arquivado') continue;
      const consultorEmail = await getConsultor(proc.property_id);
      const updates = proc.updates || [];
      for (const upd of updates) {
        if (!upd.deadline) continue;
        const days = getDays(upd.deadline);
        if (days === null) continue;
        if (days <= 0) {
          await notifyWithTeam(proc.client_email, consultorEmail,
            'Prazo de Processo Vencido',
            `Processo ${proc.process_number}: prazo de etapa vencido.`,
            'atualizacao_processo', 'error', '/Processes');
        } else if ([1, 7].includes(days)) {
          await notifyWithTeam(proc.client_email, consultorEmail,
            `Prazo de Processo em ${days} dia${days > 1 ? 's' : ''}`,
            `Processo ${proc.process_number}: prazo em ${days} dia${days > 1 ? 's' : ''}.`,
            'atualizacao_processo', 'warning', '/Processes');
        }
      }
    }

    // ─── PRAD DEADLINES ──────────────────────────────────────────────────
    const prads = await base44.asServiceRole.entities.PRAD.list();
    for (const prad of prads) {
      if (!prad.owner_email || prad.status === 'Concluído') continue;
      const consultorEmail = await getConsultor(prad.property_id);
      const schedule = prad.execution_schedule || [];
      for (const stage of schedule) {
        if (stage.status === 'Concluído' || !stage.deadline) continue;
        const days = getDays(stage.deadline);
        if (days === null) continue;
        if (days <= 0) {
          await notifyWithTeam(prad.owner_email, consultorEmail,
            'Etapa do PRAD Atrasada',
            `"${prad.project_name}" – etapa "${stage.stage}" está atrasada.`,
            'outro', 'error', '/PRAD');
        } else if ([1, 7, 15].includes(days)) {
          await notifyWithTeam(prad.owner_email, consultorEmail,
            `Prazo do PRAD em ${days} dia${days > 1 ? 's' : ''}`,
            `"${prad.project_name}" – etapa "${stage.stage}" vence em ${days} dia${days > 1 ? 's' : ''}.`,
            'outro', days <= 7 ? 'warning' : 'info', '/PRAD');
        }
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
      } else if ([1, 3, 7].includes(days)) {
        await createNotif(inv.client_email, `Fatura Vencendo em ${days} dia${days > 1 ? 's' : ''}`,
          `Fatura ${val} vence em ${days} dia${days > 1 ? 's' : ''}.`, 'fatura_vencendo', 'warning', '/Invoices');
      }
    }

    // ─── CRM TASKS ───────────────────────────────────────────────────────
    const crmList = await base44.asServiceRole.entities.ClientCRM.list();
    const todayStr = today.toISOString().split('T')[0];

    for (const crm of crmList) {
      if (!crm.consultor_email) continue;
      const tasks = crm.tasks || [];
      let crmChanged = false;
      const updatedTasks = [];
      const consultorData = await getUserData(crm.consultor_email);

      for (const task of tasks) {
        let t = { ...task };

        // Atualiza status para 'overdue' automaticamente
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
          }
          // Equipe do consultor (plano pro/enterprise)
          const plan = (consultorData?.plan || '').toLowerCase();
          if (['pro', 'enterprise'].includes(plan) && responsible !== crm.consultor_email) {
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
              `Tarefa de CRM vence em ${days} dia${days > 1 ? 's' : ''}`,
              `"${t.title}" do cliente "${crm.client_name || 'N/A'}" vence em ${days} dia${days > 1 ? 's' : ''}.`,
              'task_due_soon', days === 1 ? 'warning' : 'info', '/ConsultorClients');
          }
        }
      }

      if (crmChanged) {
        try {
          await base44.asServiceRole.entities.ClientCRM.update(crm.id, { tasks: updatedTasks });
        } catch (e) {
          console.warn(`[Expiry] Erro ao atualizar status overdue do CRM ${crm.id}:`, e.message);
        }
      }
    }

    // ─── GEOREFERENCIAMENTO ──────────────────────────────────────────────
    const geos = await base44.asServiceRole.entities.Georeferencing.list();
    for (const geo of geos) {
      if (!geo.owner_email || geo.status === 'Regular') continue;
      if (geo.status === 'Irregular') {
        const consultorEmail = await getConsultor(geo.property_id);
        await notifyWithTeam(geo.owner_email, consultorEmail,
          'Georreferenciamento Irregular',
          'Há uma irregularidade no georreferenciamento da propriedade. Regularize o mais breve possível.',
          'outro', 'error', '/Georeferencing');
      }
    }

    console.log(`[Expiry] Concluído. Total de notificações enviadas: ${totalSent}`);
    return Response.json({ success: true, notifications_sent: totalSent });

  } catch (error) {
    console.error('[Expiry] Erro:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});