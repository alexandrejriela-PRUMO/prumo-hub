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

    if (type === 'clients') {
      const users = await base44.asServiceRole.entities.User.list('-created_date', 200);
      const clients = users.filter(u => u.user_type === 'client_consultor');
      return Response.json({ clients });
    }
    
    // Log: entramos na seção de usuários
    console.log('[adminGetUsers] Processing users request...');

    // Busca usuários
    const users = await base44.asServiceRole.entities.User.list('-created_date', 200);

    // Se type === 'users', inclui também TeamMembers pendentes (convites não aceitos)
    let pendingInvites = [];
    if (!type || type === 'users') {
      const teamMembers = await base44.asServiceRole.entities.TeamMember.list('-invited_at', 500);
      console.log('[adminGetUsers] Total TeamMembers fetched:', teamMembers.length);
      
      // Log dos status encontrados (para debug)
      const statuses = new Set(teamMembers.map(tm => tm.status).filter(Boolean));
      console.log('[adminGetUsers] Found statuses:', Array.from(statuses));
      
      // Filtra por status 'Pendente' ou 'pending' (case-insensitive)
      const pendingTeamMembers = teamMembers.filter(tm => 
        tm.status && (tm.status === 'Pendente' || tm.status.toLowerCase() === 'pendente')
      );
      console.log('[adminGetUsers] Pending TeamMembers (case-sensitive):', pendingTeamMembers.length);
      
      // Se não encontrou, tenta sem case-sensitivity e busca por qualquer coisa com "pend"
      if (pendingTeamMembers.length === 0) {
        const alternativePending = teamMembers.filter(tm => 
          !tm.status || tm.status.toLowerCase().includes('pend')
        );
        console.log('[adminGetUsers] Alternative pending matches:', alternativePending.length);
        if (alternativePending.length > 0) {
          pendingTeamMembers.push(...alternativePending);
        }
      }
      
      console.log('[adminGetUsers] Final pending TeamMembers:', pendingTeamMembers.length);
      
      pendingInvites = pendingTeamMembers
        .map(tm => {
          // Tenta usar pending_user_type ou default baseado em tipo
          const userType = tm.pending_user_type || 'consultor';
          const plan = userType === 'produtor' ? 'unico' : 'start';
          
          return {
            id: `pending_${tm.id}`,
            email: tm.member_email,
            full_name: tm.member_name || tm.member_email,
            user_type: userType,
            plano: plan,
            role: 'user',
            status: 'Pendente',
            subscription_status: 'pending_invite',
            is_pending_invite: true,
            invite_data: {
              team_member_id: tm.id,
              invited_at: tm.invited_at,
              expires_at: tm.expires_at,
              member_role: tm.member_role,
            }
          };
        });
      
      console.log('[adminGetUsers] Pending invites mapped:', pendingInvites.length);
    }

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

    // Combine usuários criados + convites pendentes, removendo duplicatas
    // (se um user já existe em User, não incluir o convite pendente)
    const existingEmails = new Set(enrichedUsers.map(u => u.email.toLowerCase()));
    const uniquePendingInvites = pendingInvites.filter(p => !existingEmails.has(p.email.toLowerCase()));
    
    const finalUsers = !type || type === 'users' ? [...enrichedUsers, ...uniquePendingInvites] : enrichedUsers;

    return Response.json({ 
      users: finalUsers,
      _debug: {
        total_users: enrichedUsers.length,
        pending_invites_found: pendingInvites.length,
        pending_invites_after_dedup: uniquePendingInvites.length,
        pending_invite_emails: uniquePendingInvites.map(p => p.email)
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});