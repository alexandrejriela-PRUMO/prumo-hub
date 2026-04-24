import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Only admin can restore users' }, { status: 403 });
    }

    // Atualizar o usuário admin
    const users = await base44.asServiceRole.entities.User.filter({ email: 'alexandrejriela@gmail.com' }, '-created_date', 1);
    
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Atualizar metadata do usuário como admin/owner
    const metadata = await base44.asServiceRole.entities.UserMetadata.filter({ user_email: 'alexandrejriela@gmail.com' }, '-created_date', 1);
    
    if (metadata && metadata.length > 0) {
      await base44.asServiceRole.entities.UserMetadata.update(metadata[0].id, {
        user_type: 'admin',
        subscription_status: 'active',
        plano: 'enterprise',
        max_properties: 1000,
        max_users: 100,
      });
    } else {
      // Criar metadata se não existir
      await base44.asServiceRole.entities.UserMetadata.create({
        user_email: 'alexandrejriela@gmail.com',
        user_id: users[0].id,
        user_type: 'admin',
        subscription_status: 'active',
        plano: 'enterprise',
        max_properties: 1000,
        max_users: 100,
      });
    }

    return Response.json({ 
      success: true, 
      message: 'alexandrejriela@gmail.com foi restaurado como admin/owner',
      user: { email: users[0].email, role: users[0].role }
    });
  } catch (error) {
    console.error('Erro ao restaurar admin:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});