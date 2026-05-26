/**
 * debugFindLegacyUrls — Varre TODAS as entidades buscando qualquer campo
 * que contenha URLs com media.base44.com ou supabase.co.
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const ENTITIES = [
    'Document', 'Mapping', 'License', 'PRAD', 'ClientContract', 'Georeferencing',
    'Expense', 'Process', 'EnvironmentalAlert', 'Budget', 'CARManagement', 'ART',
    'ConsultorCharge', 'CarbonCredit', 'PSAContract', 'EnvironmentalEasement',
    'RuralCredit', 'HarvestLoss', 'Certification', 'GreenLoan', 'TaxIncentive',
    'Property', 'ClimateMonitoring', 'UnifiedDocument', 'AgendaEvent', 'ClientCRM',
    'ChecklistTemplate', 'ProjectChecklist', 'BudgetTemplate', 'ContractTemplate',
    'UserMetadata', 'TeamMember', 'Invoice', 'Request', 'SupportTicket',
  ];

  const PATTERNS = ['media.base44.com', 'supabase.co'];

  // Recursively find all string values in an object that match any pattern
  function findUrls(obj, path = '') {
    const hits = [];
    if (!obj || typeof obj !== 'object') return hits;
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => hits.push(...findUrls(item, `${path}[${i}]`)));
      return hits;
    }
    for (const [key, val] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      if (typeof val === 'string') {
        if (PATTERNS.some(p => val.includes(p))) {
          hits.push({ field: fullPath, url: val });
        }
      } else if (val && typeof val === 'object') {
        hits.push(...findUrls(val, fullPath));
      }
    }
    return hits;
  }

  const results = {};
  let grandTotal = 0;

  for (const entityName of ENTITIES) {
    try {
      const entity = base44.asServiceRole.entities[entityName];
      if (!entity) continue;

      const records = await entity.list('-created_date', 5000);
      const entityHits = [];

      for (const record of records) {
        const hits = findUrls(record);
        if (hits.length > 0) {
          entityHits.push({
            id: record.id,
            hits: hits.map(h => ({ field: h.field, url: h.url.slice(0, 200) }))
          });
        }
      }

      if (entityHits.length > 0) {
        results[entityName] = entityHits;
        grandTotal += entityHits.reduce((sum, r) => sum + r.hits.length, 0);
        console.log(`[found] ${entityName}: ${entityHits.length} registros com ${entityHits.reduce((s,r)=>s+r.hits.length,0)} URLs`);
      } else {
        console.log(`[clean] ${entityName}: ${records.length} registros, nenhuma URL legada`);
      }
    } catch (e) {
      console.error(`[error] ${entityName}: ${e.message}`);
      results[`${entityName}_error`] = e.message;
    }
  }

  return Response.json({ grand_total_urls: grandTotal, results });
});