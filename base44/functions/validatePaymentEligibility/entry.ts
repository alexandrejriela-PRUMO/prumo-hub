import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAYING_USERS = ['consultor', 'produtor'];

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

    const canPay = PAYING_USERS.includes(user.user_type);

    if (!canPay) {
      return Response.json({
        eligible: false,
        message: `Usuários do tipo '${user.user_type}' não podem fazer pagamentos. Apenas Consultor e Produtor podem pagar.`,
        userType: user.user_type,
      });
    }

    return Response.json({
      eligible: true,
      message: 'Usuário elegível para pagamento',
      userType: user.user_type,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});