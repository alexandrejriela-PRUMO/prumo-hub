import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Quando um consultor/produtor convida um membro, aplica imediatamente o user_type correto.
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

    const { member_email, team_member_id, primary_consultor_email } = await req.json();

    if (!member_email || !team_member_id) {
      return Response.json({ error: 'member_email e team_member_id são obrigatórios' }, { status: 400 });
    }

    const primaryEmail = primary_consultor_email || caller.email;

    // Descobrir tipo do usuário principal
    let primaryUserType = caller.user_type || 'consultor';
    let primaryPlano = 'start';
    try {
      const primaryMeta = await base44.asServiceRole.entities.UserMetadata.filter(
        { user_email: primaryEmail }, '-created_date', 1
      );
      if (primaryMeta && primaryMeta.length > 0) {
        primaryUserType = primaryMeta[0].user_type || primaryUserType;
        primaryPlano = primaryMeta[0].plano || 'start';
      }
    } catch (e) {
      console.warn('[applyTeamMemberOnInvite] Erro ao buscar UserMetadata do principal:', e.message);
    }

    // Normalizar: garantir que não é um tipo de equipe
    if (primaryUserType === 'equipe' || primaryUserType === 'equipe_consultor' || primaryUserType === 'equipe_produtor') {
      primaryUserType = 'consultor';
    }

    // Tipo específico do membro
    const memberUserType = primaryUserType === 'produtor' ? 'equipe_produtor' : 'equipe_consultor';

    // Verifica se já existe UserMetadata para este email
    const existingMeta = await base44.asServiceRole.entities.UserMetadata.filter(
      { user_email: member_email },
      '-created_date',
      1
    );

    if (existingMeta && existingMeta.length > 0) {
      await base44.asServiceRole.entities.UserMetadata.update(existingMeta[0].id, {
        user_type: memberUserType,
        subscription_status: 'active',
        primary_consultor_email: primaryEmail,
        plano: primaryPlano,
      });

      await base44.asServiceRole.entities.TeamMember.update(team_member_id, {
        user_type_applied: true,
        status: 'Ativo',
        activated_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      });

      console.log(`[applyTeamMemberOnInvite] Usuário existente ${member_email} atualizado para ${memberUserType}`);
      return Response.json({ applied: true, existing_user: true, user_type: memberUserType });
    }

    // Usuário não existe ainda — deixa o applyInviteConfigOnFirstLogin lidar no primeiro login
    console.log(`[applyTeamMemberOnInvite] Usuário ${member_email} ainda não existe, aguardando primeiro login`);
    return Response.json({ applied: false, existing_user: false, reason: 'User not registered yet' });

  } catch (error) {
    console.error('[applyTeamMemberOnInvite]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});