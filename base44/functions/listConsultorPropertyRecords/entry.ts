import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * listConsultorPropertyRecords — Retorna registros de qualquer entidade
 * vinculada às propriedades do consultor efetivo (bypass de RLS para equipe).
 *
 * Necessário porque a RLS de License, Process, UnifiedDocument, etc. exige
 * owner_email === user.email ou property_id in user.properties_ids,
 * bloqueando membros de equipe cujo email e properties_ids diferem do consultor principal.
 *
 * Body:
 *   - entity_name: nome da entidade (ex: "License", "Process", "UnifiedDocument")
 *   - field_name: campo de vínculo com property (default: "property_id")
 *   - email_field: campo de email adicional para buscar (ex: "uploaded_by", "owner_email")
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { entity_name, field_name = 'property_id', email_field = null } = body;

    if (!entity_name) {
      return Response.json({ error: 'entity_name é obrigatório' }, { status: 400 });
    }

    const entity = base44.asServiceRole.entities[entity_name];
    if (!entity) {
      return Response.json({ error: `Entidade '${entity_name}' não encontrada` }, { status: 400 });
    }

    // Admin: retorna todos os registros
    if (user.role === 'admin') {
      const records = await entity.list('-created_date', 1000);
      return Response.json({ records: records || [], consultorEmail: user.email, propertyIds: [] });
    }

    // Resolve effective consultant email
    let consultorEmail = user.email;
    let isEquipe = false;

    const memberships = await base44.asServiceRole.entities.TeamMember.filter({
      member_email: user.email,
      status: 'Ativo',
    });
    if (memberships.length > 0) {
      consultorEmail = memberships[0].primary_user_email;
      isEquipe = true;
    }

    // Get all property IDs for the consultant
    const emailsToSearch = isEquipe ? [consultorEmail, user.email] : [consultorEmail];
    const propPromises = emailsToSearch.map(email =>
      base44.asServiceRole.entities.Property.filter({ consultor_email: email })
    );
    const propResults = await Promise.all(propPromises);
    const propertyIds = [];
    const propSeen = new Set();
    for (const list of propResults) {
      for (const item of (list || [])) {
        if (!propSeen.has(item.id)) { propSeen.add(item.id); propertyIds.push(item.id); }
      }
    }

    // Query by property IDs using $in (single query)
    let records = [];
    if (propertyIds.length > 0) {
      try {
        records = await entity.filter({ [field_name]: { $in: propertyIds } });
      } catch {
        // Fallback: parallel queries per property
        const byProperty = await Promise.all(
          propertyIds.map(id => entity.filter({ [field_name]: id }))
        );
        records = byProperty.flat();
      }
    }

    // Also query by email field if provided
    if (email_field) {
      const byEmail = await Promise.all(
        emailsToSearch.map(e => entity.filter({ [email_field]: e }))
      );
      records = [...records, ...byEmail.flat()];
    }

    // Deduplicate by id
    const seen = new Set();
    const deduped = [];
    for (const r of (records || [])) {
      if (!seen.has(r.id)) { seen.add(r.id); deduped.push(r); }
    }

    return Response.json({ records: deduped, consultorEmail, propertyIds });
  } catch (error) {
    console.error('[listConsultorPropertyRecords] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});