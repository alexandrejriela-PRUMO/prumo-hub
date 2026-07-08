import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * updateProperty — Atualiza uma Property usando service role.
 *
 * Necessário porque a RLS bloqueia membros de equipe cujo email difere do consultor principal.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, data } = body;
    if (!id) return Response.json({ error: 'ID é obrigatório.' }, { status: 400 });
    if (!data || typeof data !== 'object') return Response.json({ error: 'Dados inválidos.' }, { status: 400 });

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

    // Buscar a propriedade para validar permissão
    const existing = await base44.asServiceRole.entities.Property.get(id);
    if (!existing) {
      return Response.json({ error: 'Registro não encontrado.' }, { status: 404 });
    }

    // Autorização: admin, ou consultor_email da propriedade == consultor efetivo, ou owner_email == user.email
    const isAuthorized = user.role === 'admin'
      || existing.consultor_email === consultorEmail
      || existing.owner_email === user.email;

    if (!isAuthorized) {
      return Response.json({ error: 'Sem permissão para editar esta propriedade.' }, { status: 403 });
    }

    const updated = await base44.asServiceRole.entities.Property.update(id, data);
    return Response.json(updated);
  } catch (error) {
    console.error('[updateProperty] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});