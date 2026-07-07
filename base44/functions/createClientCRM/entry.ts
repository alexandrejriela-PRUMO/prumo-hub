import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * createClientCRM — Cria um registro de ClientCRM usando service role.
 *
 * Necessário porque a RLS da entidade exige consultor_email === user.email,
 * o que bloqueia membros de equipe (equipe_consultor) que criam clientes
 * em nome do consultor principal (cujo email difere do email do membro).
 *
 * A função:
 *   1. Autentica o usuário
 *   2. Determina o email efetivo do consultor (próprio ou do principal)
 *   3. Valida os campos obrigatórios
 *   4. Cria o registro via asServiceRole (bypass RLS)
 *   5. Retorna o registro criado
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Determinar o email efetivo do consultor
    let consultorEmail = user.email;

    // Se for admin, usa o próprio email
    if (user.role !== 'admin') {
      // Verificar se é membro de equipe
      const memberships = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email,
        status: 'Ativo',
      });

      if (memberships.length > 0) {
        // É equipe — usa o email do consultor principal
        consultorEmail = memberships[0].primary_user_email;
      }
    }

    // Validações
    const clientName = body.client_name?.trim();
    if (!clientName) {
      return Response.json({ error: 'Nome do cliente é obrigatório.' }, { status: 400 });
    }

    // Montar o objeto de dados
    const clientData = {
      consultor_email: consultorEmail,
      client_name: clientName,
      client_email: body.client_email || undefined,
      client_phone: body.client_phone || undefined,
      client_type: body.client_type || 'pf',
      status: body.status || 'NovoProspect',
      cpf: body.cpf || undefined,
      rg: body.rg || undefined,
      birth_date: body.birth_date || undefined,
      cnpj: body.cnpj || undefined,
      state_registration: body.state_registration || undefined,
      address: body.address || undefined,
      city: body.city || undefined,
      state: body.state || undefined,
      zip_code: body.zip_code || undefined,
      notes: body.notes || undefined,
      property_id: body.property_id || undefined,
      tags: body.tags || [],
      interactions: [],
      tasks: [],
      services: [],
    };

    // Remover campos undefined
    Object.keys(clientData).forEach(k => clientData[k] === undefined && delete clientData[k]);

    // Criar via service role (bypass RLS)
    const created = await base44.asServiceRole.entities.ClientCRM.create(clientData);

    return Response.json(created);
  } catch (error) {
    console.error('[createClientCRM] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});