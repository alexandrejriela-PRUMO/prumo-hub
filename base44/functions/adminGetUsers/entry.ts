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
    const { type } = body;

    if (type === 'leads') {
      const leads = await base44.asServiceRole.entities.LeadFormSubmission.list('-submitted_at', 200);
      return Response.json({ leads });
    }

    // Busca usuários
    const users = await base44.asServiceRole.entities.User.list('-created_date', 200);

    // Busca membros de equipe para identificar o consultor principal
    const teamMembers = await base44.asServiceRole.entities.TeamMember.list('-created_date', 500);

    // Monta mapa: member_email -> { primary_user_email, primary_user_plano }
    // Primeiro indexamos consultores por email para pegar o plano deles
    const consultorMap = {};
    for (const u of users) {
      if (u.user_type === 'consultor' || u.user_type === 'produtor') {
        consultorMap[u.email] = u;
      }
    }

    // Mapa de email do membro → dados do consultor principal
    const memberToConsultor = {};
    for (const tm of teamMembers) {
      const primaryEmail = tm.primary_user_email || tm.consultor_email;
      if (primaryEmail && tm.member_email) {
        memberToConsultor[tm.member_email] = {
          primary_email: primaryEmail,
          primary_name: consultorMap[primaryEmail]?.full_name || primaryEmail,
          primary_plano: consultorMap[primaryEmail]?.plano || null,
          primary_max_properties: consultorMap[primaryEmail]?.max_properties || null,
          primary_max_users: consultorMap[primaryEmail]?.max_users || null,
        };
      }
    }

    // Enriquece usuários equipe/client_consultor com dados do consultor principal
    const enrichedUsers = users.map(u => {
      if ((u.user_type === 'equipe' || u.user_type === 'client_consultor') && memberToConsultor[u.email]) {
        const consultorData = memberToConsultor[u.email];
        return {
          ...u,
          primary_consultor_email: consultorData.primary_email,
          primary_consultor_name: consultorData.primary_name,
          // Plano herdado do consultor principal
          plano_display: consultorData.primary_plano,
        };
      }
      return u;
    });

    return Response.json({ users: enrichedUsers });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});