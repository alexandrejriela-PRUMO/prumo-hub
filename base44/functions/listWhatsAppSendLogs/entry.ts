import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * listWhatsAppSendLogs — Retorna o histórico de envios (WhatsAppSendLog) do
 * consultor efetivo, usado pela Central de Mensagens.
 *
 * Necessário porque a RLS de WhatsAppSendLog exige consultor_email === user.email,
 * o que bloqueia membros de equipe (equipe_consultor) cujo email difere do
 * consultor principal — mesmo padrão de listConsultorBudgets.
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

    // Busca por ambos os emails (consultor principal + membro da equipe) para dados históricos
    const emailsToSearch = isEquipe ? [consultorEmail, user.email] : [consultorEmail];

    const results = await Promise.all(
      emailsToSearch.map(email =>
        base44.asServiceRole.entities.WhatsAppSendLog.filter({ consultor_email: email }, '-sent_at', 500)
      )
    );

    const logs = [];
    const seen = new Set();
    for (const list of results) {
      for (const item of (list || [])) {
        if (!seen.has(item.id)) { seen.add(item.id); logs.push(item); }
      }
    }
    logs.sort((a, b) => new Date(b.sent_at || b.created_date) - new Date(a.sent_at || a.created_date));

    return Response.json({ logs });
  } catch (error) {
    console.error('[listWhatsAppSendLogs] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
