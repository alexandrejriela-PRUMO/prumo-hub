import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Quando um consultor convida um membro, verifica se o usuário já existe no sistema
// e aplica imediatamente o user_type correto no UserMetadata dele.
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { member_email, team_member_id, primary_consultor_email, user_type } = await req.json();

    if (!member_email || !team_member_id) {
      return Response.json({ error: 'member_email e team_member_id são obrigatórios' }, { status: 400 });
    }

    const targetUserType = user_type || 'equipe';
    const consultorEmail = primary_consultor_email || caller.email;

    // Verifica se já existe UserMetadata para este email
    const existingMeta = await base44.asServiceRole.entities.UserMetadata.filter(
      { user_email: member_email },
      '-created_date',
      1
    );

    if (existingMeta && existingMeta.length > 0) {
      // Usuário já existe — atualiza imediatamente
      await base44.asServiceRole.entities.UserMetadata.update(existingMeta[0].id, {
        user_type: targetUserType,
        subscription_status: 'active',
        primary_consultor_email: consultorEmail,
      });

      // Marca o TeamMember como já aplicado
      await base44.asServiceRole.entities.TeamMember.update(team_member_id, {
        user_type_applied: true,
        status: 'Ativo',
        activated_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      });

      console.log(`[applyTeamMemberOnInvite] Usuário existente ${member_email} atualizado para ${targetUserType}`);
      return Response.json({ applied: true, existing_user: true, user_type: targetUserType });
    }

    // Usuário não existe ainda — deixa o applyInviteConfigOnFirstLogin lidar quando ele logar
    console.log(`[applyTeamMemberOnInvite] Usuário ${member_email} ainda não existe, aguardando primeiro login`);
    return Response.json({ applied: false, existing_user: false, reason: 'User not registered yet' });

  } catch (error) {
    console.error('[applyTeamMemberOnInvite]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});