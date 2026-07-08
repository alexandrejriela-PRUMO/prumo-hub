import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * managePropertyRecord — Cria, atualiza ou exclui um registro de entidade
 * vinculada a propriedades, usando service role (bypass de RLS para equipe).
 *
 * Necessário porque a RLS de License, Process, etc. exige
 * owner_email === user.email ou property_id in user.properties_ids,
 * bloqueando membros de equipe que operam em nome do consultor principal.
 *
 * Body:
 *   - action: "create" | "update" | "delete"
 *   - entity_name: nome da entidade (ex: "License", "Process")
 *   - data: dados do registro (para create/update)
 *   - id: ID do registro (para update/delete)
 *   - email_field: campo de email a preencher com email do consultor (ex: "owner_email", "client_email")
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, entity_name, data, id, email_field } = body;

    if (!entity_name || !action) {
      return Response.json({ error: 'entity_name e action são obrigatórios' }, { status: 400 });
    }

    const entity = base44.asServiceRole.entities[entity_name];
    if (!entity) {
      return Response.json({ error: `Entidade '${entity_name}' não encontrada` }, { status: 400 });
    }

    // Resolve effective consultant email
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
      const payload = email_field ? { ...data, [email_field]: consultorEmail } : data;
      const created = await entity.create(payload);
      return Response.json(created);
    }

    if (action === 'update') {
      const payload = email_field ? { ...data, [email_field]: consultorEmail } : data;
      const updated = await entity.update(id, payload);
      return Response.json(updated);
    }

    if (action === 'delete') {
      await entity.delete(id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida. Use: create, update, delete' }, { status: 400 });
  } catch (error) {
    console.error('[managePropertyRecord] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});