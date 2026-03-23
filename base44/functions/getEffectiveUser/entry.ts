/**
 * getEffectiveUser — Retorna o email efetivo para queries de dados.
 *
 * Busca o TeamMember pelo email do usuário (independente do user_type).
 * Se encontrar vínculo ativo, retorna o email do consultor e as permissões.
 * Se for consultor/produtor sem vínculo de equipe, retorna o próprio usuário.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Se for consultor ou admin, retorna o próprio usuário imediatamente
    if (user.user_type === 'consultor' || user.role === 'admin') {
      return Response.json({
        email: user.email,
        actual_email: user.email,
        full_name: user.full_name,
        user_type: user.user_type,
        consultor_email: null,
        is_equipe: false,
      });
    }

    // Para qualquer tipo de usuário (incluindo 'equipe', 'user', null, etc.),
    // buscar se existe um TeamMember ativo vinculado a este email
    const memberships = await base44.asServiceRole.entities.TeamMember.filter({
      member_email: user.email,
      status: 'Ativo',
    });

    if (memberships.length > 0) {
      const membership = memberships[0];
      const consultorEmail = membership.primary_user_email;

      // Busca dados do consultor (nome + plano)
      let consultorName = consultorEmail;
      let consultorPlan = 'start';
      try {
        const consultorUsers = await base44.asServiceRole.entities.User.filter({ email: consultorEmail });
        if (consultorUsers.length > 0) {
          consultorName = consultorUsers[0].full_name || consultorEmail;
          consultorPlan = consultorUsers[0].consultor_plan || 'start';
        }
      } catch (e) {
        console.warn('[getEffectiveUser] Não foi possível buscar dados do consultor:', e.message);
      }

      const VIEWER_PERMS = {
        office:           { view: true,  edit: false },
        property_center:  { view: true,  edit: false },
        advanced_modules: { access: false },
        reports:          { view: false },
        ai_chat:          { access: true },
        team_management:  { manage: false },
        financial:        { view: false },
      };
      const permissions = membership.permissions || VIEWER_PERMS;

      // Garantir que o user_type seja 'equipe' caso ainda não esteja
      if (user.user_type !== 'equipe') {
        try {
          await base44.auth.updateMe({ user_type: 'equipe' });
          console.log(`[getEffectiveUser] user_type atualizado para 'equipe' para ${user.email}`);
        } catch (e) {
          console.warn('[getEffectiveUser] Não foi possível atualizar user_type:', e.message);
        }
      }

      return Response.json({
        email: consultorEmail,           // email para usar em queries (como se fosse o consultor)
        actual_email: user.email,        // email real do membro da equipe
        full_name: user.full_name,       // nome do membro
        user_type: 'equipe',
        consultor_email: consultorEmail,
        consultor_name: consultorName,
        consultor_plan: consultorPlan,
        member_role: membership.member_role,
        permissions,
        is_equipe: true,
        is_pending: false,
      });
    }

    // Sem vínculo ativo — retorna o próprio usuário
    return Response.json({
      email: user.email,
      actual_email: user.email,
      full_name: user.full_name,
      user_type: user.user_type,
      consultor_email: null,
      is_equipe: false,
    });

  } catch (error) {
    console.error('[getEffectiveUser] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});