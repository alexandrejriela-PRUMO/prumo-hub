/**
 * checkExpiryAndNotify — VERSÃO LEGADA (mantida por compatibilidade)
 * A lógica principal foi consolidada em checkExpiryNotifications (mais completa).
 * Esta versão foi corrigida para usar asServiceRole em todos os calls.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();

    // ─── Helpers ─────────────────────────────────────────────────────────
    const getDays = (dateStr) => {
      if (!dateStr) return null;
      return Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));
    };

    const propDataCache = {};
    const userNameCache = {};

    const getConsultorEmail = async (propertyId) => {
      if (!propertyId) return null;
      try {
        const props = await base44.asServiceRole.entities.Property.filter({ id: propertyId });
        return props[0]?.consultor_email || null;
      } catch (e) { return null; }
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
      if (userNameCache[email]) return userNameCache[email];
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        userNameCache[email] = users[0]?.full_name || null;
        return userNameCache[email];
      } catch { return null; }
    };

    const getTeamEmails = async (consultorEmail) => {
      if (!consultorEmail) return [];
      try {
        const team = await base44.asServiceRole.entities.TeamMember.filter({
          consultor_email: consultorEmail,
          status: 'Ativo'
        });
        return team.map(m => m.member_email).filter(Boolean);
      } catch (e) { return []; }
    };

    // Deduplicação por dia: evita recriar notificação deletada pelo usuário
    const todayStr = today.toISOString().split('T')[0];
    const createNotifSafe = async (userEmail, title, message, eventType, severity, link) => {
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
          metadata: { type: 'expiry_check_legacy', checked_at: today.toISOString(), checked_date: todayStr }
        });
      } catch (e) {
        console.error('[ExpiryLegacy] Erro notif:', e.message);
      }
    };

    const notifyWithTeam = async (ownerEmail, consultorEmail, title, message, eventType, severity, link) => {
      if (ownerEmail) await createNotifSafe(ownerEmail, title, message, eventType, severity, link);
      if (consultorEmail && consultorEmail !== ownerEmail) {
        await createNotifSafe(consultorEmail, title, message, eventType, severity, link);
        const teamEmails = await getTeamEmails(consultorEmail);
        for (const m of teamEmails) {
          if (m !== ownerEmail && m !== consultorEmail) {
            await createNotifSafe(m, title, message, eventType, severity, link);
          }
        }
      }
    };

    // ─── LICENSES ────────────────────────────────────────────────────────
    const licenses = await base44.asServiceRole.entities.License.list('-updated_date', 1000);
    for (const license of licenses) {
      if (!license.expiry_date || !license.owner_email || license.status === 'Vencida') continue;
      const daysLeft = getDays(license.expiry_date);
      if (daysLeft === null) continue;
      const consultorEmail = await getConsultorEmail(license.property_id);
      const propertyName = await getPropertyName(license.property_id);
      const ownerName = await getUserName(license.owner_email);
      const licNum = license.license_number || 'N/A';
      const ctxText = `${ownerName ? ` | Cliente: ${ownerName}` : ''}${propertyName ? ` | Propriedade: ${propertyName}` : ''} | Nº: ${licNum}`;
      const ctxHtml = `<ul>${ownerName ? `<li><strong>Cliente:</strong> ${ownerName}</li>` : ''}${propertyName ? `<li><strong>Propriedade:</strong> ${propertyName}</li>` : ''}<li><strong>Tipo:</strong> ${license.license_type}</li><li><strong>Número:</strong> ${licNum}</li><li><strong>Validade:</strong> ${new Date(license.expiry_date).toLocaleDateString('pt-BR')}</li></ul>`;

      if (daysLeft <= 0) {
        await notifyWithTeam(license.owner_email, consultorEmail,
          `⛔ Licença ${license.license_type} VENCIDA`,
          `A licença nº ${licNum} expirou há ${Math.abs(daysLeft)} dia(s)${ctxText}.`,
          'licenca_vencida', 'error', '/Licenses');
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'PRUMO Hub',
          to: license.owner_email,
          subject: `⛔ URGENTE: Licença ${license.license_type} VENCIDA`,
          body: `<p>Olá${ownerName ? `, ${ownerName}` : ''},</p><p>Sua licença ambiental <strong>${license.license_type} nº ${licNum}</strong> já <strong>VENCEU</strong> há ${Math.abs(daysLeft)} dia(s).</p>${ctxHtml}<p>Renove imediatamente.</p><p>Equipe PRUMO Hub</p>`
        });
        if (consultorEmail && consultorEmail !== license.owner_email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'PRUMO Hub',
            to: consultorEmail,
            subject: `⛔ Licença de Cliente VENCIDA: ${license.license_type}`,
            body: `<p>Olá,</p><p>A licença <strong>${license.license_type} nº ${licNum}</strong> de um cliente seu está <strong>VENCIDA</strong> há ${Math.abs(daysLeft)} dia(s).</p>${ctxHtml}<p>Verifique a plataforma.</p><p>Equipe PRUMO Hub</p>`
          });
        }
      } else if ([1, 7, 15, 30].includes(daysLeft)) {
        await notifyWithTeam(license.owner_email, consultorEmail,
          `⚠️ Licença ${license.license_type} vencendo em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`,
          `A licença nº ${licNum} vencerá em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}${ctxText}.`,
          'licenca_vencendo', daysLeft <= 7 ? 'error' : 'warning', '/Licenses');
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'PRUMO Hub',
          to: license.owner_email,
          subject: `⚠️ Alerta: Licença ${license.license_type} vencendo em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`,
          body: `<p>Olá${ownerName ? `, ${ownerName}` : ''},</p><p>Sua licença ambiental <strong>${license.license_type} nº ${licNum}</strong> vencerá em <strong>${daysLeft} dia${daysLeft > 1 ? 's' : ''}</strong>.</p>${ctxHtml}<p>Tome as medidas necessárias para renovação.</p><p>Equipe PRUMO Hub</p>`
        });
        if (consultorEmail && consultorEmail !== license.owner_email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'PRUMO Hub',
            to: consultorEmail,
            subject: `⚠️ Licença de Cliente vencendo em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`,
            body: `<p>Olá,</p><p>A licença <strong>${license.license_type} nº ${licNum}</strong> de um cliente seu vencerá em <strong>${daysLeft} dia${daysLeft > 1 ? 's' : ''}</strong>.</p>${ctxHtml}<p>Verifique a plataforma.</p><p>Equipe PRUMO Hub</p>`
          });
        }
      }
    }

    // ─── PRAD ────────────────────────────────────────────────────────────
    const prads = await base44.asServiceRole.entities.PRAD.list('-updated_date', 1000);
    for (const prad of prads) {
      // Ignorar PRADs órfãos (sem propriedade vinculada válida)
      if (prad.property_id) {
        try {
          await base44.asServiceRole.entities.Property.get(prad.property_id);
        } catch (e) {
          console.warn(`[ExpiryLegacy] PRAD "${prad.project_name}" ignorado — propriedade ${prad.property_id} não encontrada.`);
          continue;
        }
      }
      const schedule = prad.execution_schedule || [];
      const consultorEmail = await getConsultorEmail(prad.property_id);
      const propertyName = await getPropertyName(prad.property_id);
      const ownerName = await getUserName(prad.owner_email);
      const ctxText = `${ownerName ? ` | Cliente: ${ownerName}` : ''}${propertyName ? ` | Propriedade: ${propertyName}` : ''}`;
      const ctxHtml = `<ul>${ownerName ? `<li><strong>Cliente:</strong> ${ownerName}</li>` : ''}${propertyName ? `<li><strong>Propriedade:</strong> ${propertyName}</li>` : ''}<li><strong>Projeto:</strong> ${prad.project_name}</li></ul>`;
      for (const stage of schedule) {
        if (stage.status === 'Concluído' || !stage.deadline) continue;
        const daysLeft = getDays(stage.deadline);
        if (daysLeft === null) continue;
        if (daysLeft <= 7) {
          const severity = daysLeft <= 0 ? 'error' : daysLeft <= 3 ? 'warning' : 'info';
          const title = `PRAD: Etapa "${stage.stage}" ${daysLeft <= 0 ? 'ATRASADA' : `vencendo em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`}`;
          await notifyWithTeam(prad.owner_email, consultorEmail, title,
            `"${prad.project_name}" — etapa vence em ${daysLeft <= 0 ? 'prazo vencido' : daysLeft + ' dias'}${ctxText}.`,
            'outro', severity, '/PRAD');
          if (daysLeft <= 3) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: 'PRUMO Hub',
              to: prad.owner_email,
              subject: title,
              body: `<p>Olá${ownerName ? `, ${ownerName}` : ''},</p><p>A etapa <strong>"${stage.stage}"</strong> do PRAD <strong>"${prad.project_name}"</strong> ${daysLeft <= 0 ? 'já venceu há ' + Math.abs(daysLeft) + ' dias' : 'vence em ' + daysLeft + ' dias'}.</p>${ctxHtml}<p>Por favor, verifique o status.</p><p>Equipe PRUMO Hub</p>`
            });
          }
        }
      }
      // Relatórios anuais
      const reports = prad.annual_reports || [];
      for (const report of reports) {
        if (report.status === 'Entregue' || !report.delivery_date) continue;
        const daysLeft = getDays(report.delivery_date);
        if (daysLeft !== null && daysLeft <= 30) {
          await notifyWithTeam(prad.owner_email, consultorEmail,
            `PRAD: Relatório Anual Ano ${report.year} ${daysLeft <= 0 ? 'ATRASADO' : `vencendo em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`}`,
            `Relatório anual (Ano ${report.year}) do PRAD "${prad.project_name}" ${daysLeft <= 0 ? 'está atrasado' : `vence em ${daysLeft} dias`}${ctxText}.`,
            'outro', daysLeft <= 0 ? 'error' : 'warning', '/PRAD');
        }
      }
    }

    // ─── CERTIFICATIONS ──────────────────────────────────────────────────
    const certs = await base44.asServiceRole.entities.Certification.list('-updated_date', 1000);
    for (const cert of certs) {
      if (!cert.expiration_date || !cert.applicant_email) continue;
      const daysLeft = getDays(cert.expiration_date);
      if (daysLeft !== null && daysLeft <= 30 && daysLeft > 0) {
        const certName = await getUserName(cert.applicant_email);
        const ctxText = `${certName ? ` | Cliente: ${certName}` : ''}`;
        await createNotifSafe(cert.applicant_email,
          `Certificação ${cert.certification_type} vencendo em ${daysLeft} dias`,
          `Sua certificação "${cert.certification_type}" vencerá em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}${ctxText}.`,
          'documento_vencendo', daysLeft <= 7 ? 'error' : 'warning', '/Certifications');
        if (daysLeft <= 7) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'PRUMO Hub',
            to: cert.applicant_email,
            subject: `⚠️ Certificação ${cert.certification_type} vencendo em ${daysLeft} dias`,
            body: `<p>Olá${certName ? `, ${certName}` : ''},</p><p>Sua certificação <strong>"${cert.certification_type}"</strong> vencerá em <strong>${daysLeft} dia${daysLeft > 1 ? 's' : ''}</strong>.</p><ul>${certName ? `<li><strong>Cliente:</strong> ${certName}</li>` : ''}<li><strong>Certificação:</strong> ${cert.certification_type}</li><li><strong>Validade:</strong> ${new Date(cert.expiration_date).toLocaleDateString('pt-BR')}</li></ul><p>Tome as medidas necessárias para renovação.</p><p>Equipe PRUMO Hub</p>`
          });
        }
      }
    }

    return Response.json({ success: true, message: 'checkExpiryAndNotify (legacy) concluído com sucesso' });

  } catch (error) {
    console.error('[ExpiryLegacy] Erro:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});