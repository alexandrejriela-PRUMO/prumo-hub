import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admins podem atualizar usuários
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, data } = await req.json();

    if (!userId || !data) {
      return Response.json({ error: 'Missing userId or data' }, { status: 400 });
    }

    // Busca ou cria registro de metadata do usuário
    const existingMetadata = await base44.asServiceRole.entities.UserMetadata.filter({ user_id: userId }, 'created_date', 1);
    
    const metadataPayload = {
      user_id: userId,
      user_email: data.user_email || '',
      plano: data.plano,
      user_type: data.user_type,
      max_properties: data.max_properties,
      max_users: data.max_users,
      subscription_status: data.subscription_status,
      primary_consultor_email: data.primary_consultor_email || null,
    };

    if (existingMetadata && existingMetadata.length > 0) {
      // Atualiza metadata existente
      await base44.asServiceRole.entities.UserMetadata.update(existingMetadata[0].id, metadataPayload);
    } else {
      // Cria novo registro de metadata
      await base44.asServiceRole.entities.UserMetadata.create(metadataPayload);
    }

    return Response.json({ success: true, message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error('[adminUpdateUser]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});