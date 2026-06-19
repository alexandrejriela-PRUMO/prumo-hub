import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();

    if (!caller || caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, user_type, plano } = await req.json();

    if (!email || !user_type) {
      return Response.json({ error: 'email e user_type são obrigatórios' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    // 1. Desativar todos os TeamMembers ativos deste email para evitar conflito no getEffectiveUser
    const activeMembers = await base44.asServiceRole.entities.TeamMember.filter({
      member_email: normalizedEmail,
      status: 'Ativo',
    });
    for (const tm of activeMembers) {
      await base44.asServiceRole.entities.TeamMember.update(tm.id, { status: 'Inativo' });
      console.log(`[adminFixUserType] TeamMember ${tm.id} desativado para ${normalizedEmail}`);
    }

    // 2. Atualizar UserMetadata
    const metas = await base44.asServiceRole.entities.UserMetadata.filter(
      { user_email: normalizedEmail }, '-created_date', 1
    );
    const metaPayload: Record<string, unknown> = { user_type, subscription_status: 'active' };
    if (plano) metaPayload.plano = plano;

    if (metas.length > 0) {
      await base44.asServiceRole.entities.UserMetadata.update(metas[0].id, metaPayload);
    } else {
      await base44.asServiceRole.entities.UserMetadata.create({ user_email: normalizedEmail, ...metaPayload });
    }

    // 3. Atualizar User entity
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    if (users.length > 0) {
      const userUpdate: Record<string, unknown> = { user_type };
      if (plano) userUpdate.plano = plano;
      await base44.asServiceRole.entities.User.update(users[0].id, userUpdate);
    }

    console.log(`[adminFixUserType] ${normalizedEmail} -> user_type: ${user_type}${plano ? `, plano: ${plano}` : ''}, ${activeMembers.length} TeamMember(s) desativado(s)`);

    return Response.json({
      success: true,
      email: normalizedEmail,
      user_type,
      plano: plano || null,
      deactivated_team_members: activeMembers.length,
    });

  } catch (error) {
    console.error('[adminFixUserType]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
