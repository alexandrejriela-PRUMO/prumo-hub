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

    // Procura por TeamMember pendente com este email (sem filtrar user_type_applied
    // pois o campo pode não ter sido salvo explicitamente como false)
    const teamMembers = await base44.asServiceRole.entities.TeamMember.filter(
      { member_email: user.email },
      '-invited_at',
      10
    );

    // Filtra: apenas os que ainda não foram aplicados
    const pending = (teamMembers || []).filter(tm => tm.user_type_applied !== true);

    if (pending.length === 0) {
      return Response.json({ 
        applied: false, 
        reason: 'No pending team member found for this email' 
      });
    }

    const tm = pending[0];

    // Verificar expiração do convite
    if (tm.expires_at && new Date(tm.expires_at) < new Date()) {
      return Response.json({
        applied: false,
        reason: 'Invite expired'
      });
    }

    const userType = tm.pending_user_type || 'equipe';
    const now = new Date().toISOString();

    // 1. Atualiza user_type na sessão/User
    await base44.auth.updateMe({ user_type: userType });

    // 2. Persiste no UserMetadata (fonte da verdade usada pelo app)
    const existingMeta = await base44.asServiceRole.entities.UserMetadata.filter(
      { user_email: user.email },
      '-created_date',
      1
    );

    // Buscar plano do consultor/produtor principal para herdar
    const primaryEmail = tm.primary_user_email || tm.consultor_email;
    let primaryPlano = 'start';
    try {
      const primaryMeta = await base44.asServiceRole.entities.UserMetadata.filter(
        { user_email: primaryEmail }, '-created_date', 1
      );
      if (primaryMeta && primaryMeta.length > 0 && primaryMeta[0].plano) {
        primaryPlano = primaryMeta[0].plano;
      }
    } catch (e) {
      console.warn('[applyInviteConfigOnFirstLogin] Não foi possível buscar plano do principal:', e.message);
    }

    if (existingMeta && existingMeta.length > 0) {
      await base44.asServiceRole.entities.UserMetadata.update(existingMeta[0].id, {
        user_type: userType,
        subscription_status: 'active',
        primary_consultor_email: primaryEmail,
        plano: primaryPlano,
      });
    } else {
      await base44.asServiceRole.entities.UserMetadata.create({
        user_email: user.email,
        user_type: userType,
        subscription_status: 'active',
        primary_consultor_email: primaryEmail,
        plano: primaryPlano,
        max_properties: 0,
        max_users: 0,
      });
    }

    // 3. Marca o TeamMember como aplicado e ativo
    await base44.asServiceRole.entities.TeamMember.update(tm.id, {
      user_type_applied: true,
      status: 'Ativo',
      activated_at: now,
      accepted_at: now,
    });

    console.log(`[applyInviteConfigOnFirstLogin] user_type '${userType}' aplicado para ${user.email}, consultor: ${tm.primary_user_email || tm.consultor_email}`);

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