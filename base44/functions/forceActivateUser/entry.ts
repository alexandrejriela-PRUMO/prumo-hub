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
    const { email, plano = 'unico', user_type = 'produtor', max_properties = 1, max_users = 1 } = body;

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    console.log(`[forceActivateUser] Ativando: ${email} | Plano: ${plano} | Tipo: ${user_type}`);

    // Buscar usuário
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (!users || users.length === 0) {
      return Response.json({ error: 'Usuário não encontrado', email }, { status: 404 });
    }

    const user = users[0];

    // Atualizar User
    await base44.asServiceRole.entities.User.update(user.id, {
      user_type,
      subscription_status: 'active',
    });
    console.log(`[forceActivateUser] User atualizado: ${email}`);

    // Buscar ou criar UserMetadata
    const existingMeta = await base44.asServiceRole.entities.UserMetadata.filter({ user_email: email });

    if (existingMeta && existingMeta.length > 0) {
      await base44.asServiceRole.entities.UserMetadata.update(existingMeta[0].id, {
        user_type,
        plano,
        subscription_status: 'active',
        max_properties,
        max_users,
      });
      console.log(`[forceActivateUser] UserMetadata atualizado: ${email}`);
    } else {
      await base44.asServiceRole.entities.UserMetadata.create({
        user_email: email,
        user_id: user.id,
        user_type,
        plano,
        subscription_status: 'active',
        max_properties,
        max_users,
      });
      console.log(`[forceActivateUser] UserMetadata criado: ${email}`);
    }

    // Criar lead se não existir
    const leads = await base44.asServiceRole.entities.LeadFormSubmission.filter({ email });
    if (!leads || leads.length === 0) {
      await base44.asServiceRole.entities.LeadFormSubmission.create({
        perfil: user_type,
        nome: user.full_name || email,
        email,
        telefone: '',
        submitted_at: new Date().toISOString(),
        parceiro: `manual_${user_type}`,
        plano,
        user_type,
        subscription_status: 'active',
        max_properties,
        max_users,
      });
      console.log(`[forceActivateUser] Lead criado: ${email}`);
    }

    return Response.json({
      success: true,
      email,
      plano,
      user_type,
      message: `Usuário ${email} ativado com sucesso!`,
    }, { status: 200 });

  } catch (error) {
    console.error('[forceActivateUser] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});