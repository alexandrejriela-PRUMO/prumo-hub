/**
 * listConsultorClients — Retorna os clientes (ClientCRM) do consultor principal.
 *
 * Se o usuário autenticado for equipe_consultor (membro de equipe vinculado a um
 * consultor), busca o TeamMember ativo e usa o email do consultor principal.
 * Caso contrário, usa o próprio email do usuário autenticado.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let consultorEmail = user.email;

    if (user.user_type === 'equipe_consultor') {
      const memberships = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email,
        status: 'Ativo',
      });
      if (memberships.length > 0) {
        consultorEmail = memberships[0].primary_user_email;
      }
    }

    const clients = await base44.asServiceRole.entities.ClientCRM.filter({
      consultor_email: consultorEmail,
    });

    return Response.json(clients);
  } catch (error) {
    console.error('[listConsultorClients] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
