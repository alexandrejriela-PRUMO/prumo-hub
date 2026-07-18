import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * listConsultorReceipts — Retorna Receipt e WhatsAppSendLog (doc_type: 'receipt') do consultor efetivo.
 *
 * Necessário porque a RLS dessas entidades exige consultor_email === user.email,
 * o que bloqueia membros de equipe (equipe_consultor) cujo email difere do consultor principal.
 * Não existe um "ReceiptEmailLog" separado — o envio por email não é logado hoje.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Determinar o email efetivo do consultor
    let consultorEmail = user.email;
    let isEquipe = false;

    if (user.role !== 'admin') {
      const memberships = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email,
        status: 'Ativo',
      });

      if (memberships.length > 0) {
        consultorEmail = memberships[0].primary_user_email;
        isEquipe = true;
      }
    }

    // Buscar por ambos os emails (consultor principal + membro da equipe) para dados históricos
    const emailsToSearch = isEquipe ? [consultorEmail, user.email] : [consultorEmail];

    const [receiptResults, whatsappLogResults] = await Promise.all([
      Promise.all(emailsToSearch.map(email =>
        base44.asServiceRole.entities.Receipt.filter({ consultor_email: email }, '-created_date', 100)
      )),
      Promise.all(emailsToSearch.map(email =>
        base44.asServiceRole.entities.WhatsAppSendLog.filter({ consultor_email: email, doc_type: 'receipt' }, '-sent_at', 100)
      )),
    ]);

    const dedupe = (results) => {
      const items = [];
      const seen = new Set();
      for (const list of results) {
        for (const item of (list || [])) {
          if (!seen.has(item.id)) { seen.add(item.id); items.push(item); }
        }
      }
      return items;
    };

    return Response.json({
      receipts: dedupe(receiptResults),
      whatsappLogs: dedupe(whatsappLogResults),
      consultorEmail,
    });
  } catch (error) {
    console.error('[listConsultorReceipts] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
