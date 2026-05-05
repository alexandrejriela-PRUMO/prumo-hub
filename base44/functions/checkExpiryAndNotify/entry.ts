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

    const getConsultorEmail = async (propertyId) => {
      if (!propertyId) return null;
      try {
        const props = await base44.asServiceRole.entities.Property.filter({ id: propertyId });
        return props[0]?.consultor_email || null;
      } catch (e) { return null; }
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

      if (daysLeft <= 0) {
        await notifyWithTeam(license.owner_email, consultorEmail,
          `⛔ Licença ${license.license_type} VENCIDA`,
          `A licença nº ${license.license_number || 'N/A'} expirou há ${Math.abs(daysLeft)} dia(s).`,
          'licenca_vencida', 'error', '/Licenses');
        // Email via asServiceRole (corrigido)
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'PRUMO Hub',
          to: license.owner_email,
          subject: `⛔ URGENTE: Licença ${license.license_type} VENCIDA`,
          body: `Olá,\n\nSua licença ambiental ${license.license_type} nº ${license.license_number || 'N/A'} já VENCEU há ${Math.abs(daysLeft)} dias.\n\nRenove imediatamente.\n\nAtenciosamente,\nPRUMO Hub`
        });
        if (consultorEmail && consultorEmail !== license.owner_email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'PRUMO Hub',
            to: consultorEmail,
            subject: `⛔ Licença de Cliente VENCIDA: ${license.license_type}`,
            body: `Olá,\n\nA licença ${license.license_type} nº ${license.license_number || 'N/A'} de um cliente seu está VENCIDA há ${Math.abs(daysLeft)} dia(s).\n\nVerifique a plataforma.\n\nAtenciosamente,\nPRUMO Hub`
          });
        }
      } else if ([1, 7, 15, 30].includes(daysLeft)) {
        await notifyWithTeam(license.owner_email, consultorEmail,
          `⚠️ Licença ${license.license_type} vencendo em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`,
          `A licença nº ${license.license_number || 'N/A'} vencerá em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}.`,
          'licenca_vencendo', daysLeft <= 7 ? 'error' : 'warning', '/Licenses');
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'PRUMO Hub',
          to: license.owner_email,
          subject: `⚠️ Alerta: Licença ${license.license_type} vencendo em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`,
          body: `Olá,\n\nSua licença ambiental ${license.license_type} nº ${license.license_number || 'N/A'} vencerá em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}.\n\nTome as medidas necessárias para renovação.\n\nAtenciosamente,\nPRUMO Hub`
        });
        if (consultorEmail && consultorEmail !== license.owner_email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'PRUMO Hub',
            to: consultorEmail,
            subject: `⚠️ Licença de Cliente vencendo em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`,
            body: `Olá,\n\nA licença ${license.license_type} nº ${license.license_number || 'N/A'} de um cliente seu vencerá em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}.\n\nVerifique a plataforma.\n\nAtenciosamente,\nPRUMO Hub`
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
      for (const stage of schedule) {
        if (stage.status === 'Concluído' || !stage.deadline) continue;
        const daysLeft = getDays(stage.deadline);
        if (daysLeft === null) continue;
        if (daysLeft <= 7) {
          const severity = daysLeft <= 0 ? 'error' : daysLeft <= 3 ? 'warning' : 'info';
          const title = `PRAD: Etapa "${stage.stage}" ${daysLeft <= 0 ? 'ATRASADA' : `vencendo em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`}`;
          await notifyWithTeam(prad.owner_email, consultorEmail, title,
            `"${prad.project_name}" — etapa vence em ${daysLeft <= 0 ? 'prazo vencido' : daysLeft + ' dias'}.`,
            'outro', severity, '/PRAD');
          if (daysLeft <= 3) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: 'PRUMO Hub',
              to: prad.owner_email,
              subject: title,
              body: `Olá,\n\nA etapa "${stage.stage}" do PRAD "${prad.project_name}" ${daysLeft <= 0 ? 'já venceu há ' + Math.abs(daysLeft) + ' dias' : 'vence em ' + daysLeft + ' dias'}.\n\nPor favor, verifique o status.\n\nAtenciosamente,\nPRUMO Hub`
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
            `Relatório anual (Ano ${report.year}) do PRAD "${prad.project_name}" ${daysLeft <= 0 ? 'está atrasado' : `vence em ${daysLeft} dias`}.`,
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
        await createNotifSafe(cert.applicant_email,
          `Certificação ${cert.certification_type} vencendo em ${daysLeft} dias`,
          `Sua certificação "${cert.certification_type}" vencerá em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}.`,
          'documento_vencendo', daysLeft <= 7 ? 'error' : 'warning', '/Certifications');
        if (daysLeft <= 7) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'PRUMO Hub',
            to: cert.applicant_email,
            subject: `⚠️ Certificação ${cert.certification_type} vencendo em ${daysLeft} dias`,
            body: `Olá,\n\nSua certificação "${cert.certification_type}" vencerá em ${daysLeft} dias.\n\nTome as medidas necessárias para renovação.\n\nAtenciosamente,\nPRUMO Hub`
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