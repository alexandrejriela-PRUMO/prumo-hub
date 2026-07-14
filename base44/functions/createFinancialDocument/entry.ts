import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * createFinancialDocument — Espelha um comprovante de despesa como Document, usando service role.
 *
 * Necessário porque a RLS da entidade Document exige owner_email === user.email,
 * bloqueando membros de equipe que lançam despesas em nome do consultor principal.
 *
 * Recebe: { expense_id, file_url, document_type, property_id, document_name, expiry_date, notes }
 * Retorna: { document_id }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { expense_id, file_url, document_type, property_id, document_name, expiry_date, notes } = body;

    if (!expense_id) return Response.json({ error: 'expense_id é obrigatório.' }, { status: 400 });
    if (!file_url) return Response.json({ error: 'file_url é obrigatório.' }, { status: 400 });

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

    const created = await base44.asServiceRole.entities.Document.create({
      owner_email: consultorEmail,
      property_id: property_id || undefined,
      document_type: document_type || 'Outro',
      document_name: `Comprovante - ${document_name || 'Despesa'}`,
      file_url,
      expiry_date: expiry_date || undefined,
      notes: notes || `Criado automaticamente do módulo financeiro (despesa ID: ${expense_id})`,
      source: 'financeiro',
      source_id: expense_id,
      current_version: 1,
      versions: [{
        version_number: 1,
        file_url,
        uploaded_date: new Date().toISOString(),
        uploaded_by: consultorEmail,
        notes: 'Espelhado automaticamente do módulo financeiro',
      }],
    });

    const expense = await base44.asServiceRole.entities.Expense.get(expense_id);
    const existingIds = expense?.document_ids || [];
    await base44.asServiceRole.entities.Expense.update(expense_id, {
      document_ids: [...existingIds, created.id],
    });

    return Response.json({ document_id: created.id });
  } catch (error) {
    console.error('[createFinancialDocument] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
