import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Save } from 'lucide-react';
import ChecklistProgress from './ChecklistProgress';
import ChecklistItem from './ChecklistItem';

export default function ChecklistView({ checklist, isEditable = false, currentUser, consultorEmail }) {
  const [items, setItems] = useState(checklist.items || []);
  const [expandedItems, setExpandedItems] = useState({});
  const queryClient = useQueryClient();

  const updateChecklistMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectChecklist.update(checklist.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      toast.success('Checklist atualizado');
    }
  });

  const handleAddItem = () => {
    const newItem = {
      id: Date.now().toString(),
      title: 'Novo Item',
      description: '',
      order: items.length,
      status: 'Pendente',
      priority: 'Média',
      responsible_email: '',
      responsible_name: '',
      start_date: '',
      due_date: '',
      notes: '',
      files: [],
      activity_history: []
    };
    const updated = [...items, newItem];
    setItems(updated);
    setExpandedItems(prev => ({ ...prev, [newItem.id]: true }));
  };

  const handleUpdateItem = (itemId, updatedItem) => {
    const updated = items.map(i => i.id === itemId ? updatedItem : i);
    setItems(updated);
  };

  const handleDeleteItem = (itemId) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  const calculateProgress = (itemsList) => {
    const completed = itemsList.filter(i => i.status === 'Concluído').length;
    const pending = itemsList.filter(i => i.status === 'Pendente').length;
    const delayed = itemsList.filter(i => i.status === 'Atrasado').length;
    const total = itemsList.length;
    return {
      items: itemsList,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      completed, pending, delayed
    };
  };

  const handleSave = () => {
    const updated = calculateProgress(items);
    updateChecklistMutation.mutate({
      items: updated.items,
      overall_progress: updated.progress,
      completed_tasks: updated.completed,
      pending_tasks: updated.pending,
      delayed_tasks: updated.delayed
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-900 mb-1">{checklist.checklist_title}</h1>
        {checklist.description && <p className="text-gray-500 text-sm">{checklist.description}</p>}
      </div>

      <ChecklistProgress checklist={{ ...checklist, items }} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Tarefas do Projeto</CardTitle>
          {isEditable && (
            <div className="flex gap-2">
              <Button onClick={handleAddItem} size="sm" variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Adicionar Tarefa
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                disabled={updateChecklistMutation.isPending}
              >
                <Save className="w-4 h-4" />
                {updateChecklistMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {items.length === 0 ? (
            <p className="text-center py-10 text-gray-400 text-sm">Nenhuma tarefa cadastrada</p>
          ) : (
            <div className="space-y-2">
              {items
                .sort((a, b) => a.order - b.order)
                .map(item => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    currentUser={currentUser}
                    consultorEmail={consultorEmail}
                    onUpdate={(updated) => handleUpdateItem(item.id, updated)}
                    onDelete={() => handleDeleteItem(item.id)}
                    isExpanded={!!expandedItems[item.id]}
                    onToggleExpand={() =>
                      setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))
                    }
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}