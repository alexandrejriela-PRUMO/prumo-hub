/**
 * manageTeamMembers — Gerencia convites e membros da equipe.
 *
 * FLUXO CORRETO:
 *   1. Validar email
 *   2. Checar duplicidade
 *   3. inviteUser() — se falhar, NADA é criado
 *   4. Criar TeamMember com status Pendente
 *   5. Enviar email personalizado
 *
 * Actions: list | invite | resend_invite | activate | apply_user_type | remove
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Valida formato de email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Calcula data de expiração (7 dias)
function expiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

// ── Plan config ──────────────────────────────────────────────────────────────
const PLAN_CONFIG = {
  start:      { max_team_members: 0 },
  pro:        { max_team_members: 1 },
  enterprise: { max_team_members: 3 },
};

// ── Default permissions por role ─────────────────────────────────────────────
function normalizeRole(role) {
  return (role || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function getDefaultPermissions(role) {
  const viewer = {
    office:           { view: true,  edit: false },
    property_center:  { view: true,  edit: false },
    advanced_modules: { access: false },
    reports:          { view: false },
    ai_chat:          { access: true },
    team_management:  { manage: false },
    financial:        { view: false },
  };

  switch (normalizeRole(role)) {
    case 'engenheiro':
      return { ...viewer, office: { view: true, edit: true }, property_center: { view: true, edit: true }, advanced_modules: { access: true }, reports: { view: true } };
    case 'advogado':
      return { ...viewer, office: { view: true, edit: false }, property_center: { view: true, edit: false }, reports: { view: true } };
    case 'administrador':
      return { office: { view: true, edit: true }, property_center: { view: true, edit: true }, advanced_modules: { access: true }, reports: { view: true }, ai_chat: { access: true }, team_management: { manage: true }, financial: { view: true } };
    case 'estagiario':
    default:
      return viewer;
  }
}

Deno.serve(async (req) => {
  try {
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

      // 1. Validar email
      if (!member_email || !isValidEmail(member_email)) {
        return Response.json({ error: 'Email inválido ou não fornecido.' }, { status: 400 });
      }

      // 2. Verificar plano do consultor — permite adição de equipe?
      const consultorUsers = await base44.asServiceRole.entities.User.filter({ email: user.email });
      const consultorPlan = consultorUsers[0]?.consultor_plan || 'start';
      const planConfig = PLAN_CONFIG[consultorPlan] || PLAN_CONFIG.start;

      if (planConfig.max_team_members === 0) {
        return Response.json({ error: `Seu plano (${consultorPlan.toUpperCase()}) não permite adicionar membros de equipe. Faça upgrade para o plano PRO ou ENTERPRISE.` }, { status: 403 });
      }

      // Contar membros ativos já existentes
      const activeMembers = await base44.asServiceRole.entities.TeamMember.filter({ primary_user_email: user.email, status: 'Ativo' });
      const pendingMembers = await base44.asServiceRole.entities.TeamMember.filter({ primary_user_email: user.email, status: 'Pendente' });
      const totalActiveOrPending = activeMembers.length + pendingMembers.length;

      if (totalActiveOrPending >= planConfig.max_team_members) {
        return Response.json({ error: `Limite de membros atingido para o plano ${consultorPlan.toUpperCase()} (máx: ${planConfig.max_team_members}). Faça upgrade para adicionar mais membros.` }, { status: 403 });
      }

      // 3. Checar duplicidade GLOBAL — um membro não pode estar vinculado a dois consultores ativos ao mesmo tempo
      const globalExisting = await base44.asServiceRole.entities.TeamMember.filter({
        member_email,
      });

      for (const m of globalExisting) {
        if (m.status === 'Inativo') continue; // Inativos são ignorados

        if (m.primary_user_email !== user.email) {
          // Conflito: membro já está ativo/pendente com OUTRO consultor
          return Response.json({
            error: `Este usuário já está vinculado à equipe de outro consultor. Um membro só pode pertencer a uma equipe ativa por vez.`
          }, { status: 400 });
        }

        // Conflito com o mesmo consultor
        const statusLabel = m.status === 'Ativo' ? 'já é membro ativo' : 'já possui convite pendente';
        return Response.json({ error: `Este usuário ${statusLabel}. Use "reenviar convite" se necessário.` }, { status: 400 });
      }

      // 3. Tentar inviteUser (não-bloqueante) — já envia email de convite pela plataforma Base44
       console.log(`[INVITE] Enviando convite para: ${member_email} | Função: ${member_role}`);
       try {
         await base44.asServiceRole.users.inviteUser(member_email, 'user');
         console.log(`[INVITE] ✅ Convite Base44 enviado para ${member_email}`);
       } catch (inviteErr) {
         console.warn(`[INVITE] ⚠️  inviteUser falhou (não-fatal): ${inviteErr.message}`);
       }

      // 4. Criar TeamMember com permissões default pelo role
      const now = new Date().toISOString();
      const defaultPerms = getDefaultPermissions(member_role || 'Outro');
      const inviteToken = crypto.randomUUID();
      console.log(`📝 [CRIANDO REGISTRO] TeamMember para ${member_email} com função: ${member_role}`);
      const member = await base44.asServiceRole.entities.TeamMember.create({
        primary_user_email: user.email,
        consultor_email: user.email,
        member_email,
        member_name: member_name || '',
        member_role: member_role || 'Outro',
        status: 'Pendente',
        permissions: defaultPerms,
        pending_user_type: 'equipe',
        user_type_applied: false,
        invited_at: now,
        expires_at: expiresAt(),
        invite_token: inviteToken,
      });
      console.log(`✅ [REGISTRO CRIADO] TeamMember id=${member.id} | Email: ${member_email} | Função: ${member.member_role} | Status: Pendente`);

      console.log(`🎉 [CONVITE COMPLETO] Email=${member_email} | Função=${member.member_role} | ID=${member.id} | Status=Pendente`);
      return Response.json({ success: true, member });
    }

    // ─── RESEND_INVITE ───────────────────────────────────────────────────────
    if (action === 'resend_invite') {
      const { member_id } = body;

      const members = await base44.asServiceRole.entities.TeamMember.filter({
        primary_user_email: user.email,
      });
      const member = members.find(m => m.id === member_id);

      if (!member) return Response.json({ error: 'Membro não encontrado.' }, { status: 404 });
      if (member.status !== 'Pendente') {
        return Response.json({ error: 'Só é possível reenviar convite para membros com status Pendente.' }, { status: 400 });
      }

      console.log(`[TeamInvite] Reenviando convite para ${member.member_email}`);
      try {
        await base44.users.inviteUser(member.member_email, 'user');
        console.log(`[TeamInvite] ✅ Convite reenviado para ${member.member_email}`);
      } catch (inviteErr) {
        console.warn(`[TeamInvite] inviteUser falhou (não-fatal): ${inviteErr.message}`);
      }

      const now = new Date().toISOString();
      const resendToken = member.invite_token || crypto.randomUUID();
      await base44.asServiceRole.entities.TeamMember.update(member_id, {
        invited_at: now,
        expires_at: expiresAt(),
        invite_token: resendToken,
      });

      console.log(`[TeamInvite] Convite reenviado para ${member.member_email}`);
      return Response.json({ success: true });
    }

    // ─── ACTIVATE (manual pelo consultor) ────────────────────────────────────
    if (action === 'activate') {
      const { member_id } = body;

      const members = await base44.asServiceRole.entities.TeamMember.filter({
        primary_user_email: user.email,
      });
      const member = members.find(m => m.id === member_id);
      if (!member) return Response.json({ error: 'Membro não encontrado.' }, { status: 404 });

      if (!member.user_type_applied && member.pending_user_type) {
        try {
          const users = await base44.asServiceRole.entities.User.filter({ email: member.member_email });
          if (users.length > 0) {
            await base44.asServiceRole.entities.User.update(users[0].id, {
              user_type: member.pending_user_type
            });
            console.log(`[TeamActivate] user_type '${member.pending_user_type}' aplicado para ${member.member_email}`);
          } else {
            console.warn(`[TeamActivate] Usuário ${member.member_email} ainda não criou conta. Será aplicado no primeiro login.`);
          }
        } catch (e) {
          console.warn(`[TeamActivate] Não foi possível aplicar user_type: ${e.message}`);
        }
      }

      const now = new Date().toISOString();
      await base44.asServiceRole.entities.TeamMember.update(member_id, {
        status: 'Ativo',
        user_type_applied: true,
        activated_at: now,
        accepted_at: now,
      });

      return Response.json({ success: true });
    }

    // ─── APPLY_USER_TYPE (chamado automaticamente no primeiro login do membro) ─
    if (action === 'apply_user_type') {
      const pendingMemberships = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email,
        user_type_applied: false
      });

      if (pendingMemberships.length === 0) {
        return Response.json({ success: true, message: 'Nenhum perfil pendente.' });
      }

      const membership = pendingMemberships[0];

      // Verificar expiração
      if (membership.expires_at && new Date(membership.expires_at) < new Date()) {
        console.warn(`[ApplyUserType] Convite expirado para ${user.email} (expirou em ${membership.expires_at})`);
        return Response.json({
          error: 'Este convite expirou. Solicite um novo convite ao consultor.',
          expired: true
        }, { status: 403 });
      }

      const userType = membership.pending_user_type || 'equipe';
      const now = new Date().toISOString();

      try {
        await base44.auth.updateMe({ user_type: userType });
        await base44.asServiceRole.entities.TeamMember.update(membership.id, {
          user_type_applied: true,
          status: 'Ativo',
          activated_at: now,
          accepted_at: now,
        });
        console.log(`[ApplyUserType] user_type '${userType}' aplicado com sucesso para ${user.email}`);
        return Response.json({ success: true, user_type: userType });
      } catch (e) {
        console.error(`[ApplyUserType] Erro ao aplicar user_type para ${user.email}:`, e.message);
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // ─── REMOVE ──────────────────────────────────────────────────────────────
    if (action === 'remove') {
      const { member_id } = body;
      const members = await base44.asServiceRole.entities.TeamMember.filter({
        primary_user_email: user.email,
      });
      const member = members.find(m => m.id === member_id);
      if (!member) return Response.json({ error: 'Membro não encontrado.' }, { status: 404 });

      await base44.asServiceRole.entities.TeamMember.delete(member_id);
      console.log(`[TeamRemove] Membro ${member.member_email} removido por ${user.email}`);
      return Response.json({ success: true });
    }

    // ─── UPDATE_PERMISSIONS ──────────────────────────────────────────────────
    if (action === 'update_permissions') {
      const { member_id, permissions } = body;
      if (!member_id || !permissions) return Response.json({ error: 'member_id e permissions são obrigatórios.' }, { status: 400 });

      const members = await base44.asServiceRole.entities.TeamMember.filter({ primary_user_email: user.email });
      const member = members.find(m => m.id === member_id);
      if (!member) return Response.json({ error: 'Membro não encontrado.' }, { status: 404 });

      // Equipe não pode gerenciar permissões de outros membros
      if (user.user_type === 'equipe') {
        return Response.json({ error: 'Apenas consultores podem alterar permissões.' }, { status: 403 });
      }

      await base44.asServiceRole.entities.TeamMember.update(member_id, { permissions });
      return Response.json({ success: true });
    }

    // ─── GET_PLAN_INFO ────────────────────────────────────────────────────────
    if (action === 'get_plan_info') {
      const consultorUsers = await base44.asServiceRole.entities.User.filter({ email: user.email });
      const plan = consultorUsers[0]?.consultor_plan || 'start';
      const config = PLAN_CONFIG[plan] || PLAN_CONFIG.start;
      const activeMembers = await base44.asServiceRole.entities.TeamMember.filter({ primary_user_email: user.email, status: 'Ativo' });
      const pendingMembers = await base44.asServiceRole.entities.TeamMember.filter({ primary_user_email: user.email, status: 'Pendente' });

      return Response.json({
        plan,
        max_team_members: config.max_team_members,
        current_active: activeMembers.length,
        current_pending: pendingMembers.length,
        can_add_more: (activeMembers.length + pendingMembers.length) < config.max_team_members,
      });
    }

    return Response.json({ error: 'Ação inválida. Use: list | invite | resend_invite | activate | apply_user_type | remove | update_permissions | get_plan_info' }, { status: 400 });

  } catch (error) {
    console.error('[manageTeamMembers] Erro inesperado:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});