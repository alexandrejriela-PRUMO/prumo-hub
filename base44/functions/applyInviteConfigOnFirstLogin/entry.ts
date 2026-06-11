import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Procura por TeamMember pendente com este email
    const teamMembers = await base44.asServiceRole.entities.TeamMember.filter(
      { member_email: user.email },
      '-invited_at',
      10
    );

    // Filtra: apenas os que ainda não foram aplicados
    const pending = (teamMembers || []).filter(tm => tm.user_type_applied !== true);

    if (pending.length === 0) {
      return Response.json({ 
        applied: false, 
        reason: 'No pending team member found for this email' 
      });
    }

    const tm = pending[0];

    // Verificar expiração do convite
    if (tm.expires_at && new Date(tm.expires_at) < new Date()) {
      return Response.json({
        applied: false,
        reason: 'Invite expired'
      });
    }

    const primaryEmail = tm.primary_user_email || tm.consultor_email;
    const now = new Date().toISOString();

    // Descobrir o tipo do usuário principal para definir equipe_consultor vs equipe_produtor
    let primaryUserType = 'consultor'; // fallback
    let primaryPlano = 'enterprise';
    try {
      const primaryMeta = await base44.asServiceRole.entities.UserMetadata.filter(
        { user_email: primaryEmail }, '-created_date', 1
      );
      if (primaryMeta && primaryMeta.length > 0) {
        primaryUserType = primaryMeta[0].user_type || 'consultor';
        primaryPlano = primaryMeta[0].plano || 'enterprise';
      }
    } catch (e) {
      console.warn('[applyInviteConfigOnFirstLogin] Erro ao buscar UserMetadata do principal:', e.message);
    }

    // Fallback via User entity
    if (!primaryUserType || primaryUserType === 'equipe' || primaryUserType === 'equipe_consultor' || primaryUserType === 'equipe_produtor') {
      try {
        const primaryUsers = await base44.asServiceRole.entities.User.filter({ email: primaryEmail });
        if (primaryUsers.length > 0 && primaryUsers[0].user_type) {
          primaryUserType = primaryUsers[0].user_type;
        }
      } catch (e) {
        console.warn('[applyInviteConfigOnFirstLogin] Erro ao buscar User do principal:', e.message);
      }
    }

    // Definir tipo específico do membro
    const memberUserType = primaryUserType === 'produtor' ? 'equipe_produtor' : 'equipe_consultor';

    // 1. Atualiza user_type na sessão/User
    await base44.auth.updateMe({ user_type: memberUserType });

    // 1.5 Chamar persistTeamMemberUserType para sincronizar em TODAS as fontes (User, UserMetadata, TeamMember)
    // Isso evita oscilações ao fazer login em diferentes browsers/devices
    try {
      const persistRes = await base44.asServiceRole.functions.invoke('persistTeamMemberUserType', {});
      console.log(`[applyInviteConfigOnFirstLogin] persistTeamMemberUserType executado:`, persistRes?.data?.message);
    } catch (e) {
      console.warn('[applyInviteConfigOnFirstLogin] Erro ao chamar persistTeamMemberUserType:', e.message);
      // Continua mesmo se falhar — os passos 2 e 3 abaixo já sincronizam
    }

    // 2. Persiste no UserMetadata
    const existingMeta = await base44.asServiceRole.entities.UserMetadata.filter(
      { user_email: user.email },
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
    } else {
      await base44.asServiceRole.entities.UserMetadata.create({
        user_email: user.email,
        user_type: memberUserType,
        subscription_status: 'active',
        primary_consultor_email: primaryEmail,
        plano: primaryPlano,
        max_properties: 0,
        max_users: 0,
      });
    }

    // 3. Marca o TeamMember como aplicado e ativo
    await base44.asServiceRole.entities.TeamMember.update(tm.id, {
      user_type_applied: true,
      status: 'Ativo',
      activated_at: now,
      accepted_at: now,
    });

    // Desativa TeamMembers antigos do mesmo email para evitar conflito no getEffectiveUser
    const outrosAtivos = teamMembers.filter(m => m.id !== tm.id && m.status === 'Ativo');
    for (const antigo of outrosAtivos) {
      await base44.asServiceRole.entities.TeamMember.update(antigo.id, { status: 'Inativo' });
      console.log(`[applyInviteConfig] Desativado TeamMember antigo ${antigo.id} para ${user.email}`);
    }

    console.log(`[applyInviteConfigOnFirstLogin] user_type '${memberUserType}' aplicado para ${user.email}, principal: ${primaryEmail} (${primaryUserType})`);

    return Response.json({ 
      applied: true, 
      user_type: memberUserType,
      message: `User ${user.email} configured as ${memberUserType}`
    });

  } catch (error) {
    console.error('[applyInviteConfigOnFirstLogin]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});