import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { History, Plus, Calendar, User, FileText } from 'lucide-react';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function AlertHistory({ alert }) {
  const [showForm, setShowForm] = useState(false);
  const [newAction, setNewAction] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EnvironmentalAlert.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environmental-alerts'] });
      setShowForm(false);
      setNewAction('');
      setNewNotes('');
      toast.success('Histórico atualizado!');
    }
  });

  const handleAddHistory = async () => {
    if (!newAction.trim()) {
      toast.error('Digite uma ação');
      return;
    }

    try {
      const user = await base44.auth.me();
      const history = alert.history || [];
      
      const newEntry = {
        date: new Date().toISOString(),
        action: newAction,
        user: user.email,
        notes: newNotes
      };

      updateMutation.mutate({
        id: alert.id,
        data: {
          ...alert,
          history: [...history, newEntry]
        }
      });
    } catch (error) {
      toast.error('Erro ao adicionar ação. Tente novamente.');
      console.error(error);
    }
  };

  const historyItems = alert.history || [];

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="bg-blue-50 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Histórico de Ações
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Ação
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {showForm && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Ação Realizada *</label>
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="Ex: Vistoria realizada na área afetada"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Observações</label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Detalhes adicionais sobre a ação..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleAddHistory} className="bg-blue-600 hover:bg-blue-700">
                Salvar
              </Button>
            </div>
          </div>
        )}

        {historyItems.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600">Nenhuma ação registrada ainda</p>
            <p className="text-sm text-gray-500 mt-1">Adicione ações e atualizações sobre este alerta</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historyItems.sort((a, b) => new Date(b.date) - new Date(a.date)).map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{item.action}</h4>
                    {item.notes && (
                      <p className="text-sm text-gray-700 mt-1">{item.notes}</p>
                    )}
                    <div className="flex gap-3 mt-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {moment(item.date).format('DD/MM/YYYY HH:mm')}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.user}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}