import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ─── LIST ────────────────────────────────────────────────────────────────
  if (action === 'list') {
    const members = await base44.asServiceRole.entities.TeamMember.filter({
      primary_user_email: user.email
    });
    return Response.json({ members });
  }

  // ─── INVITE ──────────────────────────────────────────────────────────────
  if (action === 'invite') {
    const { member_email, member_name, member_role } = body;

    if (!member_email) {
      return Response.json({ error: 'member_email é obrigatório' }, { status: 400 });
    }

    // Idempotência: verificar se já existe
    const existing = await base44.asServiceRole.entities.TeamMember.filter({
      primary_user_email: user.email,
      member_email,
    });

    if (existing.length > 0) {
      return Response.json({ error: 'Este membro já foi convidado.' }, { status: 400 });
    }

    // Criar registro de TeamMember com pending_user_type para aplicação posterior
    const member = await base44.asServiceRole.entities.TeamMember.create({
      primary_user_email: user.email,
      consultor_email: user.email,
      member_email,
      member_name: member_name || '',
      member_role: member_role || 'Outro',
      status: 'Pendente',
      pending_user_type: 'equipe',
      user_type_applied: false,
      invited_at: new Date().toISOString(),
    });

    // Convidar usuário na plataforma
    await base44.users.inviteUser(member_email, 'user');

    // Email de boas-vindas personalizado PRUMO
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'PRUMO Hub',
        to: member_email,
        subject: `Você foi convidado para a equipe de ${user.full_name || user.email} no PRUMO Hub`,
        body: `Olá${member_name ? ', ' + member_name : ''},\n\n${user.full_name || user.email} convidou você para fazer parte da equipe de consultoria no PRUMO Hub.\n\nSeu perfil: ${member_role || 'Membro da Equipe'}\n\nAo aceitar o convite e fazer seu primeiro login, seu perfil será configurado automaticamente com acesso às ferramentas de consultoria.\n\nAcesse: https://prumo.app\n\nAtenciosamente,\nEquipe PRUMO Hub`
      });
    } catch (emailErr) {
      console.warn('[TeamInvite] Falha ao enviar email de boas-vindas:', emailErr.message);
    }

    console.log(`[TeamInvite] Convite enviado para ${member_email} pelo consultor ${user.email}`);
    return Response.json({ success: true, member });
  }

  // ─── ACTIVATE (aplica user_type idempotentemente) ────────────────────────
  if (action === 'activate') {
    const { member_id } = body;

    const members = await base44.asServiceRole.entities.TeamMember.filter({
      primary_user_email: user.email,
    });
    const member = members.find(m => m.id === member_id);
    if (!member) return Response.json({ error: 'Membro não encontrado' }, { status: 404 });

    // Aplicar user_type se ainda não foi feito (idempotência)
    if (!member.user_type_applied && member.pending_user_type) {
      try {
        // Buscar o usuário pelo email para obter o ID
        const users = await base44.asServiceRole.entities.User.filter({ email: member.member_email });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            user_type: member.pending_user_type
          });
          console.log(`[TeamActivate] user_type '${member.pending_user_type}' aplicado para ${member.member_email}`);
        } else {
          console.warn(`[TeamActivate] Usuário ${member.member_email} ainda não criou conta. user_type será aplicado no próximo login.`);
        }
      } catch (e) {
        console.warn(`[TeamActivate] Não foi possível aplicar user_type: ${e.message}`);
      }
    }

    await base44.asServiceRole.entities.TeamMember.update(member_id, {
      status: 'Ativo',
      user_type_applied: true,
      activated_at: new Date().toISOString()
    });

    return Response.json({ success: true });
  }

  // ─── REMOVE ──────────────────────────────────────────────────────────────
  if (action === 'remove') {
    const { member_id } = body;
    const members = await base44.asServiceRole.entities.TeamMember.filter({
      primary_user_email: user.email,
    });
    const member = members.find(m => m.id === member_id);
    if (!member) return Response.json({ error: 'Membro não encontrado' }, { status: 404 });

    await base44.asServiceRole.entities.TeamMember.delete(member_id);
    return Response.json({ success: true });
  }

  // ─── APPLY_USER_TYPE (chamado no primeiro login do membro) ───────────────
  // Pode ser chamado pelo próprio membro para garantir que seu perfil esteja correto
  if (action === 'apply_user_type') {
    const pendingMemberships = await base44.asServiceRole.entities.TeamMember.filter({
      member_email: user.email,
      user_type_applied: false
    });

    if (pendingMemberships.length === 0) {
      return Response.json({ success: true, message: 'Nenhum perfil pendente' });
    }

    const membership = pendingMemberships[0];
    const userType = membership.pending_user_type || 'equipe';

    try {
      await base44.auth.updateMe({ user_type: userType });
      await base44.asServiceRole.entities.TeamMember.update(membership.id, {
        user_type_applied: true,
        status: 'Ativo',
        activated_at: new Date().toISOString()
      });
      console.log(`[ApplyUserType] user_type '${userType}' aplicado para ${user.email}`);
      return Response.json({ success: true, user_type: userType });
    } catch (e) {
      console.error(`[ApplyUserType] Erro:`, e.message);
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Ação inválida' }, { status: 400 });
});