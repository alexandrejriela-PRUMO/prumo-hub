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
 * Otimização: busca por owner_email (poucos) em vez de property_id (muitos)
 * sempre que possível, reduzindo drasticamente o número de queries paralelas.
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

    // Coletar owner_emails únicos (para busca por email — muito menos queries)
    const ownerEmails = [...new Set(
      properties.map(p => p.owner_email).filter(Boolean)
    )];

    // Buscar entidades que têm owner_email/client_email por email (otimizado)
    // e entidades que só têm property_id por property_id
    const emailQueries = ownerEmails.flatMap(email => [
      base44.asServiceRole.entities.License.filter({ owner_email: email }),
      base44.asServiceRole.entities.Document.filter({ owner_email: email }),
      base44.asServiceRole.entities.Process.filter({ client_email: email }),
      base44.asServiceRole.entities.PRAD.filter({ owner_email: email }),
    ]);

    // EnvironmentalAlert e Georeferencing só têm property_id
    const propertyQueries = propertyIds.flatMap(pid => [
      base44.asServiceRole.entities.EnvironmentalAlert.filter({ property_id: pid }),
      base44.asServiceRole.entities.Georeferencing.filter({ property_id: pid }),
      base44.asServiceRole.entities.UnifiedDocument.filter({ entity_id: pid }),
    ]);

    const allQueries = [...emailQueries, ...propertyQueries];
    const results = await Promise.all(allQueries);

    // Dividir resultados de volta nas categorias
    const nEmails = ownerEmails.length;
    let idx = 0;

    const licenseResults = results.slice(idx, idx + nEmails); idx += nEmails;
    const docResults = results.slice(idx, idx + nEmails); idx += nEmails;
    const procResults = results.slice(idx, idx + nEmails); idx += nEmails;
    const pradResults = results.slice(idx, idx + nEmails); idx += nEmails;

    const alertResults = results.slice(idx, idx + propertyIds.length); idx += propertyIds.length;
    const geoResults = results.slice(idx, idx + propertyIds.length); idx += propertyIds.length;
    const unifiedDocResults = results.slice(idx, idx + propertyIds.length); idx += propertyIds.length;

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