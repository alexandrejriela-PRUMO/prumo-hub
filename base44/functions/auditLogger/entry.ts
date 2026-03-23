import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ENTITY_LABELS = {
  Property: 'Propriedade',
  Process: 'Processo',
  License: 'Licença Ambiental',
  PRAD: 'PRAD',
  ClientCRM: 'CRM do Cliente',
  Document: 'Documento',
  Mapping: 'Mapeamento',
  Georeferencing: 'Georreferenciamento',
  CarbonCredit: 'Crédito de Carbono',
  Request: 'Requerimento',
  Georeferencing: 'Georreferenciamento',
};

const ACTION_LABELS = {
  create: 'criado(a)',
  update: 'atualizado(a)',
  delete: 'excluído(a)',
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  let logEntry;

  if (body.event) {
    // Called from entity automation
    const { event, data, payload_too_large } = body;
    const entityLabel = ENTITY_LABELS[event.entity_name] || event.entity_name;
    const actionLabel = ACTION_LABELS[event.type] || event.type;

    let recordLabel = event.entity_id;
    let userEmail = 'sistema';

    if (data && !payload_too_large) {
      recordLabel = data.property_name || data.project_name || data.process_number ||
                    data.license_number || data.document_name || data.title ||
                    data.subject || event.entity_id;
      userEmail = data.created_by || 'sistema';
    }

    logEntry = {
      user_email: userEmail,
      user_full_name: '-',
      action: event.type,
      entity_name: event.entity_name,
      entity_id: event.entity_id,
      entity_label: String(recordLabel),
      description: `${entityLabel} "${recordLabel}" foi ${actionLabel}`,
      timestamp: new Date().toISOString(),
    };
  } else {
    // Called directly from frontend
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const entityLabel = ENTITY_LABELS[body.entity_name] || body.entity_name;
    const actionLabel = ACTION_LABELS[body.action] || body.action;

    logEntry = {
      user_email: user.email,
      user_full_name: user.full_name || user.email,
      action: body.action,
      entity_name: body.entity_name,
      entity_id: body.entity_id,
      entity_label: body.entity_label || body.entity_id,
      description: body.description || `${entityLabel} foi ${actionLabel}`,
      timestamp: new Date().toISOString(),
    };
  }

  await base44.asServiceRole.entities.AuditLog.create(logEntry);
  return Response.json({ success: true });
});