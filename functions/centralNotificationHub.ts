import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Mapeamento: entidade + evento → tipo de notificação e mensagem ──────────
const EVENT_MAP = {
  License: {
    create: { event_type: 'nova_licenca',       severity: 'info',    label: 'Nova Licença Ambiental criada' },
    update: { event_type: 'atualizacao_licenca', severity: 'info',    label: 'Licença Ambiental atualizada' },
    delete: { event_type: 'remocao_licenca',     severity: 'warning', label: 'Licença Ambiental removida' },
  },
  Process: {
    create: { event_type: 'novo_processo',       severity: 'info',    label: 'Novo Processo cadastrado' },
    update: { event_type: 'atualizacao_processo', severity: 'info',   label: 'Processo atualizado' },
    delete: { event_type: 'remocao_processo',    severity: 'warning', label: 'Processo removido' },
  },
  EnvironmentalAlert: {
    create: { event_type: 'novo_alerta_ambiental',       severity: 'error',   label: 'Novo Alerta Ambiental detectado' },
    update: { event_type: 'atualizacao_alerta_ambiental', severity: 'warning', label: 'Alerta Ambiental atualizado' },
    delete: { event_type: 'remocao_alerta_ambiental',    severity: 'info',    label: 'Alerta Ambiental removido' },
  },
  PRAD: {
    create: { event_type: 'novo_prad',       severity: 'info',    label: 'Novo PRAD cadastrado' },
    update: { event_type: 'atualizacao_prad', severity: 'info',   label: 'PRAD atualizado' },
    delete: { event_type: 'remocao_prad',    severity: 'warning', label: 'PRAD removido' },
  },
  Mapping: {
    create: { event_type: 'novo_mapeamento',       severity: 'info',    label: 'Novo Mapeamento de Agricultura de Precisão criado' },
    update: { event_type: 'atualizacao_mapeamento', severity: 'info',   label: 'Mapeamento de Agricultura de Precisão atualizado' },
    delete: { event_type: 'remocao_mapeamento',    severity: 'warning', label: 'Mapeamento de Agricultura de Precisão removido' },
  },
};

// ─── Monta a mensagem de notificação ────────────────────────────────────────
function buildMessage(label, data, entityName) {
  const name =
    data?.license_type || data?.process_number || data?.title ||
    data?.project_name || data?.prad_name || data?.mapping_name ||
    data?.name || entityName;

  const status = data?.status ? ` — Status: ${data.status}` : '';
  const property = data?.property_id ? ` (Propriedade ID: ${data.property_id})` : '';

  return `${label}: ${name}${status}${property}.`;
}

// ─── Busca os emails responsáveis pela propriedade/entidade ─────────────────
async function getResponsibleEmails(base44, data, entityName) {
  const emails = new Set();

  // Owner direto na entidade
  if (data?.owner_email) emails.add(data.owner_email);
  if (data?.client_email) emails.add(data.client_email);
  if (data?.responsible_email) emails.add(data.responsible_email);

  // Busca via property_id
  if (data?.property_id) {
    try {
      const properties = await base44.asServiceRole.entities.Property.filter({ id: data.property_id });
      const prop = properties[0];
      if (prop) {
        if (prop.owner_email) emails.add(prop.owner_email);
        if (prop.consultor_email) emails.add(prop.consultor_email);

        // Equipe do consultor
        if (prop.consultor_email) {
          const team = await base44.asServiceRole.entities.TeamMember.filter({
            consultor_email: prop.consultor_email
          });
          team.forEach(m => { if (m.email) emails.add(m.email); });
        }

        // Usuários autorizados na propriedade
        if (prop.authorized_users) {
          try {
            const authorized = JSON.parse(prop.authorized_users);
            if (Array.isArray(authorized)) {
              authorized.forEach(u => { if (u.email) emails.add(u.email); });
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn('Erro ao buscar propriedade:', err.message);
    }
  }

  return [...emails].filter(Boolean);
}

// ─── Verifica preferências e envia notificação ───────────────────────────────
async function dispatchNotification(base44, email, eventType, title, message, severity, link, metadata) {
  // Verifica preferência específica ou global "todos"
  const [prefs, globalPrefs] = await Promise.all([
    base44.asServiceRole.entities.NotificationPreference.filter({ user_email: email, event_type: eventType }),
    base44.asServiceRole.entities.NotificationPreference.filter({ user_email: email, event_type: 'todos' }),
  ]);

  const allPrefs = [...prefs, ...globalPrefs];

  // Se não há nenhuma preferência configurada, assume push habilitado por padrão
  const pushEnabled  = allPrefs.length === 0 ? true  : allPrefs.some(p => p.push_enabled);
  const emailEnabled = allPrefs.some(p => p.email_enabled);

  if (pushEnabled) {
    await base44.asServiceRole.entities.InAppNotification.create({
      user_email: email,
      title,
      message,
      event_type: eventType,
      severity,
      read: false,
      link,
      metadata,
    });
    console.log(`[Hub] Push → ${email} | ${eventType}`);
  }

  if (emailEnabled) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'PRUMO Hub',
      to: email,
      subject: title,
      body: `Olá,\n\n${message}\n\nAcesse o aplicativo para mais detalhes: https://prumo.app\n\nAtenciosamente,\nEquipe PRUMO`,
    });
    console.log(`[Hub] Email → ${email} | ${eventType}`);
  }
}

// ─── Handler principal ───────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Suporta chamada direta da automação de entidade
    const { event, data, old_data } = body;

    if (!event || !event.entity_name || !event.type) {
      return Response.json({ error: 'Payload inválido: event.entity_name e event.type são obrigatórios' }, { status: 400 });
    }

    const entityName = event.entity_name;
    const eventVerb  = event.type; // create | update | delete

    const entityConfig = EVENT_MAP[entityName];
    if (!entityConfig) {
      return Response.json({ skipped: true, reason: `Entidade ${entityName} não monitorada` });
    }

    const eventConfig = entityConfig[eventVerb];
    if (!eventConfig) {
      return Response.json({ skipped: true, reason: `Evento ${eventVerb} não mapeado para ${entityName}` });
    }

    const { event_type, severity, label } = eventConfig;
    const message = buildMessage(label, data, entityName);
    const title   = `PRUMO · ${label}`;
    const link    = null; // Pode ser customizado por entidade futuramente

    // Identifica responsáveis
    const emails = await getResponsibleEmails(base44, data, entityName);

    if (emails.length === 0) {
      console.warn(`[Hub] Nenhum responsável encontrado para ${entityName} ${eventVerb}`);
      return Response.json({ success: true, notified: 0 });
    }

    const metadata = { entityName, entityId: event.entity_id, eventVerb, event_type };

    await Promise.all(
      emails.map(email =>
        dispatchNotification(base44, email, event_type, title, message, severity, link, metadata)
      )
    );

    console.log(`[Hub] ${entityName}.${eventVerb} → ${emails.length} usuário(s) notificado(s)`);
    return Response.json({ success: true, notified: emails.length, emails });

  } catch (error) {
    console.error('[Hub] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});