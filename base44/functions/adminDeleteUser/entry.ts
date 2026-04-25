import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { userId } = body;

    if (!userId) {
      return Response.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    // Se for um convite pendente (id começa com "pending_"), deletar o TeamMember
    if (String(userId).startsWith('pending_')) {
      const teamMemberId = String(userId).replace('pending_', '');
      await base44.asServiceRole.entities.TeamMember.delete(teamMemberId);
      return Response.json({
        received: true,
        message: 'Convite pendente removido com sucesso.',
        userId,
      }, { status: 200 });
    }

    // Deletar usuário real
    await base44.asServiceRole.entities.User.delete(userId);

    return Response.json({
      received: true,
      message: 'Usuário deletado com sucesso.',
      userId,
    }, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});