import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * deleteClientContract — Exclui um registro de ClientContract via service role.
 *
 * Necessário para membros de equipe que não passam pela RLS.
 *
 * Valida que o usuário tem acesso ao registro antes de excluir.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return Response.json({ error: 'id é obrigatório.' }, { status: 400 });
    }

    // Buscar o registro para validar acesso
    let existing;
    try {
      existing = await base44.asServiceRole.entities.ClientContract.get(id);
    } catch (e) {
      // Já foi excluído — retornar sucesso
      return Response.json({ success: true, alreadyDeleted: true });
    }
    if (!existing) {
      // Já foi excluído — retornar sucesso
      return Response.json({ success: true, alreadyDeleted: true });
    }

    // Validar acesso
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

    await base44.asServiceRole.entities.ClientContract.delete(id);

    return Response.json({ success: true });
  } catch (error) {
    console.error('[deleteClientContract] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
