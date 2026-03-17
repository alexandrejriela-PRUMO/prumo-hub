import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CalendarDays, User } from 'lucide-react';

const toDatetimeLocal = (date) => {
  if (!date) return '';
  if (date instanceof Date) return format(date, "yyyy-MM-dd'T'HH:mm");
  return date.split('.')[0].slice(0, 16);
};

const defaultForm = (initialDate, user) => ({
  title: '',
  description: '',
  event_type: 'Reunião',
  start_datetime: initialDate ? `${format(initialDate, 'yyyy-MM-dd')}T09:00` : '',
  end_datetime: initialDate ? `${format(initialDate, 'yyyy-MM-dd')}T10:00` : '',
  all_day: false,
  location: '',
  property_id: '',
  client_name: '',
  client_email: '',
  assigned_to_email: user?.email || '',
  assigned_to_name: user?.full_name || '',
  status: 'Pendente',
  priority: 'Média',
  sync_google: true,
  reminder_minutes: 30,
  notes: '',
});

export default function AgendaEventModal({ event, initialDate, user, properties, teamMembers, onClose, onSaved }) {
  const [form, setForm] = useState(defaultForm(initialDate, user));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event) {
      setForm({
        ...defaultForm(initialDate, user),
        ...event,
        start_datetime: toDatetimeLocal(event.start_datetime),
        end_datetime: toDatetimeLocal(event.end_datetime),
      });
    } else {
      setForm(defaultForm(initialDate, user));
    }
  }, [event, initialDate, user]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handlePropertyChange = (pid) => {
    const prop = properties.find(p => p.id === pid);
    set('property_id', pid);
    if (prop) {
      set('client_name', prop.client_name || prop.property_name || '');
      set('client_email', prop.owner_email || '');
    }
  };

  const handleAssigneeChange = (email) => {
    if (email === user?.email) {
      set('assigned_to_email', user.email);
      set('assigned_to_name', user.full_name || '');
    } else {
      const member = teamMembers.find(m => m.email === email || m.member_email === email);
      set('assigned_to_email', email);
      set('assigned_to_name', member?.full_name || member?.name || email);
    }
  };

  const toGCalEvent = (f) => ({
    summary: f.title,
    description: f.description || '',
    location: f.location || '',
    start: f.all_day
      ? { date: f.start_datetime?.slice(0, 10) }
      : { dateTime: new Date(f.start_datetime).toISOString(), timeZone: 'America/Sao_Paulo' },
    end: f.all_day
      ? { date: (f.end_datetime || f.start_datetime)?.slice(0, 10) }
      : { dateTime: new Date(f.end_datetime || f.start_datetime).toISOString(), timeZone: 'America/Sao_Paulo' },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: Number(f.reminder_minutes) || 30 }] }
  });

  const handleSave = async () => {
    if (!form.title || !form.start_datetime) {
      toast.error('Preencha o título e a data/hora de início.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        consultor_email: user.email,
        start_datetime: new Date(form.start_datetime).toISOString(),
        end_datetime: form.end_datetime ? new Date(form.end_datetime).toISOString() : new Date(form.start_datetime).toISOString(),
      };

      let gcalId = form.google_calendar_event_id;

      if (gcalId) payload.google_calendar_event_id = gcalId;

      if (event?.id) {
        await base44.entities.AgendaEvent.update(event.id, payload);
      } else {
        await base44.entities.AgendaEvent.create(payload);
      }

      toast.success(event ? 'Evento atualizado!' : 'Evento criado!');
      onSaved();
    } catch (e) {
      toast.error('Erro ao salvar: ' + e.message);
    }
    setLoading(false);
  };

  const allAssignees = [
    { email: user?.email, name: user?.full_name || 'Eu (você)' },
    ...(teamMembers || []).filter(m => (m.email || m.member_email) !== user?.email).map(m => ({
      email: m.email || m.member_email,
      name: m.full_name || m.name || m.email || m.member_email
    }))
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-700" />
            {event ? 'Editar Evento' : 'Novo Evento na Agenda'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Reunião com cliente..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.event_type} onValueChange={v => set('event_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Reunião', 'Tarefa', 'Prazo', 'Follow-up', 'Visita', 'Outro'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Baixa', 'Média', 'Alta'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.all_day} onCheckedChange={v => set('all_day', v)} id="allday" />
            <Label htmlFor="allday">Dia inteiro</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início *</Label>
              <Input
                type={form.all_day ? 'date' : 'datetime-local'}
                value={form.all_day ? form.start_datetime?.slice(0, 10) : form.start_datetime}
                onChange={e => set('start_datetime', e.target.value)}
              />
            </div>
            <div>
              <Label>Fim</Label>
              <Input
                type={form.all_day ? 'date' : 'datetime-local'}
                value={form.all_day ? form.end_datetime?.slice(0, 10) : form.end_datetime}
                onChange={e => set('end_datetime', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Local</Label>
            <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Ex: Escritório, Google Meet..." />
          </div>

          <div>
            <Label>Propriedade / Cliente</Label>
            <Select value={form.property_id} onValueChange={handlePropertyChange}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>— Nenhuma —</SelectItem>
                {(properties || []).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.client_name || p.property_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="flex items-center gap-1"><User className="w-3 h-3" /> Delegar para</Label>
            <Select value={form.assigned_to_email} onValueChange={handleAssigneeChange}>
              <SelectTrigger><SelectValue placeholder="Responsável..." /></SelectTrigger>
              <SelectContent>
                {allAssignees.map(a => (
                  <SelectItem key={a.email} value={a.email}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Pendente', 'Confirmado', 'Concluído', 'Cancelado'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descrição / Notas</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detalhes do evento..." rows={3} />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">📅 Sincronizar com Google Agenda</p>
              <p className="text-xs text-blue-600">Cria/atualiza o evento na sua conta Google</p>
            </div>
            <Switch checked={form.sync_google} onCheckedChange={v => set('sync_google', v)} />
          </div>

          {form.sync_google && (
            <div>
              <Label>Lembrete (minutos antes)</Label>
              <Input type="number" value={form.reminder_minutes} onChange={e => set('reminder_minutes', e.target.value)} min={0} />
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={loading} className="flex-1 bg-emerald-700 hover:bg-emerald-800">
            {loading ? 'Salvando...' : 'Salvar Evento'}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}