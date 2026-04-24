import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    console.log(`[manualActivateNexanoUser] Ativando: ${email}`);

    // Buscar lead do Nexano
    const leads = await base44.asServiceRole.entities.LeadFormSubmission.filter(
      { email },
      '-created_date',
      1
    );

    if (!leads || leads.length === 0) {
      return Response.json({ error: 'Lead não encontrado', email }, { status: 404 });
    }

    const lead = leads[0];

    if (!lead.parceiro || !lead.parceiro.startsWith('nexano_')) {
      return Response.json({ error: 'Lead não é do Nexano', email }, { status: 400 });
    }

    console.log(`[manualActivateNexanoUser] Lead encontrado: ${lead.plano} | ${lead.user_type}`);

    // Buscar ou criar UserMetadata
    const existingMeta = await base44.asServiceRole.entities.UserMetadata.filter({ user_email: email });

    if (existingMeta && existingMeta.length > 0) {
      await base44.asServiceRole.entities.UserMetadata.update(existingMeta[0].id, {
        user_type: lead.user_type || 'produtor',
        plano: lead.plano,
        subscription_status: 'active',
        max_properties: lead.max_properties || 5,
        max_users: lead.max_users || 1,
      });
      console.log(`[manualActivateNexanoUser] UserMetadata atualizado: ${email}`);
    } else {
      // Buscar user_id
      const users = await base44.asServiceRole.entities.User.filter({ email });
      const userId = users && users.length > 0 ? users[0].id : null;

      await base44.asServiceRole.entities.UserMetadata.create({
        user_email: email,
        user_id: userId,
        user_type: lead.user_type || 'produtor',
        plano: lead.plano,
        subscription_status: 'active',
        max_properties: lead.max_properties || 5,
        max_users: lead.max_users || 1,
      });
      console.log(`[manualActivateNexanoUser] UserMetadata criado: ${email}`);
    }

    // Atualizar lead status
    await base44.asServiceRole.entities.LeadFormSubmission.update(lead.id, {
      subscription_status: 'active',
    });

    return Response.json({
      success: true,
      email,
      plano: lead.plano,
      user_type: lead.user_type,
      message: `Usuário ${email} ativado com sucesso!`,
    }, { status: 200 });

  } catch (error) {
    console.error('[manualActivateNexanoUser] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});