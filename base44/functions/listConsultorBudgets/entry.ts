import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * listConsultorBudgets — Retorna Budget, BudgetTemplate e BudgetEmailLog do consultor efetivo.
 *
 * Necessário porque a RLS dessas entidades exige consultor_email === user.email,
 * o que bloqueia membros de equipe (equipe_consultor) cujo email difere do consultor principal.
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

    // Buscar por ambos os emails (consultor principal + membro da equipe) para dados históricos
    const emailsToSearch = isEquipe ? [consultorEmail, user.email] : [consultorEmail];

    const [budgetResults, templateResults, emailLogResults] = await Promise.all([
      Promise.all(emailsToSearch.map(email =>
        base44.asServiceRole.entities.Budget.filter({ consultor_email: email }, '-created_date', 100)
      )),
      Promise.all(emailsToSearch.map(email =>
        base44.asServiceRole.entities.BudgetTemplate.filter({ consultor_email: email })
      )),
      Promise.all(emailsToSearch.map(email =>
        base44.asServiceRole.entities.BudgetEmailLog.filter({ consultor_email: email }, '-sent_at', 100)
      )),
    ]);

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
      budgets: dedupe(budgetResults),
      templates: dedupe(templateResults),
      emailLogs: dedupe(emailLogResults),
      consultorEmail,
    });
  } catch (error) {
    console.error('[listConsultorBudgets] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
