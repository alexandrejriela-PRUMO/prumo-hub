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
      const [leads, users] = await Promise.all([
        base44.asServiceRole.entities.LeadFormSubmission.list('-submitted_at', 200),
        base44.asServiceRole.entities.User.list('-created_date', 200),
      ]);
      const activeEmails = new Set(users.map(u => u.email?.toLowerCase()).filter(Boolean));
      const filteredLeads = leads.filter(l => !activeEmails.has(l.email?.toLowerCase()));
      return Response.json({ leads: filteredLeads });
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
      
      // Filtra por status 'Pendente' (case-sensitive)
      const pendingTeamMembers = teamMembers.filter(tm => 
        tm.status === 'Pendente'
      );
      
      // Busca metadados dos principais para herdar plano nos convites pendentes
      const allMetaForPending = await base44.asServiceRole.entities.UserMetadata.list('-updated_date', 500);
      const metaByEmailForPending = {};
      for (const m of allMetaForPending) {
        if (m.user_email) metaByEmailForPending[m.user_email.toLowerCase()] = m;
      }

      pendingInvites = pendingTeamMembers
        .map(tm => {
          const userType = tm.pending_user_type || 'equipe';
          // Herdar plano do principal (consultor ou produtor)
          const primaryEmail = (tm.primary_user_email || tm.consultor_email || '').toLowerCase();
          const primaryMeta = metaByEmailForPending[primaryEmail];
          const plan = primaryMeta?.plano || 'start';
          
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
            primary_consultor_email: tm.primary_user_email || tm.consultor_email,
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

    // Busca metadados dos usuários (plano, tipo, etc)
    const userMetadataList = await base44.asServiceRole.entities.UserMetadata.list('-updated_date', 500);
    const metadataMap = {};
    for (const meta of userMetadataList) {
     metadataMap[meta.user_email?.toLowerCase()] = meta;
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

    // Enriquece usuários com metadados salvos (plano, tipo, limits, etc)
    const enrichedUsers = users.map(u => {
      const metadata = metadataMap[u.email?.toLowerCase()];
      const baseUser = { ...u };
      
      // Se tem metadata, sobrescreve com os dados salvos
      if (metadata) {
        baseUser.plano = metadata.plano;
        baseUser.user_type = metadata.user_type;
        baseUser.max_properties = metadata.max_properties;
        baseUser.max_users = metadata.max_users;
        baseUser.subscription_status = metadata.subscription_status;
      }
      
      // Adiciona dados do consultor principal para equipe/client
      if ((baseUser.user_type === 'equipe' || baseUser.user_type === 'client_consultor') && memberToConsultor[baseUser.email]) {
        const consultorData = memberToConsultor[baseUser.email];
        return {
          ...baseUser,
          primary_consultor_email: consultorData.primary_email,
          primary_consultor_name: consultorData.primary_name,
          // Plano herdado do consultor principal (se não tem metadata próprio)
          plano_display: baseUser.plano || consultorData.primary_plano,
        };
      }
      return baseUser;
    });

    // Combine usuários criados + convites pendentes, removendo duplicatas
    // (se um user já existe em User, não incluir o convite pendente)
    const existingEmails = new Set(enrichedUsers.map(u => u.email.toLowerCase()));
    
    // Deduplica também os convites pendentes entre si (mesmo email não deve aparecer 2x)
    const seenPendingEmails = new Set();
    const uniquePendingInvites = pendingInvites.filter(p => {
      const emailLower = p.email.toLowerCase();
      // Se já existe como usuário real, ignora
      if (existingEmails.has(emailLower)) return false;
      // Se já vimos esse email pendente, ignora
      if (seenPendingEmails.has(emailLower)) return false;
      seenPendingEmails.add(emailLower);
      return true;
    });
    
    const finalUsers = !type || type === 'users' ? [...enrichedUsers, ...uniquePendingInvites] : enrichedUsers;

    return Response.json({ 
      users: finalUsers,
      _debug: {
        total_users: enrichedUsers.length,
        pending_invites_found: pendingInvites.length,
        pending_invites_after_dedup: uniquePendingInvites.length,
        pending_invite_emails: uniquePendingInvites.map(p => p.email),
        existing_emails_sample: Array.from(existingEmails).slice(0, 5)
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});