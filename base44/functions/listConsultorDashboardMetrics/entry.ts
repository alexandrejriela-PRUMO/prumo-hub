import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * listConsultorDashboardMetrics — Retorna todas as métricas do dashboard
 * (licenses, alerts, documents, processes, prads, georeferencing) para as
 * propriedades do consultor efetivo.
 *
 * Necessário porque a RLS dessas entidades exige owner_email/responsible_email
 * === user.email, o que bloqueia membros de equipe (equipe_consultor) cujo email
 * difere do consultor principal.
 *
 * A função resolve o email efetivo do consultor (próprio ou do principal via
 * TeamMember) e busca os registros via service role (bypass RLS).
 *
 * IMPORTANTE: busca todas as entidades por property_id (não por owner_email/
 * client_email). O campo owner_email de License/Document/Process/PRAD nem
 * sempre reflete o email do produtor — em registros criados pelo próprio
 * consultor em nome do cliente, esse campo fica com o email do consultor.
 * property_id é o único vínculo confiável em todos os casos.
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

    // Buscar todas as propriedades do consultor
    const emailsToSearch = isEquipe
      ? [consultorEmail, user.email]
      : [consultorEmail];

    const propPromises = emailsToSearch.flatMap(email => [
      base44.asServiceRole.entities.Property.filter({ consultor_email: email }),
      base44.asServiceRole.entities.Property.filter({ owner_email: email }),
    ]);

    const propResults = await Promise.all(propPromises);

    // Deduplicar propriedades por ID
    const properties = [];
    const propSeen = new Set();
    for (const list of propResults) {
      for (const item of (list || [])) {
        if (!propSeen.has(item.id)) { propSeen.add(item.id); properties.push(item); }
      }
    }

    const propertyIds = properties.map(p => p.id);
    if (propertyIds.length === 0) {
      return Response.json({
        licenses: [],
        alerts: [],
        documents: [],
        processes: [],
        prads: [],
        georeferencing: [],
        consultorEmail,
      });
    }

    // Todas as entidades vinculadas às propriedades, buscadas por property_id
    // (vínculo confiável, independente de qual email foi gravado em owner_email/client_email)
    // Uma lista de promises por tipo de entidade (não intercalada) para não embaralhar os resultados.
    const [licenseResults, docResults, procResults, pradResults, alertResults, geoResults, unifiedDocResults] = await Promise.all([
      Promise.all(propertyIds.map(pid => base44.asServiceRole.entities.License.filter({ property_id: pid }))),
      Promise.all(propertyIds.map(pid => base44.asServiceRole.entities.Document.filter({ property_id: pid }))),
      Promise.all(propertyIds.map(pid => base44.asServiceRole.entities.Process.filter({ property_id: pid }))),
      Promise.all(propertyIds.map(pid => base44.asServiceRole.entities.PRAD.filter({ property_id: pid }))),
      Promise.all(propertyIds.map(pid => base44.asServiceRole.entities.EnvironmentalAlert.filter({ property_id: pid }))),
      Promise.all(propertyIds.map(pid => base44.asServiceRole.entities.Georeferencing.filter({ property_id: pid }))),
      Promise.all(propertyIds.map(pid => base44.asServiceRole.entities.UnifiedDocument.filter({ entity_id: pid }))),
    ]);

    // Achatar e deduplicar por ID
    const dedup = (resultsArr) => {
      const seen = new Set();
      const out = [];
      for (const list of resultsArr) {
        for (const item of (list || [])) {
          if (!seen.has(item.id)) { seen.add(item.id); out.push(item); }
        }
      }
      return out;
    };

    return Response.json({
      properties,
      licenses: dedup(licenseResults),
      alerts: dedup(alertResults),
      documents: dedup([...docResults, ...unifiedDocResults]),
      processes: dedup(procResults),
      prads: dedup(pradResults),
      georeferencing: dedup(geoResults),
      consultorEmail,
    });
  } catch (error) {
    console.error('[listConsultorDashboardMetrics] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});