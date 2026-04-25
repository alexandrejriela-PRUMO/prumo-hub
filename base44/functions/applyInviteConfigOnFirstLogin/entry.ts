import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Procura por TeamMember pendente (user_type_applied=false) com este email
    const teamMembers = await base44.asServiceRole.entities.TeamMember.filter(
      { member_email: user.email, user_type_applied: false },
      '-invited_at',
      1
    );

    if (!teamMembers || teamMembers.length === 0) {
      return Response.json({ 
        applied: false, 
        reason: 'No pending team member found for this email' 
      });
    }

    const tm = teamMembers[0];

    // Verificar expiração do convite
    if (tm.expires_at && new Date(tm.expires_at) < new Date()) {
      return Response.json({
        applied: false,
        reason: 'Invite expired'
      });
    }

    const userType = tm.pending_user_type || 'equipe';
    const now = new Date().toISOString();

    // Aplica user_type correto via updateMe
    await base44.auth.updateMe({ user_type: userType });

    // Marca o TeamMember como aplicado e ativo
    await base44.asServiceRole.entities.TeamMember.update(tm.id, {
      user_type_applied: true,
      status: 'Ativo',
      activated_at: now,
      accepted_at: now,
    });

    console.log(`[applyInviteConfigOnFirstLogin] user_type '${userType}' aplicado para ${user.email}`);

    return Response.json({ 
      applied: true, 
      user_type: userType,
      message: `User ${user.email} configured as ${userType}`
    });

  } catch (error) {
    console.error('[applyInviteConfigOnFirstLogin]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});