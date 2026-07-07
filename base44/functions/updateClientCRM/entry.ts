import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * updateClientCRM — Atualiza um registro de ClientCRM via service role.
 *
 * Necessário para membros de equipe que não passam pela RLS
 * (consultor_email !== user.email para membros de equipe).
 *
 * Valida que o usuário tem acesso ao registro (é o consultor ou membro de equipe ativo).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, data } = body;

    if (!id || !data || typeof data !== 'object') {
      return Response.json({ error: 'id e data são obrigatórios.' }, { status: 400 });
    }

    // Buscar o registro para validar acesso
    const existing = await base44.asServiceRole.entities.ClientCRM.get(id);
    if (!existing) {
      return Response.json({ error: 'Registro não encontrado.' }, { status: 404 });
    }

    // Validar acesso: admin, consultor titular, ou membro de equipe ativo do consultor
    let hasAccess = user.role === 'admin' || existing.consultor_email === user.email;

    if (!hasAccess) {
      const memberships = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email,
        status: 'Ativo',
      });
      hasAccess = memberships.some(m => m.primary_user_email === existing.consultor_email);
    }

    if (!hasAccess) {
      return Response.json({ error: 'Sem permissão.' }, { status: 403 });
    }

    const updated = await base44.asServiceRole.entities.ClientCRM.update(id, data);
    return Response.json(updated);
  } catch (error) {
    console.error('[updateClientCRM] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});