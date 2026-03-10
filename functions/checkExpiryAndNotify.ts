import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ─── CHECK LICENSES ──────────────────────────────────────────────────
    const licenses = await base44.asServiceRole.entities.License.list('-updated_date', 1000);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const today = new Date();

    for (const license of licenses) {
      if (!license.expiry_date || license.status === 'Vencida') continue;
      
      const expiryDate = new Date(license.expiry_date);
      const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      if (daysLeft <= 30 && daysLeft > 0) {
        const notifKey = `license_expiring_${license.id}`;
        const existing = await base44.asServiceRole.entities.InAppNotification.filter({
          link: `/Licenses?id=${license.id}`,
          event_type: 'licenca_vencendo'
        });

        if (existing.length === 0) {
          await base44.asServiceRole.entities.InAppNotification.create({
            user_email: license.owner_email,
            title: `Licença ${license.license_type} vencendo em ${daysLeft} dias`,
            message: `A licença nº ${license.license_number || 'N/A'} vencerá em ${daysLeft} dias (${expiryDate.toLocaleDateString('pt-BR')})`,
            event_type: 'licenca_vencendo',
            severity: daysLeft <= 7 ? 'error' : 'warning',
            link: `/Licenses?id=${license.id}`,
            read: false,
            metadata: {
              license_id: license.id,
              days_left: daysLeft,
              type: 'expiry_alert'
            }
          });

          // Send email
          await base44.integrations.Core.SendEmail({
            to: license.owner_email,
            subject: `⚠️ Alerta: Licença ${license.license_type} vencendo em ${daysLeft} dias`,
            body: `Olá,\n\nSua licença ambiental ${license.license_type} nº ${license.license_number || 'N/A'} vencerá em ${daysLeft} dias (${expiryDate.toLocaleDateString('pt-BR')}).\n\nTome as medidas necessárias para renovação.\n\nAtenciosamente,\nPRUMO Hub`
          });
        }
      } else if (daysLeft <= 0) {
        const expired = await base44.asServiceRole.entities.InAppNotification.filter({
          link: `/Licenses?id=${license.id}`,
          event_type: 'licenca_vencida'
        });

        if (expired.length === 0) {
          await base44.asServiceRole.entities.InAppNotification.create({
            user_email: license.owner_email,
            title: `⛔ Licença ${license.license_type} VENCIDA`,
            message: `A licença nº ${license.license_number || 'N/A'} expirou em ${Math.abs(daysLeft)} dias atrás`,
            event_type: 'licenca_vencida',
            severity: 'error',
            link: `/Licenses?id=${license.id}`,
            read: false,
            metadata: {
              license_id: license.id,
              type: 'expired_alert'
            }
          });

          await base44.integrations.Core.SendEmail({
            to: license.owner_email,
            subject: `⛔ URGENTE: Licença ${license.license_type} VENCIDA`,
            body: `Olá,\n\nSua licença ambiental ${license.license_type} nº ${license.license_number || 'N/A'} já VENCEU há ${Math.abs(daysLeft)} dias.\n\nEsta é uma situação crítica. Renove imediatamente.\n\nAtenciosamente,\nPRUMO Hub`
          });
        }
      }
    }

    // ─── CHECK DOCUMENTS ────────────────────────────────────────────────
    const documents = await base44.asServiceRole.entities.Document.list('-updated_date', 1000);
    for (const doc of documents) {
      const versions = doc.versions || [];
      if (versions.length === 0) continue;

      const latest = versions[versions.length - 1];
      const uploadDate = new Date(latest.uploaded_date);
      const daysOld = Math.ceil((today - uploadDate) / (1000 * 60 * 60 * 24));

      if (daysOld > 180) {
        const notifKey = `document_old_${doc.id}`;
        const existing = await base44.asServiceRole.entities.InAppNotification.filter({
          link: `/DocumentsHub?id=${doc.id}`,
          event_type: 'documento_vencendo'
        });

        if (existing.length === 0) {
          await base44.asServiceRole.entities.InAppNotification.create({
            user_email: doc.owner_email,
            title: `Documento "${doc.document_name}" requer atualização`,
            message: `Este documento não foi atualizado há ${daysOld} dias. Considere revisar e atualizar.`,
            event_type: 'documento_vencendo',
            severity: 'warning',
            link: `/DocumentsHub?id=${doc.id}`,
            read: false
          });
        }
      }
    }

    // ─── CHECK PRAD MILESTONES ──────────────────────────────────────────
    const prads = await base44.asServiceRole.entities.PRAD.list('-updated_date', 1000);
    for (const prad of prads) {
      const schedule = prad.execution_schedule || [];
      for (const stage of schedule) {
        if (stage.status === 'Concluído') continue;

        const deadline = new Date(stage.deadline);
        const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

        if (daysLeft <= 7 && daysLeft > -1) {
          const notifKey = `prad_deadline_${prad.id}_${stage.stage}`;
          const existing = await base44.asServiceRole.entities.InAppNotification.filter({
            link: `/PRAD?id=${prad.id}`,
            event_type: 'outro'
          });

          if (existing.length === 0) {
            const severity = daysLeft <= 0 ? 'error' : daysLeft <= 3 ? 'warning' : 'info';
            await base44.asServiceRole.entities.InAppNotification.create({
              user_email: prad.owner_email,
              title: `PRAD: Etapa "${stage.stage}" ${daysLeft <= 0 ? 'ATRASADA' : 'vencendo'}`,
              message: `A etapa "${stage.stage}" do projeto "${prad.project_name}" ${daysLeft <= 0 ? 'já venceu' : `vence em ${daysLeft} dias`} (${deadline.toLocaleDateString('pt-BR')})`,
              event_type: 'outro',
              severity,
              link: `/PRAD?id=${prad.id}`,
              read: false,
              metadata: {
                prad_id: prad.id,
                stage: stage.stage,
                days_left: daysLeft,
                type: 'milestone_alert'
              }
            });

            if (daysLeft <= 0 || daysLeft <= 3) {
              await base44.integrations.Core.SendEmail({
                to: prad.owner_email,
                subject: `⚠️ PRAD: Etapa "${stage.stage}" ${daysLeft <= 0 ? 'ATRASADA' : 'vencendo'}`,
                body: `Olá,\n\nA etapa "${stage.stage}" do PRAD "${prad.project_name}" ${daysLeft <= 0 ? 'já venceu há ' + Math.abs(daysLeft) + ' dias' : 'vence em ' + daysLeft + ' dias'}.\n\nData: ${deadline.toLocaleDateString('pt-BR')}\n\nPor favor, verifique o status e tome as medidas necessárias.\n\nAtenciosamente,\nPRUMO Hub`
              });
            }
          }
        }
      }

      // Check annual reports
      const reports = prad.annual_reports || [];
      for (const report of reports) {
        if (report.status === 'Entregue') continue;
        if (!report.delivery_date) continue;

        const reportDeadline = new Date(report.delivery_date);
        const daysLeft = Math.ceil((reportDeadline - today) / (1000 * 60 * 60 * 24));

        if (daysLeft <= 30 && daysLeft > -1) {
          const existing = await base44.asServiceRole.entities.InAppNotification.filter({
            link: `/PRAD?id=${prad.id}`,
            event_type: 'outro'
          });

          if (existing.length === 0) {
            await base44.asServiceRole.entities.InAppNotification.create({
              user_email: prad.owner_email,
              title: `PRAD: Relatório Anual Ano ${report.year} ${daysLeft <= 0 ? 'ATRASADO' : 'vencendo'}`,
              message: `O relatório anual (Ano ${report.year}) do PRAD "${prad.project_name}" ${daysLeft <= 0 ? 'está atrasado' : `vence em ${daysLeft} dias`}`,
              event_type: 'outro',
              severity: daysLeft <= 0 ? 'error' : 'warning',
              link: `/PRAD?id=${prad.id}`,
              read: false
            });

            if (daysLeft <= 0 || daysLeft <= 7) {
              await base44.integrations.Core.SendEmail({
                to: prad.owner_email,
                subject: `⚠️ PRAD: Relatório Anual Ano ${report.year} ${daysLeft <= 0 ? 'ATRASADO' : 'vencendo'}`,
                body: `Olá,\n\nO relatório anual (Ano ${report.year}) do PRAD "${prad.project_name}" precisa ser entregue.\n\nData limite: ${reportDeadline.toLocaleDateString('pt-BR')}\n\nPor favor, finalize e envie o relatório.\n\nAtenciosamente,\nPRUMO Hub`
              });
            }
          }
        }
      }
    }

    // ─── CHECK CERTIFICATIONS ───────────────────────────────────────────
    const certs = await base44.asServiceRole.entities.Certification.list('-updated_date', 1000);
    for (const cert of certs) {
      if (!cert.expiration_date) continue;

      const expDate = new Date(cert.expiration_date);
      const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

      if (daysLeft <= 30 && daysLeft > -1) {
        const existing = await base44.asServiceRole.entities.InAppNotification.filter({
          link: `/Certifications`,
          event_type: 'documento_vencendo'
        });

        if (existing.length === 0) {
          await base44.asServiceRole.entities.InAppNotification.create({
            user_email: cert.applicant_email,
            title: `Certificação ${cert.certification_type} vencendo em ${daysLeft} dias`,
            message: `Sua certificação "${cert.certification_type}" vencerá em ${daysLeft} dias (${expDate.toLocaleDateString('pt-BR')})`,
            event_type: 'documento_vencendo',
            severity: daysLeft <= 7 ? 'error' : 'warning',
            link: `/Certifications`,
            read: false
          });

          if (daysLeft <= 7) {
            await base44.integrations.Core.SendEmail({
              to: cert.applicant_email,
              subject: `⚠️ Certificação ${cert.certification_type} vencendo em ${daysLeft} dias`,
              body: `Olá,\n\nSua certificação "${cert.certification_type}" vencerá em ${daysLeft} dias (${expDate.toLocaleDateString('pt-BR')}).\n\nTome as medidas necessárias para renovação.\n\nAtenciosamente,\nPRUMO Hub`
            });
          }
        }
      }
    }

    return Response.json({
      success: true,
      message: 'Verificação de prazos concluída com sucesso'
    });

  } catch (error) {
    console.error('Erro ao verificar prazos:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});