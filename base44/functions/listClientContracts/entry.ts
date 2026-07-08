import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * listClientContracts — Retorna todos os ClientContract do consultor efetivo.
 *
 * Necessário porque a RLS de ClientContract exige consultor_email === user.email,
 * o que bloqueia membros de equipe (equipe_consultor) cujo email difere do consultor principal.
 *
 * A função resolve o email efetivo do consultor (próprio ou do principal via TeamMember)
 * e busca os registros via service role (bypass RLS). Aceita `propertyId` opcional
 * para restringir a busca a uma propriedade específica.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { propertyId } = body || {};

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

    const contractPromises = emailsToSearch.map(email => {
      const f = { consultor_email: email };
      if (propertyId) f.property_id = propertyId;
      return base44.asServiceRole.entities.ClientContract.filter(f);
    });

    const results = await Promise.all(contractPromises);

    // Achatar e deduplicar por ID
    const contracts = [];
    const seen = new Set();
    for (const list of results) {
      for (const item of (list || [])) {
        if (!seen.has(item.id)) { seen.add(item.id); contracts.push(item); }
      }
    }

    return Response.json({
      contracts,
      consultorEmail,
    });
  } catch (error) {
    console.error('[listClientContracts] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});