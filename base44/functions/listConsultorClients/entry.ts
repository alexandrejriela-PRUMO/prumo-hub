import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * listConsultorClients — Retorna todos os ClientCRM e Properties do consultor efetivo.
 *
 * Necessário porque a RLS de ClientCRM e Property exige consultor_email === user.email,
 * o que bloqueia membros de equipe (equipe_consultor) cujo email difere do consultor principal.
 *
 * A função resolve o email efetivo do consultor (próprio ou do principal via TeamMember)
 * e busca os registros via service role (bypass RLS).
 *
 * IMPORTANTE: Busca também por registros criados com o email do próprio membro da equipe
 * (dados históricos anteriores à implementação das backend functions).
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

    // Emails para busca: consultor principal + email do próprio membro (dados históricos)
    const emailsToSearch = isEquipe
      ? [consultorEmail, user.email]
      : [consultorEmail];

    // Buscar ClientCRM e Properties para cada email, em paralelo
    const crmPromises = emailsToSearch.map(email =>
      base44.asServiceRole.entities.ClientCRM.filter({ consultor_email: email })
    );
    const propPromises = emailsToSearch.map(email =>
      base44.asServiceRole.entities.Property.filter({ consultor_email: email })
    );

    const [crmResults, propResults] = await Promise.all([
      Promise.all(crmPromises),
      Promise.all(propPromises),
    ]);

    // Achatar e deduplicar por ID
    const crmList = [];
    const crmSeen = new Set();
    for (const list of crmResults) {
      for (const item of (list || [])) {
        if (!crmSeen.has(item.id)) { crmSeen.add(item.id); crmList.push(item); }
      }
    }

    const properties = [];
    const propSeen = new Set();
    for (const list of propResults) {
      for (const item of (list || [])) {
        if (!propSeen.has(item.id)) { propSeen.add(item.id); properties.push(item); }
      }
    }

    return Response.json({
      crmList,
      properties,
      consultorEmail,
    });
  } catch (error) {
    console.error('[listConsultorClients] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});