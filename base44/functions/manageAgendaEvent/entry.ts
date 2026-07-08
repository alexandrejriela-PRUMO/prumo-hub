import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * manageAgendaEvent — Create / update / delete AgendaEvent usando service role.
 *
 * Necessário porque membros de equipe (equipe_consultor) conseguem VER os eventos
 * (via listConsultorAgendaEvents com service role), mas não conseguem EXCLUIR
 * porque o RLS exige consultor_email === user.email ou created_by_id === user.id.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action;

    // Resolver o email do consultor efetivo (para membros de equipe)
    let consultorEmail = user.email;
    if (user.role !== 'admin') {
      const memberships = await base44.asServiceRole.entities.TeamMember.filter({
        member_email: user.email,
        status: 'Ativo',
      });
      if (memberships.length > 0) {
        consultorEmail = memberships[0].primary_user_email;
      }
    }

    if (action === 'delete') {
      const eventId = body.event_id;
      if (!eventId) return Response.json({ error: 'event_id is required' }, { status: 400 });

      // Validar que o evento pertence ao consultor efetivo ou ao próprio usuário
      const event = await base44.asServiceRole.entities.AgendaEvent.get(eventId);
      if (!event) return Response.json({ error: 'Evento não encontrado' }, { status: 404 });

      const isOwner = event.consultor_email === consultorEmail
        || event.consultor_email === user.email
        || event.assigned_to_email === user.email
        || event.created_by_id === user.id
        || user.role === 'admin';

      if (!isOwner) {
        return Response.json({ error: 'Sem permissão para excluir este evento' }, { status: 403 });
      }

      // Sincronizar exclusão com Google Calendar (silencioso)
      if (event.google_calendar_event_id) {
        try {
          await base44.functions.invoke('syncAgendaEventToGCal', { action: 'delete', event });
        } catch (syncErr) {
          console.warn('[manageAgendaEvent] GCal delete sync failed (non-blocking):', syncErr.message);
        }
      }

      await base44.asServiceRole.entities.AgendaEvent.delete(eventId);
      return Response.json({ success: true, deleted_id: eventId });
    }

    if (action === 'update') {
      const eventId = body.event_id;
      const data = body.data;
      if (!eventId || !data) return Response.json({ error: 'event_id and data are required' }, { status: 400 });

      const event = await base44.asServiceRole.entities.AgendaEvent.get(eventId);
      if (!event) return Response.json({ error: 'Evento não encontrado' }, { status: 404 });

      const isOwner = event.consultor_email === consultorEmail
        || event.consultor_email === user.email
        || event.assigned_to_email === user.email
        || event.created_by_id === user.id
        || user.role === 'admin';

      if (!isOwner) {
        return Response.json({ error: 'Sem permissão para editar este evento' }, { status: 403 });
      }

      const updated = await base44.asServiceRole.entities.AgendaEvent.update(eventId, data);
      return Response.json({ success: true, event: updated });
    }

    if (action === 'create') {
      const data = body.data;
      if (!data) return Response.json({ error: 'data is required' }, { status: 400 });

      // Garantir que consultor_email seja do consultor efetivo
      if (!data.consultor_email) {
        data.consultor_email = consultorEmail;
      }

      const created = await base44.asServiceRole.entities.AgendaEvent.create(data);
      return Response.json({ success: true, event: created });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[manageAgendaEvent] Erro:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});