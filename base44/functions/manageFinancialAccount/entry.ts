import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * manageFinancialAccount — Cria, atualiza ou exclui uma FinancialAccount usando service role.
 *
 * Necessário porque a RLS exige consultor_email === user.email,
 * bloqueando membros de equipe que gerenciam contas do consultor principal.
 *
 * Ação:
 *   - create: cria uma FinancialAccount com consultor_email = email efetivo
 *   - update: atualiza uma FinancialAccount existente
 *   - delete: exclui uma FinancialAccount
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, data, id } = body;

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

    if (action === 'create') {
      const created = await base44.asServiceRole.entities.FinancialAccount.create({
        ...data,
        consultor_email: consultorEmail,
      });
      return Response.json(created);
    }

    if (action === 'update') {
      const updated = await base44.asServiceRole.entities.FinancialAccount.update(id, data);
      return Response.json(updated);
    }

    if (action === 'delete') {
      await base44.asServiceRole.entities.FinancialAccount.delete(id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida. Use: create, update, delete' }, { status: 400 });
  } catch (error) {
    console.error('[manageFinancialAccount] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});