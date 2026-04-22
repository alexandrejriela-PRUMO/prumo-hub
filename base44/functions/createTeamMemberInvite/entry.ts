/**
 * createTeamMemberInvite — Cria registro TeamMember com status Pendente
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { member_email, member_name, user_type = 'consultor' } = body;

    if (!member_email) {
      return Response.json({ error: 'member_email é obrigatório' }, { status: 400 });
    }

    const inviteToken = Math.random().toString(36).substr(2, 9) + Date.now();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const teamMemberData = {
      primary_user_email: user.email,
      consultor_email: user.email,
      member_email: member_email,
      member_name: member_name || member_email.split('@')[0],
      member_role: 'Consultor',
      status: 'Pendente',
      invite_token: inviteToken,
      invited_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      pending_user_type: user_type,
      permissions: {
        office: { view: true, edit: true },
        property_center: { view: true, edit: true },
        advanced_modules: { access: true },
        reports: { view: true },
        ai_chat: { access: true },
        team_management: { manage: false },
        financial: { view: true },
      }
    };

    await base44.asServiceRole.entities.TeamMember.create(teamMemberData);

    console.log(`✅ TeamMember criado para ${member_email}`);

    return Response.json({
      success: true,
      message: `Convite criado para ${member_email}`,
      team_member_id: inviteToken
    });

  } catch (error) {
    console.error('[createTeamMemberInvite] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});