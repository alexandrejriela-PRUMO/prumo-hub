/**
 * ARQUIVO DESATIVADO — setupClicksignContract
 *
 * Fluxo legado e quebrado (enviava HTML bruto disfarçado de PDF para a Clicksign,
 * e gravava status de assinatura em campos/entidade que o webhook clicksignWebhook
 * não lê). Nunca esteve conectado a nenhum botão funcional na UI.
 *
 * O fluxo correto e ativo de assinatura digital está em:
 * - src/components/contracts/ClicksignContractButton.jsx (UI)
 * - base44/functions/clicksignConsultor/entry.ts (setup/API key/envio)
 * - base44/functions/clicksignWebhook/entry.ts (callback de status)
 * - base44/entities/DigitalSignature.jsonc (rastreamento de assinaturas)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  return Response.json({ error: 'Esta function foi desativada. Use clicksignConsultor.' }, { status: 410 });
});
