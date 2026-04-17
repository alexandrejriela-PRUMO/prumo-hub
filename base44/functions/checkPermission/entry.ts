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

    const body = await req.json().catch(() => ({}));
    const { moduleKey, field = 'view' } = body;

    if (!moduleKey) {
      return Response.json({ error: 'moduleKey é obrigatório' }, { status: 400 });
    }

    // Se não é equipe, tem acesso completo
    if (user.user_type !== 'equipe') {
      return Response.json({ 
        allowed: true, 
        reason: 'Usuário não é equipe - acesso completo' 
      });
    }

    // Busca permissões do membro da equipe
    const teamMembers = await base44.asServiceRole.entities.TeamMember.filter(
      { member_email: user.email },
      '-created_date',
      1
    );

    if (!teamMembers || teamMembers.length === 0) {
      return Response.json({ 
        allowed: false, 
        reason: 'Nenhum registro de equipe encontrado' 
      });
    }

    const teamMember = teamMembers[0];
    const permissions = teamMember.permissions || {};
    const modulePerms = permissions[moduleKey];

    if (!modulePerms) {
      return Response.json({ 
        allowed: false, 
        reason: `Módulo '${moduleKey}' não configurado` 
      });
    }

    const allowed = modulePerms[field] === true;

    return Response.json({
      allowed,
      module: moduleKey,
      field,
      permissions: modulePerms,
      reason: allowed 
        ? `Permissão '${field}' concedida para '${moduleKey}'`
        : `Permissão '${field}' negada para '${moduleKey}'`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});