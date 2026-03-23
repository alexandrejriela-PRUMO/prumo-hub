/**
 * ARQUIVO DESATIVADO — notificationMonitor
 *
 * Este arquivo continha código frontend (localStorage, base44.entities sem serviceRole)
 * que é inválido em contexto de backend/Deno.
 *
 * A lógica de monitoramento foi incorporada em:
 * - checkExpiryNotifications (agendado via automação)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (_req) => {
  return Response.json({
    disabled: true,
    message: 'Este endpoint foi desativado. Use checkExpiryNotifications para monitoramento de vencimentos.'
  }, { status: 410 });
});