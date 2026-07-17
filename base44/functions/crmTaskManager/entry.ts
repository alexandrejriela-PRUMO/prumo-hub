/**
 * crmTaskManager — Gerencia @mentions, delegação de tarefas e notificações no CRM.
 *
 * Actions:
 *   process_mentions  — detecta @mentions em texto e notifica
 *   assign_task       — delega tarefa com verificação de plano
 *   update_overdue    — marca tarefas vencidas como 'overdue' (chamado pelo checkExpiry)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// ─── Extrai @mentions do texto ────────────────────────────────────────────────
// Suporta @email (com @) e @nome.sobrenome
function extractMentions(text) {
  if (!text) return [];
  // Captura @palavra, @palavra.palavra, @email@dominio (sem espaço)
  const matches = text.match(/@[\w.+-]+(?:@[\w.-]+)?/g) || [];
  // Deduplicar e normalizar
  const unique = [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
  return unique;
}

// ─── Regras de plano ──────────────────────────────────────────────────────────
function canDelegate(consultor, targetUserType) {
  const plan = (consultor?.plan || '').toLowerCase();
  if (plan === 'start') return targetUserType === 'consultor';
  if (plan === 'pro') return ['consultor', 'equipe'].includes(targetUserType);
  if (plan === 'enterprise') return ['consultor', 'equipe', 'client_consultor'].includes(targetUserType);
  return false;
}

// ─── Cria notificação in-app (com deduplicação de 5 min) ─────────────────────
async function pushNotif(base44, { user_email, title, message, event_type, severity = 'info', link = null, metadata = {} }) {
  if (!user_email) return;
  try {
    // Deduplicação: não enviar a mesma notificação em menos de 5 minutos
    const recent = await base44.asServiceRole.entities.InAppNotification.filter(
      { user_email, title }, '-created_date', 1
    );
    if (recent.length > 0) {
      const mins = (Date.now() - new Date(recent[0].created_date)) / 60000;
      if (mins < 5) {
        console.log(`[CRM] Notif duplicada evitada para ${user_email}: "${title}"`);
        return;
      }
    }
    await base44.asServiceRole.entities.InAppNotification.create({
      user_email, title, message, event_type, severity, read: false, link,
      metadata: { ...metadata, timestamp: new Date().toISOString() }
    });
  } catch (e) {
    console.error(`[CRM] Erro ao criar notif para ${user_email}:`, e.message);
  }
}

// ─── Busca preferência de WhatsApp para um evento ─────────────────────────────
async function getWhatsappPref(base44, email) {
  try {
    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
      user_email: email, event_type: 'task_overdue'
    });
    const pref = prefs[0];
    return {
      enabled: pref ? (pref.sms_enabled === true) : false,
      phone: pref?.phone_number || null,
    };
  } catch {
    return { enabled: false, phone: null };
  }
}

// ─── Envia email ──────────────────────────────────────────────────────────────
async function sendEmail(base44, to, subject, body) {
  if (!to) return;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'PRUMO Hub', to, subject, body
    });
  } catch (e) {
    console.warn(`[CRM] Erro ao enviar email para ${to}:`, e.message);
  }
}

// ─── Busca usuário por email ou nome parcial ──────────────────────────────────
async function resolveUser(base44, mention) {
  try {
    // Tenta por email exato
    if (mention.includes('@') || mention.includes('.')) {
      const byEmail = await base44.asServiceRole.entities.User.filter({ email: mention });
      if (byEmail.length > 0) return byEmail[0];
    }
    // Fallback: busca por nome parcial (full_name contains)
    const all = await base44.asServiceRole.entities.User.list();
    const lower = mention.toLowerCase();
    const found = all.find(u =>
      u.full_name?.toLowerCase().replace(/\s+/g, '.').includes(lower) ||
      u.email?.toLowerCase().startsWith(lower)
    );
    return found || null;
  } catch (e) { return null; }
}

// ═════════════════════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ─── ACTION: PROCESS_MENTIONS ─────────────────────────────────────────
    if (action === 'process_mentions') {
      const { text, crm_id, client_name, context_type = 'interaction', context_id } = body;
      if (!text || !crm_id) {
        return Response.json({ error: 'text e crm_id são obrigatórios' }, { status: 400 });
      }

      const rawMentions = extractMentions(text);
      if (rawMentions.length === 0) {
        return Response.json({ success: true, mentions_notified: 0 });
      }

      const notified = [];
      const seenEmails = new Set();

      for (const mention of rawMentions) {
        const mentioned = await resolveUser(base44, mention);
        if (!mentioned) {
          console.log(`[CRM Mention] Usuário não encontrado para mention: @${mention}`);
          continue;
        }
        // Não notificar o próprio autor
        if (mentioned.email === user.email) continue;
        // Deduplicar menções repetidas no mesmo texto
        if (seenEmails.has(mentioned.email)) continue;
        seenEmails.add(mentioned.email);

        const contextLabel = context_type === 'task' ? 'tarefa' : 'interação';
        const title = `${user.full_name || user.email} mencionou você`;
        const message = `Você foi mencionado em uma ${contextLabel} do cliente "${client_name || 'CRM'}".\n\n"${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`;

        await pushNotif(base44, {
          user_email: mentioned.email,
          title,
          message,
          event_type: 'mention',
          severity: 'info',
          link: '/ConsultorClients',
          metadata: { crm_id, context_type, context_id, mentioned_by: user.email }
        });

        await sendEmail(base44, mentioned.email,
          `[PRUMO Hub] Você foi mencionado por ${user.full_name || user.email}`,
          `Olá, ${mentioned.full_name || ''},\n\n${user.full_name || user.email} mencionou você em uma ${contextLabel} do CRM:\n\n"${text.substring(0, 300)}"\n\nCliente: ${client_name || 'N/A'}\n\nAcesse o PRUMO Hub para responder.\n\nAtenciosamente,\nPRUMO Hub`
        );

        notified.push(mentioned.email);
      }

      console.log(`[CRM Mention] ${notified.length} usuário(s) notificado(s):`, notified);
      return Response.json({ success: true, mentions_notified: notified.length, notified });
    }

    // ─── ACTION: ASSIGN_TASK ──────────────────────────────────────────────
    if (action === 'assign_task') {
      const { crm_id, task_id, assigned_to_email, task_title, client_name, previous_assigned_email } = body;
      if (!crm_id || !task_id || !assigned_to_email || !task_title) {
        return Response.json({ error: 'crm_id, task_id, assigned_to_email e task_title são obrigatórios' }, { status: 400 });
      }

      // Não notificar se delegando para si mesmo
      if (assigned_to_email === user.email) {
        return Response.json({ success: true, message: 'Auto-delegação: sem notificação enviada' });
      }

      // Verificar plano do consultor
      const assigneeUsers = await base44.asServiceRole.entities.User.filter({ email: assigned_to_email });
      const assignee = assigneeUsers[0];
      if (!assignee) {
        return Response.json({ error: `Usuário ${assigned_to_email} não encontrado` }, { status: 404 });
      }

      if (!canDelegate(user, assignee.user_type)) {
        console.log(`[CRM Assign] BLOQUEADO: plano ${user.plan} não permite delegar para ${assignee.user_type}`);
        return Response.json({
          error: `Seu plano (${user.plan || 'sem plano'}) não permite delegar tarefas para este tipo de usuário.`,
          blocked_by: 'plan_restriction'
        }, { status: 403 });
      }

      // Notificar novo responsável
      const assignTitle = `Nova tarefa delegada a você`;
      const assignMsg = `${user.full_name || user.email} delegou a tarefa "${task_title}" para você.\nCliente: ${client_name || 'N/A'}`;

      await pushNotif(base44, {
        user_email: assigned_to_email,
        title: assignTitle,
        message: assignMsg,
        event_type: 'task_assigned',
        severity: 'info',
        link: '/ConsultorClients',
        metadata: { crm_id, task_id, assigned_by: user.email, client_name }
      });

      await sendEmail(base44, assigned_to_email,
        `[PRUMO Hub] ${assignTitle}: ${task_title}`,
        `Olá, ${assignee.full_name || ''},\n\n${assignMsg}\n\nAcesse o PRUMO Hub para ver os detalhes e prazo da tarefa.\n\nAtenciosamente,\nPRUMO Hub`
      );

      // Notificar responsável anterior (se mudou)
      if (previous_assigned_email && previous_assigned_email !== assigned_to_email && previous_assigned_email !== user.email) {
        await pushNotif(base44, {
          user_email: previous_assigned_email,
          title: `Tarefa reatribuída`,
          message: `A tarefa "${task_title}" foi transferida para outro responsável.`,
          event_type: 'task_assigned',
          severity: 'warning',
          link: '/ConsultorClients',
          metadata: { crm_id, task_id }
        });
      }

      console.log(`[CRM Assign] Tarefa "${task_title}" delegada para ${assigned_to_email} por ${user.email}`);
      return Response.json({ success: true, assigned_to: assigned_to_email });
    }

    // ─── ACTION: UPDATE_OVERDUE ───────────────────────────────────────────
    // Marca tarefas vencidas como 'overdue' e notifica responsável
    // Chamado pelo checkExpiryNotifications ou automação agendada
    if (action === 'update_overdue') {
      // Apenas admin ou service role interno
      if (user.role !== 'admin' && user.email !== 'system') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const allCRM = await base44.asServiceRole.entities.ClientCRM.list();
      let updated = 0;
      let notified = 0;

      for (const crm of allCRM) {
        const tasks = crm.tasks || [];
        let changed = false;

        const updatedTasks = tasks.map(task => {
          if (task.done || task.status === 'done' || !task.due_date) return task;
          if (task.due_date < todayStr && task.status !== 'overdue') {
            changed = true;
            return { ...task, status: 'overdue' };
          }
          return task;
        });

        if (changed) {
          await base44.asServiceRole.entities.ClientCRM.update(crm.id, { tasks: updatedTasks });
          updated++;

          // Notificar responsáveis das tarefas que ficaram overdue
          for (const task of updatedTasks) {
            if (task.status === 'overdue' && task.due_date < todayStr) {
              const responsible = task.assigned_to_email || task.responsible_email;
              if (!responsible) continue;
              await pushNotif(base44, {
                user_email: responsible,
                title: '⚠️ Tarefa Vencida no CRM',
                message: `A tarefa "${task.title}" do cliente "${crm.client_name}" está VENCIDA desde ${task.due_date}.`,
                event_type: 'task_overdue',
                severity: 'error',
                link: '/ConsultorClients',
                metadata: { crm_id: crm.id, task_id: task.id }
              });

              const waPref = await getWhatsappPref(base44, responsible);
              if (waPref.enabled && waPref.phone) {
                try {
                  await fetch('https://prumohub.app.n8n.cloud/webhook/prumo-whatsapp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      phone: waPref.phone,
                      message: `⚠️ Tarefa Vencida: A tarefa "${task.title}" do cliente "${crm.client_name}" está VENCIDA desde ${task.due_date}.`
                    })
                  });
                  console.log(`[CRM Overdue] WhatsApp enviado para ${waPref.phone}`);
                } catch (e) {
                  console.error('[CRM Overdue] Erro ao enviar WhatsApp:', e.message);
                }
              }

              notified++;
            }
          }
        }
      }

      console.log(`[CRM Overdue] ${updated} registros atualizados, ${notified} notificações enviadas`);
      return Response.json({ success: true, records_updated: updated, notifications_sent: notified });
    }

    return Response.json({ error: 'Ação inválida. Use: process_mentions | assign_task | update_overdue' }, { status: 400 });

  } catch (error) {
    console.error('[CRM TaskManager] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});