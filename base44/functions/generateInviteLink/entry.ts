/**
 * generateInviteLink — Gera ou retorna o link de convite por token para um membro da equipe.
 * Actions: generate | validate_token
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function generateToken() {
  return crypto.randomUUID();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, member_id, token } = body;

    // ─── GENERATE: gera token para o membro e retorna o link ─────────────────
    if (action === 'generate') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const members = await base44.asServiceRole.entities.TeamMember.filter({
        primary_user_email: user.email,
      });
      const member = members.find(m => m.id === member_id);
      if (!member) return Response.json({ error: 'Membro não encontrado.' }, { status: 404 });

      // Reutilizar token se já existir, senão gerar novo
      let inviteToken = member.invite_token;
      if (!inviteToken) {
        inviteToken = generateToken();
        await base44.asServiceRole.entities.TeamMember.update(member_id, {
          invite_token: inviteToken,
        });
      }

      const inviteLink = `https://prumo.app/AcceptInvite?token=${inviteToken}`;
      return Response.json({ success: true, invite_link: inviteLink, token: inviteToken });
    }

    // ─── VALIDATE_TOKEN: valida o token e retorna dados do convite ────────────
    if (action === 'validate_token') {
      if (!token) return Response.json({ error: 'Token não fornecido.' }, { status: 400 });

      // Buscar todos com esse token (deve haver apenas um)
      const allMembers = await base44.asServiceRole.entities.TeamMember.filter({
        invite_token: token,
      });

      if (allMembers.length === 0) {
        return Response.json({ error: 'Convite inválido ou não encontrado.' }, { status: 404 });
      }

      const member = allMembers[0];

      if (member.status === 'Ativo') {
        return Response.json({ error: 'Este convite já foi aceito.' }, { status: 400 });
      }

      if (member.expires_at && new Date(member.expires_at) < new Date()) {
        return Response.json({ error: 'Este convite expirou. Solicite um novo convite ao consultor.', expired: true }, { status: 403 });
      }

      return Response.json({
        success: true,
        member: {
          id: member.id,
          member_name: member.member_name,
          member_email: member.member_email,
          member_role: member.member_role,
          consultor_email: member.primary_user_email,
          expires_at: member.expires_at,
          status: member.status,
        }
      });
    }

    return Response.json({ error: 'Ação inválida. Use: generate | validate_token' }, { status: 400 });

  } catch (error) {
    console.error('[generateInviteLink] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});