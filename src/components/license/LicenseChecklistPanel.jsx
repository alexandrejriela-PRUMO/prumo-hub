import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, ClipboardList, ChevronDown, Save, Trash2 } from 'lucide-react';
import ChecklistProgress from '@/components/checklist/ChecklistProgress';
import ChecklistItem from '@/components/checklist/ChecklistItem';

// Mini ChecklistView inline
function InlineChecklistView({ checklist, user }) {
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

  const handleStatusChange = (itemId, newStatus) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, status: newStatus, completion_date: newStatus === 'Concluído' ? new Date().toISOString() : null } : item
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
      delayed_tasks: delayed
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
            items.sort((a, b) => a.order - b.order).map(item => (
              <ChecklistItem
                key={item.id}
                item={item}
                onStatusChange={(status) => handleStatusChange(item.id, status)}
                onDelete={() => handleDeleteItem(item.id)}
                isExpanded={expandedItems[item.id]}
                onToggleExpand={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
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
    queryKey: ['checklistTemplates', user?.email],
    queryFn: () => base44.entities.ChecklistTemplate.filter({ consultor_email: user?.email }),
    enabled: !!user?.email && showCreate
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
      consultor_email: user?.email,
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
        responsible_email: user?.email || '',
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
      <InlineChecklistView checklist={checklist} user={user} />
    </div>
  );
}