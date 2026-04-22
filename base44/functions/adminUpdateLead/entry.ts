/**
 * adminUpdateLead — Convida um lead e atualiza seu status
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { leadId, inviteEmail, inviteRole = 'user' } = body;

    if (!leadId || !inviteEmail) {
      return Response.json({ error: 'leadId e inviteEmail são obrigatórios' }, { status: 400 });
    }

    // 1. Get lead info
    const lead = await base44.asServiceRole.entities.LeadFormSubmission.get(leadId);
    if (!lead) {
      return Response.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // 2. Send custom invite email with correct URL
    await base44.functions.invoke('sendCustomInviteEmail', {
      email: inviteEmail,
      name: lead.nome || '',
      type: lead.perfil || 'consultor',
      plan: lead.plano || 'start'
    });

    // 3. Invite user via base44 platform
    await base44.users.inviteUser(inviteEmail, inviteRole);

    // 4. Update lead status
    await base44.asServiceRole.entities.LeadFormSubmission.update(leadId, {
      subscription_status: 'invited'
    });

    return Response.json({
      success: true,
      message: `Convite enviado para ${inviteEmail}`,
      email: inviteEmail
    });

  } catch (error) {
    console.error('[adminUpdateLead] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});