import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus, ClipboardList, Save, Trash2,
  ChevronDown, Upload, FileText, User, Calendar, MessageSquare, Link2
} from 'lucide-react';
import ChecklistProgress from '@/components/checklist/ChecklistProgress';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors = {
  'Pendente': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Em Progresso': 'bg-blue-100 text-blue-800 border-blue-300',
  'Concluído': 'bg-green-100 text-green-800 border-green-300',
  'Atrasado': 'bg-red-100 text-red-800 border-red-300',
  'Bloqueado': 'bg-gray-100 text-gray-800 border-gray-300'
};

const priorityColors = {
  'Baixa': 'text-blue-600',
  'Média': 'text-orange-600',
  'Alta': 'text-red-600'
};

// Item de tarefa com equipe, notas, integração CRM/Agenda
function ChecklistTaskItem({ item, teamMembers, consultorEmail, licenseId, propertyId, onFieldChange, onStatusChange, onDelete, isExpanded, onToggleExpand, user }) {
  const [showFileInput, setShowFileInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState('');
  const [linkingCRM, setLinkingCRM] = useState(false);
  const [linkingAgenda, setLinkingAgenda] = useState(false);

  const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'Concluído';

  // Busca clientes para integração CRM
  const { data: crmClients = [] } = useQuery({
    queryKey: ['crmForChecklist', consultorEmail, propertyId],
    queryFn: () => base44.entities.ClientCRM.filter({ consultor_email: consultorEmail }),
    enabled: !!consultorEmail && linkingCRM,
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newFile = {
        id: Date.now().toString(),
        name: file.name,
        url: file_url,
        type: 'Documento',
        uploaded_by: user?.email,
        uploaded_date: new Date().toISOString(),
        size_bytes: file.size
      };
      onFieldChange('files', [...(item.files || []), newFile]);
      toast.success('Arquivo anexado!');
    } catch {
      toast.error('Erro ao fazer upload');
    }
    setUploading(false);
    setShowFileInput(false);
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    const activity = {
      id: Date.now().toString(),
      action: 'note_added',
      timestamp: new Date().toISOString(),
      user_email: user?.email,
      user_name: user?.full_name || user?.email,
      details: note.trim()
    };
    onFieldChange('activity_history', [...(item.activity_history || []), activity]);
    onFieldChange('notes', item.notes ? item.notes + '\n' + note.trim() : note.trim());
    setNote('');
    toast.success('Nota adicionada!');
  };

  const handleCreateAgendaEvent = async () => {
    if (!item.due_date) { toast.error('Defina um prazo para criar evento na agenda'); return; }
    setLinkingAgenda(true);
    try {
      await base44.entities.AgendaEvent.create({
        user_email: consultorEmail,
        title: `Tarefa: ${item.title}`,
        description: `Checklist de Licença\nResponsável: ${item.responsible_name || '-'}\nNotas: ${item.notes || '-'}`,
        start_date: item.due_date,
        end_date: item.due_date,
        type: 'Tarefa',
        status: 'Pendente',
        related_entity_type: 'License',
        related_entity_id: licenseId,
      });
      toast.success('Evento criado na Agenda!');
    } catch {
      toast.error('Erro ao criar evento na agenda');
    }
    setLinkingAgenda(false);
  };

  const handleLinkCRM = async (clientId) => {
    const client = crmClients.find(c => c.id === clientId);
    if (!client) return;
    setLinkingCRM(false);
    try {
      // Adiciona tarefa ao CRM do cliente
      const newTask = {
        id: Date.now().toString(),
        title: item.title,
        description: `Vinculado ao Checklist de Licença`,
        due_date: item.due_date || '',
        done: false,
        status: 'pending',
        priority: item.priority || 'Média',
        responsible_email: item.responsible_email || consultorEmail,
        responsible_name: item.responsible_name || '',
        assigned_to_email: item.responsible_email || consultorEmail,
        assigned_by_email: consultorEmail,
        assigned_at: new Date().toISOString(),
        thread: []
      };
      const updatedTasks = [...(client.tasks || []), newTask];
      await base44.entities.ClientCRM.update(clientId, { tasks: updatedTasks });
      toast.success(`Tarefa vinculada ao CRM de ${client.client_name}!`);
    } catch {
      toast.error('Erro ao vincular ao CRM');
    }
  };

  return (
    <Card className={`p-3 mb-2 transition-all ${isOverdue ? 'border-red-400 border-2' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between cursor-pointer" onClick={onToggleExpand}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            <span className="font-semibold text-sm">{item.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[item.status]}`}>{item.status}</span>
            <span className={`text-xs font-bold ${priorityColors[item.priority]}`}>{item.priority}</span>
            {item.responsible_name && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{item.responsible_name}</span>
            )}
            {item.due_date && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                📅 {new Date(item.due_date).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-gray-500 ml-6 mt-0.5 line-clamp-1">{item.description}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 ml-1 flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Expanded */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t space-y-3 ml-6">
          {/* Status + Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Status</label>
              <select
                value={item.status}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
              >
                <option>Pendente</option>
                <option>Em Progresso</option>
                <option>Concluído</option>
                <option>Atrasado</option>
                <option>Bloqueado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Prioridade</label>
              <select
                value={item.priority || 'Média'}
                onChange={(e) => onFieldChange('priority', e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
              >
                <option>Baixa</option>
                <option>Média</option>
                <option>Alta</option>
              </select>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Data Início
              </label>
              <input
                type="date"
                value={item.start_date || ''}
                onChange={(e) => onFieldChange('start_date', e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Prazo
              </label>
              <input
                type="date"
                value={item.due_date || ''}
                onChange={(e) => onFieldChange('due_date', e.target.value)}
                className={`w-full px-2 py-1.5 border rounded-lg text-sm ${isOverdue ? 'border-red-400 bg-red-50' : ''}`}
              />
            </div>
          </div>

          {/* Responsável — dropdown da equipe */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1 flex items-center gap-1">
              <User className="w-3 h-3" /> Responsável
            </label>
            {teamMembers.length > 0 ? (
              <select
                value={item.responsible_email || ''}
                onChange={(e) => {
                  const member = teamMembers.find(m => m.member_email === e.target.value);
                  onFieldChange('responsible_email', e.target.value);
                  onFieldChange('responsible_name', member?.member_name || e.target.value);
                }}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
              >
                <option value="">— Selecionar Responsável —</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.member_email}>
                    {m.member_name} ({m.member_role || 'Equipe'})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Nome do responsável"
                value={item.responsible_name || ''}
                onChange={(e) => onFieldChange('responsible_name', e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
              />
            )}
          </div>

          {/* Notas/Observações */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Observações
            </label>
            <textarea
              value={item.notes || ''}
              onChange={(e) => onFieldChange('notes', e.target.value)}
              placeholder="Adicione observações sobre esta tarefa..."
              className="w-full px-2 py-1.5 border rounded-lg text-sm h-20 resize-none"
            />
          </div>

          {/* Adicionar nota rápida ao histórico */}
          <div className="flex gap-2">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNote())}
              placeholder="Nota rápida para o histórico..."
              className="flex-1 px-2 py-1.5 border rounded-lg text-xs"
            />
            <Button size="sm" variant="outline" onClick={handleAddNote} className="text-xs h-8 px-2">
              + Nota
            </Button>
          </div>

          {/* Integração Agenda + CRM */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreateAgendaEvent}
              disabled={linkingAgenda}
              className="text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Calendar className="w-3 h-3" />
              {linkingAgenda ? 'Criando...' : 'Criar na Agenda'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLinkingCRM(!linkingCRM)}
              className="text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Link2 className="w-3 h-3" />
              Vincular CRM
            </Button>
          </div>

          {/* Seletor de cliente CRM */}
          {linkingCRM && (
            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-700 mb-1">Escolha o cliente para vincular:</p>
              {crmClients.length === 0 ? (
                <p className="text-xs text-gray-500">Nenhum cliente encontrado no CRM</p>
              ) : (
                <div className="space-y-1">
                  {crmClients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleLinkCRM(c.id)}
                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-emerald-100 transition-colors"
                    >
                      {c.client_name} — {c.client_email || c.client_phone || ''}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setLinkingCRM(false)} className="text-xs text-gray-400 mt-1 hover:text-gray-600">Cancelar</button>
            </div>
          )}

          {/* Arquivos */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Arquivos ({item.files?.length || 0})</label>
            <div className="space-y-1 mb-2">
              {item.files?.map(file => (
                <div key={file.id} className="flex items-center gap-2 bg-gray-50 p-1.5 rounded text-xs">
                  <FileText className="w-3 h-3 text-blue-600 flex-shrink-0" />
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-blue-700 hover:underline">{file.name}</a>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="gap-1 text-xs w-full" onClick={() => setShowFileInput(!showFileInput)}>
              <Upload className="w-3 h-3" /> Anexar Arquivo
            </Button>
            {showFileInput && (
              <input type="file" onChange={handleFileUpload} disabled={uploading} className="w-full mt-1 text-xs" />
            )}
          </div>

          {/* Histórico de atividades */}
          {item.activity_history?.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Histórico</label>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {[...item.activity_history].reverse().map(act => (
                  <div key={act.id} className="text-xs text-gray-600 bg-gray-50 p-1.5 rounded">
                    <span className="font-medium text-gray-700">{act.user_name}: </span>
                    <span>{act.details}</span>
                    <span className="text-gray-400 ml-1">
                      · {formatDistanceToNow(new Date(act.timestamp), { locale: ptBR, addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// View inline do checklist com suporte a equipe
function InlineChecklistView({ checklist, user, consultorEmail, teamMembers, licenseId, propertyId }) {
  const [items, setItems] = useState(checklist.items || []);
  const [expandedItems, setExpandedItems] = useState({});
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectChecklist.update(checklist.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenseChecklist'] });
      toast.success('Checklist salvo!');
    }
  });

  const handleAddItem = () => {
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      title: 'Nova Tarefa',
      description: '',
      order: prev.length,
      status: 'Pendente',
      priority: 'Média',
      responsible_email: user?.email || '',
      responsible_name: user?.full_name || '',
      start_date: '',
      due_date: '',
      notes: '',
      files: [],
      activity_history: []
    }]);
  };

  const handleFieldChange = (itemId, field, value) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const handleStatusChange = (itemId, newStatus) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? {
        ...item,
        status: newStatus,
        completion_date: newStatus === 'Concluído' ? new Date().toISOString() : null,
        activity_history: [...(item.activity_history || []), {
          id: Date.now().toString(),
          action: 'status_changed',
          timestamp: new Date().toISOString(),
          user_email: user?.email,
          user_name: user?.full_name || user?.email,
          details: `Status alterado para "${newStatus}"`
        }]
      } : item
    ));
  };

  const handleDeleteItem = (itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSave = () => {
    const completed = items.filter(i => i.status === 'Concluído').length;
    const pending = items.filter(i => i.status === 'Pendente').length;
    const delayed = items.filter(i => i.status === 'Atrasado').length;
    const total = items.length;
    updateMutation.mutate({
      items,
      overall_progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      completed_tasks: completed,
      pending_tasks: pending,
      delayed_tasks: delayed,
      last_updated: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-4">
      <ChecklistProgress checklist={{ ...checklist, items }} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-base">Tarefas</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleAddItem} className="gap-1 text-xs">
              <Plus className="w-3 h-3" /> Adicionar
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 gap-1 text-xs" disabled={updateMutation.isPending}>
              <Save className="w-3 h-3" /> {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center py-6 text-gray-500 text-sm">Nenhuma tarefa. Clique em "Adicionar" para começar.</p>
          ) : (
            items.sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => (
              <ChecklistTaskItem
                key={item.id}
                item={item}
                teamMembers={teamMembers}
                consultorEmail={consultorEmail}
                licenseId={licenseId}
                propertyId={propertyId}
                onFieldChange={(field, value) => handleFieldChange(item.id, field, value)}
                onStatusChange={(status) => handleStatusChange(item.id, status)}
                onDelete={() => handleDeleteItem(item.id)}
                isExpanded={expandedItems[item.id]}
                onToggleExpand={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                user={user}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LicenseChecklistPanel({ license, user }) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const queryClient = useQueryClient();

  // Busca equipe do consultor responsável pela licença
  const consultorEmail = license.consultor_email || user?.email;

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembersForChecklist', consultorEmail],
    queryFn: async () => {
      const all = await base44.entities.TeamMember.filter({ primary_user_email: consultorEmail });
      // Inclui o próprio consultor como opção
      const consultorMember = {
        id: 'consultor',
        member_email: consultorEmail,
        member_name: user?.full_name || consultorEmail,
        member_role: 'Consultor'
      };
      const active = all.filter(m => m.status === 'Ativo');
      return [consultorMember, ...active];
    },
    enabled: !!consultorEmail
  });

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['licenseChecklist', license.id],
    queryFn: async () => {
      const result = await base44.entities.ProjectChecklist.filter({
        entity_type: 'License',
        entity_id: license.id
      });
      return result?.[0] || null;
    },
    enabled: !!license.id
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['checklistTemplates', consultorEmail],
    queryFn: () => base44.entities.ChecklistTemplate.filter({ consultor_email: consultorEmail }),
    enabled: !!consultorEmail && showCreate
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectChecklist.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenseChecklist', license.id] });
      toast.success('Checklist criado e vinculado à licença!');
      setShowCreate(false);
      setSelectedTemplateId(null);
    },
    onError: (err) => toast.error('Erro ao criar checklist: ' + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectChecklist.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenseChecklist', license.id] });
      toast.success('Checklist removido');
    }
  });

  const handleCreate = () => {
    const template = templates.find(t => t.id === selectedTemplateId);
    createMutation.mutate({
      entity_type: 'License',
      entity_id: license.id,
      consultor_email: consultorEmail,
      checklist_title: `Checklist - ${license.license_type}`,
      description: `Workflow para ${license.license_type}${license.license_number ? ' Nº ' + license.license_number : ''}`,
      template_id: template?.id || null,
      items: template?.steps?.map((step, index) => ({
        id: Date.now().toString() + index,
        title: step.title,
        description: step.description || '',
        order: step.order || index,
        status: 'Pendente',
        priority: step.default_priority || 'Média',
        responsible_email: consultorEmail,
        responsible_name: user?.full_name || '',
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + (step.estimated_days || 5) * 86400000).toISOString().split('T')[0],
        notes: '',
        files: [],
        activity_history: []
      })) || [],
      overall_progress: 0,
      completed_tasks: 0,
      pending_tasks: 0,
      delayed_tasks: 0,
      status: 'Em Progresso',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    });
  };

  if (isLoading) return <p className="text-sm text-gray-500 py-4">Carregando checklist...</p>;

  if (!checklist) {
    return (
      <div className="mt-4">
        {!showCreate ? (
          <Button variant="outline" size="sm" onClick={() => setShowCreate(true)} className="gap-2 w-full border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50">
            <Plus className="w-4 h-4" /> Criar Checklist para esta Licença
          </Button>
        ) : (
          <Card className="border-emerald-200">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Criar Checklist Vinculado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Usar Modelo (opcional)</label>
                <select
                  value={selectedTemplateId || ''}
                  onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">— Começar do Zero —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.template_name} ({t.steps?.length || 0} etapas)</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancelar</Button>
                <Button size="sm" onClick={handleCreate} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Criar Checklist'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-gray-700">Checklist Vinculado</span>
          <Badge className="bg-emerald-100 text-emerald-800 text-xs">{checklist.overall_progress || 0}%</Badge>
          {teamMembers.length > 1 && (
            <Badge className="bg-blue-100 text-blue-800 text-xs">{teamMembers.length - 1} na equipe</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { if (window.confirm('Remover o checklist desta licença?')) deleteMutation.mutate(checklist.id); }}
          className="text-red-500 hover:text-red-700 h-7 px-2"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      <InlineChecklistView
        checklist={checklist}
        user={user}
        consultorEmail={consultorEmail}
        teamMembers={teamMembers}
        licenseId={license.id}
        propertyId={license.property_id}
      />
    </div>
  );
}