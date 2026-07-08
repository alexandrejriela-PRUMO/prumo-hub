import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * createClientContract — Cria um registro de ClientContract usando service role.
 *
 * Necessário porque a RLS da entidade exige consultor_email === user.email,
 * o que bloqueia membros de equipe (equipe_consultor) que criam contratos
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
    if (!body.property_id) {
      return Response.json({ error: 'Propriedade é obrigatória.' }, { status: 400 });
    }
    if (!body.contract_type) {
      return Response.json({ error: 'Tipo de contrato é obrigatório.' }, { status: 400 });
    }
    if (!body.object?.trim()) {
      return Response.json({ error: 'Objeto do contrato é obrigatório.' }, { status: 400 });
    }
    if (!body.start_date) {
      return Response.json({ error: 'Data de início é obrigatória.' }, { status: 400 });
    }

    // Montar o objeto de dados
    const contractData = {
      consultor_email: consultorEmail,
      property_id: body.property_id,
      client_email: body.client_email || undefined,
      client_name: body.client_name || undefined,
      contract_number: body.contract_number || undefined,
      contract_type: body.contract_type,
      object: body.object.trim(),
      start_date: body.start_date,
      end_date: body.end_date || undefined,
      status: body.status || 'Proposta',
      total_value: body.total_value ?? undefined,
      payment_terms: body.payment_terms || undefined,
      enable_expiry_alerts: body.enable_expiry_alerts ?? false,
      alert_days_before_expiry: body.alert_days_before_expiry ?? 30,
      parties: body.parties || [],
      services_linked: body.services_linked || [],
      documents: body.documents || [],
      notes: body.notes || undefined,
    };

    // Remover campos undefined
    Object.keys(contractData).forEach(k => contractData[k] === undefined && delete contractData[k]);

    // Criar via service role (bypass RLS)
    const created = await base44.asServiceRole.entities.ClientContract.create(contractData);

    return Response.json(created);
  } catch (error) {
    console.error('[createClientContract] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
