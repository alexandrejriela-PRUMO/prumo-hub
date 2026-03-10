import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === 'list') {
    const members = await base44.asServiceRole.entities.TeamMember.filter({ primary_user_email: user.email });
    return Response.json({ members });
  }

  if (action === 'invite') {
    const { member_email, member_name, member_role } = body;

    // Check if already exists
    const existing = await base44.asServiceRole.entities.TeamMember.filter({
      primary_user_email: user.email,
      member_email,
    });

    if (existing.length > 0) {
      return Response.json({ error: 'Este membro já foi convidado.' }, { status: 400 });
    }

    // Create team member record
    const member = await base44.asServiceRole.entities.TeamMember.create({
      primary_user_email: user.email,
      member_email,
      member_name: member_name || '',
      member_role: member_role || 'Outro',
      status: 'Pendente',
      invited_at: new Date().toISOString(),
    });

    // Invite user to the platform
    await base44.users.inviteUser(member_email, 'user');

    return Response.json({ success: true, member });
  }

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

  if (action === 'activate') {
    const { member_id } = body;
    await base44.asServiceRole.entities.TeamMember.update(member_id, { status: 'Ativo' });
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Ação inválida' }, { status: 400 });
});