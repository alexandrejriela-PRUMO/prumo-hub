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

    // Buscar métricas por property_id (e também por owner_email para documentos/processos)
    const licensePromises = propertyIds.map(pid =>
      base44.asServiceRole.entities.License.filter({ property_id: pid })
    );
    const alertPromises = propertyIds.map(pid =>
      base44.asServiceRole.entities.EnvironmentalAlert.filter({ property_id: pid })
    );
    const docPromises = propertyIds.map(pid =>
      base44.asServiceRole.entities.Document.filter({ property_id: pid })
    );
    const unifiedDocPromises = propertyIds.map(pid =>
      base44.asServiceRole.entities.UnifiedDocument.filter({ entity_id: pid })
    );
    const procPromises = propertyIds.map(pid =>
      base44.asServiceRole.entities.Process.filter({ property_id: pid })
    );
    const pradPromises = propertyIds.map(pid =>
      base44.asServiceRole.entities.PRAD.filter({ property_id: pid })
    );
    const geoPromises = propertyIds.map(pid =>
      base44.asServiceRole.entities.Georeferencing.filter({ property_id: pid })
    );

    // Buscar também documentos/processos por owner_email (para registros sem property_id)
    const ownerEmails = properties.map(p => p.owner_email).filter(Boolean);
    const docByOwnerPromises = ownerEmails.map(email =>
      base44.asServiceRole.entities.Document.filter({ owner_email: email })
    );
    const procByOwnerPromises = ownerEmails.map(email =>
      base44.asServiceRole.entities.Process.filter({ client_email: email })
    );

    const [
      licenseResults, alertResults, docResults, unifiedDocResults,
      procResults, pradResults, geoResults, docByOwnerResults, procByOwnerResults
    ] = await Promise.all([
      Promise.all(licensePromises),
      Promise.all(alertPromises),
      Promise.all(docPromises),
      Promise.all(unifiedDocPromises),
      Promise.all(procPromises),
      Promise.all(pradPromises),
      Promise.all(geoPromises),
      Promise.all(docByOwnerPromises),
      Promise.all(procByOwnerPromises),
    ]);

    // Achatar e deduplicar por ID
    const dedup = (results, seen = new Set()) => {
      const out = [];
      for (const list of results) {
        for (const item of (list || [])) {
          if (!seen.has(item.id)) { seen.add(item.id); out.push(item); }
        }
      }
      return out;
    };

    return Response.json({
      licenses: dedup(licenseResults),
      alerts: dedup(alertResults),
      documents: dedup([...docResults, ...unifiedDocResults, ...docByOwnerResults]),
      processes: dedup([...procResults, ...procByOwnerResults]),
      prads: dedup(pradResults),
      georeferencing: dedup(geoResults),
      consultorEmail,
    });
  } catch (error) {
    console.error('[listConsultorDashboardMetrics] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});