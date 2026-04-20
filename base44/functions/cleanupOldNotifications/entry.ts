/**
 * cleanupOldNotifications — Remove notificações lidas com mais de 90 dias.
 * Executado semanalmente para evitar crescimento irrestrito da coleção InAppNotification.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Busca notificações lidas antigas (em lotes de 200 para evitar timeout)
    const old = await base44.asServiceRole.entities.InAppNotification.filter(
      { read: true },
      'created_date',
      200
    );

    const toDelete = old.filter(n => n.created_date < cutoff);

    let deleted = 0;
    for (const n of toDelete) {
      try {
        await base44.asServiceRole.entities.InAppNotification.delete(n.id);
        deleted++;
      } catch (e) {
        console.warn(`[Cleanup] Erro ao deletar ${n.id}:`, e.message);
      }
    }

    console.log(`[Cleanup] Notificações deletadas: ${deleted} (cutoff: ${cutoff})`);
    return Response.json({ success: true, deleted, cutoff });

  } catch (error) {
    console.error('[Cleanup] Erro:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});