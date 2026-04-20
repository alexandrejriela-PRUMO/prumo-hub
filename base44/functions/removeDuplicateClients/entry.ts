import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { consultor_email } = await req.json();
    const targetEmail = consultor_email || user.email;

    // Busca todos os clientes do consultor
    const allClients = await base44.entities.ClientCRM.filter({
      consultor_email: targetEmail
    });

    // Agrupa por email do cliente
    const clientsByEmail = new Map();
    allClients.forEach(client => {
      if (client.client_email) {
        if (!clientsByEmail.has(client.client_email)) {
          clientsByEmail.set(client.client_email, []);
        }
        clientsByEmail.get(client.client_email).push(client);
      }
    });

    // Identifica duplicatas e remove
    let removedCount = 0;
    for (const [email, clients] of clientsByEmail.entries()) {
      if (clients.length > 1) {
        // Mantém o cliente que tem property_id (vinculado à propriedade)
        const withProperty = clients.filter(c => c.property_id);
        const keepClient = withProperty.length > 0 ? withProperty[0] : clients[0];

        // Remove os demais
        for (const client of clients) {
          if (client.id !== keepClient.id) {
            await base44.entities.ClientCRM.delete(client.id);
            removedCount++;
          }
        }
      }
    }

    return Response.json({
      success: true,
      message: `Removidas ${removedCount} duplicata(s)`,
      removed: removedCount
    });
  } catch (error) {
    console.error('Erro ao remover duplicatas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});