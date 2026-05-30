/**
 * persistTeamMemberUserType — Sincroniza e persiste o user_type do membro de equipe
 * em TODAS as fontes (User, UserMetadata, TeamMember) para evitar oscilações.
 *
 * Chamada após applyInviteConfigOnFirstLogin ou quando detectar divergência.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Buscar TeamMember para este usuário
    const memberships = await base44.asServiceRole.entities.TeamMember.filter({
      member_email: user.email,
      status: 'Ativo',
    });

    if (memberships.length === 0) {
      return Response.json({ error: 'Nenhum vínculo de equipe ativo encontrado' }, { status: 404 });
    }

    const membership = memberships[0];
    const primaryEmail = membership.primary_user_email;

    // Determinar o user_type baseado no principal
    let primaryUserType = null;
    try {
      const primaryMeta = await base44.asServiceRole.entities.UserMetadata.filter(
        { user_email: primaryEmail }, '-created_date', 1
      );
      if (primaryMeta.length > 0) {
        primaryUserType = primaryMeta[0].user_type;
      }
    } catch (e) {
      console.warn('[persistTeamMemberUserType] Erro ao buscar UserMetadata do principal:', e.message);
    }

    // Fallback: User entity
    if (!primaryUserType) {
      try {
        const primaryUsers = await base44.asServiceRole.entities.User.filter({ email: primaryEmail });
        if (primaryUsers.length > 0) {
          primaryUserType = primaryUsers[0].user_type;
        }
      } catch (e) {
        console.warn('[persistTeamMemberUserType] Erro ao buscar User do principal:', e.message);
      }
    }

    // Validar tipo
    if (!primaryUserType || primaryUserType === 'equipe' || primaryUserType === 'equipe_consultor' || primaryUserType === 'equipe_produtor') {
      primaryUserType = 'consultor';
    }

    // user_type específico do membro
    const memberUserType = primaryUserType === 'produtor' ? 'equipe_produtor' : 'equipe_consultor';

    // 1️⃣ Sincronizar na User entity (auth)
    if (user.user_type !== memberUserType) {
      try {
        await base44.auth.updateMe({ user_type: memberUserType });
        console.log(`[persistTeamMemberUserType] User atualizado: ${user.email} → ${memberUserType}`);
      } catch (e) {
        console.error('[persistTeamMemberUserType] Erro ao atualizar User:', e.message);
      }
    }

    // 2️⃣ Sincronizar/criar no UserMetadata
    try {
      const existingMeta = await base44.asServiceRole.entities.UserMetadata.filter(
        { user_email: user.email }, '-created_date', 1
      );

      if (existingMeta.length > 0) {
        // Atualizar existente
        await base44.asServiceRole.entities.UserMetadata.update(existingMeta[0].id, {
          user_type: memberUserType,
          primary_consultor_email: primaryEmail,
        });
        console.log(`[persistTeamMemberUserType] UserMetadata atualizado: ${user.email}`);
      } else {
        // Criar novo
        await base44.asServiceRole.entities.UserMetadata.create({
          user_email: user.email,
          user_id: user.id,
          user_type: memberUserType,
          primary_consultor_email: primaryEmail,
          plano: 'enterprise',
          subscription_status: 'active',
        });
        console.log(`[persistTeamMemberUserType] UserMetadata criado: ${user.email}`);
      }
    } catch (e) {
      console.error('[persistTeamMemberUserType] Erro ao sincronizar UserMetadata:', e.message);
    }

    // 3️⃣ Atualizar TeamMember se necessário
    try {
      const updated = await base44.asServiceRole.entities.TeamMember.update(membership.id, {
        user_type_applied: true,
        pending_user_type: memberUserType,
      });
      console.log(`[persistTeamMemberUserType] TeamMember atualizado: ${membership.id}`);
    } catch (e) {
      console.warn('[persistTeamMemberUserType] Erro ao atualizar TeamMember:', e.message);
    }

    return Response.json({
      success: true,
      memberEmail: user.email,
      memberUserType,
      primaryEmail,
      primaryUserType,
      message: `Membro ${user.email} sincronizado como ${memberUserType}`,
    });

  } catch (error) {
    console.error('[persistTeamMemberUserType] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});