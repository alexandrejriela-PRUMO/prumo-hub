import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * manageExpense — Cria, atualiza ou exclui um Expense usando service role.
 *
 * Necessário porque a RLS exige consultor_email === user.email,
 * bloqueando membros de equipe que criam despesas em nome do consultor principal.
 *
 * Ação:
 *   - create: cria um Expense com consultor_email = email efetivo do consultor
 *   - update: atualiza um Expense existente
 *   - delete: exclui um Expense
 *   - bulkCreate: cria múltiplos Expenses (para parcelamentos)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, data, id, records } = body;

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
      const created = await base44.asServiceRole.entities.Expense.create({
        ...data,
        consultor_email: consultorEmail,
      });
      return Response.json(created);
    }

    if (action === 'bulkCreate') {
      const items = (records || []).map(r => ({ ...r, consultor_email: consultorEmail }));
      const created = await base44.asServiceRole.entities.Expense.bulkCreate(items);
      return Response.json({ success: true, count: created?.length || 0 });
    }

    if (action === 'update') {
      const updated = await base44.asServiceRole.entities.Expense.update(id, {
        ...data,
        consultor_email: consultorEmail,
      });
      return Response.json(updated);
    }

    if (action === 'delete') {
      await base44.asServiceRole.entities.Expense.delete(id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida. Use: create, update, delete, bulkCreate' }, { status: 400 });
  } catch (error) {
    console.error('[manageExpense] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});