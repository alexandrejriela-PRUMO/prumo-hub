import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * listConsultorAgendaEvents — Retorna AgendaEvent do consultor efetivo.
 *
 * Necessário porque a RLS exige consultor_email === user.email (ou assigned_to_email
 * / created_by_id), o que bloqueia membros de equipe (equipe_consultor) cujo email
 * difere do consultor principal.
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

    const results = await Promise.all(
      emailsToSearch.map(email => base44.asServiceRole.entities.AgendaEvent.filter({ consultor_email: email }))
    );

    const events = [];
    const seen = new Set();
    for (const list of results) {
      for (const item of (list || [])) {
        if (!seen.has(item.id)) { seen.add(item.id); events.push(item); }
      }
    }

    return Response.json({ events, consultorEmail });
  } catch (error) {
    console.error('[listConsultorAgendaEvents] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
