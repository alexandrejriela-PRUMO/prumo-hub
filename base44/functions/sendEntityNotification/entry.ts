/**
 * sendEntityNotification — Função principal de notificações por entidade.
 * Consolida push (in-app) + email. SMS não implementado (ignorado silenciosamente).
 * Verifica plano do consultor antes de notificar client_consultor.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// ─── Regras de notificação por plano ─────────────────────────────────────────
function canReceiveNotification(recipient, consultor) {
  const plan = (consultor?.plan || '').toLowerCase();

  if (plan === 'start') {
    return recipient.user_type === 'consultor';
  }
  if (plan === 'pro') {
    return ['consultor', 'equipe'].includes(recipient.user_type);
  }
  if (plan === 'enterprise') {
    return ['consultor', 'equipe', 'client_consultor'].includes(recipient.user_type);
  }
  return false;
}

// ─── Busca dados do consultor (com cache) ─────────────────────────────────────
const consultorCache = {};
async function getConsultorData(base44, email) {
  if (!email) return null;
  if (consultorCache[email]) return consultorCache[email];
  try {
    const users = await base44.asServiceRole.entities.User.filter({ email });
    consultorCache[email] = users[0] || null;
    return consultorCache[email];
  } catch (e) { return null; }
}

// ─── Busca dados do destinatário (com cache) ──────────────────────────────────
const recipientCache = {};
async function getRecipientData(base44, email) {
  if (!email) return null;
  if (recipientCache[email]) return recipientCache[email];
  try {
    const users = await base44.asServiceRole.entities.User.filter({ email });
    recipientCache[email] = users[0] || { user_type: 'produtor' };
    return recipientCache[email];
  } catch (e) { return { user_type: 'produtor' }; }
}

// ─── Cache de preferências ────────────────────────────────────────────────────
const prefCache = {};
async function getUserPrefs(base44, email) {
  if (!email) return {};
  if (prefCache[email]) return prefCache[email];
  try {
    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ user_email: email });
    const map = {};
    prefs.forEach(p => { map[p.event_type] = p; });
    prefCache[email] = map;
    return map;
  } catch (e) { return {}; }
}

// ─── Deduplicação de email (janela de 5 minutos) ──────────────────────────────
const recentEmails = new Map(); // key: `${email}:${subject}` → timestamp
function isDuplicateEmail(email, subject) {
  const key = `${email}:${subject}`;
  const last = recentEmails.get(key);
  const now = Date.now();
  if (last && (now - last) < 5 * 60 * 1000) return true;
  recentEmails.set(key, now);
  return false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addNotif(notifications, userEmail, title, message, eventType, severity = 'info', link = null) {
  if (userEmail) notifications.push({ user_email: userEmail, title, message, event_type: eventType, severity, link });
}

async function addEmail(emailsToSend, base44, userEmail, subject, body, eventType) {
  if (!userEmail) return;
  if (isDuplicateEmail(userEmail, subject)) {
    console.log(`[Notif] Email duplicado bloqueado para ${userEmail}: "${subject}"`);
    return;
  }
  const prefs = await getUserPrefs(base44, userEmail);
  const pref = prefs[eventType] || prefs['todos'];
  // Default: email habilitado se não há preferência
  if (!pref || pref.email_enabled !== false) {
    emailsToSend.push({ to: userEmail, subject, body });
  }
}

// ─── Salva notificações push respeitando preferências ────────────────────────
async function saveNotifications(base44, notifications, entityName, entityId) {
  for (const notif of notifications) {
    const prefs = await getUserPrefs(base44, notif.user_email);
    const pref = prefs[notif.event_type] || prefs['todos'];
    if (!pref || pref.push_enabled !== false) {
      try {
        await base44.asServiceRole.entities.InAppNotification.create({
          user_email: notif.user_email,
          title: notif.title,
          message: notif.message,
          event_type: notif.event_type,
          severity: notif.severity,
          read: false,
          link: notif.link,
          metadata: {
            entity_name: entityName,
            entity_id: entityId,
            timestamp: new Date().toISOString()
          }
        });
      } catch (e) {
        console.error(`[Notif] Erro ao criar push para ${notif.user_email}:`, e.message);
      }
    }
  }
}

// ─── Envia emails ─────────────────────────────────────────────────────────────
async function sendEmails(base44, emailsToSend) {
  for (const email of emailsToSend) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'PRUMO Hub',
        to: email.to,
        subject: email.subject,
        body: email.body
      });
    } catch (e) {
      console.error(`[Notif] Erro ao enviar email para ${email.to}:`, e.message);
    }
  }
}

// ─── Filtra destinatários bloqueados por plano ────────────────────────────────
async function filterByPlan(base44, emails, consultorEmail) {
  const result = [];
  const consultor = await getConsultorData(base44, consultorEmail);

  for (const email of emails) {
    if (!email) continue;
    const recipient = await getRecipientData(base44, email);
    if (!canReceiveNotification(recipient, consultor)) {
      console.log(`[NotifPlan] Bloqueado: ${email} (${recipient?.user_type}) — plano do consultor: ${consultor?.plan || 'nenhum'}`);
      continue;
    }
    result.push(email);
  }
  return result;
}

// ─── Handler principal ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;

    if (!event?.entity_name || !event?.type) {
      return Response.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const notifications = [];
    const emailsToSend = [];

    // SMS: canal não implementado — ignorado silenciosamente
    // Mesmo que sms_enabled = true nas preferências, nenhum envio ocorre
    console.log('[Notif] SMS channel: not implemented, skipped.');

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

      const recipients = await filterByPlan(base44, [owner, consultorEmail], consultorEmail);

      if (event.type === 'create') {
        const msgCreate = `Licença ${data.license_type}${data.license_number ? ` nº ${data.license_number}` : ''} foi registrada.`;
        for (const r of recipients) {
          const label = r === consultorEmail ? 'Nova Licença - Cliente' : 'Nova Licença Cadastrada';
          addNotif(notifications, r, label, msgCreate, 'nova_licenca', 'info', '/Licenses');
        }
        await addEmail(emailsToSend, base44, owner,
          `[PRUMO Hub] Nova Licença Cadastrada: ${data.license_type}`,
          `<p>Olá,</p><p>Uma nova licença foi cadastrada na plataforma PRUMO Hub:</p><ul><li><strong>Tipo:</strong> ${data.license_type}</li>${data.license_number ? `<li><strong>Número:</strong> ${data.license_number}</li>` : ''}<li><strong>Status:</strong> ${data.status || 'N/A'}</li></ul><p>Acesse a plataforma para mais detalhes.</p><p>Equipe PRUMO Hub</p>`,
          'nova_licenca'
        );
      }

      if (event.type === 'update') {
        const oldU = old_data?.updates || [], newU = data?.updates || [];
        if (newU.length > oldU.length) {
          const latest = newU[newU.length - 1];
          const andamentoMsg = `Licença ${data.license_type}${data.license_number ? ` nº ${data.license_number}` : ''}: ${latest.description?.substring(0, 120) || 'Nova movimentação registrada'}`;
          for (const r of recipients) {
            const label = r === consultorEmail ? 'Andamento em Licença - Cliente' : 'Novo Andamento em Licença';
            addNotif(notifications, r, label, andamentoMsg, 'atualizacao_licenca', 'info', '/Licenses');
          }
          await addEmail(emailsToSend, base44, owner,
            `[PRUMO Hub] Novo Andamento na Licença ${data.license_type}${data.license_number ? ` nº ${data.license_number}` : ''}`,
            `<p>Olá,</p><p>Houve uma nova movimentação na licença <strong>${data.license_type}${data.license_number ? ` nº ${data.license_number}` : ''}</strong>:</p><blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #2d6a4f;">${latest.description || 'Nova movimentação registrada'}</blockquote>${latest.date ? `<p><strong>Data:</strong> ${latest.date}</p>` : ''}${latest.responsible ? `<p><strong>Responsável:</strong> ${latest.responsible}</p>` : ''}<p>Equipe PRUMO Hub</p>`,
            'atualizacao_licenca'
          );
        }
        if (old_data?.status && old_data.status !== data.status) {
          const sev = data.status === 'Vencida' ? 'error' : 'warning';
          const statusMsg = `Licença ${data.license_type}: ${old_data.status} → ${data.status}`;
          for (const r of recipients) {
            const label = r === consultorEmail ? 'Status de Licença Alterado - Cliente' : 'Status de Licença Alterado';
            addNotif(notifications, r, label, statusMsg, 'licenca_vencida', sev, '/Licenses');
          }
          await addEmail(emailsToSend, base44, owner,
            `[PRUMO Hub] Status da Licença ${data.license_type} Alterado`,
            `<p>Olá,</p><p>O status da licença <strong>${data.license_type}${data.license_number ? ` nº ${data.license_number}` : ''}</strong> foi alterado:</p><p><strong>${old_data.status}</strong> → <strong>${data.status}</strong></p><p>Equipe PRUMO Hub</p>`,
            'licenca_vencida'
          );
        }
      }
    }

    // ─── PROCESS ─────────────────────────────────────────────────────────
    if (event.entity_name === 'Process') {
      const client = data.client_email;
      let consultorEmail = null;

      if (data.property_id) {
        try {
          const props = await base44.asServiceRole.entities.Property.filter({ id: data.property_id });
          if (props.length > 0) consultorEmail = props[0].consultor_email;
        } catch (e) { /* ignore */ }
      }

      const recipients = await filterByPlan(base44, [client, consultorEmail], consultorEmail);

      if (event.type === 'create') {
        const message = `Processo ${data.process_number} (${data.process_type}): ${data.subject}`;
        for (const r of recipients) {
          const label = r === consultorEmail ? 'Novo Processo - Cliente' : 'Novo Processo Registrado';
          addNotif(notifications, r, label, message, 'novo_processo', 'info', '/Processes');
        }
        await addEmail(emailsToSend, base44, client,
          `[PRUMO Hub] Novo Processo Registrado: ${data.process_number}`,
          `<p>Olá,</p><p>Um novo processo foi cadastrado na plataforma PRUMO Hub:</p><ul><li><strong>Número:</strong> ${data.process_number}</li><li><strong>Tipo:</strong> ${data.process_type}</li><li><strong>Matéria:</strong> ${data.subject}</li><li><strong>Status:</strong> ${data.status}</li></ul><p>Equipe PRUMO Hub</p>`,
          'novo_processo'
        );
      }

      if (event.type === 'update') {
        const oldU = old_data?.updates || [], newU = data?.updates || [];
        if (newU.length > oldU.length) {
          const latest = newU[newU.length - 1];
          const movMessage = `Processo ${data.process_number}: ${latest.description?.substring(0, 120) || 'Nova movimentação'}`;
          for (const r of recipients) {
            const label = r === consultorEmail ? 'Andamento em Processo - Cliente' : 'Novo Andamento em Processo';
            addNotif(notifications, r, label, movMessage, 'atualizacao_processo', 'info', '/Processes');
          }
          await addEmail(emailsToSend, base44, client,
            `[PRUMO Hub] Novo Andamento no Processo ${data.process_number}`,
            `<p>Olá,</p><p>Houve uma nova movimentação no processo <strong>${data.process_number}</strong>:</p><blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #2d6a4f;">${latest.description || 'Nova movimentação registrada'}</blockquote><p>Equipe PRUMO Hub</p>`,
            'atualizacao_processo'
          );
        }
        if (old_data?.status && old_data.status !== data.status) {
          const statusMsg = `Processo ${data.process_number}: ${old_data.status} → ${data.status}`;
          for (const r of recipients) {
            const label = r === consultorEmail ? 'Status de Processo Alterado - Cliente' : 'Status de Processo Alterado';
            addNotif(notifications, r, label, statusMsg, 'atualizacao_processo', 'warning', '/Processes');
          }
          await addEmail(emailsToSend, base44, client,
            `[PRUMO Hub] Status do Processo ${data.process_number} Alterado`,
            `<p>Olá,</p><p>O status do processo <strong>${data.process_number}</strong> foi alterado:</p><p><strong>${old_data.status}</strong> → <strong>${data.status}</strong></p><p>Equipe PRUMO Hub</p>`,
            'atualizacao_processo'
          );
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
      const recipients = await filterByPlan(base44, [ownerEmail, consultorEmail], consultorEmail);

      if (event.type === 'create') {
        const alertTitle = 'Novo Alerta Ambiental';
        const alertMsg = `${data.alert_type}: ${data.title}`;
        for (const r of recipients) {
          addNotif(notifications, r, alertTitle, alertMsg, 'novo_alerta_ambiental', sev, '/EnvironmentalAlerts');
        }
        // Email também para alertas ambientais (correção de inconsistência)
        await addEmail(emailsToSend, base44, ownerEmail,
          `[PRUMO Hub] ⚠️ Novo Alerta Ambiental: ${data.title}`,
          `<p>Olá,</p><p>Um novo alerta ambiental foi detectado:</p><ul><li><strong>Tipo:</strong> ${data.alert_type}</li><li><strong>Título:</strong> ${data.title}</li><li><strong>Severidade:</strong> ${data.severity}</li>${data.description ? `<li><strong>Descrição:</strong> ${data.description}</li>` : ''}</ul><p>Acesse a plataforma para mais detalhes.</p><p>Equipe PRUMO Hub</p>`,
          'novo_alerta_ambiental'
        );
      }
      if (event.type === 'update' && old_data?.status !== data.status) {
        if (data.status === 'Resolvido') {
          for (const r of recipients) {
            addNotif(notifications, r, 'Alerta Ambiental Resolvido',
              `O alerta "${data.title}" foi resolvido.`, 'alerta_resolvido', 'success', '/EnvironmentalAlerts');
          }
        } else {
          for (const r of recipients) {
            addNotif(notifications, r, 'Alerta Ambiental Atualizado',
              `"${data.title}": ${old_data?.status} → ${data.status}`, 'novo_alerta_ambiental', sev, '/EnvironmentalAlerts');
          }
        }
      }
    }

    // ─── PRAD ────────────────────────────────────────────────────────────
    if (event.entity_name === 'PRAD') {
      const owner = data.owner_email;
      let consultorEmail = null;

      if (data.property_id) {
        try {
          const props = await base44.asServiceRole.entities.Property.filter({ id: data.property_id });
          if (props.length > 0) consultorEmail = props[0].consultor_email;
        } catch (e) { /* ignore */ }
      }

      const recipients = await filterByPlan(base44, [owner, consultorEmail], consultorEmail);

      if (event.type === 'create') {
        for (const r of recipients) {
          const label = r === consultorEmail ? 'Novo PRAD - Cliente' : 'Novo PRAD Criado';
          addNotif(notifications, r, label, `Projeto "${data.project_name}" foi registrado.`, 'outro', 'info', '/PRAD');
        }
      }
      if (event.type === 'update') {
        if (old_data?.status && old_data.status !== data.status) {
          const sev = data.status === 'Concluído' ? 'success' : 'info';
          for (const r of recipients) {
            const label = r === consultorEmail ? 'Status do PRAD Alterado - Cliente' : 'Status do PRAD Alterado';
            addNotif(notifications, r, label, `"${data.project_name}": ${old_data.status} → ${data.status}`, 'outro', sev, '/PRAD');
          }
        }
        const oldP = old_data?.pipeline_status || [], newP = data?.pipeline_status || [];
        for (let i = 0; i < newP.length; i++) {
          if (oldP[i] && oldP[i].current_status !== newP[i].current_status) {
            const sev = newP[i].current_status === 'Concluído' ? 'success' : 'info';
            for (const r of recipients) {
              addNotif(notifications, r, 'Andamento no PRAD',
                `Etapa "${newP[i].stage_name}": ${oldP[i].current_status} → ${newP[i].current_status}`, 'outro', sev, '/PRAD');
            }
          }
        }
      }
    }

    // ─── MAPPING ─────────────────────────────────────────────────────────
    if (event.entity_name === 'Mapping') {
      const userEmail = data.user_email;
      if (event.type === 'create') {
        addNotif(notifications, userEmail, 'Novo Mapeamento Criado',
          `${data.mapping_type}: "${data.title}" foi criado.`, 'outro', 'info', '/Mappings');
      }
      if (event.type === 'update' && old_data?.status !== data.status) {
        addNotif(notifications, userEmail, 'Status do Mapeamento Alterado',
          `"${data.title}": ${old_data?.status} → ${data.status}`,
          'outro', data.status === 'Concluído' ? 'success' : 'info', '/Mappings');
      }
    }

    // ─── GEOREFERENCING ──────────────────────────────────────────────────
    if (event.entity_name === 'Georeferencing') {
      const owner = data.owner_email;
      if (event.type === 'create') {
        addNotif(notifications, owner, 'Georreferenciamento Registrado',
          'Novo processo de georreferenciamento iniciado.', 'outro', 'info', '/Georeferencing');
      }
      if (event.type === 'update') {
        if (old_data?.status !== data.status) {
          addNotif(notifications, owner, 'Status do Georreferenciamento Alterado',
            `Status: ${old_data?.status} → ${data.status}`,
            'outro', data.status === 'Regular' ? 'success' : 'warning', '/Georeferencing');
        }
        if (old_data?.sigef_status !== data.sigef_status) {
          addNotif(notifications, owner, 'Status SIGEF Atualizado',
            `SIGEF: ${old_data?.sigef_status || '—'} → ${data.sigef_status}`,
            'outro', data.sigef_status === 'Aprovado' ? 'success' : 'info', '/Georeferencing');
        }
      }
    }

    // ─── CLIENT CRM ──────────────────────────────────────────────────────
    if (event.entity_name === 'ClientCRM') {
      const consultor = data.consultor_email;
      if (event.type === 'update') {
        const oldI = old_data?.interactions || [], newI = data?.interactions || [];
        if (newI.length > oldI.length) {
          const latest = newI[newI.length - 1];
          addNotif(notifications, consultor, 'Nova Interação com Cliente',
            `${latest.type}: ${latest.title || latest.description?.substring(0, 100) || 'Nova interação'}`,
            'outro', 'info', '/ConsultorClients');
        }
        const oldT = old_data?.tasks || [], newT = data?.tasks || [];
        if (newT.length > oldT.length) {
          const latest = newT[newT.length - 1];
          addNotif(notifications, consultor, 'Nova Tarefa de CRM',
            `${latest.title} | Vence: ${latest.due_date || 'sem data'} | Prioridade: ${latest.priority}`,
            'outro', latest.priority === 'Alta' ? 'warning' : 'info', '/ConsultorClients');
        }
        const oldS = old_data?.services || [], newS = data?.services || [];
        for (let i = 0; i < newS.length; i++) {
          if (oldS[i] && oldS[i].status !== newS[i].status) {
            const val = newS[i].value ? ` (R$ ${Number(newS[i].value).toLocaleString('pt-BR')})` : '';
            addNotif(notifications, consultor, 'Status de Serviço Alterado',
              `${newS[i].name}${val}: ${oldS[i].status} → ${newS[i].status}`,
              'outro', newS[i].status === 'Cancelado' ? 'error' : newS[i].status === 'Concluído' ? 'success' : 'info',
              '/ConsultorClients');
          }
        }
      }
    }

    // ─── REQUEST ─────────────────────────────────────────────────────────
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
          addNotif(notifications, c, 'Novo Requerimento Recebido',
            `[${data.category}] ${data.subject}`, 'novo_requerimento', sev, '/Requests');
        }
        // CORREÇÃO: Notificar também o criador (cliente) — confirmação de recebimento
        addNotif(notifications, client, 'Requerimento Enviado com Sucesso',
          `Seu requerimento "${data.subject}" foi recebido e está sendo analisado.`,
          'resposta_requerimento', 'info', '/Requests');
      }

      if (event.type === 'update') {
        const oldC = old_data?.conversation || [], newC = data?.conversation || [];
        if (newC.length > oldC.length) {
          const latest = newC[newC.length - 1];
          if (latest.sender_type === 'team') {
            addNotif(notifications, client, 'Nova Resposta ao seu Requerimento',
              `"${data.subject}": ${latest.message?.substring(0, 120) || 'Nova mensagem da equipe'}`,
              'resposta_requerimento', 'info', '/Requests');
          } else {
            const consultores = await findConsultores();
            for (const c of consultores) {
              addNotif(notifications, c, 'Nova Mensagem de Cliente',
                `"${data.subject}": ${latest.message?.substring(0, 120) || 'Nova mensagem'}`,
                'novo_requerimento', 'info', '/Requests');
            }
          }
        }
        if (old_data?.status && old_data.status !== data.status) {
          addNotif(notifications, client, 'Status do Requerimento Alterado',
            `"${data.subject}": ${old_data.status} → ${data.status}`,
            'resposta_requerimento', data.status === 'Respondido' ? 'success' : 'info', '/Requests');
        }
      }
    }

    // ─── PROPERTY ────────────────────────────────────────────────────────
    if (event.entity_name === 'Property') {
      if (event.type === 'create' && data.consultor_email) {
        addNotif(notifications, data.consultor_email, 'Nova Propriedade Cadastrada',
          `"${data.property_name}" vinculada ao cliente ${data.client_name || data.owner_email}.`,
          'outro', 'info', '/Properties');
      }
    }

    // ─── CARBON CREDIT ───────────────────────────────────────────────────
    if (event.entity_name === 'CarbonCredit') {
      const owner = data.owner_email;
      if (event.type === 'create') {
        addNotif(notifications, owner, 'Novo Crédito de Carbono Registrado',
          `Projeto "${data.project_name || 'sem nome'}" registrado.`, 'outro', 'info', '/CarbonCredits');
      }
      if (event.type === 'update' && old_data?.status !== data.status) {
        addNotif(notifications, owner, 'Status de Crédito de Carbono Alterado',
          `"${data.project_name}": ${old_data?.status} → ${data.status}`,
          'outro', data.status === 'Certificado' ? 'success' : 'info', '/CarbonCredits');
      }
    }

    // ─── PSA CONTRACT ────────────────────────────────────────────────────
    if (event.entity_name === 'PSAContract') {
      const owner = data.owner_email;
      if (event.type === 'create') {
        addNotif(notifications, owner, 'Novo Contrato PSA Registrado',
          `Contrato "${data.contract_name || 'sem nome'}" registrado.`, 'outro', 'info', '/PSAContracts');
      }
      if (event.type === 'update' && old_data?.status !== data.status) {
        addNotif(notifications, owner, 'Status de Contrato PSA Alterado',
          `"${data.contract_name || 'sem nome'}": ${old_data?.status} → ${data.status}`,
          'outro', 'info', '/PSAContracts');
      }
    }

    // ─── ENVIRONMENTAL EASEMENT ──────────────────────────────────────────
    if (event.entity_name === 'EnvironmentalEasement') {
      const owner = data.owner_email;
      if (event.type === 'create') {
        addNotif(notifications, owner, 'Nova Servidão Ambiental Registrada',
          'Servidão ambiental registrada.', 'outro', 'info', '/EnvironmentalEasements');
      }
      if (event.type === 'update' && old_data?.status !== data.status) {
        addNotif(notifications, owner, 'Status de Servidão Ambiental Alterado',
          `${old_data?.status} → ${data.status}`, 'outro', 'info', '/EnvironmentalEasements');
      }
    }

    // ─── AUDIT LOG (modificações pela equipe) ────────────────────────────
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
            addNotif(notifications, primaryEmail, 'Modificação pela Equipe',
              `${data.user_full_name || actorEmail} ${verb} ${data.entity_label || data.entity_name}.`,
              'outro', 'info', null);
          }
        }
      } catch (e) { /* ignore */ }
    }

    // ─── PERSIST ─────────────────────────────────────────────────────────
    if (notifications.length === 0 && emailsToSend.length === 0) {
      return Response.json({ success: true, message: 'Evento não requer notificação' });
    }

    await Promise.all([
      saveNotifications(base44, notifications, event.entity_name, event.entity_id),
      sendEmails(base44, emailsToSend)
    ]);

    console.log(`[Notif] ${event.entity_name}.${event.type} → push:${notifications.length} email:${emailsToSend.length}`);
    return Response.json({
      success: true,
      notifications_sent: notifications.length,
      emails_sent: emailsToSend.length,
      sms_sent: 0 // canal não implementado
    });

  } catch (error) {
    console.error('[Notif] Erro:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});