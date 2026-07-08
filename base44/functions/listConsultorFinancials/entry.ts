import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Buscar por ambos os emails (consultor principal + membro da equipe) para dados históricos
    const emailsToSearch = isEquipe ? [consultorEmail, user.email] : [consultorEmail];

    // Buscar Expenses, ConsultorCharges e FinancialAccounts em paralelo
    const [expenseResults, chargeResults, accountResults] = await Promise.all([
      Promise.all(emailsToSearch.map(email =>
        base44.asServiceRole.entities.Expense.filter({ consultor_email: email }, '-date', 1000)
      )),
      Promise.all(emailsToSearch.map(email =>
        base44.asServiceRole.entities.ConsultorCharge.filter({ consultor_email: email }, '-created_date', 1000)
      )),
      Promise.all(emailsToSearch.map(email =>
        base44.asServiceRole.entities.FinancialAccount.filter({ consultor_email: email }, 'name', 100)
      )),
    ]);

    // Achatar e deduplicar por ID
    const dedupe = (results) => {
      const items = [];
      const seen = new Set();
      for (const list of results) {
        for (const item of (list || [])) {
          if (!seen.has(item.id)) { seen.add(item.id); items.push(item); }
        }
      }
      return items;
    };

    return Response.json({
      expenses: dedupe(expenseResults),
      charges: dedupe(chargeResults),
      accounts: dedupe(accountResults),
      consultorEmail,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});