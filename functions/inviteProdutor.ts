import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (user.user_type !== 'consultor') {
      return Response.json({ error: 'Apenas consultores podem convidar produtores.' }, { status: 403 });
    }

    const { email, property_id } = await req.json();

    if (!email || !property_id) {
      return Response.json({ error: 'email e property_id são obrigatórios.' }, { status: 400 });
    }

    // Validate that this property belongs to the consultor
    const properties = await base44.asServiceRole.entities.Property.filter({ consultor_email: user.email });
    const property = properties.find(p => p.id === property_id);

    if (!property) {
      return Response.json({ error: 'Propriedade não encontrada ou não vinculada a este consultor.' }, { status: 403 });
    }

    // Invite the user as a regular "user" role
    await base44.asServiceRole.users.inviteUser(email, 'user');

    // Set owner_email on the property if not already set
    if (!property.owner_email || property.owner_email === user.email) {
      await base44.asServiceRole.entities.Property.update(property_id, { owner_email: email });
    }

    return Response.json({ success: true, message: `Convite enviado para ${email} com sucesso!` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});