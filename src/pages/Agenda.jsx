import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, Calendar, Users, Building2, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AgendaCalendarView from '../components/agenda/AgendaCalendarView';
import AgendaSidePanel from '../components/agenda/AgendaSidePanel';
import AgendaEventModal from '../components/agenda/AgendaEventModal';
import AgendaEventDetail from '../components/agenda/AgendaEventDetail';

export default function Agenda() {
  const [user, setUser] = React.useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [detailEvent, setDetailEvent] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [gcalEvents, setGcalEvents] = useState([]);
  const [gcalLoading, setGcalLoading] = useState(false);
  const [search, setSearch] = useState('');

  const qc = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Load data
  const { data: agendaEvents = [] } = useQuery({
    queryKey: ['agendaEvents', user?.email],
    queryFn: () => base44.entities.AgendaEvent.filter({ consultor_email: user.email }, '-start_datetime', 200),
    enabled: !!user?.email,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['agendaProperties', user?.email],
    queryFn: () => base44.entities.Property.filter({ consultor_email: user.email }, 'property_name', 100),
    enabled: !!user?.email,
  });

  const { data: crmRecords = [] } = useQuery({
    queryKey: ['agendaCRM', user?.email],
    queryFn: () => base44.entities.ClientCRM.filter({ consultor_email: user.email }, '-updated_date', 100),
    enabled: !!user?.email,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['agendaTeam', user?.email],
    queryFn: () => base44.entities.TeamMember.filter({ consultor_email: user.email }, 'name', 50),
    enabled: !!user?.email,
  });

  // Load Google Calendar events directly
  const [gcalEvents, setGcalEvents] = useState([]);
  const [gcalLoading, setGcalLoading] = useState(false);

  const fetchGCalEvents = async () => {
    if (!user?.email) return;
    setGcalLoading(true);
    try {
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();
      const res = await base44.functions.invoke('googleCalendarAgenda', { action: 'list', event: { timeMin, timeMax } });
      const items = res.data?.items || [];
      setGcalEvents(items.map(ev => ({
        id: `gcal_${ev.id}`,
        google_calendar_event_id: ev.id,
        title: ev.summary || '(sem título)',
        start_datetime: ev.start?.dateTime || ev.start?.date,
        end_datetime: ev.end?.dateTime || ev.end?.date,
        all_day: !!ev.start?.date && !ev.start?.dateTime,
        location: ev.location || '',
        description: ev.description || '',
        _source: 'gcal',
        status: 'Confirmado',
        htmlLink: ev.htmlLink,
      })));
    } catch (e) {
      console.error('Erro ao buscar Google Calendar:', e);
    }
    setGcalLoading(false);
  };

  useEffect(() => {
    if (user?.email) fetchGCalEvents();
  }, [user?.email]);

  // Extract CRM events (tasks + interactions with next_action_date)
  const crmEvents = useMemo(() => {
    const evs = [];
    crmRecords.forEach(crm => {
      const prop = properties.find(p => p.id === crm.property_id);
      const clientName = prop?.client_name || prop?.property_name || crm.client_email || '';

      // Pending tasks with due_date
      (crm.tasks || []).forEach(task => {
        if (!task.done && task.due_date) {
          evs.push({
            id: `crm_task_${crm.id}_${task.id}`,
            title: task.title,
            _date: task.due_date,
            start_datetime: task.due_date,
            _source: 'crm_task',
            client_name: clientName,
            client_email: crm.client_email,
            priority: task.priority || 'Média',
            assigned_to_email: task.responsible_email || '',
            assigned_to_name: task.responsible_name || '',
            description: '',
          });
        }
      });

      // Interactions with next_action_date
      (crm.interactions || []).forEach(inter => {
        if (inter.next_action_date) {
          evs.push({
            id: `crm_inter_${crm.id}_${inter.id}`,
            title: inter.next_action || `Follow-up: ${inter.title}`,
            _date: inter.next_action_date,
            start_datetime: inter.next_action_date,
            _source: 'crm_interaction',
            client_name: clientName,
            client_email: crm.client_email,
            assigned_to_email: inter.responsible_email || '',
            assigned_to_name: inter.responsible_name || '',
            description: inter.description || '',
          });
        }
      });
    });
    return evs;
  }, [crmRecords, properties]);

  // All events merged (deduplicate: gcal events already linked to agenda events are skipped)
  const allEvents = useMemo(() => {
    const linkedGcalIds = new Set(agendaEvents.filter(e => e.google_calendar_event_id).map(e => e.google_calendar_event_id));
    const externalGcal = gcalEvents.filter(e => !linkedGcalIds.has(e.google_calendar_event_id));
    return [
      ...agendaEvents.map(e => ({ ...e, _source: 'agenda' })),
      ...crmEvents,
      ...externalGcal,
    ];
  }, [agendaEvents, crmEvents, gcalEvents]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      if (filterAssignee !== 'all' && ev.assigned_to_email !== filterAssignee) return false;
      if (filterType !== 'all') {
        if (filterType === 'crm' && ev._source === 'agenda') return false;
        if (filterType === 'agenda' && ev._source !== 'agenda') return false;
      }
      if (search && !ev.title?.toLowerCase().includes(search.toLowerCase()) &&
          !ev.client_name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allEvents, filterAssignee, filterType, search]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: allEvents.length,
      today: allEvents.filter(e => (e.start_datetime || e._date || '')?.startsWith(today)).length,
      crm: crmEvents.length,
      delegated: agendaEvents.filter(e => e.assigned_to_email && e.assigned_to_email !== user?.email).length,
    };
  }, [allEvents, crmEvents, agendaEvents, user]);

  const deleteEventMutation = useMutation({
    mutationFn: async (ev) => {
      if (ev.google_calendar_event_id) {
        await base44.functions.invoke('googleCalendarAgenda', { action: 'delete', eventId: ev.google_calendar_event_id, event: {} });
      }
      await base44.entities.AgendaEvent.delete(ev.id);
    },
    onMutate: async (ev) => {
      await qc.cancelQueries(['agendaEvents']);
      const previousData = qc.getQueryData(['agendaEvents']);
      qc.setQueryData(['agendaEvents'], (old = []) => old.filter(e => e.id !== ev.id));
      return { previousData };
    },
    onError: (err, vars, context) => {
      if (context?.previousData) {
        qc.setQueryData(['agendaEvents'], context.previousData);
      }
    },
    onSuccess: () => {
      toast.success('Evento removido!');
      qc.invalidateQueries(['agendaEvents']);
    },
  });

  const deleteEvent = async (ev) => {
    if (!confirm('Remover este evento?')) return;
    deleteEventMutation.mutate(ev);
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setEditingEvent(null);
    setShowModal(true);
  };

  const handleEventClick = (ev) => {
    setDetailEvent(ev);
  };

  const handleEdit = () => {
    setShowModal(true);
    setEditingEvent(detailEvent);
    setDetailEvent(null);
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditingEvent(null);
    setSelectedDate(null);
    qc.invalidateQueries(['agendaEvents']);
  };

  const allAssignees = useMemo(() => {
    const seen = new Set();
    const arr = [];
    allEvents.forEach(e => {
      if (e.assigned_to_email && !seen.has(e.assigned_to_email)) {
        seen.add(e.assigned_to_email);
        arr.push({ email: e.assigned_to_email, name: e.assigned_to_name || e.assigned_to_email });
      }
    });
    return arr;
  }, [allEvents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">📅 Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Eventos, tarefas do CRM e delegações — tudo sincronizado com Google Agenda</p>
        </div>
        <Button
          onClick={() => { setEditingEvent(null); setSelectedDate(new Date()); setShowModal(true); }}
          className="bg-emerald-700 hover:bg-emerald-800 gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Evento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
          { label: 'Hoje', value: stats.today, icon: Calendar, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Do CRM', value: stats.crm, icon: Building2, color: 'text-amber-600 bg-amber-50' },
          { label: 'Delegados', value: stats.delegated, icon: Users, color: 'text-purple-600 bg-purple-50' },
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
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-xs text-gray-500">Evento</span>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-2" /><span className="text-xs text-gray-500">Tarefa CRM</span>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ml-2" /><span className="text-xs text-gray-500">Follow-up</span>
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