/**
 * debugUrlSamples — Coleta amostras de URLs de arquivo do banco para diagnóstico.
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const samples = {};

  // Mapping - files
  try {
    const recs = await base44.asServiceRole.entities.Mapping.list('-created_date', 10);
    samples.Mapping = [];
    for (const r of recs) {
      if (r.files?.length) samples.Mapping.push(...r.files.slice(0,2).map(f => ({ id: r.id, field: 'files', url: f.url })));
      if (r.dji_files?.length) samples.Mapping.push(...r.dji_files.slice(0,2).map(f => ({ id: r.id, field: 'dji_files', url: f.file_url })));
    }
  } catch(e) { samples.Mapping_err = e.message; }

  // License - documents + updates
  try {
    const recs = await base44.asServiceRole.entities.License.list('-created_date', 10);
    samples.License = [];
    for (const r of recs) {
      if (r.documents?.length) samples.License.push(...r.documents.slice(0,2).map(f => ({ id: r.id, field: 'documents', url: f.url })));
      if (r.updates?.length) samples.License.push(...r.updates.slice(0,2).map(f => ({ id: r.id, field: 'updates.file_url', url: f.file_url })));
    }
  } catch(e) { samples.License_err = e.message; }

  // PRAD - documents + annual_reports
  try {
    const recs = await base44.asServiceRole.entities.PRAD.list('-created_date', 10);
    samples.PRAD = [];
    for (const r of recs) {
      if (r.documents?.length) samples.PRAD.push(...r.documents.slice(0,2).map(f => ({ id: r.id, field: 'documents', url: f.url })));
      if (r.annual_reports?.length) samples.PRAD.push(...r.annual_reports.slice(0,2).map(f => ({ id: r.id, field: 'annual_reports.file_url', url: f.file_url })));
    }
  } catch(e) { samples.PRAD_err = e.message; }

  // Process - updates
  try {
    const recs = await base44.asServiceRole.entities.Process.list('-created_date', 10);
    samples.Process = [];
    for (const r of recs) {
      if (r.updates?.length) samples.Process.push(...r.updates.slice(0,3).map(f => ({ id: r.id, field: 'updates.file_url', url: f.file_url })));
    }
  } catch(e) { samples.Process_err = e.message; }

  return Response.json(samples);
});