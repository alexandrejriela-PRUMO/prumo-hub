import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, Users, Building2, Filter } from 'lucide-react';
import { toast } from 'sonner';
import AgendaCalendarView from '../components/agenda/AgendaCalendarView';
import AgendaSidePanel from '../components/agenda/AgendaSidePanel';
import AgendaEventModal from '../components/agenda/AgendaEventModal';
import AgendaEventDetail from '../components/agenda/AgendaEventDetail';
import GoogleCalendarBanner from '../components/agenda/GoogleCalendarBanner';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

const GCAL_CONNECTOR_ID = '6a162a2643253d1b5412e449';

function AgendaContent() {
  const { user, effectiveEmail, isLoading: effectiveLoading } = useEffectiveUser();
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [detailEvent, setDetailEvent] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  // Google Calendar state
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalLoading, setGcalLoading] = useState(true);
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [gcalEvents, setGcalEvents] = useState([]);
  const [gcalConnecting, setGcalConnecting] = useState(false);

  const qc = useQueryClient();

  // ── Data queries ─────────────────────────────────────────────────────────

  const { data: agendaEvents = [] } = useQuery({
    queryKey: ['agendaEvents', effectiveEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('listConsultorAgendaEvents', {});
      return res.data?.events || [];
    },
    enabled: !!effectiveEmail && !effectiveLoading,
  });

  const { data: consultorClients } = useQuery({
    queryKey: ['agendaConsultorClients', effectiveEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('listConsultorClients', {});
      return res.data;
    },
    enabled: !!effectiveEmail && !effectiveLoading,
  });

  const properties = consultorClients?.properties || [];
  const crmRecords = consultorClients?.crmList || [];

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['agendaTeam', effectiveEmail],
    queryFn: async () => {
      const [byPrimary, byConsultor] = await Promise.all([
        base44.entities.TeamMember.filter({ primary_user_email: effectiveEmail, status: 'Ativo' }),
        base44.entities.TeamMember.filter({ consultor_email: effectiveEmail, status: 'Ativo' }),
      ]);
      const all = [...byPrimary, ...byConsultor];
      const seen = new Set();
      return all.filter(m => {
        if (seen.has(m.member_email)) return false;
        seen.add(m.member_email);
        return true;
      });
    },
    enabled: !!effectiveEmail && !effectiveLoading,
  });

  // ── Google Calendar ───────────────────────────────────────────────────────

  const fetchGcalEvents = useCallback(async () => {
    setGcalSyncing(true);
    try {
      const res = await base44.functions.invoke('fetchGoogleCalendarEvents', {});
      const data = res?.data;
      if (data?.error) {
        setGcalConnected(false);
        setGcalEvents([]);
      } else {
        setGcalConnected(true);
        const mapped = (data?.events || []).map(ev => ({
          id: `gcal_${ev.id}`,
          title: ev.summary || '(sem título)',
          start_datetime: ev.start?.dateTime || ev.start?.date,
          _date: ev.start?.dateTime || ev.start?.date,
          _source: 'gcal',
          description: ev.description || '',
          location: ev.location || '',
        }));
        setGcalEvents(mapped);
      }
    } catch {
      setGcalConnected(false);
      setGcalEvents([]);
    } finally {
      setGcalSyncing(false);
      setGcalLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGcalEvents();
  }, [fetchGcalEvents]);

  const handleGcalConnect = async () => {
    setGcalConnecting(true);
    try {
      const url = await base44.connectors.connectAppUser(GCAL_CONNECTOR_ID);
      const popup = window.open(url, '_blank', 'width=600,height=700');
      const timer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          setGcalConnecting(false);
          setGcalLoading(true);
          // Aguarda o callback OAuth ser processado antes de verificar
          await new Promise(r => setTimeout(r, 2000));
          await fetchGcalEvents();
        }
      }, 800);
      // Timeout de segurança: encerra o polling após 3 minutos
      setTimeout(() => { clearInterval(timer); setGcalConnecting(false); }, 180000);
    } catch (error) {
      setGcalConnecting(false);
      toast.error('Erro ao iniciar conexão: ' + error.message);
    }
  };

  const handleGcalForceRefresh = async () => {
    setGcalConnecting(false);
    setGcalLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    await fetchGcalEvents();
  };

  const handleGcalDisconnect = async () => {
    await base44.connectors.disconnectAppUser(GCAL_CONNECTOR_ID);
    setGcalConnected(false);
    setGcalEvents([]);
  };

  // ── CRM events ────────────────────────────────────────────────────────────

  const crmEvents = useMemo(() => {
    const evs = [];
    (crmRecords || []).forEach(crm => {
      const prop = properties?.find(p => p?.id === crm?.property_id);
      const clientName = prop?.client_name || prop?.property_name || crm?.client_email || '';

      (crm?.tasks || []).forEach(task => {
        if (!task?.done && task?.due_date) {
          evs.push({
            id: `crm_task_${crm?.id}_${task?.id}`,
            title: task?.title,
            _date: task?.due_date,
            start_datetime: task?.due_date,
            _source: 'crm_task',
            client_name: clientName,
            client_email: crm?.client_email,
            priority: task?.priority || 'Média',
            assigned_to_email: task?.responsible_email || '',
            assigned_to_name: task?.responsible_name || '',
            description: '',
          });
        }
      });

      (crm?.interactions || []).forEach(inter => {
        if (inter?.next_action_date) {
          evs.push({
            id: `crm_inter_${crm?.id}_${inter?.id}`,
            title: inter?.next_action || `Follow-up: ${inter?.title}`,
            _date: inter?.next_action_date,
            start_datetime: inter?.next_action_date,
            _source: 'crm_interaction',
            client_name: clientName,
            client_email: crm?.client_email,
            assigned_to_email: inter?.responsible_email || '',
            assigned_to_name: inter?.responsible_name || '',
            description: inter?.description || '',
          });
        }
      });
    });
    return evs;
  }, [crmRecords, properties]);

  // ── Merge all events ──────────────────────────────────────────────────────

  const allEvents = useMemo(() => [
    ...(agendaEvents || []).map(e => ({ ...e, _source: 'agenda' })),
    ...crmEvents,
    ...gcalEvents,
  ], [agendaEvents, crmEvents, gcalEvents]);

  // ── Filtered events ───────────────────────────────────────────────────────

  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      if (filterAssignee !== 'all' && ev?.assigned_to_email !== filterAssignee) return false;
      if (filterType !== 'all') {
        if (filterType === 'crm' && ev?._source !== 'crm_task' && ev?._source !== 'crm_interaction') return false;
        if (filterType === 'agenda' && ev?._source !== 'agenda') return false;
        if (filterType === 'gcal' && ev?._source !== 'gcal') return false;
      }
      if (search && !ev?.title?.toLowerCase().includes(search.toLowerCase()) &&
          !ev?.client_name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allEvents, filterAssignee, filterType, search]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: allEvents.length,
      today: allEvents.filter(e => (e?.start_datetime || e?._date || '')?.startsWith(today)).length,
      crm: crmEvents.length,
      gcal: gcalEvents.length,
    };
  }, [allEvents, crmEvents, gcalEvents]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const deleteEventMutation = useMutation({
    mutationFn: async (ev) => {
      await base44.functions.invoke('manageAgendaEvent', { action: 'delete', event_id: ev.id });
    },
    onMutate: async (ev) => {
      await qc.cancelQueries(['agendaEvents']);
      const previousData = qc.getQueryData(['agendaEvents']);
      qc.setQueryData(['agendaEvents'], (old = []) => old.filter(e => e.id !== ev.id));
      return { previousData };
    },
    onError: (err, vars, context) => {
      if (context?.previousData) qc.setQueryData(['agendaEvents'], context.previousData);
    },
    onSuccess: () => {
      toast.success('Evento removido!');
      qc.invalidateQueries(['agendaEvents']);
    },
  });

  const deleteCRMTaskMutation = useMutation({
    mutationFn: async (ev) => {
      // ev.id format: crm_task_{crmId}_{taskId} or crm_inter_{crmId}_{interId}
      const parts = ev.id.split('_');
      const crmId = parts[2];
      const itemId = parts[3];

      const crm = crmRecords.find(c => c.id === crmId);
      if (!crm) throw new Error('Registro CRM não encontrado');

      if (ev._source === 'crm_task') {
        const updatedTasks = (crm.tasks || []).filter(t => t.id !== itemId);
        await base44.functions.invoke('updateClientCRM', {
          id: crmId,
          data: { tasks: updatedTasks },
        });
      } else if (ev._source === 'crm_interaction') {
        const updatedInteractions = (crm.interactions || []).map(i =>
          i.id === itemId ? { ...i, next_action: null, next_action_date: null } : i
        );
        await base44.functions.invoke('updateClientCRM', {
          id: crmId,
          data: { interactions: updatedInteractions },
        });
      }
    },
    onMutate: async (ev) => {
      await qc.cancelQueries(['agendaConsultorClients']);
      const previousData = qc.getQueryData(['agendaConsultorClients']);
      return { previousData };
    },
    onError: (err, vars, context) => {
      if (context?.previousData) qc.setQueryData(['agendaConsultorClients'], context.previousData);
      toast.error('Erro ao remover tarefa: ' + err.message);
    },
    onSuccess: () => {
      toast.success('Tarefa removida da agenda!');
      qc.invalidateQueries(['agendaConsultorClients']);
    },
  });

  const deleteEvent = (ev) => {
    const isCRM = ev._source === 'crm_task' || ev._source === 'crm_interaction';
    const msg = isCRM
      ? 'Remover esta tarefa da agenda? A tarefa será removida do CRM do cliente.'
      : 'Remover este evento?';
    if (!confirm(msg)) return;
    setDetailEvent(null);
    if (isCRM) {
      deleteCRMTaskMutation.mutate(ev);
    } else {
      deleteEventMutation.mutate(ev);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDayClick = (day) => { setSelectedDate(day); setEditingEvent(null); setShowModal(true); };
  const handleEventClick = (ev) => { setDetailEvent(ev); };
  const handleEdit = () => { setShowModal(true); setEditingEvent(detailEvent); setDetailEvent(null); };
  const handleSaved = () => { setShowModal(false); setEditingEvent(null); setSelectedDate(null); qc.invalidateQueries(['agendaEvents']); };

  const allAssignees = useMemo(() => {
    const seen = new Set();
    const arr = [];
    allEvents.forEach(e => {
      if (e?.assigned_to_email && !seen.has(e.assigned_to_email)) {
        seen.add(e.assigned_to_email);
        arr.push({ email: e.assigned_to_email, name: e?.assigned_to_name || e?.assigned_to_email });
      }
    });
    return arr;
  }, [allEvents]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">📅 Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Eventos, tarefas do CRM e delegações da equipe</p>
        </div>
        <Button
          onClick={() => { setEditingEvent(null); setSelectedDate(new Date()); setShowModal(true); }}
          className="bg-emerald-700 hover:bg-emerald-800 gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Evento
        </Button>
      </div>

      {/* Google Calendar Banner */}
      <GoogleCalendarBanner
        connected={gcalConnected}
        loading={gcalLoading}
        syncing={gcalSyncing}
        connecting={gcalConnecting}
        onConnect={handleGcalConnect}
        onDisconnect={handleGcalDisconnect}
        onRefresh={fetchGcalEvents}
        onForceRefresh={handleGcalForceRefresh}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
          { label: 'Hoje', value: stats.today, icon: Calendar, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Do CRM', value: stats.crm, icon: Building2, color: 'text-amber-600 bg-amber-50' },
          { label: 'Google', value: stats.gcal, icon: Calendar, color: 'text-indigo-600 bg-indigo-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl p-3 border border-gray-100">
        <Filter className="w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar evento ou cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-48 h-8 text-sm"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="agenda">Meus Eventos</SelectItem>
            <SelectItem value="crm">Do CRM</SelectItem>
            <SelectItem value="gcal">Google Calendar</SelectItem>
          </SelectContent>
        </Select>
        {allAssignees.length > 0 && (
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {allAssignees.map(a => <SelectItem key={a.email} value={a.email}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-xs text-gray-500">Evento</span>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-2" /><span className="text-xs text-gray-500">Tarefa CRM</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ml-2" /><span className="text-xs text-gray-500">Follow-up</span>
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 ml-2" /><span className="text-xs text-gray-500">Google</span>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <AgendaCalendarView
            events={filteredEvents}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        </div>
        <div>
          <AgendaSidePanel
            events={filteredEvents}
            selectedDate={selectedDate}
            onEventClick={handleEventClick}
          />
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <AgendaEventModal
          event={editingEvent}
          initialDate={selectedDate}
          user={user}
          properties={properties}
          teamMembers={teamMembers}
          onClose={() => { setShowModal(false); setEditingEvent(null); }}
          onSaved={handleSaved}
        />
      )}

      {detailEvent && (
        <AgendaEventDetail
          event={detailEvent}
          onClose={() => setDetailEvent(null)}
          onEdit={handleEdit}
          onDelete={() => deleteEvent(detailEvent)}
        />
      )}
    </div>
  );
}

export default function Agenda() {
  return <AgendaContent />;
}