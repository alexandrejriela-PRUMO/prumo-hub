/**
 * checkExpiryNotifications — Verifica vencimentos e notifica responsáveis + equipe.
 * Canais: push (in-app) + email + WhatsApp (via webhook n8n).
 *
 * v4 — Preferências por destinatário (NotificationPreference), alerta de renovação de
 *       licença (renewal_required/renewal_days_before), condicionantes com event_type
 *       correto ('condicionante_vencendo'), checagem de documentos com expiry_date,
 *       e visualizadores por propriedade (authorized_users).
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
    const notifPrefsCache = {};
    const propViewersCache = {};
    const emailDedupeMap = new Map();

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

    // ─── Preferências de notificação por usuário/evento ──────────────────
    // Retorna: { days: number[], push: bool, email: bool, whatsapp: bool, phone: string|null }
    // Se não houver preferência cadastrada, usa defaultDays e push+email habilitados.
    const getNotifPrefs = async (email, eventType, defaultDays) => {
      const cacheKey = `${email}:${eventType}`;
      if (notifPrefsCache[cacheKey] !== undefined) return notifPrefsCache[cacheKey];
      try {
        const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
          user_email: email, event_type: eventType
        });
        const pref = prefs[0];
        let days = defaultDays;
        if (pref?.days_before) {
          try { days = JSON.parse(pref.days_before); } catch {}
        }
        const result = {
          days,
          push:     pref ? (pref.push_enabled  !== false) : true,
          email:    pref ? (pref.email_enabled  !== false) : true,
          whatsapp: pref ? (pref.sms_enabled    === true)  : false,
          phone:    pref?.phone_number || null,
        };
        notifPrefsCache[cacheKey] = result;
        return result;
      } catch {
        const result = { days: defaultDays, push: true, email: true, whatsapp: false, phone: null };
        notifPrefsCache[cacheKey] = result;
        return result;
      }
    };

    // ─── Visualizadores de propriedade com notificação habilitada ────────
    const getPropertyViewers = async (propertyId, eventKey) => {
      if (!propertyId) return [];
      const cacheKey = `${propertyId}:${eventKey}`;
      if (propViewersCache[cacheKey] !== undefined) return propViewersCache[cacheKey];
      try {
        const props = await base44.asServiceRole.entities.Property.filter({ id: propertyId });
        const prop = props[0];
        if (!prop?.authorized_users) { propViewersCache[cacheKey] = []; return []; }
        let users = prop.authorized_users;
        if (typeof users === 'string') { try { users = JSON.parse(users); } catch { users = []; } }
        const viewers = (users || [])
          .filter(u => u.role === 'Visualizador' && u.notification_settings?.[eventKey] === true)
          .map(u => u.email)
          .filter(Boolean);
        propViewersCache[cacheKey] = viewers;
        return viewers;
      } catch {
        propViewersCache[cacheKey] = [];
        return [];
      }
    };

    // ─── Push in-app com deduplicação por dia ────────────────────────────
    const createNotif = async (userEmail, title, message, eventType, severity, link) => {
      if (!userEmail) return;
      try {
        const recent = await base44.asServiceRole.entities.InAppNotification.filter(
          { user_email: userEmail }, '-created_date', 200
        );
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
        if (['enterprise'].includes(plan)) {
          const teamEmails = await getTeamEmails(consultorEmail);
          for (const m of teamEmails) {
            if (m !== ownerEmail && m !== consultorEmail) {
              await createNotif(m, title, message, eventType, severity, link);
            }
          }
        }
      }
    };

    // ─── Notifica push + email (usado nas seções sem preferências por usuário) ─
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

    // ─── Notifica via preferências do destinatário ────────────────────────
    // O chamador já verificou se days está nos prefs.days; esta função
    // apenas respeita os canais habilitados (push/email/whatsapp).
    const notifyPerPrefs = async (email, prefs, title, message, eventType, severity, link, emailSubject, emailBody) => {
      if (!email) return;
      if (prefs.push) {
        await createNotif(email, title, message, eventType, severity, link);
      }
      if (prefs.email && emailSubject && emailBody) {
        await sendEmail(email, emailSubject, emailBody);
      }
      if (prefs.whatsapp && prefs.phone) {
        try {
          await fetch('https://prumohub.app.n8n.cloud/webhook/prumo-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: prefs.phone, message: `${title}: ${message}` })
          });
          console.log(`[Expiry] WhatsApp enviado → ${prefs.phone}: "${title}"`);
        } catch (e) {
          console.error('[Expiry] Erro ao enviar WhatsApp para', prefs.phone, ':', e.message);
        }
      }
    };

    const propDataCache = {};
    const getPropertyName = async (propertyId) => {
      if (!propertyId) return null;
      if (propDataCache[propertyId] !== undefined) return propDataCache[propertyId];
      try {
        const props = await base44.asServiceRole.entities.Property.filter({ id: propertyId });
        propDataCache[propertyId] = props[0]?.property_name || props[0]?.name || null;
        return propDataCache[propertyId];
      } catch (e) { return null; }
    };
    const getUserNameExpiry = async (email) => {
      if (!email) return null;
      const u = await getUserData(email);
      return u?.full_name || null;
    };
    function buildCtx(data, fields, extra) {
      extra = extra || {};
      const fmtDate = (d) => { if (!d) return null; const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d); return isNaN(dt) ? null : dt.toLocaleDateString('pt-BR'); };
      const items = [];
      const textParts = [];
      if (extra.clientName) { items.push(`<li><strong>Cliente:</strong> ${extra.clientName}</li>`); textParts.push(`Cliente: ${extra.clientName}`); }
      if (extra.propertyName) { items.push(`<li><strong>Propriedade:</strong> ${extra.propertyName}</li>`); textParts.push(`Propriedade: ${extra.propertyName}`); }
      for (const f of fields) {
        const key = f[0], label = f[1], type = f[2];
        let val = data[key];
        if (val === undefined || val === null || val === '') continue;
        if (type === 'date') { val = fmtDate(val); if (!val) continue; }
        if (type === 'currency') { val = `R$ ${Number(val).toLocaleString('pt-BR')}`; }
        items.push(`<li><strong>${label}:</strong> ${val}</li>`);
        if (key !== 'description' && key !== 'notes') textParts.push(`${label}: ${val}`);
      }
      return { html: `<ul>${items.join('')}</ul>`, text: textParts.length ? ` | ${textParts.join(' · ')}` : '' };
    }
    const getConsultor = async (propertyId) => {
      if (!propertyId) return null;
      if (propConsultorCache[propertyId] !== undefined) return propConsultorCache[propertyId];
      try {
        const props = await base44.asServiceRole.entities.Property.filter({ id: propertyId });
        propConsultorCache[propertyId] = props[0]?.consultor_email || null;
        return propConsultorCache[propertyId];
      } catch (e) { return null; }
    };

    // ─── Monta lista de destinatários únicos sem repetição ───────────────
    const buildRecipients = (ownerEmail, consultorEmail, viewers) => {
      const seen = new Set();
      const list = [];
      for (const email of [ownerEmail, consultorEmail, ...viewers]) {
        if (email && !seen.has(email)) { seen.add(email); list.push(email); }
      }
      return list;
    };

    // ─── LICENSES ────────────────────────────────────────────────────────
    const licenses = await base44.asServiceRole.entities.License.list();
    for (const lic of licenses) {
      if (!lic.expiry_date || !lic.owner_email || lic.status === 'Vencida') continue;
      const days = getDays(lic.expiry_date);
      if (days === null) continue;
      const consultorEmail = await getConsultor(lic.property_id);
      const propertyName = await getPropertyName(lic.property_id);
      const ownerName = await getUserNameExpiry(lic.owner_email);
      const licLabel = `${lic.license_type}${lic.license_number ? ` nº ${lic.license_number}` : ''}`;
      const licCtx = buildCtx(lic, [['license_type','Tipo'],['license_number','Número'],['elaboration_stage','Fase'],['issue_date','Emissão','date'],['expiry_date','Validade','date'],['environmental_agency','Órgão'],['status','Status']], { clientName: ownerName, propertyName });

      if (days <= 0) {
        // Vencida
        const title = `Licença VENCIDA: ${lic.license_type}`;
        await notifyWithEmail(lic.owner_email, consultorEmail,
          title,
          `Licença ${licLabel} está VENCIDA há ${Math.abs(days)} dia(s)${licCtx.text}.`,
          'licenca_vencida', 'error', '/Licenses',
          `[PRUMO Hub] ⛔ ${title}`,
          `<p>Olá${ownerName ? `, ${ownerName}` : ''},</p><p>A licença <strong>${licLabel}</strong> está <strong>VENCIDA</strong> há ${Math.abs(days)} dia(s).</p>${licCtx.html}<p>Renove imediatamente para evitar penalidades.</p><p>Equipe PRUMO Hub</p>`
        );
      } else {
        const viewers = await getPropertyViewers(lic.property_id, 'licenca_vencendo');
        const recipients = buildRecipients(lic.owner_email, consultorEmail, viewers);

        for (const email of recipients) {
          const prefs = await getNotifPrefs(email, 'licenca_vencendo', [1, 7, 15, 30]);
          if (!prefs.days.includes(days)) continue;
          const title = `Licença vencendo em ${days} dia${days > 1 ? 's' : ''}`;
          await notifyPerPrefs(email, prefs, title,
            `Licença ${licLabel} vence em ${days} dia${days > 1 ? 's' : ''}${licCtx.text}.`,
            'licenca_vencendo', days <= 7 ? 'error' : 'warning', '/Licenses',
            `[PRUMO Hub] ⚠️ ${title}: ${lic.license_type}`,
            `<p>Olá${ownerName ? `, ${ownerName}` : ''},</p><p>A licença <strong>${licLabel}</strong> vencerá em <strong>${days} dia${days > 1 ? 's' : ''}</strong>.</p>${licCtx.html}<p>Providencie a renovação com antecedência.</p><p>Equipe PRUMO Hub</p>`
          );
        }

        // Alerta extra de protocolo de renovação
        if (lic.renewal_required && lic.renewal_days_before && days === Number(lic.renewal_days_before)) {
          const renewTitle = `Iniciar protocolo de renovação: ${lic.license_type} (${days} dias)`;
          const renewBody = `<p>Olá${ownerName ? `, ${ownerName}` : ''},</p><p>É hora de iniciar o protocolo de renovação da licença <strong>${licLabel}</strong>. Vencimento em <strong>${days} dias</strong>.</p>${licCtx.html}<p>Providencie a documentação com antecedência.</p><p>Equipe PRUMO Hub</p>`;
          for (const email of recipients) {
            const prefs = await getNotifPrefs(email, 'licenca_vencendo', [1, 7, 15, 30]);
            await notifyPerPrefs(email, prefs,
              renewTitle,
              `Iniciar protocolo de renovação da licença ${licLabel}. Vencimento em ${days} dias${licCtx.text}.`,
              'licenca_vencendo', 'warning', '/Licenses',
              `[PRUMO Hub] 🔄 ${renewTitle}`, renewBody
            );
          }
        }

        // Equipe do consultor (enterprise)
        if (consultorEmail) {
          const consultorData = await getUserData(consultorEmail);
          if ((consultorData?.plan || '').toLowerCase() === 'enterprise') {
            const teamEmails = await getTeamEmails(consultorEmail);
            for (const m of teamEmails) {
              if (recipients.includes(m)) continue;
              const prefs = await getNotifPrefs(m, 'licenca_vencendo', [1, 7, 15, 30]);
              if (!prefs.days.includes(days)) continue;
              await createNotif(m,
                `Licença vencendo em ${days} dia${days > 1 ? 's' : ''}`,
                `Licença ${licLabel} vence em ${days} dia${days > 1 ? 's' : ''}${licCtx.text}.`,
                'licenca_vencendo', days <= 7 ? 'error' : 'warning', '/Licenses'
              );
            }
          }
        }
      }
    }

    // ─── LICENSE CONDITIONS (condicionantes com prazo) ───────────────────
    for (const lic of licenses) {
      if (!lic.owner_email || !lic.conditions?.length) continue;
      const consultorEmail = await getConsultor(lic.property_id);
      const propertyName = await getPropertyName(lic.property_id);
      const ownerName = await getUserNameExpiry(lic.owner_email);
      const viewers = await getPropertyViewers(lic.property_id, 'condicionante_vencendo');
      const recipients = buildRecipients(lic.owner_email, consultorEmail, viewers);
      const licLabel = `${lic.license_type}${lic.license_number ? ` nº ${lic.license_number}` : ''}`;
      const licCtx = buildCtx(lic, [['license_type','Tipo'],['license_number','Número'],['elaboration_stage','Fase'],['issue_date','Emissão','date'],['expiry_date','Validade','date']], { clientName: ownerName, propertyName });

      for (const cond of lic.conditions) {
        if (typeof cond === 'string' || !cond?.due_date) continue;
        const days = getDays(cond.due_date);
        if (days === null) continue;
        const condText = cond.text || 'Condicionante';

        if (days <= 0) {
          await notifyWithEmail(lic.owner_email, consultorEmail,
            'Prazo de Condicionante Vencido',
            `Condicionante "${condText}" da ${licLabel} está VENCIDA${licCtx.text}.`,
            'condicionante_vencendo', 'error', '/Licenses',
            `[PRUMO Hub] ⛔ Condicionante VENCIDA: ${condText}`,
            `<p>Olá${ownerName ? `, ${ownerName}` : ''},</p><p>A condicionante <strong>"${condText}"</strong> da licença <strong>${licLabel}</strong> está <strong>VENCIDA</strong>.</p>${licCtx.html}<p>Equipe PRUMO Hub</p>`
          );
        } else {
          for (const email of recipients) {
            const prefs = await getNotifPrefs(email, 'condicionante_vencendo', [1, 7, 15, 30]);
            if (!prefs.days.includes(days)) continue;
            const title = `Condicionante vence em ${days} dia${days > 1 ? 's' : ''}`;
            await notifyPerPrefs(email, prefs, title,
              `"${condText}" (${licLabel}) vence em ${days} dia${days > 1 ? 's' : ''}${licCtx.text}.`,
              'condicionante_vencendo', days <= 7 ? 'error' : 'warning', '/Licenses',
              `[PRUMO Hub] ⚠️ Condicionante vencendo em ${days} dia${days > 1 ? 's' : ''}`,
              `<p>Olá${ownerName ? `, ${ownerName}` : ''},</p><p>A condicionante <strong>"${condText}"</strong> da licença <strong>${licLabel}</strong> vence em <strong>${days} dia${days > 1 ? 's' : ''}</strong>.</p>${licCtx.html}<p>Equipe PRUMO Hub</p>`
            );
          }
        }
      }
    }

    // ─── DOCUMENTS (expiry_date opcional) ────────────────────────────────
    const documents = await base44.asServiceRole.entities.Document.list();
    for (const doc of documents) {
      if (!doc.expiry_date || !doc.owner_email) continue;
      const days = getDays(doc.expiry_date);
      if (days === null || days < 0) continue;
      const propId = doc.entity_type === 'Property' ? doc.entity_id : null;
      const consultorEmail = await getConsultor(propId);
      const propertyName = await getPropertyName(propId);
      const ownerName = await getUserNameExpiry(doc.owner_email);
      const viewers = await getPropertyViewers(propId, 'documento_vencendo');
      const recipients = buildRecipients(doc.owner_email, consultorEmail, viewers);
      const docName = doc.document_name || doc.document_type || 'Documento';
      const docCtx = buildCtx(doc, [['document_type','Tipo'],['document_name','Nome'],['expiry_date','Validade','date']], { clientName: ownerName, propertyName });

      for (const email of recipients) {
        const prefs = await getNotifPrefs(email, 'documento_vencendo', [7, 30]);
        if (!prefs.days.includes(days)) continue;
        const title = `Documento vencendo em ${days} dia${days > 1 ? 's' : ''}`;
        await notifyPerPrefs(email, prefs, title,
          `"${docName}" vence em ${days} dia${days > 1 ? 's' : ''}${docCtx.text}.`,
          'documento_vencendo', days <= 7 ? 'error' : 'warning', '/Documents',
          `[PRUMO Hub] ⚠️ ${title}: ${docName}`,
          `<p>Olá${ownerName ? `, ${ownerName}` : ''},</p><p>O documento <strong>"${docName}"</strong> vencerá em <strong>${days} dia${days > 1 ? 's' : ''}</strong>.</p>${docCtx.html}<p>Verifique se é necessária a renovação.</p><p>Equipe PRUMO Hub</p>`
        );
      }
    }

    // ─── PROCESSES ───────────────────────────────────────────────────────
    const processes = await base44.asServiceRole.entities.Process.list();
    for (const proc of processes) {
      if (!proc.client_email || proc.status === 'Finalizado' || proc.status === 'Arquivado') continue;
      const consultorEmail = await getConsultor(proc.property_id);
      const propertyName = await getPropertyName(proc.property_id);
      const clientName = await getUserNameExpiry(proc.client_email);
      const procCtx = buildCtx(proc, [['process_type','Tipo'],['process_number','Número'],['subject','Matéria'],['location','Local'],['filing_date','Propositura','date'],['status','Status']], { clientName, propertyName });
      for (const upd of (proc.updates || [])) {
        if (!upd.deadline) continue;
        const days = getDays(upd.deadline);
        if (days === null) continue;
        if (days <= 0) {
          await notifyWithEmail(proc.client_email, consultorEmail,
            'Prazo de Processo Vencido',
            `Processo ${proc.process_number}: prazo de etapa vencido${procCtx.text}.`,
            'atualizacao_processo', 'error', '/Processes',
            `[PRUMO Hub] ⛔ Prazo Vencido — Processo ${proc.process_number}`,
            `<p>Olá${clientName ? `, ${clientName}` : ''},</p><p>Um prazo do processo <strong>${proc.process_number}</strong> está <strong>vencido</strong>.</p>${procCtx.html}<p>Acesse a plataforma para detalhes.</p><p>Equipe PRUMO Hub</p>`
          );
        } else if ([1, 7].includes(days)) {
          await notifyWithEmail(proc.client_email, consultorEmail,
            `Prazo de Processo em ${days} dia${days > 1 ? 's' : ''}`,
            `Processo ${proc.process_number}: prazo em ${days} dia${days > 1 ? 's' : ''}${procCtx.text}.`,
            'atualizacao_processo', 'warning', '/Processes',
            `[PRUMO Hub] ⚠️ Prazo de Processo em ${days} dia${days > 1 ? 's' : ''}`,
            `<p>Olá${clientName ? `, ${clientName}` : ''},</p><p>O processo <strong>${proc.process_number}</strong> possui um prazo que vence em <strong>${days} dia${days > 1 ? 's' : ''}</strong>.</p>${procCtx.html}<p>Equipe PRUMO Hub</p>`
          );
        }
      }
    }

    // ─── PRAD DEADLINES ──────────────────────────────────────────────────
    const prads = await base44.asServiceRole.entities.PRAD.list();
    for (const prad of prads) {
      if (!prad.owner_email || prad.status === 'Concluído') continue;
      if (prad.property_id) {
        try {
          await base44.asServiceRole.entities.Property.get(prad.property_id);
        } catch (e) {
          console.warn(`[Expiry] PRAD "${prad.project_name}" ignorado — propriedade ${prad.property_id} não encontrada.`);
          continue;
        }
      }
      const consultorEmail = await getConsultor(prad.property_id);
      const propertyName = await getPropertyName(prad.property_id);
      const ownerName = await getUserNameExpiry(prad.owner_email);
      const pradCtx = buildCtx(prad, [['project_name','Projeto'],['status','Status']], { clientName: ownerName, propertyName });
      for (const stage of (prad.execution_schedule || [])) {
        if (stage.status === 'Concluído' || !stage.deadline) continue;
        const days = getDays(stage.deadline);
        if (days === null) continue;
        if (days <= 0) {
          await notifyWithEmail(prad.owner_email, consultorEmail,
            `Etapa do PRAD Atrasada`,
            `"${prad.project_name}" – etapa "${stage.stage}" está atrasada${pradCtx.text}.`,
            'outro', 'error', '/PRAD',
            `[PRUMO Hub] ⛔ Etapa do PRAD Atrasada: ${prad.project_name}`,
            `<p>Olá${ownerName ? `, ${ownerName}` : ''},</p><p>A etapa <strong>"${stage.stage}"</strong> do PRAD <strong>"${prad.project_name}"</strong> está <strong>atrasada</strong>.</p>${pradCtx.html}<p>Equipe PRUMO Hub</p>`
          );
        } else if ([1, 7, 15].includes(days)) {
          await notifyWithTeam(prad.owner_email, consultorEmail,
            `Prazo do PRAD em ${days} dia${days > 1 ? 's' : ''}`,
            `"${prad.project_name}" – etapa "${stage.stage}" vence em ${days} dia${days > 1 ? 's' : ''}${pradCtx.text}.`,
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
      const propertyName = await getPropertyName(contract.property_id);
      const clientName = contract.client_name || await getUserNameExpiry(clientEmail);
      const contractCtx = buildCtx(contract, [['contract_type','Tipo'],['object','Objeto'],['start_date','Início','date'],['end_date','Vencimento','date'],['status','Status']], { clientName, propertyName });

      if (days <= 0) {
        await notifyWithEmail(clientEmail, consultorEmail,
          `Contrato Vencido: ${contract.contract_type}`,
          `Contrato "${contract.contract_type}" expirou${contractCtx.text}.`,
          'atualizacao_contrato', 'error', '/Contracts',
          `[PRUMO Hub] ⛔ Contrato Vencido: ${contract.contract_type}`,
          `<p>Olá${clientName ? `, ${clientName}` : ''},</p><p>O contrato <strong>${contract.contract_type}</strong> está <strong>vencido</strong>.</p>${contractCtx.html}<p>Verifique a necessidade de renovação.</p><p>Equipe PRUMO Hub</p>`
        );
      } else if ([7, 30].includes(days)) {
        await notifyWithEmail(clientEmail, consultorEmail,
          `Contrato vencendo em ${days} dia${days > 1 ? 's' : ''}`,
          `Contrato "${contract.contract_type}" vence em ${days} dia${days > 1 ? 's' : ''}${contractCtx.text}.`,
          'atualizacao_contrato', days <= 7 ? 'error' : 'warning', '/Contracts',
          `[PRUMO Hub] ⚠️ Contrato vencendo em ${days} dia${days > 1 ? 's' : ''}`,
          `<p>Olá${clientName ? `, ${clientName}` : ''},</p><p>O contrato <strong>${contract.contract_type}</strong> vencerá em <strong>${days} dia${days > 1 ? 's' : ''}</strong>.</p>${contractCtx.html}<p>Equipe PRUMO Hub</p>`
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
      const propertyName = await getPropertyName(crm.property_id);
      const clientName = crm.client_name || await getUserNameExpiry(crm.client_email);
      const crmCtx = buildCtx(crm, [['client_name','Cliente']], { clientName, propertyName });

      for (const task of tasks) {
        let t = { ...task };
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
              `Tarefa "${t.title}" do cliente "${crm.client_name || 'N/A'}" está VENCIDA${crmCtx.text}.`,
              'task_overdue', 'error', '/ConsultorClients');
            await sendEmail(responsible,
              `[PRUMO Hub] ⚠️ Tarefa Vencida: ${t.title}`,
              `<p>Olá,</p><p>A tarefa <strong>"${t.title}"</strong> do cliente <strong>${crm.client_name || 'N/A'}</strong> está <strong>vencida</strong>.</p>${crmCtx.html}<p>Acesse o CRM para atualizar o status.</p><p>Equipe PRUMO Hub</p>`
            );
          }
          const plan = (consultorData?.plan || '').toLowerCase();
          if (['enterprise'].includes(plan)) {
            const team = await getTeamEmails(crm.consultor_email);
            for (const memberEmail of team) {
              if (memberEmail === responsible) continue;
              await createNotif(memberEmail, '⚠️ Tarefa de CRM Vencida',
                `Tarefa "${t.title}" do cliente "${crm.client_name || 'N/A'}" está VENCIDA (resp: ${responsible})${crmCtx.text}.`,
                'task_overdue', 'error', '/ConsultorClients');
            }
          }
        } else if ([1, 3].includes(days)) {
          if (await shouldNotify(responsible, crm.consultor_email)) {
            await createNotif(responsible,
              `Tarefa vence em ${days} dia${days > 1 ? 's' : ''}`,
              `"${t.title}" — cliente "${crm.client_name || 'N/A'}" vence em ${days} dia${days > 1 ? 's' : ''}${crmCtx.text}.`,
              'task_due_soon', days === 1 ? 'warning' : 'info', '/ConsultorClients');
            if (days === 1) {
              await sendEmail(responsible,
                `[PRUMO Hub] Tarefa vence amanhã: ${t.title}`,
                `<p>Olá,</p><p>A tarefa <strong>"${t.title}"</strong> do cliente <strong>${crm.client_name || 'N/A'}</strong> vence <strong>amanhã</strong>.</p>${crmCtx.html}<p>Equipe PRUMO Hub</p>`
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
      const propertyName = await getPropertyName(geo.property_id);
      const ownerName = await getUserNameExpiry(geo.owner_email);
      const geoCtx = buildCtx(geo, [['status','Status'],['sigef_status','SIGEF'],['municipality','Município'],['state','UF']], { clientName: ownerName, propertyName });
      await notifyWithTeam(geo.owner_email, consultorEmail,
        'Georreferenciamento Irregular',
        `Há uma irregularidade no georreferenciamento da propriedade${geoCtx.text}.`,
        'outro', 'error', '/Georeferencing');
    }

    console.log(`[Expiry] Concluído. Push: ${totalPush} | Email: ${totalEmail} | SMS: 0`);
    return Response.json({ success: true, notifications_push: totalPush, notifications_email: totalEmail, sms: 0 });

  } catch (error) {
    console.error('[Expiry] Erro:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});