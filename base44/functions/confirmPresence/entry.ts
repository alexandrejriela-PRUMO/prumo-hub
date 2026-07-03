/**
 * confirmPresence — Endpoint público para a página de confirmação de presença.
 * Recebe um confirmation_token (e opcionalmente uma resposta) e usa asServiceRole
 * para localizar e atualizar apenas o registro de interação correspondente,
 * sem expor a listagem completa de ClientCRM ao cliente.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ success: false, error: 'method_not_allowed' }, { status: 405 });
    }

    const { token, response } = await req.json();
    if (!token) {
      return Response.json({ success: false, error: 'missing_token' }, { status: 400 });
    }
    if (response && !['confirmed', 'declined'].includes(response)) {
      return Response.json({ success: false, error: 'invalid_response' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const crms = await base44.asServiceRole.entities.ClientCRM.list();

    let match = null;
    for (const crm of crms) {
      const interactions = crm.interactions || [];
      const found = interactions.find(i => i.confirmation_token === token);
      if (found) { match = { crm, interactions, interaction: found }; break; }
    }

    if (!match) {
      return Response.json({ success: false, error: 'not_found' }, { status: 404 });
    }

    const { crm, interactions, interaction } = match;
    const payload = {
      title: interaction.title || null,
      meeting_datetime: interaction.meeting_datetime || null,
      description: interaction.description || null,
    };

    // Já respondido: não sobrescreve, apenas informa o status atual.
    if (interaction.confirmation_status === 'confirmed' || interaction.confirmation_status === 'declined') {
      return Response.json({ success: true, status: interaction.confirmation_status, ...payload });
    }

    if (!response) {
      return Response.json({ success: true, status: 'pending', ...payload });
    }

    const updated = interactions.map(i =>
      i.confirmation_token === token
        ? { ...i, confirmation_status: response, responded_at: new Date().toISOString() }
        : i
    );
    await base44.asServiceRole.entities.ClientCRM.update(crm.id, { interactions: updated });

    return Response.json({ success: true, status: response, ...payload });
  } catch (error) {
    console.error('[ConfirmPresence] Erro:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
