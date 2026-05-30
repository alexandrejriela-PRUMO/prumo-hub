/**
 * getEffectiveUser — Retorna o email efetivo para queries de dados.
 *
 * Busca o TeamMember pelo email do usuário.
 * Se encontrar vínculo ativo, retorna o email do principal e as permissões.
 * Se for consultor/produtor sem vínculo, retorna o próprio usuário.
 *
 * user_type retornado para membros de equipe:
 *   - 'equipe_consultor' se o principal é consultor
 *   - 'equipe_produtor'  se o principal é produtor
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Admin — retorna o próprio usuário imediatamente
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

    // Buscar vínculo de equipe ativo para este usuário
    const memberships = await base44.asServiceRole.entities.TeamMember.filter({
      member_email: user.email,
      status: 'Ativo',
    });

    if (memberships.length > 0) {
      const membership = memberships[0];
      const primaryEmail = membership.primary_user_email;

      let primaryName = primaryEmail;
      let primaryPlan = 'start';
      let primaryUserType = null;

      // Fonte da verdade: UserMetadata do principal
      try {
        const primaryMeta = await base44.asServiceRole.entities.UserMetadata.filter(
          { user_email: primaryEmail }, '-created_date', 1
        );
        if (primaryMeta.length > 0) {
          primaryPlan = primaryMeta[0].plano || 'enterprise';
          primaryUserType = primaryMeta[0].user_type || null;
          console.log(`[getEffectiveUser] primaryUserType via UserMetadata: ${primaryUserType} para ${primaryEmail}`);
        }
      } catch (e) {
        console.warn('[getEffectiveUser] Erro ao buscar UserMetadata do principal:', e.message);
      }

      // Fallback: User entity do principal
      try {
        const primaryUsers = await base44.asServiceRole.entities.User.filter({ email: primaryEmail });
        if (primaryUsers.length > 0) {
          primaryName = primaryUsers[0].full_name || primaryEmail;
          if (!primaryUserType && primaryUsers[0].user_type) {
            primaryUserType = primaryUsers[0].user_type;
            console.log(`[getEffectiveUser] primaryUserType via User: ${primaryUserType} para ${primaryEmail}`);
          }
        }
      } catch (e) {
        console.warn('[getEffectiveUser] Erro ao buscar User do principal:', e.message);
      }

      // Fallback final
      if (!primaryUserType || primaryUserType === 'equipe' || primaryUserType === 'equipe_consultor' || primaryUserType === 'equipe_produtor') {
        primaryUserType = 'consultor';
        console.warn(`[getEffectiveUser] primaryUserType inválido para ${primaryEmail}, usando fallback 'consultor'`);
      }

      // Tipo específico do membro: equipe_consultor ou equipe_produtor
      const memberUserType = primaryUserType === 'produtor' ? 'equipe_produtor' : 'equipe_consultor';

      // Sincronizar user_type do membro se necessário
      // Inclui variantes antigas ('equipe') que precisam ser migradas para o tipo específico
      const needsSync = user.user_type !== memberUserType;
      if (needsSync) {
        try {
          await base44.auth.updateMe({ user_type: memberUserType });
          // Atualizar UserMetadata do membro também
          const memberMeta = await base44.asServiceRole.entities.UserMetadata.filter(
            { user_email: user.email }, '-created_date', 1
          );
          if (memberMeta.length > 0) {
            await base44.asServiceRole.entities.UserMetadata.update(memberMeta[0].id, {
              user_type: memberUserType,
              primary_consultor_email: primaryEmail,
            });
          }
          console.log(`[getEffectiveUser] user_type do membro ${user.email} atualizado para '${memberUserType}'`);
        } catch (e) {
          console.warn('[getEffectiveUser] Erro ao atualizar user_type do membro:', e.message);
        }
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

      return Response.json({
        email: primaryEmail,
        actual_email: user.email,
        full_name: user.full_name,
        user_type: memberUserType,
        primary_user_type: primaryUserType,
        consultor_email: primaryEmail,
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