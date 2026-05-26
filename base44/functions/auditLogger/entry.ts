import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
};

const ACTION_LABELS = {
  create: 'criado(a)',
  update: 'atualizado(a)',
  delete: 'excluído(a)',
};

// OWASP A03 - Sanitiza strings para evitar injeção de caracteres de controle nos logs
const sanitize = (v) =>
  typeof v === 'string'
    ? v.substring(0, 500).replace(/[\x00-\x08\x0e-\x1f\x7f]/g, '')
    : String(v ?? '').substring(0, 500);

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  let logEntry;

  if (body.event) {
    // Chamada de automação (entity trigger) — sem usuário autenticado
    const { event, data, payload_too_large } = body;

    // OWASP A02 - Valida estrutura mínima do payload de automação
    if (!event?.entity_name || !event?.type || !event?.entity_id) {
      return Response.json({ error: 'Payload de automação inválido' }, { status: 400 });
    }

    const entityLabel = ENTITY_LABELS[event.entity_name] || sanitize(event.entity_name);
    const actionLabel = ACTION_LABELS[event.type] || sanitize(event.type);
    let recordLabel = sanitize(event.entity_id);
    let userEmail = 'sistema';

    if (data && !payload_too_large) {
      const rawLabel = data.property_name || data.project_name || data.process_number ||
        data.license_number || data.document_name || data.title ||
        data.subject || event.entity_id;
      recordLabel = sanitize(rawLabel);
      userEmail = sanitize(data.created_by || 'sistema');
    }

    logEntry = {
      user_email: userEmail,
      user_full_name: '-',
      action: sanitize(event.type),
      entity_name: sanitize(event.entity_name),
      entity_id: sanitize(event.entity_id),
      entity_label: recordLabel,
      description: `${entityLabel} "${recordLabel}" foi ${actionLabel}`,
      timestamp: new Date().toISOString(),
    };
  } else {
    // Chamada direta do frontend — requer usuário autenticado
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const entityLabel = ENTITY_LABELS[body.entity_name] || sanitize(body.entity_name);
    const actionLabel = ACTION_LABELS[body.action] || sanitize(body.action);

    logEntry = {
      user_email: user.email,
      user_full_name: sanitize(user.full_name || user.email),
      action: sanitize(body.action),
      entity_name: sanitize(body.entity_name),
      entity_id: sanitize(body.entity_id),
      entity_label: sanitize(body.entity_label || body.entity_id),
      description: sanitize(body.description || `${entityLabel} foi ${actionLabel}`),
      timestamp: new Date().toISOString(),
    };
  }

  await base44.asServiceRole.entities.AuditLog.create(logEntry);
  return Response.json({ success: true });
});