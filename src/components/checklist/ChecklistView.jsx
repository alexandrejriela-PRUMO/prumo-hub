import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Save } from 'lucide-react';
import ChecklistProgress from './ChecklistProgress';
import ChecklistItem from './ChecklistItem';

export default function ChecklistView({ checklist, isEditable = false }) {
  const [items, setItems] = useState(checklist.items || []);
  const [expandedItems, setExpandedItems] = useState({});
  const queryClient = useQueryClient();

  const updateChecklistMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.ProjectChecklist.update(checklist.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      toast.success('Checklist atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
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
    setItems([...items, newItem]);
  };

  const handleStatusChange = (itemId, newStatus) => {
    const updatedItems = items.map(item =>
      item.id === itemId
        ? {
            ...item,
            status: newStatus,
            completion_date: newStatus === 'Concluído' ? new Date().toISOString() : null
          }
        : item
    );
    setItems(updatedItems);
  };

  const handleDeleteItem = (itemId) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const handleSave = () => {
    const updated = calculateProgress(items);
    updateChecklistMutation.mutate({
      items: updated,
      overall_progress: updated.progress,
      completed_tasks: updated.completed,
      pending_tasks: updated.pending,
      delayed_tasks: updated.delayed
    });
  };

  const calculateProgress = (itemsList) => {
    const completed = itemsList.filter(i => i.status === 'Concluído').length;
    const pending = itemsList.filter(i => i.status === 'Pendente').length;
    const delayed = itemsList.filter(i => i.status === 'Atrasado').length;
    const total = itemsList.length;

    return {
      items: itemsList,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      completed,
      pending,
      delayed
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-emerald-900 mb-2">{checklist.checklist_title}</h1>
        {checklist.description && (
          <p className="text-gray-600">{checklist.description}</p>
        )}
      </div>

      {/* Progress Cards */}
      <ChecklistProgress checklist={{ ...checklist, items }} />

      {/* Checklist Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tarefas do Projeto</CardTitle>
          {isEditable && (
            <div className="flex gap-2">
              <Button
                onClick={handleAddItem}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar Tarefa
              </Button>
              <Button
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                <Save className="w-4 h-4" /> Salvar
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.length === 0 ? (
              <p className="text-center py-8 text-gray-600">Nenhuma tarefa ainda</p>
            ) : (
              items
                .sort((a, b) => a.order - b.order)
                .map(item => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    onStatusChange={(status) => handleStatusChange(item.id, status)}
                    onDelete={() => handleDeleteItem(item.id)}
                    isExpanded={expandedItems[item.id]}
                    onToggleExpand={() =>
                      setExpandedItems(prev => ({
                        ...prev,
                        [item.id]: !prev[item.id]
                      }))
                    }
                  />
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}