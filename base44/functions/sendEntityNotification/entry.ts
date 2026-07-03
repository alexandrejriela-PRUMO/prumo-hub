/**
 * sendEntityNotification — Função principal de notificações por entidade.
 * Consolida push (in-app) + email. SMS não implementado.
 *
 * COBERTURA:
 * - License: criação/atualização/vencimento → owner + consultor + equipe + client_consultor (enterprise)
 * - Process: criação/andamentos/status → client + consultor + equipe + client_consultor (enterprise)
 * - EnvironmentalAlert: criação/resolução → owner + consultor + equipe
 * - PRAD: criação/status/etapas → owner + consultor + equipe
 * - ClientContract: criação/status/vencimento → client + consultor + equipe + client_consultor (enterprise)
 * - ClientCRM: interações/tarefas/menções → consultor + membro mencionado
 * - Request: criação/resposta → client + consultor + equipe
 * - Property: criação → consultor
 * - Mapping, Georeferencing, CarbonCredit, PSAContract, EnvironmentalEasement
 * - AuditLog: notifica dono da equipe sobre ações da equipe
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Regras de notificação por plano ─────────────────────────────────────────
function canReceiveNotification(recipient, consultor) {
  const type = recipient?.user_type || 'produtor';
  if (['produtor', 'consultor', 'equipe'].includes(type)) return true;
  if (type === 'client_consultor') {
    const plan = (consultor?.plan || '').toLowerCase();
    return plan === 'enterprise';
  }
  return true;
}

function addNotif(notifications, userEmail, title, message, eventType, severity = 'info', link = null) {
  if (userEmail) notifications.push({ user_email: userEmail, title, message, event_type: eventType, severity, link });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;

    if (!event?.entity_name || !event?.type) {
      return Response.json({ error: 'Payload inválido' }, { status: 400 });
    }

    // Cache local por request
    const consultorCache = {};
    const recipientCache = {};
    const prefCache = {};
    const recentEmailsMap = new Map();

    async function getConsultorData(email) {
      if (!email) return null;
      if (consultorCache[email]) return consultorCache[email];
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        consultorCache[email] = users[0] || null;
        return consultorCache[email];
      } catch (e) { return null; }
    }

    async function getRecipientData(email) {
      if (!email) return null;
      if (recipientCache[email]) return recipientCache[email];
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        recipientCache[email] = users[0] || { user_type: 'produtor' };
        return recipientCache[email];
      } catch (e) { return { user_type: 'produtor' }; }
    }

    async function getUserPrefs(email) {
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

    function isDuplicateEmail(email, subject) {
      const key = `${email}:${subject}`;
      const last = recentEmailsMap.get(key);
      const now = Date.now();
      if (last && (now - last) < 5 * 60 * 1000) return true;
      recentEmailsMap.set(key, now);
      return false;
    }

    async function addEmail(emailsToSend, userEmail, subject, body, eventType) {
      if (!userEmail) return;
      if (isDuplicateEmail(userEmail, subject)) {
        console.log(`[Notif] Email duplicado bloqueado para ${userEmail}: "${subject}"`);
        return;
      }
      const prefs = await getUserPrefs(userEmail);
      const pref = prefs[eventType] || prefs['todos'];
      if (!pref || pref.email_enabled !== false) {
        emailsToSend.push({ to: userEmail, subject, body });
      }
    }

    async function saveNotifications(notifications, entityName, entityId) {
      for (const notif of notifications) {
        const prefs = await getUserPrefs(notif.user_email);
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

    async function sendEmails(emailsToSend) {
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

    async function filterByPlan(emails, consultorEmail) {
      const result = [];
      const consultor = await getConsultorData(consultorEmail);
      const seen = new Set();
      for (const email of emails) {
        if (!email || seen.has(email)) continue;
        seen.add(email);
        const recipient = await getRecipientData(email);
        if (!canReceiveNotification(recipient, consultor)) {
          console.log(`[NotifPlan] Bloqueado: ${email} (${recipient?.user_type}) — plano: ${consultor?.plan || 'nenhum'}`);
          continue;
        }
        result.push(email);
      }
      return result;
    }

    async function getTeamEmails(consultorEmail) {
      if (!consultorEmail) return [];
      try {
        const team = await base44.asServiceRole.entities.TeamMember.filter({
          consultor_email: consultorEmail,
          status: 'Ativo'
        });
        return team.map(m => m.member_email).filter(Boolean);
      } catch (e) { return []; }
    }

    // Busca email do client_consultor vinculado a uma propriedade (portal do cliente)
    async function getClientConsultorEmail(propertyId, ownerEmail) {
      if (!propertyId) return null;
      try {
        const props = await base44.asServiceRole.entities.Property.filter({ id: propertyId });
        if (props.length === 0) return null;
        const clientEmail = props[0].owner_email || ownerEmail;
        if (!clientEmail) return null;
        const users = await base44.asServiceRole.entities.User.filter({ email: clientEmail });
        if (users.length > 0 && users[0].user_type === 'client_consultor') return clientEmail;
        return null;
      } catch (e) { return null; }
    }

    const notifications = [];
    const emailsToSend = [];

    // ─── LICENSE ─────────────────────────────────────────────────────────
    if (event.entity_name === 'License') {
      const owner = data.owner_email;
      let consultorEmail = null;
      let propertyName = null;
      let ownerName = null;

      // Busca propriedade (consultor + nome) e proprietário (nome) para enriquecer
      if (data.property_id) {
        try {
          const props = await base44.asServiceRole.entities.Property.filter({ id: data.property_id });
          if (props.length > 0) {
            consultorEmail = props[0].consultor_email;
            propertyName = props[0].property_name || props[0].name || null;
          }
        } catch (e) { /* ignore */ }
      }
      if (owner) {
        try {
          const ownerUsers = await base44.asServiceRole.entities.User.filter({ email: owner });
          if (ownerUsers.length > 0) ownerName = ownerUsers[0].full_name || null;
        } catch (e) { /* ignore */ }
      }

      // Bloco de contexto comum (HTML + texto) — cliente, propriedade, número, fase, datas, status
      const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : null;
      const ctxItems = [];
      if (ownerName) ctxItems.push(`<li><strong>Cliente:</strong> ${ownerName}</li>`);
      if (propertyName) ctxItems.push(`<li><strong>Propriedade:</strong> ${propertyName}</li>`);
      ctxItems.push(`<li><strong>Tipo:</strong> ${data.license_type}</li>`);
      if (data.license_number) ctxItems.push(`<li><strong>Número:</strong> ${data.license_number}</li>`);
      if (data.elaboration_stage) ctxItems.push(`<li><strong>Fase:</strong> ${data.elaboration_stage}</li>`);
      const di = fmtDate(data.issue_date); if (di) ctxItems.push(`<li><strong>Data de Emissão:</strong> ${di}</li>`);
      const dv = fmtDate(data.expiry_date); if (dv) ctxItems.push(`<li><strong>Data de Validade:</strong> ${dv}</li>`);
      if (data.status) ctxItems.push(`<li><strong>Status:</strong> ${data.status}</li>`);
      const ctxHtml = `<ul>${ctxItems.join('')}</ul>`;
      const ctxTextParts = [];
      if (ownerName) ctxTextParts.push(`Cliente: ${ownerName}`);
      if (propertyName) ctxTextParts.push(`Propriedade: ${propertyName}`);
      if (data.license_number) ctxTextParts.push(`Nº ${data.license_number}`);
      if (data.elaboration_stage) ctxTextParts.push(`Fase: ${data.elaboration_stage}`);
      if (dv) ctxTextParts.push(`Validade: ${dv}`);
      const ctxText = ctxTextParts.length > 0 ? ` | ${ctxTextParts.join(' · ')}` : '';

      const teamEmails = await getTeamEmails(consultorEmail);
      // Inclui o client_consultor se existir
      const clientConsultorEmail = await getClientConsultorEmail(data.property_id, owner);
      const candidates = [...new Set([owner, consultorEmail, ...teamEmails, clientConsultorEmail].filter(Boolean))];
      const recipients = await filterByPlan(candidates, consultorEmail);

      if (event.type === 'create') {
        const msgCreate = `Licença ${data.license_type}${data.license_number ? ` nº ${data.license_number}` : ''} registrada${ctxText}.`;
        for (const r of recipients) {
          const label = r === consultorEmail ? 'Nova Licença - Cliente' : r === clientConsultorEmail ? 'Nova Licença em sua Propriedade' : 'Nova Licença Cadastrada';
          addNotif(notifications, r, label, msgCreate, 'nova_licenca', 'info', '/Licenses');
        }
        await addEmail(emailsToSend, owner,
          `[PRUMO Hub] Nova Licença Cadastrada: ${data.license_type}`,
          `<p>Olá${ownerName ? `, ${ownerName}` : ''},</p><p>Uma nova licença foi cadastrada:</p>${ctxHtml}<p>Equipe PRUMO Hub</p>`,
          'nova_licenca'
        );
        // Notifica client_consultor também por email se for diferente do owner
        if (clientConsultorEmail && clientConsultorEmail !== owner) {
          await addEmail(emailsToSend, clientConsultorEmail,
            `[PRUMO Hub] Nova Licença em sua Propriedade: ${data.license_type}`,
            `<p>Olá,</p><p>Seu consultor cadastrou uma nova licença em sua propriedade:</p>${ctxHtml}<p>Equipe PRUMO Hub</p>`,
            'nova_licenca'
          );
        }
      }

      if (event.type === 'update') {
        const oldU = old_data?.updates || [], newU = data?.updates || [];
        if (newU.length > oldU.length) {
          const latest = newU[newU.length - 1];
          const andamentoMsg = `Andamento na licença ${data.license_type}${data.license_number ? ` nº ${data.license_number}` : ''}${ctxText}: ${latest.description?.substring(0, 120) || 'Nova movimentação registrada'}`;
          for (const r of recipients) {
            const label = r === consultorEmail ? 'Andamento em Licença - Cliente' : r === clientConsultorEmail ? 'Novo Andamento em Licença da sua Propriedade' : 'Novo Andamento em Licença';
            addNotif(notifications, r, label, andamentoMsg, 'atualizacao_licenca', 'info', '/Licenses');
          }
          await addEmail(emailsToSend, owner,
            `[PRUMO Hub] Novo Andamento na Licença ${data.license_type}${data.license_number ? ` nº ${data.license_number}` : ''}`,
            `<p>Olá${ownerName ? `, ${ownerName}` : ''},</p><p>Nova movimentação na licença <strong>${data.license_type}</strong>:</p><blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #2d6a4f;">${latest.description || 'Nova movimentação registrada'}</blockquote>${ctxHtml}<p>Equipe PRUMO Hub</p>`,
            'atualizacao_licenca'
          );
          if (clientConsultorEmail && clientConsultorEmail !== owner) {
            await addEmail(emailsToSend, clientConsultorEmail,
              `[PRUMO Hub] Andamento em Licença da sua Propriedade`,
              `<p>Olá,</p><p>Seu consultor registrou uma atualização na licença <strong>${data.license_type}</strong>:</p><blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #2d6a4f;">${latest.description || 'Nova movimentação'}</blockquote>${ctxHtml}<p>Equipe PRUMO Hub</p>`,
              'atualizacao_licenca'
            );
          }
        }
        if (old_data?.status && old_data.status !== data.status) {
          const sev = data.status === 'Vencida' ? 'error' : 'warning';
          const statusMsg = `Licença ${data.license_type}: ${old_data.status} → ${data.status}${ctxText}`;
          for (const r of recipients) {
            const label = r === consultorEmail ? 'Status de Licença Alterado - Cliente' : 'Status de Licença Alterado';
            addNotif(notifications, r, label, statusMsg, 'licenca_vencida', sev, '/Licenses');
          }
          await addEmail(emailsToSend, owner,
            `[PRUMO Hub] Status da Licença ${data.license_type} Alterado`,
            `<p>Olá${ownerName ? `, ${ownerName}` : ''},</p><p>Status alterado: <strong>${old_data.status}</strong> → <strong>${data.status}</strong></p>${ctxHtml}<p>Equipe PRUMO Hub</p>`,
            'licenca_vencida'
          );
          if (clientConsultorEmail && clientConsultorEmail !== owner) {
            await addEmail(emailsToSend, clientConsultorEmail,
              `[PRUMO Hub] Status da Licença ${data.license_type} Alterado`,
              `<p>Olá,</p><p>O status da sua licença foi alterado: <strong>${old_data.status}</strong> → <strong>${data.status}</strong></p>${ctxHtml}<p>Equipe PRUMO Hub</p>`,
              'licenca_vencida'
            );
          }
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

      const teamEmails = await getTeamEmails(consultorEmail);
      const clientConsultorEmail = await getClientConsultorEmail(data.property_id, client);
      const candidates = [...new Set([client, consultorEmail, ...teamEmails, clientConsultorEmail].filter(Boolean))];
      const recipients = await filterByPlan(candidates, consultorEmail);

      if (event.type === 'create') {
        const message = `Processo ${data.process_number} (${data.process_type}): ${data.subject}`;
        for (const r of recipients) {
          const label = r === consultorEmail ? 'Novo Processo - Cliente' : r === clientConsultorEmail ? 'Novo Processo em sua Propriedade' : 'Novo Processo Registrado';
          addNotif(notifications, r, label, message, 'novo_processo', 'info', '/Processes');
        }
        await addEmail(emailsToSend, client,
          `[PRUMO Hub] Novo Processo Registrado: ${data.process_number}`,
          `<p>Novo processo cadastrado:</p><ul><li><strong>Número:</strong> ${data.process_number}</li><li><strong>Tipo:</strong> ${data.process_type}</li><li><strong>Matéria:</strong> ${data.subject}</li><li><strong>Status:</strong> ${data.status}</li></ul><p>Equipe PRUMO Hub</p>`,
          'novo_processo'
        );
        if (clientConsultorEmail && clientConsultorEmail !== client) {
          await addEmail(emailsToSend, clientConsultorEmail,
            `[PRUMO Hub] Novo Processo Registrado em sua Propriedade`,
            `<p>Olá,</p><p>Seu consultor registrou um novo processo para sua propriedade:</p><ul><li><strong>Número:</strong> ${data.process_number}</li><li><strong>Tipo:</strong> ${data.process_type}</li><li><strong>Matéria:</strong> ${data.subject}</li></ul><p>Equipe PRUMO Hub</p>`,
            'novo_processo'
          );
        }
      }

      if (event.type === 'update') {
        const oldU = old_data?.updates || [], newU = data?.updates || [];
        if (newU.length > oldU.length) {
          const latest = newU[newU.length - 1];
          const movMessage = `Processo ${data.process_number}: ${latest.description?.substring(0, 120) || 'Nova movimentação'}`;
          for (const r of recipients) {
            const label = r === consultorEmail ? 'Andamento em Processo - Cliente' : r === clientConsultorEmail ? 'Novo Andamento no seu Processo' : 'Novo Andamento em Processo';
            addNotif(notifications, r, label, movMessage, 'atualizacao_processo', 'info', '/Processes');
          }
          await addEmail(emailsToSend, client,
            `[PRUMO Hub] Novo Andamento no Processo ${data.process_number}`,
            `<p>Nova movimentação no processo <strong>${data.process_number}</strong>:</p><blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #2d6a4f;">${latest.description || 'Nova movimentação'}</blockquote><p>Equipe PRUMO Hub</p>`,
            'atualizacao_processo'
          );
          if (clientConsultorEmail && clientConsultorEmail !== client) {
            await addEmail(emailsToSend, clientConsultorEmail,
              `[PRUMO Hub] Andamento no seu Processo ${data.process_number}`,
              `<p>Olá,</p><p>Novo andamento no processo <strong>${data.process_number}</strong>:</p><blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #2d6a4f;">${latest.description || 'Nova movimentação'}</blockquote><p>Equipe PRUMO Hub</p>`,
              'atualizacao_processo'
            );
          }
        }
        if (old_data?.status && old_data.status !== data.status) {
          const statusMsg = `Processo ${data.process_number}: ${old_data.status} → ${data.status}`;
          for (const r of recipients) {
            const label = r === consultorEmail ? 'Status de Processo Alterado - Cliente' : 'Status de Processo Alterado';
            addNotif(notifications, r, label, statusMsg, 'atualizacao_processo', 'warning', '/Processes');
          }
          await addEmail(emailsToSend, client,
            `[PRUMO Hub] Status do Processo ${data.process_number} Alterado`,
            `<p>Status alterado: <strong>${old_data.status}</strong> → <strong>${data.status}</strong></p><p>Equipe PRUMO Hub</p>`,
            'atualizacao_processo'
          );
          if (clientConsultorEmail && clientConsultorEmail !== client) {
            await addEmail(emailsToSend, clientConsultorEmail,
              `[PRUMO Hub] Status do seu Processo ${data.process_number} Alterado`,
              `<p>Olá,</p><p>O status do processo alterou: <strong>${old_data.status}</strong> → <strong>${data.status}</strong></p><p>Equipe PRUMO Hub</p>`,
              'atualizacao_processo'
            );
          }
        }
      }
    }

    // ─── CLIENT CONTRACT ─────────────────────────────────────────────────
    if (event.entity_name === 'ClientContract') {
      const clientEmail = data.client_email;
      const consultorEmail = data.consultor_email;
      const teamEmails = await getTeamEmails(consultorEmail);
      const clientConsultorEmail = await getClientConsultorEmail(data.property_id, clientEmail);
      const candidates = [...new Set([clientEmail, consultorEmail, ...teamEmails, clientConsultorEmail].filter(Boolean))];
      const recipients = await filterByPlan(candidates, consultorEmail);

      if (event.type === 'create') {
        const msg = `Contrato "${data.contract_type}" para ${data.client_name || clientEmail} foi criado.`;
        for (const r of recipients) {
          const label = r === clientEmail || r === clientConsultorEmail ? 'Novo Contrato Disponível' : 'Novo Contrato Criado';
          addNotif(notifications, r, label, msg, 'outro', 'info', '/Contracts');
        }
        if (clientEmail) {
          await addEmail(emailsToSend, clientEmail,
            `[PRUMO Hub] Novo Contrato: ${data.contract_type}`,
            `<p>Olá ${data.client_name || ''},</p><p>Um novo contrato foi criado para você:</p><ul><li><strong>Tipo:</strong> ${data.contract_type}</li><li><strong>Objeto:</strong> ${data.object || 'N/A'}</li><li><strong>Status:</strong> ${data.status}</li></ul><p>Acesse a plataforma para visualizar.</p><p>Equipe PRUMO Hub</p>`,
            'outro'
          );
        }
      }

      if (event.type === 'update') {
        // Mudança de status
        if (old_data?.status && old_data.status !== data.status) {
          const sev = data.status === 'Cancelado' ? 'error' : data.status === 'Assinado' || data.status === 'Ativo' ? 'success' : 'info';
          const statusMsg = `Contrato "${data.contract_type}": ${old_data.status} → ${data.status}`;
          for (const r of recipients) {
            addNotif(notifications, r, 'Status de Contrato Alterado', statusMsg, 'outro', sev, '/Contracts');
          }
          if (clientEmail) {
            await addEmail(emailsToSend, clientEmail,
              `[PRUMO Hub] Status do Contrato "${data.contract_type}" Alterado`,
              `<p>Olá,</p><p>O status do seu contrato foi atualizado: <strong>${old_data.status}</strong> → <strong>${data.status}</strong></p><p>Equipe PRUMO Hub</p>`,
              'outro'
            );
          }
          if (clientConsultorEmail && clientConsultorEmail !== clientEmail) {
            await addEmail(emailsToSend, clientConsultorEmail,
              `[PRUMO Hub] Status do seu Contrato Alterado`,
              `<p>Olá,</p><p>O status do contrato <strong>${data.contract_type}</strong> foi alterado: <strong>${old_data.status}</strong> → <strong>${data.status}</strong></p><p>Equipe PRUMO Hub</p>`,
              'outro'
            );
          }
        }
        // Mudança de signature_status
        if (old_data?.signature_status && old_data.signature_status !== data.signature_status) {
          const sigMsg = `Contrato "${data.contract_type}": assinatura ${data.signature_status}`;
          const sev = data.signature_status === 'Assinado' ? 'success' : data.signature_status === 'Recusado' ? 'error' : 'info';
          for (const r of recipients) {
            addNotif(notifications, r, 'Atualização de Assinatura de Contrato', sigMsg, 'outro', sev, '/Contracts');
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
      const teamEmails = await getTeamEmails(consultorEmail);
      const clientConsultorEmail = await getClientConsultorEmail(data.property_id, ownerEmail);
      const candidates = [...new Set([ownerEmail, consultorEmail, ...teamEmails, clientConsultorEmail].filter(Boolean))];
      const recipients = await filterByPlan(candidates, consultorEmail);

      if (event.type === 'create') {
        const alertTitle = 'Novo Alerta Ambiental';
        const alertMsg = `${data.alert_type}: ${data.title}`;
        for (const r of recipients) {
          addNotif(notifications, r, alertTitle, alertMsg, 'novo_alerta_ambiental', sev, '/EnvironmentalAlerts');
        }
        await addEmail(emailsToSend, ownerEmail,
          `[PRUMO Hub] ⚠️ Novo Alerta Ambiental: ${data.title}`,
          `<p>Um novo alerta ambiental foi detectado:</p><ul><li><strong>Tipo:</strong> ${data.alert_type}</li><li><strong>Título:</strong> ${data.title}</li><li><strong>Severidade:</strong> ${data.severity}</li>${data.description ? `<li><strong>Descrição:</strong> ${data.description}</li>` : ''}</ul><p>Acesse a plataforma para mais detalhes.</p><p>Equipe PRUMO Hub</p>`,
          'novo_alerta_ambiental'
        );
        if (consultorEmail && consultorEmail !== ownerEmail) {
          await addEmail(emailsToSend, consultorEmail,
            `[PRUMO Hub] ⚠️ Alerta Ambiental em Propriedade Monitorada: ${data.title}`,
            `<p>Alerta detectado em propriedade de seu cliente:</p><ul><li><strong>Tipo:</strong> ${data.alert_type}</li><li><strong>Severidade:</strong> ${data.severity}</li></ul><p>Equipe PRUMO Hub</p>`,
            'novo_alerta_ambiental'
          );
        }
        if (clientConsultorEmail && clientConsultorEmail !== ownerEmail && clientConsultorEmail !== consultorEmail) {
          await addEmail(emailsToSend, clientConsultorEmail,
            `[PRUMO Hub] ⚠️ Alerta Ambiental em sua Propriedade: ${data.title}`,
            `<p>Olá,</p><p>Um alerta ambiental foi detectado em sua propriedade:</p><ul><li><strong>Tipo:</strong> ${data.alert_type}</li><li><strong>Severidade:</strong> ${data.severity}</li></ul><p>Acesse a plataforma para mais detalhes.</p><p>Equipe PRUMO Hub</p>`,
            'novo_alerta_ambiental'
          );
        }
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
      const teamEmails = await getTeamEmails(consultorEmail);
      const clientConsultorEmail = await getClientConsultorEmail(data.property_id, owner);
      const candidates = [...new Set([owner, consultorEmail, ...teamEmails, clientConsultorEmail].filter(Boolean))];
      const recipients = await filterByPlan(candidates, consultorEmail);

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
        // Nova interação
        const oldI = old_data?.interactions || [], newI = data?.interactions || [];
        if (newI.length > oldI.length) {
          const latest = newI[newI.length - 1];
          // Notifica o consultor
          addNotif(notifications, consultor, 'Nova Interação com Cliente',
            `${latest.type}: ${latest.title || latest.description?.substring(0, 100) || 'Nova interação'}`,
            'outro', 'info', '/ConsultorClients');
          // Notifica responsável se diferente do consultor
          if (latest.responsible_email && latest.responsible_email !== consultor) {
            addNotif(notifications, latest.responsible_email, 'Interação Atribuída a Você',
              `"${latest.title || 'Nova interação'}" no cliente "${data.client_name || ''}"`,
              'outro', 'info', '/CRMBoard');
            await addEmail(emailsToSend, latest.responsible_email,
              `[PRUMO Hub] Interação atribuída a você no CRM`,
              `<p>Olá,</p><p>Uma nova interação foi atribuída a você no CRM do cliente <strong>${data.client_name || ''}</strong>:</p><p><strong>${latest.title || 'Nova interação'}</strong></p><p>Tipo: ${latest.type}</p><p>Acesse o CRM para responder.</p><p>Equipe PRUMO Hub</p>`,
              'outro'
            );
          }
          // Verifica menções (@) nas threads da interação
          const thread = latest.thread || [];
          for (const msg of thread) {
            const mentions = msg.mentions || [];
            for (const mentionedEmail of mentions) {
              if (mentionedEmail !== msg.author_email) {
                addNotif(notifications, mentionedEmail, `Você foi mencionado no CRM`,
                  `${msg.author_name || msg.author_email} mencionou você: "${msg.message?.substring(0, 100) || ''}"`,
                  'outro', 'info', '/CRMBoard');
                await addEmail(emailsToSend, mentionedEmail,
                  `[PRUMO Hub] Você foi mencionado no CRM - ${data.client_name || ''}`,
                  `<p>Olá,</p><p><strong>${msg.author_name || msg.author_email}</strong> mencionou você em uma conversa sobre <strong>${data.client_name || 'cliente'}</strong>:</p><blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #2d6a4f;">${msg.message || ''}</blockquote><p>Acesse o CRM para responder.</p><p>Equipe PRUMO Hub</p>`,
                  'outro'
                );
              }
            }
          }
        }

        // Nova tarefa
        const oldT = old_data?.tasks || [], newT = data?.tasks || [];
        if (newT.length > oldT.length) {
          const latest = newT[newT.length - 1];
          addNotif(notifications, consultor, 'Nova Tarefa de CRM',
            `${latest.title} | Vence: ${latest.due_date || 'sem data'} | Prioridade: ${latest.priority}`,
            'outro', latest.priority === 'Alta' ? 'warning' : 'info', '/ConsultorClients');
          // Notifica membro atribuído se diferente do consultor
          if (latest.assigned_to_email && latest.assigned_to_email !== consultor) {
            addNotif(notifications, latest.assigned_to_email, 'Tarefa Delegada a Você',
              `"${latest.title}" — cliente: ${data.client_name || ''} | Vence: ${latest.due_date || 'sem data'}`,
              'outro', latest.priority === 'Alta' ? 'warning' : 'info', '/CRMBoard');
            await addEmail(emailsToSend, latest.assigned_to_email,
              `[PRUMO Hub] Tarefa delegada a você: ${latest.title}`,
              `<p>Olá,</p><p>Uma nova tarefa foi delegada a você:</p><ul><li><strong>Tarefa:</strong> ${latest.title}</li><li><strong>Cliente:</strong> ${data.client_name || ''}</li><li><strong>Vencimento:</strong> ${latest.due_date || 'Sem data'}</li><li><strong>Prioridade:</strong> ${latest.priority}</li></ul><p>Equipe PRUMO Hub</p>`,
              'outro'
            );
          }
          // Verifica menções em threads de tarefas
          const thread = latest.thread || [];
          for (const msg of thread) {
            const mentions = msg.mentions || [];
            for (const mentionedEmail of mentions) {
              if (mentionedEmail !== msg.author_email) {
                addNotif(notifications, mentionedEmail, `Você foi mencionado em Tarefa`,
                  `${msg.author_name || msg.author_email}: "${msg.message?.substring(0, 100) || ''}"`,
                  'outro', 'info', '/CRMBoard');
              }
            }
          }
        }

        // Serviços
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
          const teamEmails = await getTeamEmails(c);
          for (const memberEmail of teamEmails) {
            addNotif(notifications, memberEmail, 'Novo Requerimento - Cliente',
              `[${data.category}] ${data.subject}`, 'novo_requerimento', sev, '/Requests');
          }
        }
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
            await addEmail(emailsToSend, client,
              `[PRUMO Hub] Nova resposta ao seu requerimento: ${data.subject}`,
              `<p>Olá,</p><p>Sua equipe respondeu ao requerimento <strong>${data.subject}</strong>:</p><blockquote style="background:#f5f5f5;padding:12px;border-left:4px solid #2d6a4f;">${latest.message || ''}</blockquote><p>Equipe PRUMO Hub</p>`,
              'resposta_requerimento'
            );
          } else {
            const consultores = await findConsultores();
            for (const c of consultores) {
              addNotif(notifications, c, 'Nova Mensagem de Cliente',
                `"${data.subject}": ${latest.message?.substring(0, 120) || 'Nova mensagem'}`,
                'novo_requerimento', 'info', '/Requests');
              const teamEmails = await getTeamEmails(c);
              for (const memberEmail of teamEmails) {
                addNotif(notifications, memberEmail, 'Nova Mensagem de Cliente',
                  `"${data.subject}": ${latest.message?.substring(0, 120) || 'Nova mensagem'}`,
                  'novo_requerimento', 'info', '/Requests');
              }
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

    // ─── AGENDA EVENT ─────────────────────────────────────────────────────
    if (event.entity_name === 'AgendaEvent') {
      const organizer = data.created_by;
      const attendees = data.attendees || [];

      if (event.type === 'create') {
        const msg = `"${data.title}" — ${data.start_date ? new Date(data.start_date).toLocaleDateString('pt-BR') : 'data a confirmar'}`;
        for (const attendeeEmail of attendees) {
          if (attendeeEmail !== organizer) {
            addNotif(notifications, attendeeEmail, 'Novo Agendamento para Você', msg, 'outro', 'info', '/Agenda');
            await addEmail(emailsToSend, attendeeEmail,
              `[PRUMO Hub] Novo agendamento: ${data.title}`,
              `<p>Olá,</p><p>Você foi incluído em um novo agendamento:</p><ul><li><strong>Título:</strong> ${data.title}</li><li><strong>Data:</strong> ${data.start_date ? new Date(data.start_date).toLocaleDateString('pt-BR') : 'a confirmar'}</li>${data.description ? `<li><strong>Descrição:</strong> ${data.description}</li>` : ''}</ul><p>Acesse a plataforma para mais detalhes.</p><p>Equipe PRUMO Hub</p>`,
              'outro'
            );
          }
        }
      }

      if (event.type === 'update') {
        // Notifica convidados sobre alteração
        if (old_data?.start_date !== data.start_date || old_data?.title !== data.title) {
          for (const attendeeEmail of attendees) {
            if (attendeeEmail !== organizer) {
              addNotif(notifications, attendeeEmail, 'Agendamento Atualizado',
                `"${data.title}" foi atualizado.`, 'outro', 'warning', '/Agenda');
            }
          }
        }
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
      saveNotifications(notifications, event.entity_name, event.entity_id),
      sendEmails(emailsToSend)
    ]);

    console.log(`[Notif] ${event.entity_name}.${event.type} → push:${notifications.length} email:${emailsToSend.length} sms:0`);
    return Response.json({
      success: true,
      notifications_sent: notifications.length,
      emails_sent: emailsToSend.length,
      sms_sent: 0
    });

  } catch (error) {
    console.error('[Notif] Erro:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});