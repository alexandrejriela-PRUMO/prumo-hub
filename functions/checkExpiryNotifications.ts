import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    let totalSent = 0;

    const getDays = (dateStr) => {
      if (!dateStr) return null;
      return Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));
    };

    const createNotif = async (userEmail, title, message, eventType, severity, link) => {
      if (!userEmail) return;
      // Prevent duplicate: skip if same title sent in last 20 hours
      try {
        const recent = await base44.asServiceRole.entities.InAppNotification.filter(
          { user_email: userEmail, title: title }, '-created_date', 1
        );
        if (recent.length > 0) {
          const hrs = (today - new Date(recent[0].created_date)) / (1000 * 60 * 60);
          if (hrs < 20) {
            console.log(`[Expiry] Notificação duplicada evitada para ${userEmail}: "${title}"`);
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
        console.log(`[Expiry] Notificação enviada para ${userEmail}: "${title}"`);
      } catch (e) {
        console.error('[Expiry] Erro ao criar notificação:', e.message);
      }
    };

    // ─── LICENSES ────────────────────────────────────────────────────────
    const licenses = await base44.asServiceRole.entities.License.list();
    for (const lic of licenses) {
      if (!lic.expiry_date || !lic.owner_email || lic.status === 'Vencida') continue;
      const days = getDays(lic.expiry_date);
      if (days === null) continue;

      if (days <= 0) {
        await createNotif(lic.owner_email, 'Licença Vencida',
          `Licença ${lic.license_type}${lic.license_number ? ` nº ${lic.license_number}` : ''} está VENCIDA.`,
          'licenca_vencida', 'error', '/Licenses');
      } else if ([1, 7, 15, 30].includes(days)) {
        await createNotif(lic.owner_email, `Licença Vencendo em ${days} dia${days > 1 ? 's' : ''}`,
          `Licença ${lic.license_type} vence em ${days} dia${days > 1 ? 's' : ''}.`,
          'licenca_vencendo', days <= 7 ? 'error' : 'warning', '/Licenses');
      }
    }

    // ─── PROCESSES (fine / deadline) ─────────────────────────────────────
    const processes = await base44.asServiceRole.entities.Process.list();
    for (const proc of processes) {
      if (!proc.client_email || proc.status === 'Finalizado' || proc.status === 'Arquivado') continue;
      const updates = proc.updates || [];
      for (const upd of updates) {
        if (!upd.deadline) continue;
        const days = getDays(upd.deadline);
        if (days === null) continue;
        if (days <= 0) {
          await createNotif(proc.client_email, 'Prazo de Processo Vencido',
            `Processo ${proc.process_number}: prazo de etapa vencido.`,
            'atualizacao_processo', 'error', '/Processes');
        } else if ([1, 7].includes(days)) {
          await createNotif(proc.client_email, `Prazo de Processo em ${days} dia${days > 1 ? 's' : ''}`,
            `Processo ${proc.process_number}: prazo de etapa em ${days} dia${days > 1 ? 's' : ''}.`,
            'atualizacao_processo', 'warning', '/Processes');
        }
      }
    }

    // ─── PRAD DEADLINES ──────────────────────────────────────────────────
    const prads = await base44.asServiceRole.entities.PRAD.list();
    for (const prad of prads) {
      if (!prad.owner_email || prad.status === 'Concluído') continue;
      const schedule = prad.execution_schedule || [];
      for (const stage of schedule) {
        if (stage.status === 'Concluído' || !stage.deadline) continue;
        const days = getDays(stage.deadline);
        if (days === null) continue;
        if (days <= 0) {
          await createNotif(prad.owner_email, 'Etapa do PRAD Atrasada',
            `"${prad.project_name}" – etapa "${stage.stage}" está atrasada.`,
            'outro', 'error', '/PRAD');
        } else if ([1, 7, 15].includes(days)) {
          await createNotif(prad.owner_email, `Prazo do PRAD em ${days} dia${days > 1 ? 's' : ''}`,
            `"${prad.project_name}" – etapa "${stage.stage}" vence em ${days} dia${days > 1 ? 's' : ''}.`,
            'outro', days <= 7 ? 'warning' : 'info', '/PRAD');
        }
      }
    }

    // ─── CARBON CREDITS ──────────────────────────────────────────────────
    const carbonCredits = await base44.asServiceRole.entities.CarbonCredit.list();
    for (const cc of carbonCredits) {
      const endDate = cc.end_date || cc.expiry_date || cc.validity_end;
      const owner = cc.owner_email;
      if (!endDate || !owner) continue;
      const days = getDays(endDate);
      if (days === null) continue;
      if (days <= 0) {
        await createNotif(owner, 'Crédito de Carbono Vencido',
          `"${cc.project_name || 'sem nome'}" – prazo encerrado.`, 'outro', 'error', '/CarbonCredits');
      } else if ([1, 7, 30].includes(days)) {
        await createNotif(owner, `Crédito de Carbono Vencendo em ${days} dia${days > 1 ? 's' : ''}`,
          `"${cc.project_name || 'sem nome'}" vence em ${days} dia${days > 1 ? 's' : ''}.`,
          'outro', days <= 7 ? 'error' : 'warning', '/CarbonCredits');
      }
    }

    // ─── PSA CONTRACTS ───────────────────────────────────────────────────
    const psaContracts = await base44.asServiceRole.entities.PSAContract.list();
    for (const c of psaContracts) {
      const endDate = c.end_date || c.expiry_date || c.validity_end;
      const owner = c.owner_email;
      if (!endDate || !owner) continue;
      const days = getDays(endDate);
      if (days === null) continue;
      if (days <= 0) {
        await createNotif(owner, 'Contrato PSA Vencido',
          `"${c.contract_name || 'sem nome'}" – prazo encerrado.`, 'outro', 'error', '/PSAContracts');
      } else if ([1, 7, 30].includes(days)) {
        await createNotif(owner, `Contrato PSA Vencendo em ${days} dia${days > 1 ? 's' : ''}`,
          `"${c.contract_name || 'sem nome'}" vence em ${days} dia${days > 1 ? 's' : ''}.`,
          'outro', days <= 7 ? 'error' : 'warning', '/PSAContracts');
      }
    }

    // ─── ENVIRONMENTAL EASEMENTS ─────────────────────────────────────────
    const easements = await base44.asServiceRole.entities.EnvironmentalEasement.list();
    for (const e of easements) {
      const endDate = e.end_date || e.expiry_date || e.validity_end;
      const owner = e.owner_email;
      if (!endDate || !owner) continue;
      const days = getDays(endDate);
      if (days === null) continue;
      if (days <= 0) {
        await createNotif(owner, 'Servidão Ambiental Vencida',
          `Servidão ambiental – prazo encerrado.`, 'outro', 'error', '/EnvironmentalEasements');
      } else if ([1, 7, 30].includes(days)) {
        await createNotif(owner, `Servidão Ambiental Vencendo em ${days} dia${days > 1 ? 's' : ''}`,
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

    // ─── CRM TASKS DUE (para consultor) ──────────────────────────────────
    const crmList = await base44.asServiceRole.entities.ClientCRM.list();
    for (const crm of crmList) {
      if (!crm.consultor_email) continue;
      const tasks = crm.tasks || [];
      for (const task of tasks) {
        if (task.done || !task.due_date) continue;
        const days = getDays(task.due_date);
        if (days === null) continue;
        if (days <= 0) {
          await createNotif(crm.consultor_email, 'Tarefa de CRM Atrasada',
            `Tarefa "${task.title}" está atrasada.`, 'outro', 'error', '/ConsultorClients');
        } else if ([1, 3].includes(days)) {
          await createNotif(crm.consultor_email, `Tarefa de CRM em ${days} dia${days > 1 ? 's' : ''}`,
            `Tarefa "${task.title}" vence em ${days} dia${days > 1 ? 's' : ''}.`, 'outro', 'warning', '/ConsultorClients');
        }
      }
    }

    // ─── GEORREFERENCIAMENTO CHECK ────────────────────────────────────────
    const geos = await base44.asServiceRole.entities.Georeferencing.list();
    for (const geo of geos) {
      if (!geo.owner_email || geo.status === 'Regular') continue;
      if (geo.status === 'Irregular') {
        await createNotif(geo.owner_email, 'Georreferenciamento Irregular',
          `Há uma irregularidade no georreferenciamento da propriedade. Regularize o mais breve possível.`,
          'outro', 'error', '/Georeferencing');
      }
    }

    return Response.json({ success: true, notifications_sent: totalSent });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});