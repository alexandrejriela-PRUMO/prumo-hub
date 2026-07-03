/**
 * checkConditionDueDates — Varredura diária de condicionantes de licença com prazo próximo.
 *
 * v2 — Corrigido event_type ('condicionante_vencendo'), preferências por destinatário,
 *       inclusão de consultor e visualizadores da propriedade.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // ─── Cache por execução ───────────────────────────────────────────────
    const propConsultorCache = {};
    const propViewersCache   = {};
    const notifPrefsCache    = {};

    const propDataCache = {};
    const userCache = {};
    // ─── Busca consultor da propriedade ──────────────────────────────────
    const getConsultor = async (propertyId) => {
      if (!propertyId) return null;
      if (propConsultorCache[propertyId] !== undefined) return propConsultorCache[propertyId];
      try {
        const props = await base44.asServiceRole.entities.Property.filter({ id: propertyId });
        propConsultorCache[propertyId] = props[0]?.consultor_email || null;
        return propConsultorCache[propertyId];
      } catch { return null; }
    };
    const getPropertyName = async (propertyId) => {
      if (!propertyId) return null;
      if (propDataCache[propertyId] !== undefined) return propDataCache[propertyId];
      try {
        const props = await base44.asServiceRole.entities.Property.filter({ id: propertyId });
        propDataCache[propertyId] = props[0]?.property_name || props[0]?.name || null;
        return propDataCache[propertyId];
      } catch { return null; }
    };
    const getUserName = async (email) => {
      if (!email) return null;
      if (userCache[email] !== undefined) return userCache[email];
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        userCache[email] = users[0]?.full_name || null;
        return userCache[email];
      } catch { return null; }
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
        items.push(`<li><strong>${label}:</strong> ${val}</li>`);
        if (key !== 'description' && key !== 'notes') textParts.push(`${label}: ${val}`);
      }
      return { html: `<ul>${items.join('')}</ul>`, text: textParts.length ? ` | ${textParts.join(' · ')}` : '' };
    }

    // ─── Visualizadores com notificação 'condicionante_vencendo' ─────────
    const getPropertyViewers = async (propertyId) => {
      if (!propertyId) return [];
      if (propViewersCache[propertyId] !== undefined) return propViewersCache[propertyId];
      try {
        const props = await base44.asServiceRole.entities.Property.filter({ id: propertyId });
        const prop = props[0];
        if (!prop?.authorized_users) { propViewersCache[propertyId] = []; return []; }
        let users = prop.authorized_users;
        if (typeof users === 'string') { try { users = JSON.parse(users); } catch { users = []; } }
        const viewers = (users || [])
          .filter(u => u.role === 'Visualizador' && u.notification_settings?.condicionante_vencendo === true)
          .map(u => u.email)
          .filter(Boolean);
        propViewersCache[propertyId] = viewers;
        return viewers;
      } catch { propViewersCache[propertyId] = []; return []; }
    };

    // ─── Preferências por destinatário ────────────────────────────────────
    // defaultDays usado quando não há preferência cadastrada.
    const getNotifPrefs = async (email, defaultDays) => {
      if (notifPrefsCache[email] !== undefined) return notifPrefsCache[email];
      try {
        const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
          user_email: email, event_type: 'condicionante_vencendo'
        });
        const pref = prefs[0];
        let days = defaultDays;
        if (pref?.days_before) { try { days = JSON.parse(pref.days_before); } catch {} }
        const result = {
          days,
          push:     pref ? (pref.push_enabled  !== false) : true,
          email:    pref ? (pref.email_enabled  !== false) : true,
          whatsapp: pref ? (pref.sms_enabled    === true)  : false,
          phone:    pref?.phone_number || null,
        };
        notifPrefsCache[email] = result;
        return result;
      } catch {
        const result = { days: defaultDays, push: true, email: true, whatsapp: false, phone: null };
        notifPrefsCache[email] = result;
        return result;
      }
    };

    // ─── Deduplicação de push por entity+condition_index+dia ─────────────
    const alreadySentPush = async (ownerEmail, licenseId, conditionIndex) => {
      const recentNotifs = await base44.asServiceRole.entities.InAppNotification.filter(
        { user_email: ownerEmail, event_type: 'condicionante_vencendo' },
        '-created_date', 100
      );
      return recentNotifs.some(n =>
        n.metadata?.entity_id === licenseId &&
        n.metadata?.condition_index === conditionIndex &&
        n.metadata?.checked_date === todayStr
      );
    };

    // ─── Cria notificação push (com dedup) ───────────────────────────────
    const createNotif = async (email, licenseId, conditionIndex, propertyId, title, body, severity, link) => {
      try {
        const recent = await base44.asServiceRole.entities.InAppNotification.filter(
          { user_email: email, event_type: 'condicionante_vencendo' }, '-created_date', 100
        );
        const alreadySent = recent.some(n =>
          n.metadata?.entity_id === licenseId &&
          n.metadata?.condition_index === conditionIndex &&
          n.metadata?.checked_date === todayStr
        );
        if (alreadySent) return;
        await base44.asServiceRole.entities.InAppNotification.create({
          user_email: email,
          title,
          message: body,
          event_type: 'condicionante_vencendo',
          severity,
          read: false,
          link,
          metadata: {
            entity_name: 'License',
            entity_id: licenseId,
            condition_index: conditionIndex,
            property_id: propertyId,
            checked_date: todayStr,
            timestamp: now.toISOString(),
          }
        });
      } catch (e) {
        console.error(`[CondDue] Erro push ${email}:`, e.message);
      }
    };

    // ─── Envia email ─────────────────────────────────────────────────────
    const sendEmail = async (to, subject, htmlBody) => {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'PRUMO Hub', to, subject, body: htmlBody
        });
      } catch (e) {
        console.error(`[CondDue] Erro email ${to}:`, e.message);
      }
    };

    // ─── Coleta alertas ───────────────────────────────────────────────────
    const licenses = await base44.asServiceRole.entities.License.list('-updated_date', 1000);
    let notifsSent = 0;

    for (const license of licenses) {
      if (!license.conditions?.length || !license.owner_email) continue;

      const consultorEmail = await getConsultor(license.property_id);
      const propertyName   = await getPropertyName(license.property_id);
      const ownerName      = await getUserName(license.owner_email);
      const viewers        = await getPropertyViewers(license.property_id);
      const licCtx = buildCtx(license, [['license_type','Tipo'],['license_number','Número'],['elaboration_stage','Fase'],['issue_date','Emissão','date'],['expiry_date','Validade','date'],['environmental_agency','Órgão']], { clientName: ownerName, propertyName });

      // Destinatários únicos
      const seen = new Set();
      const recipients = [];
      for (const email of [license.owner_email, consultorEmail, ...viewers]) {
        if (email && !seen.has(email)) { seen.add(email); recipients.push(email); }
      }

      for (let i = 0; i < license.conditions.length; i++) {
        const cond = license.conditions[i];
        if (!cond?.due_date) continue;

        const dueDate      = new Date(cond.due_date);
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        // Janela de alerta: até 120 dias (cobre o máximo das prefs) ou vencido há até 1 ano
        if (daysUntilDue > 120 || daysUntilDue < -365) continue;

        const condText = cond.text || 'Condicionante';
        const licLabel = `${license.license_type}${license.license_number ? ` nº ${license.license_number}` : ''}`;

        let severity: string;
        let messageTitle: string;
        let messageBody: string;

        if (daysUntilDue < 0) {
          severity     = 'error';
          messageTitle = `Prazo de Condicionante Vencido`;
          messageBody  = `A condicionante "${condText}" (${licLabel}) teve prazo vencido há ${Math.abs(daysUntilDue)} dias${licCtx.text}.`;
        } else if (daysUntilDue === 0) {
          severity     = 'error';
          messageTitle = `Condicionante Vence Hoje`;
          messageBody  = `A condicionante "${condText}" (${licLabel}) vence hoje${licCtx.text}!`;
        } else if (daysUntilDue <= 7) {
          severity     = 'error';
          messageTitle = `Condicionante Vence em ${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}`;
          messageBody  = `A condicionante "${condText}" (${licLabel}) vence em ${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}${licCtx.text}.`;
        } else {
          severity     = 'warning';
          messageTitle = `Condicionante Próxima do Prazo`;
          messageBody  = `A condicionante "${condText}" (${licLabel}) vence em ${daysUntilDue} dias${licCtx.text}.`;
        }

        const link = `/Licenses?property_id=${license.property_id}`;

        for (const email of recipients) {
          const prefs = await getNotifPrefs(email, [1, 7, 15, 30]);

          // Vencidas: sempre notifica. A vencer: só se o dia está nas prefs
          const shouldFire = daysUntilDue <= 0 || prefs.days.includes(daysUntilDue);
          if (!shouldFire) continue;

          if (prefs.push) {
            await createNotif(email, license.id, i, license.property_id, messageTitle, messageBody, severity, link);
          }

          // Email: apenas para owner e consultor (não visualizadores), e só quando não vencido
          if (prefs.email && (email === license.owner_email || email === consultorEmail) && daysUntilDue >= 0) {
            const emailSubject = email === consultorEmail && email !== license.owner_email
              ? `[Equipe] ${messageTitle}`
              : messageTitle;
            await sendEmail(email, emailSubject, `
              <h2>${messageTitle}</h2>
              <p>${messageBody}</p>
              ${licCtx.html}
              <hr/>
              <p><strong>Condicionante:</strong> ${condText}</p>
              <p><strong>Data de Cumprimento:</strong> ${cond.due_date}</p>
              <hr/>
              <p><a href="https://prumo.app${link}">Ver Licença no Sistema</a></p>
            `);
          }

          notifsSent++;
        }
      }
    }

    return Response.json({
      success: true,
      licenses_checked: licenses.length,
      notifications_sent: notifsSent,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[CondDue] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});