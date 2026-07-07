import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffectiveUser } from '../../hooks/useEffectiveUser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Phone, Mail, MessageCircle, Users, Calendar, CheckSquare, Square,
  Plus, Briefcase, Clock, Trash2, Edit3, Share2, Loader, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CRMThread from './CRMThread';

const STATUS_OPTIONS = ['NovoProspect', 'Prospect', 'Ativo', 'Em Negociação', 'Inativo', 'Encerrado'];
const STATUS_LABELS = {
  'NovoProspect': 'Prospect',
  'Prospect': 'Atividades em Andamento',
  'Ativo': 'Cliente',
  'Em Negociação': 'Em Negociação',
  'Inativo': 'Inativo',
  'Encerrado': 'Encerrado',
};

const INTERACTION_TYPES = ['Ligação', 'Reunião', 'E-mail', 'WhatsApp', 'Visita', 'Proposta', 'Contrato', 'Outro'];
const INTERACTION_ICONS = {
  'Ligação': Phone, 'Reunião': Users, 'E-mail': Mail, 'WhatsApp': MessageCircle,
  'Visita': Users, 'Proposta': Briefcase, 'Contrato': Briefcase, 'Outro': Clock,
};

// ─── ClientCRMPanel ───────────────────────────────────────────────────────────
// Recebe `property` que é o próprio objeto ClientCRM (com .id já definido).
// Nunca cria novos registros — apenas atualiza o registro existente via seu ID.
export default function ClientCRMPanel({ property, onClose }) {
  const queryClient = useQueryClient();
  const { effectiveEmail: hookEffectiveEmail, isEquipe, consultorName: hookConsultorName } = useEffectiveUser();
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  // ── Estado dos formulários ───────────────────────────────────────────────
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [syncingInteractionId, setSyncingInteractionId] = useState(null);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingServiceIndex, setEditingServiceIndex] = useState(null);
  const [newInteraction, setNewInteraction] = useState({ type: 'Ligação', title: '', description: '', next_action: '', next_action_date: '', responsible_email: '', responsible_name: '', meeting_datetime: '', request_confirmation: false, confirmation_channel: 'whatsapp' });
  const [newTask, setNewTask] = useState({ title: '', due_date: '', priority: 'Média', responsible_email: '', responsible_name: '' });
  const [newService, setNewService] = useState({ name: '', status: 'Em Proposta', value: '', notes: '', payment_type: 'avista', payment_method: 'Pix', installments: '', start_date: '', due_dates: [], installments_data: [], received: false, received_at: '', account_id: '', account_name: '' });

  // ── ID do ClientCRM — é a chave única para todas as operações ────────────
  // property.id É o id do registro ClientCRM (passado pelo CRMBoard ou ConsultorClients)
  const crmId = property?.id;
  const crmConsultorEmail = property?.consultor_email || hookEffectiveEmail;

  // ── Busca o registro CRM pelo ID direto (via backend function para bypass de RLS) ──
  const { data: activeCRM, isLoading } = useQuery({
    queryKey: ['client-crm', crmId],
    queryFn: async () => {
      const res = await base44.functions.invoke('listConsultorClients', {});
      const list = res.data?.crmList || [];
      return list.find(c => c.id === crmId) || null;
    },
    enabled: !!crmId,
    staleTime: 0,
  });

  // ── Mutation de atualização — NUNCA cria, só atualiza (via backend function) ──
  const updateCRM = useMutation({
    mutationFn: async (data) => {
      if (!crmId) throw new Error('CRM não identificado.');
      const res = await base44.functions.invoke('updateClientCRM', { id: crmId, data });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-crm', crmId] });
      queryClient.invalidateQueries({ queryKey: ['consultor-clients-data'] });
    },
    onError: (e) => toast.error('Erro ao salvar: ' + e.message),
  });

  // ── Contas financeiras ──────────────────────────────────────────────────
  // Busca por consultor_email do CRM (dono real das contas) e também pelo email efetivo do usuário
  const { data: accounts = [] } = useQuery({
    queryKey: ['fin-accounts-crm', crmConsultorEmail],
    queryFn: async () => {
      const results = await base44.entities.FinancialAccount.filter({ consultor_email: crmConsultorEmail });
      if (results.length > 0) return results;
      // Fallback: tenta pelo email efetivo do hook (para usuários de equipe)
      if (hookEffectiveEmail && hookEffectiveEmail !== crmConsultorEmail) {
        return base44.entities.FinancialAccount.filter({ consultor_email: hookEffectiveEmail });
      }
      return [];
    },
    enabled: !!crmConsultorEmail,
  });

  // ── Membros da equipe para atribuição ────────────────────────────────────
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', crmConsultorEmail],
    queryFn: async () => {
      const [byPrimary, byConsultor] = await Promise.all([
        base44.entities.TeamMember.filter({ primary_user_email: crmConsultorEmail, status: 'Ativo' }),
        base44.entities.TeamMember.filter({ consultor_email: crmConsultorEmail, status: 'Ativo' }),
      ]);
      const all = [...byPrimary, ...byConsultor];
      const seen = new Set();
      return all.filter(m => { if (seen.has(m.member_email)) return false; seen.add(m.member_email); return true; });
    },
    enabled: !!crmConsultorEmail,
  });

  const consultorName = useMemo(() => {
    if (isEquipe && hookConsultorName) return hookConsultorName;
    return currentUser?.full_name || crmConsultorEmail;
  }, [isEquipe, hookConsultorName, currentUser, crmConsultorEmail]);

  const assignableMembers = useMemo(() => {
    const list = crmConsultorEmail ? [{ member_email: crmConsultorEmail, member_name: consultorName, member_role: 'Consultor' }] : [];
    teamMembers.forEach(m => { if (m.member_email !== crmConsultorEmail) list.push(m); });
    return list;
  }, [teamMembers, crmConsultorEmail, consultorName]);

  // ── Notificação de responsável ───────────────────────────────────────────
  const notifyAssignment = async (responsible_email, responsible_name, type, title) => {
    if (!responsible_email) return;
    try {
      await base44.functions.invoke('notifyCRMAssignment', {
        responsible_email,
        assigner_name: currentUser?.full_name || crmConsultorEmail,
        type, title,
        client_name: property?.client_name,
        property_id: crmId,
      });
    } catch (e) {
      console.warn('Erro ao notificar:', e.message);
    }
  };

  // ── Interações ───────────────────────────────────────────────────────────
  const addInteraction = () => {
    if (!newInteraction.title) { toast.error('Informe o título da interação.'); return; }
    const interactions = editingInteraction
      ? (activeCRM?.interactions || []).map(i => i.id === editingInteraction.id ? { ...i, ...newInteraction } : i)
      : [...(activeCRM?.interactions || []), { id: Date.now().toString(), date: new Date().toISOString(), ...newInteraction, created_by: crmConsultorEmail, confirmation_token: newInteraction.request_confirmation?(Date.now().toString(36)+Math.random().toString(36).slice(2,10)):null, confirmation_status: newInteraction.request_confirmation?'pending':null }];
    updateCRM.mutate({ interactions });
    if (!editingInteraction && newInteraction.responsible_email) notifyAssignment(newInteraction.responsible_email, newInteraction.responsible_name, 'interaction', newInteraction.title);
    setNewInteraction({ type: 'Ligação', title: '', description: '', next_action: '', next_action_date: '', responsible_email: '', responsible_name: '', meeting_datetime: '', request_confirmation: false, confirmation_channel: 'whatsapp' });
    setShowInteractionForm(false); setEditingInteraction(null);
    toast.success(editingInteraction ? 'Interação atualizada!' : 'Interação registrada!');
  };

  const deleteInteraction = (id) => {
    updateCRM.mutate({ interactions: (activeCRM?.interactions || []).filter(i => i.id !== id) });
    toast.success('Interação removida.');
  };

  const startEditInteraction = (interaction) => {
    setEditingInteraction(interaction);
    setNewInteraction({ type: interaction.type, title: interaction.title, description: interaction.description || '', next_action: interaction.next_action || '', next_action_date: interaction.next_action_date || '', responsible_email: interaction.responsible_email || '', responsible_name: interaction.responsible_name || '', meeting_datetime: interaction.meeting_datetime || '', request_confirmation: interaction.request_confirmation || false, confirmation_channel: interaction.confirmation_channel || 'whatsapp' });
    setShowInteractionForm(true);
  };

  const saveInteractionThread = async (interactionId, thread) => {
    // Busca estado fresco do CRM para evitar race condition em múltiplas threads abertas
    const fresh = await base44.entities.ClientCRM.filter({ id: crmId });
    const freshCRM = fresh?.[0];
    const interactions = (freshCRM?.interactions || activeCRM?.interactions || []).map(i => i.id === interactionId ? { ...i, thread } : i);
    return updateCRM.mutateAsync({ interactions });
  };

  // ── Tarefas ──────────────────────────────────────────────────────────────
  const addTask = () => {
    if (!newTask.title) { toast.error('Informe o título da tarefa.'); return; }
    const tasks = editingTask
      ? (activeCRM?.tasks || []).map(t => t.id === editingTask.id ? { ...t, ...newTask } : t)
      : [...(activeCRM?.tasks || []), { id: Date.now().toString(), done: false, ...newTask }];
    updateCRM.mutate({ tasks });
    if (!editingTask && newTask.responsible_email) notifyAssignment(newTask.responsible_email, newTask.responsible_name, 'task', newTask.title);
    setNewTask({ title: '', due_date: '', priority: 'Média', responsible_email: '', responsible_name: '' });
    setShowTaskForm(false); setEditingTask(null);
    toast.success(editingTask ? 'Tarefa atualizada!' : 'Tarefa adicionada!');
  };

  const deleteTask = (id) => {
    updateCRM.mutate({ tasks: (activeCRM?.tasks || []).filter(t => t.id !== id) });
  };

  const toggleTask = (id) => {
    updateCRM.mutate({ tasks: (activeCRM?.tasks || []).map(t => t.id === id ? { ...t, done: !t.done } : t) });
  };

  const startEditTask = (task) => {
    setEditingTask(task);
    setNewTask({ title: task.title, due_date: task.due_date || '', priority: task.priority || 'Média', responsible_email: task.responsible_email || '', responsible_name: task.responsible_name || '' });
    setShowTaskForm(true);
  };

  const saveTaskThread = async (taskId, thread) => {
    // Busca estado fresco do CRM para evitar race condition em múltiplas threads abertas
    const fresh = await base44.entities.ClientCRM.filter({ id: crmId });
    const freshCRM = fresh?.[0];
    const tasks = (freshCRM?.tasks || activeCRM?.tasks || []).map(t => t.id === taskId ? { ...t, thread } : t);
    return updateCRM.mutateAsync({ tasks });
  };

  // ── Serviços ─────────────────────────────────────────────────────────────
   const addService = () => {
      if (!newService.name) { toast.error('Informe o nome do serviço.'); return; }
      const serviceValue = parseFloat(newService.value) || 0;
      const received_at = newService.received && newService.received_at
        ? new Date(newService.received_at + 'T12:00:00').toISOString()
        : (newService.received ? new Date().toISOString() : null);

      // Estruturar dados parcelados corretamente
      let serviceObj = { 
        name: newService.name, 
        status: newService.status, 
        value: serviceValue, 
        notes: newService.notes,
        payment_type: newService.payment_type,
        payment_method: newService.payment_method || 'Pix',
        start_date: newService.payment_type === 'avista' ? newService.start_date : '',
        received: newService.received && newService.payment_type === 'avista',
        received_at: (newService.received && newService.payment_type === 'avista') ? received_at : null,
        account_id: (newService.received && newService.payment_type === 'avista') ? newService.account_id : '',
        account_name: (newService.received && newService.payment_type === 'avista') ? newService.account_name : '',
        installments_data: []
      };

      if (newService.payment_type === 'parcelado') {
        const numInstallments = parseInt(newService.installments) || 1;
        const installmentValue = serviceValue / numInstallments;

        // Garantir que installments_data existem e têm todos os campos
        const baseInstallments = newService.installments_data && newService.installments_data.length > 0 
          ? newService.installments_data 
          : Array.from({ length: numInstallments }, (_, i) => ({
              number: i + 1,
              amount: installmentValue,
              due_date: '',
              received: false,
              received_date: '',
              account_id: '',
              account_name: '',
              payment_method: '',
            }));

        serviceObj.installments_data = baseInstallments.map((inst, i) => ({
          number: inst.number !== undefined ? inst.number : i + 1,
          amount: inst.amount || installmentValue,
          due_date: inst.due_date || '',
          received: inst.received === true,
          received_date: inst.received_date || '',
          account_id: inst.account_id || '',
          account_name: inst.account_name || '',
          payment_method: inst.payment_method || '',
        }));
      }

      let services;
      if (editingServiceIndex !== null) {
        services = (activeCRM?.services || []).map((s, i) => i === editingServiceIndex ? serviceObj : s);
      } else {
        services = [...(activeCRM?.services || []), serviceObj];
      }
      updateCRM.mutate({ services }, {
        onSuccess: async () => {
          setNewService({ name: '', status: 'Em Proposta', value: '', notes: '', payment_type: 'avista', payment_method: 'Pix', installments: '', start_date: '', due_dates: [], installments_data: [], received: false, received_at: '', account_id: '', account_name: '' });
          setShowServiceForm(false); setEditingServiceIndex(null);
          toast.success(editingServiceIndex !== null ? 'Serviço atualizado!' : 'Serviço adicionado!');
          // Sincronizar transações de parcelas recebidas
          try {
            const result = await base44.functions.invoke('syncInstallmentTransactions', { crmId, consultor_email: crmConsultorEmail });
            if (result.data?.transactionsCreated > 0) {
              toast.success(`${result.data.transactionsCreated} transação(ões) criada(s)!`);
              queryClient.invalidateQueries({ queryKey: ['fin-accounts-crm', crmConsultorEmail] });
            }
          } catch (e) {
            console.error('Erro ao sincronizar transações:', e.message);
            toast.error('Erro ao sincronizar transações: ' + e.message);
          }
        }
      });
    };

  const deleteService = (index) => {
    const filtered = (activeCRM?.services || []).filter((_, i) => i !== index).map(s => ({
      ...s,
      installments: Array.isArray(s.installments) ? s.installments : [],
      installments_data: Array.isArray(s.installments_data) ? s.installments_data : []
    }));
    updateCRM.mutate({ services: filtered }, {
      onSuccess: () => {
        toast.success('Serviço removido.');
      },
      onError: () => {
        toast.error('Erro ao remover serviço.');
      }
    });
  };

  const startEditService = (service, index) => {
     setEditingServiceIndex(index);
     const installmentsData = service.installments_data || [];
     const duesDates = installmentsData.map(inst => inst.due_date || '');
     setNewService({ 
       name: service.name, 
       status: service.status, 
       value: service.value?.toString() || '', 
       notes: service.notes || '', 
       payment_type: service.payment_type || 'avista', 
       payment_method: service.payment_method || 'Pix', 
       installments: installmentsData.length?.toString() || '', 
       start_date: service.start_date || '', 
       due_dates: duesDates, 
       installments_data: installmentsData,
       received: service.received || false, 
       received_at: service.received_at ? service.received_at.split('T')[0] : '', 
       account_id: service.account_id || '', 
       account_name: service.account_name || '' 
     });
     setShowServiceForm(true);
   };

  // ── Sincronização Google Calendar ────────────────────────────────────────
  const syncToGoogleCalendar = async (interaction) => {
    setSyncingInteractionId(interaction.id);
    try {
      const response = await base44.functions.invoke('syncToGoogleCalendar', {
        interaction, clientName: property?.client_name, propertyName: property?.property_name,
      });
      toast.success('Evento sincronizado com Google Calendar!');
      if (response.data?.eventLink) window.open(response.data.eventLink, '_blank');
    } catch (error) {
      toast.error('Erro ao sincronizar: ' + (error.message || 'Tente novamente'));
    } finally {
      setSyncingInteractionId(null);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-700 font-bold text-base">
              {(property?.client_name || '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{property?.client_name}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-0.5">
              {property?.client_email && (
                <a href={`mailto:${property.client_email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 transition-colors">
                  <Mail className="w-3 h-3" />{property.client_email}
                </a>
              )}
              {property?.client_phone && (
                <a href={`https://wa.me/${property.client_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 transition-colors">
                  <Phone className="w-3 h-3" />{property.client_phone}
                </a>
              )}
            </div>
          </div>
        </div>
        <Select value={activeCRM?.status || property?.status || 'NovoProspect'} onValueChange={(s) => updateCRM.mutate({ status: s })}>
          <SelectTrigger className="w-full sm:w-52 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s] || s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="interactions">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="interactions" className="text-xs sm:text-sm">Interações</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs sm:text-sm">Tarefas</TabsTrigger>
        </TabsList>

        {/* ── Interações ── */}
        <TabsContent value="interactions" className="space-y-3 mt-4">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto" onClick={() => { setEditingInteraction(null); setNewInteraction({ type: 'Ligação', title: '', description: '', next_action: '', next_action_date: '', responsible_email: '', responsible_name: '', meeting_datetime: '', request_confirmation: false, confirmation_channel: 'whatsapp' }); setShowInteractionForm(true); }}>
            <Plus className="w-3 h-3 mr-1" /> Nova Interação
          </Button>

          {showInteractionForm && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-emerald-800">{editingInteraction ? 'Editar Interação' : 'Nova Interação'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Tipo</Label>
                    <Select value={newInteraction.type} onValueChange={v => setNewInteraction(p => ({ ...p, type: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{INTERACTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Título *</Label>
                    <Input className="h-9 text-sm" value={newInteraction.title} onChange={e => setNewInteraction(p => ({ ...p, title: e.target.value }))} placeholder="Resumo" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Descrição</Label>
                  <Input className="h-9 text-sm" value={newInteraction.description} onChange={e => setNewInteraction(p => ({ ...p, description: e.target.value }))} placeholder="Detalhes..." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Próxima Ação</Label>
                    <Input className="h-9 text-sm" value={newInteraction.next_action} onChange={e => setNewInteraction(p => ({ ...p, next_action: e.target.value }))} placeholder="O que fazer?" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Data da Próxima Ação</Label>
                    <Input className="h-9 text-sm" type="date" value={newInteraction.next_action_date} onChange={e => setNewInteraction(p => ({ ...p, next_action_date: e.target.value }))} />
                  </div>
                </div>
                {(newInteraction.type==='Reunião'||newInteraction.type==='Visita')&&(<div className="border border-blue-200 bg-blue-50 rounded-lg p-3"><div><Label className="text-xs text-blue-800 mb-1 block">Data/Hora Encontro</Label><Input className="h-9 text-sm" type="datetime-local" value={newInteraction.meeting_datetime} onChange={e=>setNewInteraction(p=>({...p,meeting_datetime:e.target.value}))}/></div><label className="flex items-center gap-2 text-xs text-blue-800 mt-2"><input type="checkbox" checked={newInteraction.request_confirmation} onChange={e=>setNewInteraction(p=>({...p,request_confirmation:e.target.checked}))}/>Solicitar confirmacao</label>{newInteraction.request_confirmation&&(<Select value={newInteraction.confirmation_channel} onValueChange={v=>setNewInteraction(p=>({...p,confirmation_channel:v}))}><SelectTrigger className="h-8 text-xs mt-1"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="email">E-mail</SelectItem><SelectItem value="both">Whats+Email</SelectItem></SelectContent></Select>)}</div>)}
{assignableMembers.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block flex items-center gap-1"><UserCheck className="w-3 h-3" /> Responsável</Label>
                    <Select value={newInteraction.responsible_email || ''} onValueChange={v => { const m = assignableMembers.find(m => m.member_email === v); setNewInteraction(p => ({ ...p, responsible_email: v || '', responsible_name: m?.member_name || v })); }}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o responsável (opcional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>— Sem responsável —</SelectItem>
                        {assignableMembers.map(m => <SelectItem key={m.member_email} value={m.member_email}>{m.member_name || m.member_email} · {m.member_role}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => { setShowInteractionForm(false); setEditingInteraction(null); }}>Cancelar</Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={addInteraction} disabled={updateCRM.isPending}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {(activeCRM?.interactions || []).length === 0 ? (
              <div className="text-center py-10"><MessageCircle className="w-10 h-10 mx-auto text-gray-200 mb-2" /><p className="text-sm text-gray-400">Nenhuma interação registrada</p></div>
            ) : (
              [...(activeCRM?.interactions || [])].reverse().map(interaction => {
                const Icon = INTERACTION_ICONS[interaction.type] || Clock;
                return (
                  <div key={interaction.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-emerald-100 hover:bg-emerald-50/20 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-1">
                        <span className="font-semibold text-sm text-gray-900 leading-snug">{interaction.title}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge variant="outline" className="text-xs px-1.5 py-0">{interaction.type}</Badge>{interaction.confirmation_status&&<Badge className={interaction.confirmation_status==='confirmed'?'bg-green-100 text-green-700 text-xs px-1.5 py-0':interaction.confirmation_status==='declined'?'bg-red-100 text-red-700 text-xs px-1.5 py-0':'bg-amber-100 text-amber-700 text-xs px-1.5 py-0'}>{interaction.confirmation_status==='confirmed'?'Confirmado':interaction.confirmation_status==='declined'?'Recusou':'Aguardando'}</Badge>}
                          <button onClick={() => startEditInteraction(interaction)} className="p-1 hover:bg-blue-50 rounded text-blue-400 hover:text-blue-600"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => syncToGoogleCalendar(interaction)} disabled={syncingInteractionId === interaction.id} className="p-1 hover:bg-emerald-50 rounded text-emerald-500 disabled:opacity-40">
                            {syncingInteractionId === interaction.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => deleteInteraction(interaction.id)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      {interaction.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{interaction.description}</p>}
                      {interaction.next_action && <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 px-2 py-1 rounded-md inline-block">→ {interaction.next_action}{interaction.next_action_date && ` · ${interaction.next_action_date}`}</p>}{interaction.meeting_datetime&&<p className="text-xs text-blue-600 mt-1">Encontro: {new Date(interaction.meeting_datetime).toLocaleString('pt-BR')}</p>}
                      {interaction.responsible_name && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><UserCheck className="w-3 h-3" /> {interaction.responsible_name}</p>}
                      <p className="text-xs text-gray-400 mt-1.5">{interaction.date ? format(new Date(interaction.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}</p>
                      <CRMThread item={interaction} itemType="interaction" teamMembers={assignableMembers} currentUser={currentUser} onSaveThread={(thread) => saveInteractionThread(interaction.id, thread)} propertyId={crmId} clientName={property?.client_name} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── Tarefas ── */}
        <TabsContent value="tasks" className="space-y-3 mt-4">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto" onClick={() => { setEditingTask(null); setNewTask({ title: '', due_date: '', priority: 'Média', responsible_email: '', responsible_name: '' }); setShowTaskForm(true); }}>
            <Plus className="w-3 h-3 mr-1" /> Nova Tarefa
          </Button>

          {showTaskForm && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-emerald-800">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-gray-600 mb-1 block">Tarefa *</Label>
                    <Input className="h-9 text-sm" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="Descreva a tarefa" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Prazo</Label>
                    <Input className="h-9 text-sm" type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Prioridade</Label>
                    <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {assignableMembers.length > 0 && (
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-gray-600 mb-1 block flex items-center gap-1"><UserCheck className="w-3 h-3" /> Responsável</Label>
                      <Select value={newTask.responsible_email || ''} onValueChange={v => { const m = assignableMembers.find(m => m.member_email === v); setNewTask(p => ({ ...p, responsible_email: v || '', responsible_name: m?.member_name || v })); }}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o responsável (opcional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>— Sem responsável —</SelectItem>
                          {assignableMembers.map(m => <SelectItem key={m.member_email} value={m.member_email}>{m.member_name || m.member_email} · {m.member_role}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => { setShowTaskForm(false); setEditingTask(null); }}>Cancelar</Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={addTask} disabled={updateCRM.isPending}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {(activeCRM?.tasks || []).length === 0 ? (
              <div className="text-center py-10"><CheckSquare className="w-10 h-10 mx-auto text-gray-200 mb-2" /><p className="text-sm text-gray-400">Nenhuma tarefa cadastrada</p></div>
            ) : (
              (activeCRM?.tasks || []).map(task => {
                const isOverdue = task.due_date && !task.done && new Date(task.due_date) < new Date();
                const priorityBadge = { 'Alta': 'bg-red-100 text-red-700', 'Média': 'bg-amber-100 text-amber-700', 'Baixa': 'bg-gray-100 text-gray-600' }[task.priority] || 'bg-gray-100 text-gray-600';
                return (
                  <div key={task.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${task.done ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-white border-gray-200 hover:border-emerald-100'}`}>
                    <button onClick={() => toggleTask(task.id)} className="mt-0.5 flex-shrink-0">
                      {task.done ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5 text-gray-300 hover:text-emerald-400 transition-colors" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
                      {task.due_date && <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>{isOverdue ? '⚠ Atrasado · ' : '📅 '}{task.due_date}</p>}
                      {task.responsible_name && <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1"><UserCheck className="w-3 h-3" /> {task.responsible_name}</p>}
                      <CRMThread item={task} itemType="task" teamMembers={assignableMembers} currentUser={currentUser} onSaveThread={(thread) => saveTaskThread(task.id, thread)} propertyId={crmId} clientName={property?.client_name} />
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${priorityBadge}`}>{task.priority}</span>
                      <button onClick={() => startEditTask(task)} className="p-1 hover:bg-blue-50 rounded text-gray-300 hover:text-blue-500 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteTask(task.id)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}