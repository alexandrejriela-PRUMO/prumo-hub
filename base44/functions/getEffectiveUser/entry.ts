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

    // Se for admin, retorna o próprio usuário imediatamente
    if (user.role === 'admin') {
      return Response.json({
        email: user.email,
        actual_email: user.email,
        full_name: user.full_name,
        user_type: user.user_type,
        consultor_email: null,
        is_equipe: false,
      });
    }

    // Para qualquer tipo de usuário, buscar se existe um TeamMember ativo vinculado a este email
    const memberships = await base44.asServiceRole.entities.TeamMember.filter({
      member_email: user.email,
      status: 'Ativo',
    });

    if (memberships.length > 0) {
      const membership = memberships[0];
      const primaryEmail = membership.primary_user_email;

      // Busca dados do usuário principal (consultor ou produtor)
      let primaryName = primaryEmail;
      let primaryPlan = 'start';
      let primaryUserType = 'consultor'; // padrão
      try {
        const primaryUsers = await base44.asServiceRole.entities.User.filter({ email: primaryEmail });
        if (primaryUsers.length > 0) {
          primaryName = primaryUsers[0].full_name || primaryEmail;
          primaryPlan = primaryUsers[0].plano || primaryUsers[0].consultor_plan || 'start';
          primaryUserType = primaryUsers[0].user_type || 'consultor';
        }
      } catch (e) {
        console.warn('[getEffectiveUser] Não foi possível buscar dados do usuário principal:', e.message);
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
        email: primaryEmail,              // email para usar em queries (como se fosse o usuário principal)
        actual_email: user.email,         // email real do membro da equipe
        full_name: user.full_name,        // nome do membro
        user_type: 'equipe',
        primary_user_type: primaryUserType, // 'consultor' ou 'produtor'
        consultor_email: primaryEmail,    // mantido para compatibilidade
        consultor_name: primaryName,
        consultor_plan: primaryPlan,
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