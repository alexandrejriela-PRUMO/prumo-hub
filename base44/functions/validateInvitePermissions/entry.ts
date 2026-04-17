import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const INVITE_RULES = {
  consultor: ['equipe', 'client_consultor'],
  produtor: ['equipe'],
  equipe: [],
  client_consultor: [],
};

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
    const { targetUserType } = body;

    if (!targetUserType) {
      return Response.json({ error: 'targetUserType é obrigatório' }, { status: 400 });
    }

    const allowedTypes = INVITE_RULES[user.user_type] || [];
    const canInvite = allowedTypes.includes(targetUserType);

    if (!canInvite) {
      return Response.json({
        allowed: false,
        message: `Usuários do tipo '${user.user_type}' não podem convidar '${targetUserType}'`,
      });
    }

    return Response.json({
      allowed: true,
      message: 'Permissão concedida para convidar este tipo de usuário',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});