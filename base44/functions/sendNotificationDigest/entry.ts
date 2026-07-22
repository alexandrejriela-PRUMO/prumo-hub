/**
 * sendNotificationDigest — Envia resumo diário/semanal de notificações por email.
 * Chamado por automação agendada (diária às 08h ou semanal às seg 08h).
 *
 * Lógica:
 * - Para cada usuário com notificações não lidas nas últimas 24h (diário) ou 7 dias (semanal),
 *   agrupa por categoria e envia um email de resumo.
 * - Respeita preferências do usuário (email_enabled por event_type).
 * - Não envia se o usuário não tiver nenhuma notificação nova.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Modo: 'daily' (padrão) ou 'weekly'
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'daily';
    const hoursBack = mode === 'weekly' ? 168 : 24;

    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    // Busca notificações não lidas recentes
    const allNotifs = await base44.asServiceRole.entities.InAppNotification.filter(
      { read: false }
    );

    // Filtra pelo período
    const recent = allNotifs.filter(n => n.created_date >= since);
    if (recent.length === 0) {
      console.log('[Digest] Nenhuma notificação recente para enviar');
      return Response.json({ success: true, sent: 0, message: 'Nenhuma notificação recente' });
    }

    // Agrupa por usuário
    const byUser = {};
    for (const notif of recent) {
      if (!notif.user_email) continue;
      if (!byUser[notif.user_email]) byUser[notif.user_email] = [];
      byUser[notif.user_email].push(notif);
    }

    // Categorias para o email
    const CATEGORY_LABELS = {
      licencas:   '📋 Licenças e Documentos',
      processos:  '⚖️ Processos',
      tarefas:    '✅ Tarefas',
      crm:        '👥 CRM e Clientes',
      contratos:  '📝 Contratos',
      agenda:     '📅 Agenda',
      financeiro: '💳 Financeiro',
      sistema:    '⚙️ Sistema / Alertas',
    };

    const EVENT_TO_CAT = {
      nova_licenca: 'licencas', atualizacao_licenca: 'licencas',
      licenca_vencendo: 'licencas', licenca_vencida: 'licencas', documento_vencendo: 'licencas',
      novo_processo: 'processos', atualizacao_processo: 'processos',
      task_overdue: 'tarefas', task_due_soon: 'tarefas',
      atualizacao_cliente_crm: 'crm', novo_cliente_crm: 'crm',
      novo_requerimento: 'crm', resposta_requerimento: 'crm',
      novo_contrato: 'contratos', atualizacao_contrato: 'contratos',
      nova_fatura: 'financeiro', fatura_vencendo: 'financeiro',
      novo_alerta_ambiental: 'sistema', alerta_resolvido: 'sistema', outro: 'sistema',
    };

    const SEVERITY_EMOJI = { error: '🔴', warning: '🟡', success: '🟢', info: '⚪' };

    function smartTruncate(text: string, maxLen: number) {
      if (!text || text.length <= maxLen) return text || '';
      const cut = text.slice(0, maxLen);
      const lastSpace = cut.lastIndexOf(' ');
      return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '...';
    }

    // Monta o texto do WhatsApp com a mesma estrutura do email (urgentes + por categoria),
    // reaproveitando as mesmas variáveis usadas para montar o corpo HTML do email.
    function buildWhatsAppDigestText(modeTitle, totalCount, urgentes, grouped, categoryLabels, severityEmoji) {
      let text = `*PRUMO Hub — ${modeTitle}*\n${totalCount} notificação${totalCount > 1 ? 'ões' : ''} pendente${totalCount > 1 ? 's' : ''}\n`;

      if (urgentes && urgentes.length > 0) {
        text += `\n🔴 *${urgentes.length} Alerta${urgentes.length > 1 ? 's' : ''} Urgente${urgentes.length > 1 ? 's' : ''}*\n`;
        urgentes.forEach(n => {
          text += `• *${n.title}* — ${smartTruncate(n.message, 200)}\n`;
        });
      }

      for (const [cat, catNotifs] of Object.entries(grouped || {})) {
        const label = categoryLabels?.[cat] || cat;
        text += `\n${label} (${catNotifs.length})\n`;
        catNotifs.forEach(n => {
          text += `${severityEmoji?.[n.severity] || '⚪'} *${n.title}*\n`;
          if (n.message) text += `   ${smartTruncate(n.message, 200)}\n`;
        });
      }

      text += `\nAcesse o app para mais detalhes: https://hub.prumo.site`;
      return text;
    }

    let emailsSent = 0;
    let whatsappsSent = 0;
    const periodLabel = mode === 'weekly' ? 'semanal' : 'diário';

    for (const [userEmail, notifs] of Object.entries(byUser)) {
      // Verifica preferências do usuário
      let prefs = {};
      try {
        const userPrefs = await base44.asServiceRole.entities.NotificationPreference.filter({ user_email: userEmail });
        userPrefs.forEach(p => { prefs[p.event_type] = p; });
      } catch (e) { /* sem preferências = usa padrão (enviar) */ }

      // Verifica se o usuário quer receber o resumo por email/whatsapp
      // usando a preferência dedicada 'resumo_diario' (não a de eventos gerais)
      const digestPref = prefs['resumo_diario'];
      const digestEmailEnabled = !digestPref || digestPref.email_enabled !== false;
      const digestWhatsappEnabled = !!(digestPref && digestPref.sms_enabled === true && digestPref.phone_number);

      if (!digestEmailEnabled && !digestWhatsappEnabled) continue;

      // Agrupa por categoria
      const grouped = {};
      for (const n of notifs) {
        const cat = EVENT_TO_CAT[n.event_type] || 'sistema';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(n);
      }

      // Separa urgentes
      const urgentes = notifs.filter(n => n.severity === 'error');

      // Monta o corpo do email
      const modeTitle = mode === 'weekly' ? 'Resumo Semanal' : 'Resumo Diário';
      const totalCount = notifs.length;

      let urgentBlock = '';
      if (urgentes.length > 0) {
        urgentBlock = `
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px;">
            <h3 style="margin:0 0 10px;color:#dc2626;font-size:15px;">🔴 ${urgentes.length} Alerta${urgentes.length > 1 ? 's' : ''} Urgente${urgentes.length > 1 ? 's' : ''}</h3>
            <ul style="margin:0;padding-left:20px;">
              ${urgentes.map(n => `<li style="margin-bottom:4px;color:#7f1d1d;font-size:13px;"><strong>${n.title}</strong> — ${smartTruncate(n.message, 280)}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      let categoryBlocks = '';
      for (const [cat, catNotifs] of Object.entries(grouped)) {
        const label = CATEGORY_LABELS[cat] || cat;
        categoryBlocks += `
          <div style="margin-bottom:16px;border-left:3px solid #059669;padding-left:12px;">
            <h4 style="margin:0 0 8px;color:#064e3b;font-size:13px;font-weight:600;">${label} (${catNotifs.length})</h4>
            <ul style="margin:0;padding-left:16px;">
              ${catNotifs.slice(0, 5).map(n => `
                <li style="margin-bottom:4px;font-size:12px;color:#374151;">
                  ${SEVERITY_EMOJI[n.severity] || '⚪'} <strong>${n.title}</strong>
                  ${n.message ? `<br><span style="color:#6b7280;font-size:11px;">${smartTruncate(n.message, 280)}</span>` : ''}
                </li>
              `).join('')}
              ${catNotifs.length > 5 ? `<li style="font-size:11px;color:#6b7280;">+ ${catNotifs.length - 5} mais...</li>` : ''}
            </ul>
          </div>
        `;
      }

      const emailBody = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
          <div style="background:linear-gradient(135deg,#064e3b,#065f46);padding:24px;border-radius:8px 8px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:20px;">PRUMO Hub — ${modeTitle}</h1>
            <p style="color:#a7f3d0;margin:4px 0 0;font-size:13px;">
              ${new Date().toLocaleDateString('pt-BR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>
          <div style="padding:24px;background:#f9fafb;border-radius:0 0 8px 8px;">
            <p style="color:#374151;font-size:14px;margin:0 0 16px;">
              Você tem <strong>${totalCount} notificação${totalCount > 1 ? 'ões' : ''}</strong> não lida${totalCount > 1 ? 's' : ''} acumulada${totalCount > 1 ? 's' : ''}.
            </p>
            ${urgentBlock}
            ${categoryBlocks}
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;">
              <a href="https://prumo.base44.app" style="background:#059669;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">
                Acessar PRUMO Hub
              </a>
            </div>
            <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">
              Você pode gerenciar suas preferências de notificação em <strong>Configurar Notificações</strong> dentro da plataforma.<br>
              Para cancelar este resumo, desative "Email" nas suas preferências.
            </p>
          </div>
        </div>
      `;

      if (digestEmailEnabled) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'PRUMO Hub',
            to: userEmail,
            subject: `[PRUMO Hub] ${modeTitle} — ${totalCount} notificação${totalCount > 1 ? 'ões' : ''} pendente${totalCount > 1 ? 's' : ''}`,
            body: emailBody
          });
          emailsSent++;
          console.log(`[Digest] Email ${periodLabel} → ${userEmail} (${totalCount} notifs)`);
        } catch (e) {
          console.error(`[Digest] Erro ao enviar para ${userEmail}:`, e.message);
        }
      }

      // WhatsApp: mesma estrutura detalhada do email (urgentes + por categoria)
      // Só dispara com opt-in explícito na preferência dedicada 'resumo_diario'
      if (digestWhatsappEnabled) {
        try {
          await fetch('https://n8n-2ud7.srv1837546.hstgr.cloud/webhook/prumo-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: digestPref.phone_number,
              message: buildWhatsAppDigestText(modeTitle, totalCount, urgentes, grouped, CATEGORY_LABELS, SEVERITY_EMOJI)
            })
          });
          whatsappsSent++;
          console.log(`[Digest] WhatsApp ${periodLabel} → ${digestPref.phone_number}`);
        } catch (e) {
          console.error(`[Digest] Erro ao enviar WhatsApp para ${userEmail}:`, e.message);
        }
      }
    }

    console.log(`[Digest] Concluído. Emails enviados: ${emailsSent} | WhatsApp enviados: ${whatsappsSent}`);
    return Response.json({ success: true, sent: emailsSent, whatsapp_sent: whatsappsSent, mode, period_hours: hoursBack });

  } catch (error) {
    console.error('[Digest] Erro:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});