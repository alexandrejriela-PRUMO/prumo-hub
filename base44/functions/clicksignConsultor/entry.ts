/**
 * ARQUIVO DESATIVADO — clicksignConsultor
 *
 * Modelo legado (BYOA: cada consultor com API Key própria da Clicksign, API v2).
 * Substituído pelo modelo centralizado em base44/functions/clicksignEnvelope/entry.ts
 * (uma conta única da PRUMO, API v3 "Envelope", com suporte a WhatsApp).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  return Response.json({ error: 'Esta function foi desativada. Use clicksignEnvelope.' }, { status: 410 });
});
