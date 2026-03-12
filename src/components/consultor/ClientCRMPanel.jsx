import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Phone, Mail, MessageCircle, Users, Calendar, CheckSquare, Square,
  Plus, Briefcase, Clock, ChevronDown, ChevronRight, Trash2, Edit3, Share2, Loader, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS = {
  'Prospect': 'bg-purple-100 text-purple-700 border-purple-200',
  'Ativo': 'bg-green-100 text-green-700 border-green-200',
  'Em Negociação': 'bg-amber-100 text-amber-700 border-amber-200',
  'Inativo': 'bg-gray-100 text-gray-600 border-gray-200',
  'Encerrado': 'bg-red-100 text-red-700 border-red-200',
};

const INTERACTION_TYPES = ['Ligação', 'Reunião', 'E-mail', 'WhatsApp', 'Visita', 'Proposta', 'Contrato', 'Outro'];
const INTERACTION_ICONS = {
  'Ligação': Phone, 'Reunião': Users, 'E-mail': Mail, 'WhatsApp': MessageCircle,
  'Visita': Users, 'Proposta': Briefcase, 'Contrato': Briefcase, 'Outro': Clock,
};

export default function ClientCRMPanel({ property, onClose }) {
  const queryClient = useQueryClient();
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [syncingInteractionId, setSyncingInteractionId] = useState(null);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingServiceIndex, setEditingServiceIndex] = useState(null);
  const [newInteraction, setNewInteraction] = useState({ type: 'Ligação', title: '', description: '', next_action: '', next_action_date: '', responsible_email: '', responsible_name: '' });
  const [newTask, setNewTask] = useState({ title: '', due_date: '', priority: 'Média', responsible_email: '', responsible_name: '' });
  const [newService, setNewService] = useState({ name: '', status: 'Em Proposta', value: '', notes: '', payment_type: 'avista', payment_method: 'Pix', installments: '', start_date: '', received: false });

  // Membros da equipe do consultor
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', crmConsultorEmail],
    queryFn: () => base44.entities.TeamMember.filter({ primary_user_email: crmConsultorEmail, status: 'Ativo' }),
    enabled: !!crmConsultorEmail,
  });

  const notifyAssignment = async (responsible_email, responsible_name, type, title) => {
    if (!responsible_email) return;
    try {
      await base44.functions.invoke('notifyCRMAssignment', {
        responsible_email,
        assigner_name: crmConsultorEmail,
        type,
        title,
        client_name: property?.client_name || property?.property_name,
      });
    } catch (e) {
      console.warn('Erro ao notificar responsável:', e.message);
    }
  };

  // Se vier do ConsultorClients, property é um objeto "client" com .properties[]
  // Usa a primeira propriedade real para associar o CRM
  const firstRealProperty = property?.properties?.find(p => !p.is_client_only) || property?.properties?.[0];
  const crmPropertyId = firstRealProperty?.id || property?.id;
  const crmConsultorEmail = firstRealProperty?.consultor_email || property?.consultor_email;
  const crmOwnerEmail = firstRealProperty?.owner_email || property?.owner_email;

  const { data: crm, isLoading } = useQuery({
    queryKey: ['client-crm', crmPropertyId],
    queryFn: async () => {
      const results = await base44.entities.ClientCRM.filter({ property_id: crmPropertyId });
      return results[0] || null;
    },
    enabled: !!crmPropertyId,
  });

  const upsertCRM = useMutation({
    mutationFn: (data) => {
      if (crm?.id) return base44.entities.ClientCRM.update(crm.id, data);
      return base44.entities.ClientCRM.create({ property_id: crmPropertyId, consultor_email: crmConsultorEmail, client_email: crmOwnerEmail, ...data });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-crm', crmPropertyId] }),
  });

  const addInteraction = () => {
    if (!newInteraction.title) { toast.error('Informe o título da interação.'); return; }
    let interactions;
    if (editingInteraction) {
      interactions = (crm?.interactions || []).map(i =>
        i.id === editingInteraction.id ? { ...i, ...newInteraction } : i
      );
    } else {
      interactions = [...(crm?.interactions || []), {
        id: Date.now().toString(), date: new Date().toISOString(),
        ...newInteraction, created_by: crmConsultorEmail,
      }];
    }
    upsertCRM.mutate({ interactions });
    // Notifica responsável apenas em criação ou se trocou de responsável
    if (!editingInteraction && newInteraction.responsible_email) {
      notifyAssignment(newInteraction.responsible_email, newInteraction.responsible_name, 'interaction', newInteraction.title);
    } else if (editingInteraction && newInteraction.responsible_email && newInteraction.responsible_email !== editingInteraction.responsible_email) {
      notifyAssignment(newInteraction.responsible_email, newInteraction.responsible_name, 'interaction', newInteraction.title);
    }
    setNewInteraction({ type: 'Ligação', title: '', description: '', next_action: '', next_action_date: '', responsible_email: '', responsible_name: '' });
    setShowInteractionForm(false);
    setEditingInteraction(null);
    toast.success(editingInteraction ? 'Interação atualizada!' : 'Interação registrada!');
  };

  const deleteInteraction = (id) => {
    const interactions = (crm?.interactions || []).filter(i => i.id !== id);
    upsertCRM.mutate({ interactions });
    toast.success('Interação removida.');
  };

  const startEditInteraction = (interaction) => {
    setEditingInteraction(interaction);
    setNewInteraction({
      type: interaction.type,
      title: interaction.title,
      description: interaction.description || '',
      next_action: interaction.next_action || '',
      next_action_date: interaction.next_action_date || '',
      responsible_email: interaction.responsible_email || '',
      responsible_name: interaction.responsible_name || '',
    });
    setShowInteractionForm(true);
  };

  const addTask = () => {
    if (!newTask.title) { toast.error('Informe o título da tarefa.'); return; }
    let tasks;
    if (editingTask) {
      tasks = (crm?.tasks || []).map(t => t.id === editingTask.id ? { ...t, ...newTask } : t);
    } else {
      tasks = [...(crm?.tasks || []), { id: Date.now().toString(), done: false, ...newTask }];
    }
    upsertCRM.mutate({ tasks });
    if (!editingTask && newTask.responsible_email) {
      notifyAssignment(newTask.responsible_email, newTask.responsible_name, 'task', newTask.title);
    } else if (editingTask && newTask.responsible_email && newTask.responsible_email !== editingTask.responsible_email) {
      notifyAssignment(newTask.responsible_email, newTask.responsible_name, 'task', newTask.title);
    }
    setNewTask({ title: '', due_date: '', priority: 'Média', responsible_email: '', responsible_name: '' });
    setShowTaskForm(false);
    setEditingTask(null);
    toast.success(editingTask ? 'Tarefa atualizada!' : 'Tarefa adicionada!');
  };

  const startEditTask = (task) => {
    setEditingTask(task);
    setNewTask({ title: task.title, due_date: task.due_date || '', priority: task.priority || 'Média', responsible_email: task.responsible_email || '', responsible_name: task.responsible_name || '' });
    setShowTaskForm(true);
  };

  const toggleTask = (taskId) => {
    const tasks = (crm?.tasks || []).map(t => t.id === taskId ? { ...t, done: !t.done } : t);
    upsertCRM.mutate({ tasks });
  };

  const deleteTask = (taskId) => {
    const tasks = (crm?.tasks || []).filter(t => t.id !== taskId);
    upsertCRM.mutate({ tasks });
  };

  const addService = () => {
    if (!newService.name) { toast.error('Informe o nome do serviço.'); return; }
    let services;
    if (editingServiceIndex !== null) {
      services = (crm?.services || []).map((s, i) =>
        i === editingServiceIndex ? { ...s, ...newService, value: parseFloat(newService.value) || 0 } : s
      );
    } else {
      services = [...(crm?.services || []), { ...newService, value: parseFloat(newService.value) || 0 }];
    }
    upsertCRM.mutate({ services });
    setNewService({ name: '', status: 'Em Proposta', value: '', notes: '', payment_type: 'avista', payment_method: 'Pix', installments: '', start_date: '', received: false });
    setShowServiceForm(false);
    setEditingServiceIndex(null);
    toast.success(editingServiceIndex !== null ? 'Serviço atualizado!' : 'Serviço adicionado!');
  };

  const startEditService = (service, index) => {
    setEditingServiceIndex(index);
    setNewService({
      name: service.name, status: service.status, value: service.value?.toString() || '',
      notes: service.notes || '', payment_type: service.payment_type || 'avista',
      payment_method: service.payment_method || 'Pix', installments: service.installments || '',
      start_date: service.start_date || '', received: service.received || false,
    });
    setShowServiceForm(true);
  };

  const deleteService = (index) => {
    const services = (crm?.services || []).filter((_, i) => i !== index);
    upsertCRM.mutate({ services });
    toast.success('Serviço removido.');
  };

  const updateStatus = (status) => upsertCRM.mutate({ status });

  const syncToGoogleCalendar = async (interaction) => {
    setSyncingInteractionId(interaction.id);
    try {
      const response = await base44.functions.invoke('syncToGoogleCalendar', {
        interaction,
        clientName: property?.client_name || property?.property_name,
        propertyName: property?.property_name,
      });
      toast.success('Evento sincronizado com Google Calendar!');
      if (response.data?.eventLink) {
        window.open(response.data.eventLink, '_blank');
      }
    } catch (error) {
      toast.error('Erro ao sincronizar: ' + (error.message || 'Tente novamente'));
    } finally {
      setSyncingInteractionId(null);
    }
  };

  const clientData = (() => {
    try { return JSON.parse(property?.authorized_users || '{}'); } catch { return {}; }
  })();

  return (
    <div className="space-y-4">
      {/* Cabeçalho do cliente */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-700 font-bold text-base">
              {(property?.client_name || property?.property_name || '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{property?.client_name || property?.property_name}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-0.5">
              {property?.owner_email && (
                <a href={`mailto:${property.owner_email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 transition-colors">
                  <Mail className="w-3 h-3" />{property.owner_email}
                </a>
              )}
              {clientData.phone && (
                <a href={`https://wa.me/${clientData.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 transition-colors">
                  <Phone className="w-3 h-3" />{clientData.phone}
                </a>
              )}
            </div>
          </div>
        </div>
        <Select value={crm?.status || 'Ativo'} onValueChange={updateStatus}>
          <SelectTrigger className="w-full sm:w-40 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(STATUS_COLORS).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="interactions">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="interactions" className="text-xs sm:text-sm">Interações</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs sm:text-sm">Tarefas</TabsTrigger>
          <TabsTrigger value="services" className="text-xs sm:text-sm">Serviços</TabsTrigger>
        </TabsList>

        {/* Interações */}
        <TabsContent value="interactions" className="space-y-3 mt-4">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto" onClick={() => {
            setEditingInteraction(null);
            setNewInteraction({ type: 'Ligação', title: '', description: '', next_action: '', next_action_date: '' });
            setShowInteractionForm(true);
          }}>
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
                {teamMembers.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block flex items-center gap-1"><UserCheck className="w-3 h-3" /> Responsável</Label>
                    <Select value={newInteraction.responsible_email} onValueChange={v => {
                      const member = teamMembers.find(m => m.member_email === v);
                      setNewInteraction(p => ({ ...p, responsible_email: v, responsible_name: member?.member_name || v }));
                    }}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o responsável (opcional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>— Sem responsável —</SelectItem>
                        {teamMembers.map(m => (
                          <SelectItem key={m.member_email} value={m.member_email}>
                            {m.member_name || m.member_email} · {m.member_role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => { setShowInteractionForm(false); setEditingInteraction(null); }}>Cancelar</Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={addInteraction}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {(crm?.interactions || []).length === 0 ? (
              <div className="text-center py-10">
                <MessageCircle className="w-10 h-10 mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Nenhuma interação registrada</p>
              </div>
            ) : (
              [...(crm?.interactions || [])].reverse().map(interaction => {
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
                          <Badge variant="outline" className="text-xs px-1.5 py-0">{interaction.type}</Badge>
                          <button onClick={() => startEditInteraction(interaction)} className="p-1 hover:bg-blue-50 rounded text-blue-400 hover:text-blue-600" title="Editar">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => syncToGoogleCalendar(interaction)} disabled={syncingInteractionId === interaction.id} className="p-1 hover:bg-emerald-50 rounded text-emerald-500 disabled:opacity-40" title="Sincronizar Google Calendar">
                            {syncingInteractionId === interaction.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => deleteInteraction(interaction.id)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400" title="Excluir">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {interaction.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{interaction.description}</p>}
                      {interaction.next_action && (
                        <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 px-2 py-1 rounded-md inline-block">
                          → {interaction.next_action}{interaction.next_action_date && ` · ${interaction.next_action_date}`}
                        </p>
                      )}
                      {interaction.responsible_name && (
                        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> {interaction.responsible_name}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1.5">
                        {interaction.date ? format(new Date(interaction.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Tarefas */}
        <TabsContent value="tasks" className="space-y-3 mt-4">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto" onClick={() => {
            setEditingTask(null);
            setNewTask({ title: '', due_date: '', priority: 'Média' });
            setShowTaskForm(true);
          }}>
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
                  {teamMembers.length > 0 && (
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-gray-600 mb-1 block flex items-center gap-1"><UserCheck className="w-3 h-3" /> Responsável</Label>
                      <Select value={newTask.responsible_email} onValueChange={v => {
                        const member = teamMembers.find(m => m.member_email === v);
                        setNewTask(p => ({ ...p, responsible_email: v, responsible_name: member?.member_name || v }));
                      }}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o responsável (opcional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>— Sem responsável —</SelectItem>
                          {teamMembers.map(m => (
                            <SelectItem key={m.member_email} value={m.member_email}>
                              {m.member_name || m.member_email} · {m.member_role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => { setShowTaskForm(false); setEditingTask(null); }}>Cancelar</Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={addTask}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {(crm?.tasks || []).length === 0 ? (
              <div className="text-center py-10">
                <CheckSquare className="w-10 h-10 mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Nenhuma tarefa cadastrada</p>
              </div>
            ) : (
              (crm?.tasks || []).map(task => {
                const isOverdue = task.due_date && !task.done && new Date(task.due_date) < new Date();
                const priorityBadge = {
                  'Alta': 'bg-red-100 text-red-700',
                  'Média': 'bg-amber-100 text-amber-700',
                  'Baixa': 'bg-gray-100 text-gray-600',
                }[task.priority] || 'bg-gray-100 text-gray-600';
                return (
                  <div key={task.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${task.done ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-white border-gray-200 hover:border-emerald-100'}`}>
                    <button onClick={() => toggleTask(task.id)} className="mt-0.5 flex-shrink-0">
                      {task.done
                        ? <CheckSquare className="w-5 h-5 text-emerald-500" />
                        : <Square className="w-5 h-5 text-gray-300 hover:text-emerald-400 transition-colors" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
                      {task.due_date && (
                        <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                          {isOverdue ? '⚠ Atrasado · ' : '📅 '}{task.due_date}
                        </p>
                      )}
                      {task.responsible_name && (
                        <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> {task.responsible_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${priorityBadge}`}>{task.priority}</span>
                      <button onClick={() => startEditTask(task)} className="p-1 hover:bg-blue-50 rounded text-gray-300 hover:text-blue-500 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteTask(task.id)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Serviços */}
        <TabsContent value="services" className="space-y-3 mt-4">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto" onClick={() => {
            setEditingServiceIndex(null);
            setNewService({ name: '', status: 'Em Proposta', value: '', notes: '' });
            setShowServiceForm(true);
          }}>
            <Plus className="w-3 h-3 mr-1" /> Novo Serviço
          </Button>

          {showServiceForm && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-emerald-800">{editingServiceIndex !== null ? 'Editar Serviço' : 'Novo Serviço'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-gray-600 mb-1 block">Nome do Serviço *</Label>
                    <Input className="h-9 text-sm" value={newService.name} onChange={e => setNewService(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Licença Ambiental LP" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Status</Label>
                    <Select value={newService.status} onValueChange={v => setNewService(p => ({ ...p, status: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Em Proposta','Contratado','Em Andamento','Concluído','Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Valor Total (R$)</Label>
                    <Input className="h-9 text-sm" type="number" value={newService.value} onChange={e => setNewService(p => ({ ...p, value: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Data de Início</Label>
                    <Input className="h-9 text-sm" type="date" value={newService.start_date} onChange={e => setNewService(p => ({ ...p, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Tipo de Pagamento</Label>
                    <Select value={newService.payment_type} onValueChange={v => setNewService(p => ({ ...p, payment_type: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avista">À Vista</SelectItem>
                        <SelectItem value="parcelado">Parcelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Forma de Pagamento</Label>
                    <Select value={newService.payment_method} onValueChange={v => setNewService(p => ({ ...p, payment_method: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Pix','Transferência','Boleto','Cartão de Crédito','Cartão de Débito','Dinheiro','Cheque','Outro'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {newService.payment_type === 'parcelado' && (
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Nº de Parcelas</Label>
                      <Input className="h-9 text-sm" type="number" min="2" value={newService.installments} onChange={e => setNewService(p => ({ ...p, installments: e.target.value }))} placeholder="Ex: 3" />
                    </div>
                  )}
                  <div className="sm:col-span-2 flex items-center gap-2 mt-1">
                    <input type="checkbox" id="svc-received" checked={newService.received} onChange={e => setNewService(p => ({ ...p, received: e.target.checked }))} className="w-4 h-4 accent-emerald-600" />
                    <label htmlFor="svc-received" className="text-sm text-gray-700 cursor-pointer">Valor já recebido</label>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-gray-600 mb-1 block">Observações</Label>
                    <Input className="h-9 text-sm" value={newService.notes} onChange={e => setNewService(p => ({ ...p, notes: e.target.value }))} placeholder="Detalhes do serviço" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => { setShowServiceForm(false); setEditingServiceIndex(null); }}>Cancelar</Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={addService}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {(crm?.services || []).length === 0 ? (
              <div className="text-center py-10">
                <Briefcase className="w-10 h-10 mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Nenhum serviço cadastrado</p>
              </div>
            ) : (
              (crm?.services || []).map((service, i) => {
                const statusColor = {
                  'Em Proposta': 'bg-blue-100 text-blue-700',
                  'Contratado': 'bg-purple-100 text-purple-700',
                  'Em Andamento': 'bg-amber-100 text-amber-700',
                  'Concluído': 'bg-green-100 text-green-700',
                  'Cancelado': 'bg-red-100 text-red-700',
                }[service.status] || 'bg-gray-100 text-gray-700';
                return (
                  <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-emerald-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 leading-snug">{service.name}</p>
                      {service.notes && <p className="text-xs text-gray-500 mt-0.5">{service.notes}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {parseFloat(service.value) > 0 && (
                          <p className="text-sm font-bold text-emerald-700">
                            R$ {parseFloat(service.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            {service.payment_type === 'parcelado' && service.installments && (
                              <span className="text-xs font-normal text-gray-500"> · {service.installments}x</span>
                            )}
                          </p>
                        )}
                        {service.payment_method && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-md">{service.payment_method}</span>}
                        {service.payment_type === 'avista' && <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md">À Vista</span>}
                        {service.received
                          ? <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-md font-medium">✓ Recebido</span>
                          : <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-md">Aguardando</span>
                        }
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>{service.status}</span>
                      <button onClick={() => startEditService(service, i)} className="p-1 hover:bg-blue-50 rounded text-gray-300 hover:text-blue-500 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteService(i)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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