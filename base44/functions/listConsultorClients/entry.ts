import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * listConsultorClients — Retorna todos os ClientCRM e Properties do consultor efetivo.
 *
 * Necessário porque a RLS de ClientCRM e Property exige consultor_email === user.email,
 * o que bloqueia membros de equipe (equipe_consultor) cujo email difere do consultor principal.
 *
 * A função resolve o email efetivo do consultor (próprio ou do principal via TeamMember)
 * e busca os registros via service role (bypass RLS).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Determinar o email efetivo do consultor
    let consultorEmail = user.email;

    if (user.role !== 'admin') {
      const memberships = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email,
        status: 'Ativo',
      });

      if (memberships.length > 0) {
        consultorEmail = memberships[0].primary_user_email;
      }
    }

    // Buscar ClientCRM e Properties em paralelo via service role
    const [crmList, properties] = await Promise.all([
      base44.asServiceRole.entities.ClientCRM.filter({ consultor_email: consultorEmail }),
      base44.asServiceRole.entities.Property.filter({ consultor_email: consultorEmail }),
    ]);

    return Response.json({
      crmList: crmList || [],
      properties: properties || [],
      consultorEmail,
    });
  } catch (error) {
    console.error('[listConsultorClients] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});