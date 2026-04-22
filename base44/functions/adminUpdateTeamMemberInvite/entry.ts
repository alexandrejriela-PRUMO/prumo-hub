/**
 * adminUpdateTeamMemberInvite — Atualiza dados de convite pendente (TeamMember)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { teamMemberId, data } = body;

    if (!teamMemberId || !data) {
      return Response.json({ error: 'teamMemberId e data são obrigatórios' }, { status: 400 });
    }

    // Atualiza o TeamMember
    await base44.asServiceRole.entities.TeamMember.update(teamMemberId, {
      pending_user_type: data.user_type,
      member_role: data.member_role || 'Consultor',
      // Preserva status pendente se quiser, ou pode mudar via subscription_status
    });

    console.log(`✅ TeamMember ${teamMemberId} atualizado`);

    return Response.json({
      success: true,
      message: 'Convite atualizado com sucesso',
      team_member_id: teamMemberId
    });

  } catch (error) {
    console.error('[adminUpdateTeamMemberInvite] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});