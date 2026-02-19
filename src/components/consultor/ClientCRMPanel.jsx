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
  Plus, Briefcase, Clock, ChevronDown, ChevronRight, Trash2, Edit3, Share2, Loader
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
  const [newInteraction, setNewInteraction] = useState({ type: 'Ligação', title: '', description: '', next_action: '', next_action_date: '' });
  const [newTask, setNewTask] = useState({ title: '', due_date: '', priority: 'Média' });
  const [newService, setNewService] = useState({ name: '', status: 'Em Proposta', value: '', notes: '' });

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
    setNewInteraction({ type: 'Ligação', title: '', description: '', next_action: '', next_action_date: '' });
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
    setNewTask({ title: '', due_date: '', priority: 'Média' });
    setShowTaskForm(false);
    setEditingTask(null);
    toast.success(editingTask ? 'Tarefa atualizada!' : 'Tarefa adicionada!');
  };

  const startEditTask = (task) => {
    setEditingTask(task);
    setNewTask({ title: task.title, due_date: task.due_date || '', priority: task.priority || 'Média' });
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
    setNewService({ name: '', status: 'Em Proposta', value: '', notes: '' });
    setShowServiceForm(false);
    setEditingServiceIndex(null);
    toast.success(editingServiceIndex !== null ? 'Serviço atualizado!' : 'Serviço adicionado!');
  };

  const startEditService = (service, index) => {
    setEditingServiceIndex(index);
    setNewService({ name: service.name, status: service.status, value: service.value?.toString() || '', notes: service.notes || '' });
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
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{property?.client_name || property?.property_name}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
            {property?.owner_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{property.owner_email}</span>}
            {clientData.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{clientData.phone}</span>}
          </div>
        </div>
        <Select value={crm?.status || 'Ativo'} onValueChange={updateStatus}>
          <SelectTrigger className="w-40">
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
          <TabsTrigger value="interactions">Interações</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
        </TabsList>

        {/* Interações */}
        <TabsContent value="interactions" className="space-y-3 mt-3">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
            setEditingInteraction(null);
            setNewInteraction({ type: 'Ligação', title: '', description: '', next_action: '', next_action_date: '' });
            setShowInteractionForm(true);
          }}>
            <Plus className="w-3 h-3 mr-1" /> Nova Interação
          </Button>

          {showInteractionForm && (
            <Card className="border-emerald-200">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-emerald-800">{editingInteraction ? 'Editar Interação' : 'Nova Interação'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={newInteraction.type} onValueChange={v => setNewInteraction(p => ({ ...p, type: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{INTERACTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Título *</Label>
                    <Input className="h-8 text-sm" value={newInteraction.title} onChange={e => setNewInteraction(p => ({ ...p, title: e.target.value }))} placeholder="Resumo" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Descrição</Label>
                  <Input className="text-sm" value={newInteraction.description} onChange={e => setNewInteraction(p => ({ ...p, description: e.target.value }))} placeholder="Detalhes..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Próxima Ação</Label>
                    <Input className="h-8 text-sm" value={newInteraction.next_action} onChange={e => setNewInteraction(p => ({ ...p, next_action: e.target.value }))} placeholder="O que fazer?" />
                  </div>
                  <div>
                    <Label className="text-xs">Data da Próxima Ação</Label>
                    <Input className="h-8 text-sm" type="date" value={newInteraction.next_action_date} onChange={e => setNewInteraction(p => ({ ...p, next_action_date: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setShowInteractionForm(false); setEditingInteraction(null); }}>Cancelar</Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={addInteraction}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {(crm?.interactions || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma interação registrada</p>
            ) : (
              [...(crm?.interactions || [])].reverse().map(interaction => {
                const Icon = INTERACTION_ICONS[interaction.type] || Clock;
                return (
                  <Card key={interaction.id} className="border-gray-100">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5 text-emerald-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm text-gray-900">{interaction.title}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Badge variant="outline" className="text-xs">{interaction.type}</Badge>
                              <button
                                onClick={() => startEditInteraction(interaction)}
                                className="p-1 hover:bg-blue-50 rounded text-blue-500"
                                title="Editar"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => syncToGoogleCalendar(interaction)}
                                disabled={syncingInteractionId === interaction.id}
                                className="p-1 hover:bg-emerald-50 rounded text-emerald-600 disabled:opacity-50"
                                title="Sincronizar com Google Calendar"
                              >
                                {syncingInteractionId === interaction.id ? (
                                  <Loader className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Share2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => deleteInteraction(interaction.id)}
                                className="p-1 hover:bg-red-50 rounded text-red-400"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {interaction.description && <p className="text-xs text-gray-500 mt-0.5">{interaction.description}</p>}
                          {interaction.next_action && (
                            <p className="text-xs text-amber-600 mt-1">
                              → {interaction.next_action}
                              {interaction.next_action_date && ` (${interaction.next_action_date})`}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {interaction.date ? format(new Date(interaction.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Tarefas */}
        <TabsContent value="tasks" className="space-y-3 mt-3">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
            setEditingTask(null);
            setNewTask({ title: '', due_date: '', priority: 'Média' });
            setShowTaskForm(true);
          }}>
            <Plus className="w-3 h-3 mr-1" /> Nova Tarefa
          </Button>

          {showTaskForm && (
            <Card className="border-emerald-200">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-emerald-800">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Tarefa *</Label>
                    <Input className="h-8 text-sm" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="Descreva a tarefa" />
                  </div>
                  <div>
                    <Label className="text-xs">Prazo</Label>
                    <Input className="h-8 text-sm" type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Prioridade</Label>
                    <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setShowTaskForm(false); setEditingTask(null); }}>Cancelar</Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={addTask}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {(crm?.tasks || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma tarefa cadastrada</p>
            ) : (
              (crm?.tasks || []).map(task => {
                const isOverdue = task.due_date && !task.done && new Date(task.due_date) < new Date();
                const priorityColor = task.priority === 'Alta' ? 'text-red-600' : task.priority === 'Média' ? 'text-amber-600' : 'text-gray-500';
                return (
                  <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border ${task.done ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
                    <button onClick={() => toggleTask(task.id)}>
                      {task.done
                        ? <CheckSquare className="w-5 h-5 text-emerald-500" />
                        : <Square className="w-5 h-5 text-gray-300" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
                      {task.due_date && (
                        <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          {isOverdue ? '⚠ Atrasado: ' : 'Prazo: '}{task.due_date}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${priorityColor}`}>{task.priority}</span>
                    <button onClick={() => startEditTask(task)} className="text-gray-300 hover:text-blue-500 p-1">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Serviços */}
        <TabsContent value="services" className="space-y-3 mt-3">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowServiceForm(true)}>
            <Plus className="w-3 h-3 mr-1" /> Novo Serviço
          </Button>

          {showServiceForm && (
            <Card className="border-emerald-200">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Nome do Serviço *</Label>
                    <Input className="h-8 text-sm" value={newService.name} onChange={e => setNewService(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Licença Ambiental LP" />
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={newService.status} onValueChange={v => setNewService(p => ({ ...p, status: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Em Proposta','Contratado','Em Andamento','Concluído','Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input className="h-8 text-sm" type="number" value={newService.value} onChange={e => setNewService(p => ({ ...p, value: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Observações</Label>
                    <Input className="text-sm" value={newService.notes} onChange={e => setNewService(p => ({ ...p, notes: e.target.value }))} placeholder="Detalhes do serviço" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowServiceForm(false)}>Cancelar</Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={addService}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {(crm?.services || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum serviço cadastrado</p>
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
                  <Card key={i} className="border-gray-100">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{service.name}</p>
                          {service.notes && <p className="text-xs text-gray-500 mt-0.5">{service.notes}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={`${statusColor} text-xs border-0`}>{service.status}</Badge>
                          {service.value > 0 && (
                            <span className="text-sm font-bold text-emerald-700">
                              R$ {service.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}