/**
 * checkPermission — Verifica se o usuário atual tem uma permissão específica.
 *
 * Body: { permission: 'office', action: 'edit' }
 * Returns: { allowed: boolean, reason?: string }
 *
 * Consultores e produtores: sempre allowed = true.
 * Equipe: verificado contra TeamMember.permissions.
 *
 * Também suporta verificação de plano:
 * Body: { plan_feature: 'advanced_modules' }
 * Returns: { allowed: boolean, plan: string }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// ── Shared Config (inlined — Deno functions cannot import from each other) ───

const PLAN_CONFIG = {
  start:      { max_team_members: 0, advanced_modules: false, reports: 'none',  client_consultor: false },
  pro:        { max_team_members: 1, advanced_modules: true,  reports: 'basic', client_consultor: false },
  enterprise: { max_team_members: 3, advanced_modules: true,  reports: 'full',  client_consultor: true  },
};

function planAllows(plan, feature) {
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.start;
  const val = config[feature];
  return val === true || (typeof val === 'string' && val !== 'none');
}

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

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { permission, action, plan_feature } = body;

    // ── Plan feature check (consultor checking own plan) ─────────────────────
    if (plan_feature) {
      // For equipe: get consultor plan
      let plan = user.consultor_plan || 'start';

      if (user.user_type === 'equipe') {
        try {
          const memberships = await base44.asServiceRole.entities.TeamMember.filter({ member_email: user.email, status: 'Ativo' });
          if (memberships.length > 0) {
            const consultorUsers = await base44.asServiceRole.entities.User.filter({ email: memberships[0].primary_user_email });
            if (consultorUsers.length > 0) plan = consultorUsers[0].consultor_plan || 'start';
          }
        } catch (e) { console.warn('[checkPermission] plan lookup error:', e.message); }
      }

      return Response.json({ allowed: planAllows(plan, plan_feature), plan });
    }

    // ── Module permission check ───────────────────────────────────────────────
    if (!permission || !action) {
      return Response.json({ error: 'permission e action são obrigatórios' }, { status: 400 });
    }

    // Consultores/produtores têm acesso total (nunca bloqueados por permissions)
    if (user.user_type !== 'equipe') {
      return Response.json({ allowed: true, is_equipe: false });
    }

    // Equipe: busca membership ativo
    const memberships = await base44.asServiceRole.entities.TeamMember.filter({
      member_email: user.email,
      status: 'Ativo',
    });

    if (memberships.length === 0) {
      return Response.json({ allowed: false, reason: 'no_active_membership' });
    }

    const membership = memberships[0];
    const permissions = membership.permissions || getDefaultPermissions(membership.member_role);
    const module = permissions[permission];

    if (!module) {
      return Response.json({ allowed: false, reason: 'unknown_permission' });
    }

    const allowed = module[action] === true;
    return Response.json({ allowed, is_equipe: true, role: membership.member_role });

  } catch (error) {
    console.error('[checkPermission] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});