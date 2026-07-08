import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * listConsultorRequests — Retorna Request do consultor efetivo.
 *
 * A entidade Request não possui campo consultor_email — é vinculada por
 * client_email (o solicitante). Para o consultor principal, client_email é o
 * próprio email do consultor; a RLS exige client_email === user.email, o que
 * bloqueia membros de equipe (equipe_consultor) de ver/gerenciar as
 * solicitações abertas em nome do consultor principal.
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
      emailsToSearch.map(email => base44.asServiceRole.entities.Request.filter({ client_email: email }, '-created_date'))
    );

    const requests = [];
    const seen = new Set();
    for (const list of results) {
      for (const item of (list || [])) {
        if (!seen.has(item.id)) { seen.add(item.id); requests.push(item); }
      }
    }

    return Response.json({ requests, consultorEmail });
  } catch (error) {
    console.error('[listConsultorRequests] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
