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

    // Se o usuário já tem user_type definido, não é primeiro login
    if (user.user_type) {
      return Response.json({ 
        applied: false, 
        reason: 'User already has user_type configured' 
      });
    }

    // Procura por TeamMember pendente com este email
    const teamMembers = await base44.asServiceRole.entities.TeamMember.filter(
      { member_email: user.email, status: 'Pendente' },
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

    // Extrai as configurações do convite
    const configToApply = {
      user_type: tm.pending_user_type || 'consultor',
      plano: tm.pending_user_type === 'produtor' ? 'unico' : 'start',
    };

    // Aplica as configurações no User via updateMe
    await base44.auth.updateMe(configToApply);

    // Marca o TeamMember como "aplicado" para evitar reprocessamento
    await base44.asServiceRole.entities.TeamMember.update(tm.id, {
      user_type_applied: true,
    });

    return Response.json({ 
      applied: true, 
      config: configToApply,
      message: `User ${user.email} configured as ${configToApply.user_type} with plan ${configToApply.plano}`
    });

  } catch (error) {
    console.error('[applyInviteConfigOnFirstLogin]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});