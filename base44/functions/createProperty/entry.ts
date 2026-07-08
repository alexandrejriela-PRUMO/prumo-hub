import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * createProperty — Cria uma Property usando service role.
 *
 * Necessário porque a RLS da entidade Property exige owner_email ou consultor_email
 * iguais a user.email, o que bloqueia membros de equipe (equipe_consultor) cujo email
 * difere do consultor principal.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

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

    // Validações
    const propertyName = body.property_name?.trim();
    if (!propertyName) {
      return Response.json({ error: 'Nome da propriedade é obrigatório.' }, { status: 400 });
    }

    // Montar objeto — espelha o schema da entidade Property
    const data: Record<string, any> = {
      property_name: propertyName,
      owner_email: body.owner_email || consultorEmail,
      consultor_email: consultorEmail,
      property_type: body.property_type || 'rural',
      is_client_only: body.is_client_only || false,
      owner_names: body.owner_names || undefined,
      owner_names_list: body.owner_names_list || undefined,
      owner_cpf: body.owner_cpf || undefined,
      owner_cnpj: body.owner_cnpj || undefined,
      car_number: body.car_number || undefined,
      car_numbers: body.car_numbers || [],
      iptu_number: body.iptu_number || undefined,
      registration_numbers: body.registration_numbers || undefined,
      contact_phone: body.contact_phone || undefined,
      contact_email: body.contact_email || undefined,
      fiscal_address: body.fiscal_address || undefined,
      location: body.location || undefined,
      city: body.city || undefined,
      state: body.state || undefined,
      coordinates: body.coordinates || undefined,
      boundaries: body.boundaries || undefined,
      kml_layers: body.kml_layers || [],
      neighbors: body.neighbors || undefined,
      rural_extra: body.rural_extra || undefined,
      total_hectares: body.total_hectares || undefined,
      app_hectares: body.app_hectares || undefined,
      legal_reserve_hectares: body.legal_reserve_hectares || undefined,
      total_area_m2: body.total_area_m2 || undefined,
      built_area_m2: body.built_area_m2 || undefined,
      activities: body.activities || undefined,
      main_activity: body.main_activity || undefined,
      authorized_users: body.authorized_users || undefined,
      client_name: body.client_name || undefined,
      client_contact: body.client_contact || undefined,
    };

    // Remover campos undefined
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

    const created = await base44.asServiceRole.entities.Property.create(data);
    return Response.json(created);
  } catch (error) {
    console.error('[createProperty] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});