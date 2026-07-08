import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * deleteProperty — Remove uma Property usando service role.
 *
 * Necessário porque a RLS bloqueia membros de equipe cujo email difere do consultor principal.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id } = body;
    if (!id) return Response.json({ error: 'ID é obrigatório.' }, { status: 400 });

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

    // Buscar para validar permissão
    const existing = await base44.asServiceRole.entities.Property.get(id);
    if (!existing) {
      return Response.json({ success: true, message: 'Registro já removido.' });
    }

    const isAuthorized = user.role === 'admin'
      || existing.consultor_email === consultorEmail
      || existing.owner_email === user.email;

    if (!isAuthorized) {
      return Response.json({ error: 'Sem permissão para remover esta propriedade.' }, { status: 403 });
    }

    await base44.asServiceRole.entities.Property.delete(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[deleteProperty] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});