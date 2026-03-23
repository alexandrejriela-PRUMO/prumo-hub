/**
 * ARQUIVO DESATIVADO — notificationTrigger
 *
 * Este arquivo continha código Node.js (require/module.exports) inválido em Deno.
 * Foi desativado para evitar erros de runtime.
 *
 * A lógica de alertas ambientais e climáticos foi incorporada em:
 * - sendEntityNotification (automação de entidade)
 * - checkExpiryNotifications (agendado)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (_req) => {
  return Response.json({
    disabled: true,
    message: 'Este endpoint foi desativado. Use sendEntityNotification ou checkExpiryNotifications.'
  }, { status: 410 });
});