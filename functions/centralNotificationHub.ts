/**
 * centralNotificationHub — Proxy para sendEntityNotification.
 * Mantido para compatibilidade com automações existentes.
 * Toda lógica foi consolidada em sendEntityNotification.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    if (!body?.event?.entity_name || !body?.event?.type) {
      return Response.json({ error: 'Payload inválido: event.entity_name e event.type são obrigatórios' }, { status: 400 });
    }

    // Delega para sendEntityNotification (função principal consolidada)
    const response = await base44.asServiceRole.functions.invoke('sendEntityNotification', body);

    console.log(`[Hub→Notif] Delegado: ${body.event.entity_name}.${body.event.type}`);
    return Response.json(response.data ?? { ok: true });

  } catch (error) {
    console.error('[Hub] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});