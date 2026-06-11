import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admins podem atualizar usuários
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, data } = await req.json();

    if (!userId || !data) {
      return Response.json({ error: 'Missing userId or data' }, { status: 400 });
    }

    const userEmail = data.user_email?.toLowerCase();

    if (!userEmail) {
      return Response.json({ error: 'Missing user_email in data' }, { status: 400 });
    }

    // Busca metadata pelo email (chave primária de lookup)
    const existingByEmail = await base44.asServiceRole.entities.UserMetadata.filter({ user_email: userEmail }, 'created_date', 1);
    // Fallback: busca por user_id
    const existingById = existingByEmail.length === 0
      ? await base44.asServiceRole.entities.UserMetadata.filter({ user_id: userId }, 'created_date', 1)
      : [];
    const existing = existingByEmail.length > 0 ? existingByEmail : existingById;

    const metadataPayload = {
      user_id: userId,
      user_email: userEmail,
      plano: data.plano,
      user_type: data.user_type,
      max_properties: data.max_properties,
      max_users: data.max_users,
      subscription_status: data.subscription_status,
      primary_consultor_email: data.primary_consultor_email || null,
    };

    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.UserMetadata.update(existing[0].id, metadataPayload);
    } else {
      await base44.asServiceRole.entities.UserMetadata.create(metadataPayload);
    }

    // Atualiza campos diretamente no User entity (user_type e role são lidos via base44.auth.me())
    const userUpdate = {};
    if (data.role) userUpdate.role = data.role;
    if (data.user_type !== undefined) userUpdate.user_type = data.user_type;
    if (data.plano !== undefined) userUpdate.plano = data.plano;
    if (data.max_properties !== undefined) userUpdate.max_properties = data.max_properties;
    if (data.max_users !== undefined) userUpdate.max_users = data.max_users;
    if (data.subscription_status !== undefined) userUpdate.subscription_status = data.subscription_status;
    if (data.primary_consultor_email !== undefined) userUpdate.primary_consultor_email = data.primary_consultor_email;

    if (Object.keys(userUpdate).length > 0) {
      await base44.asServiceRole.entities.User.update(userId, userUpdate);
    }

    // Se o novo user_type não é equipe, desativa TeamMembers ativos conflitantes
    if (data.user_type && !data.user_type.startsWith('equipe')) {
      const activeMembers = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: userEmail,
        status: 'Ativo',
      });
      for (const tm of activeMembers) {
        await base44.asServiceRole.entities.TeamMember.update(tm.id, { status: 'Inativo' });
        console.log(`[adminUpdateUser] TeamMember ${tm.id} desativado para ${userEmail}`);
      }
    }

    return Response.json({ success: true, message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error('[adminUpdateUser]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});