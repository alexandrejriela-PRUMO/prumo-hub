import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { target_email, user_type } = body;

    if (!target_email || !user_type) {
      return Response.json({ error: 'target_email e user_type são obrigatórios' }, { status: 400 });
    }

    // Atualizar User entity
    const users = await base44.asServiceRole.entities.User.filter({ email: target_email });
    if (users.length === 0) {
      return Response.json({ error: `Usuário ${target_email} não encontrado` }, { status: 404 });
    }
    await base44.asServiceRole.entities.User.update(users[0].id, { user_type });

    // Atualizar UserMetadata
    const metas = await base44.asServiceRole.entities.UserMetadata.filter({ user_email: target_email }, '-created_date', 1);
    if (metas.length > 0) {
      await base44.asServiceRole.entities.UserMetadata.update(metas[0].id, { user_type });
    }

    console.log(`[adminFixUserType] ${target_email} -> user_type: ${user_type}`);
    return Response.json({ success: true, target_email, user_type });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});