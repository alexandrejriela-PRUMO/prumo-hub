import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    // Busca todos os TeamMembers
    const teamMembers = await base44.asServiceRole.entities.TeamMember.list('-created_date', 500);
    
    // Coleta informações sobre os statuses
    const statuses = {};
    teamMembers.forEach(tm => {
      const status = tm.status || 'null';
      if (!statuses[status]) {
        statuses[status] = [];
      }
      statuses[status].push({
        member_email: tm.member_email,
        member_name: tm.member_name,
        invited_at: tm.invited_at,
      });
    });

    return Response.json({
      total_team_members: teamMembers.length,
      statuses_found: Object.keys(statuses),
      status_breakdown: statuses,
      sample_pending: statuses['Pendente'] || [],
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});