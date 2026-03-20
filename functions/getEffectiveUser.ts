/**
 * getEffectiveUser — Retorna o email efetivo para queries de dados.
 *
 * Se o usuário for do tipo 'equipe', retorna o email do consultor vinculado.
 * Se não houver vínculo ativo, retorna erro.
 * Se for consultor/produtor, retorna o próprio usuário.
 *
 * Uso no frontend: base44.functions.invoke('getEffectiveUser', {})
 * Uso no backend: base44.functions.invoke('getEffectiveUser', {})
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Se não for equipe, retorna o próprio usuário
    if (user.user_type !== 'equipe') {
      return Response.json({
        email: user.email,
        actual_email: user.email,
        full_name: user.full_name,
        user_type: user.user_type,
        consultor_email: null,
        is_equipe: false,
      });
    }

    // Busca vínculo ativo com consultor
    const memberships = await base44.asServiceRole.entities.TeamMember.filter({
      member_email: user.email,
      status: 'Ativo',
    });

    if (memberships.length === 0) {
      // Pode estar pendente — tentar pendente também
      const pending = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email,
        status: 'Pendente',
      });

      if (pending.length === 0) {
        return Response.json({
          error: 'Nenhum vínculo ativo encontrado. Solicite ao consultor que ative seu acesso.',
          no_binding: true,
        }, { status: 403 });
      }

      // Está pendente — retorna o próprio email mas avisa
      return Response.json({
        email: user.email,
        actual_email: user.email,
        full_name: user.full_name,
        user_type: user.user_type,
        consultor_email: pending[0].primary_user_email,
        is_equipe: true,
        is_pending: true,
        warning: 'Seu acesso está pendente de ativação pelo consultor.',
      });
    }

    const membership = memberships[0];
    const consultorEmail = membership.primary_user_email;

    // Busca dados do consultor para retornar nome, etc.
    let consultorName = consultorEmail;
    try {
      const consultorUsers = await base44.asServiceRole.entities.User.filter({ email: consultorEmail });
      if (consultorUsers.length > 0) {
        consultorName = consultorUsers[0].full_name || consultorEmail;
      }
    } catch (e) {
      console.warn('[getEffectiveUser] Não foi possível buscar dados do consultor:', e.message);
    }

    return Response.json({
      email: consultorEmail,           // email para usar em queries (como se fosse o consultor)
      actual_email: user.email,        // email real do membro da equipe
      full_name: user.full_name,       // nome do membro
      user_type: user.user_type,       // 'equipe'
      consultor_email: consultorEmail, // alias explícito
      consultor_name: consultorName,
      member_role: membership.member_role,
      is_equipe: true,
      is_pending: false,
    });

  } catch (error) {
    console.error('[getEffectiveUser] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});