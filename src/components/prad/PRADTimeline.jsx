import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, Clock, AlertCircle, ChevronRight, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PIPELINE_STAGES = [
  "Em Elaboração",
  "Aguardando Documentos",
  "Protocolado",
  "Complementações",
  "Deferido",
  "Indeferido",
  "Em Execução",
  "Pedido de Desembargo",
  "Em Averbação"
];

export default function PRADTimeline({ prad, onUpdate }) {
  const queryClient = useQueryClient();
  const [editingStage, setEditingStage] = useState(null);
  const [editData, setEditData] = useState({});

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PRAD.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['prad']);
      setEditingStage(null);
      onUpdate?.();
    },
  });

  const handleStageStatusChange = (stageIndex, newStatus) => {
    const updatedPipeline = [...(prad.pipeline_status || [])];
    if (!updatedPipeline[stageIndex]) {
      updatedPipeline[stageIndex] = { stage_order: stageIndex, stage_name: PIPELINE_STAGES[stageIndex], current_status: 'Pendente', status_date: new Date().toISOString() };
    } else {
      updatedPipeline[stageIndex].current_status = newStatus;
      updatedPipeline[stageIndex].status_date = new Date().toISOString();
    }
    updateMutation.mutate({ id: prad.id, data: { pipeline_status: updatedPipeline } });
  };

  const handleEditSave = (stageIndex) => {
    const updatedPipeline = [...(prad.pipeline_status || [])];
    if (!updatedPipeline[stageIndex]) {
      updatedPipeline[stageIndex] = { stage_order: stageIndex, stage_name: PIPELINE_STAGES[stageIndex], current_status: 'Pendente', status_date: new Date().toISOString() };
    }
    updatedPipeline[stageIndex] = {
      ...updatedPipeline[stageIndex],
      ...editData,
      status_date: new Date().toISOString()
    };
    updateMutation.mutate({ id: prad.id, data: { pipeline_status: updatedPipeline } });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Concluído': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'Em Progresso': return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Concluído': return 'bg-green-100 border-green-300';
      case 'Em Progresso': return 'bg-blue-100 border-blue-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline do PRAD - Etapas do Processo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {PIPELINE_STAGES.map((stageName, index) => {
            const stageData = (prad.pipeline_status || []).find(s => s.stage_order === index);
            const status = stageData?.current_status || 'Pendente';

            return (
              <div key={index} className="relative">
                <div className={`p-4 rounded-lg border-2 transition-all ${getStatusColor(status)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">{getStatusIcon(status)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{stageName}</h4>
                          <Badge className={
                            status === 'Concluído' ? 'bg-green-600' :
                            status === 'Em Progresso' ? 'bg-blue-600' :
                            'bg-gray-600'
                          }>
                            {status}
                          </Badge>
                        </div>
                        {stageData?.notes && (
                          <p className="text-sm text-gray-700 mb-2">{stageData.notes}</p>
                        )}
                        {stageData?.status_date && (
                          <p className="text-xs text-gray-500">
                            Atualizado em {format(new Date(stageData.status_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <Dialog open={editingStage === index} onOpenChange={(open) => {
                      if (!open) setEditingStage(null);
                      if (open) {
                        setEditingStage(index);
                        setEditData(stageData || { current_status: 'Pendente', notes: '' });
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1">
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Etapa: {stageName}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div>
                            <label className="text-sm font-medium">Status</label>
                            <Select
                              value={editData.current_status || 'Pendente'}
                              onValueChange={(value) => setEditData({ ...editData, current_status: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pendente">Pendente</SelectItem>
                                <SelectItem value="Em Progresso">Em Progresso</SelectItem>
                                <SelectItem value="Concluído">Concluído</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Observações</label>
                            <Textarea
                              value={editData.notes || ''}
                              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                              placeholder="Adicione observações sobre esta etapa"
                              className="h-24"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setEditingStage(null)}>Cancelar</Button>
                            <Button 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleEditSave(index)}
                              disabled={updateMutation.isPending}
                            >
                              Salvar Alterações
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {index < PIPELINE_STAGES.length - 1 && (
                    <div className="mt-4 flex items-center gap-2 ml-7">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                      <button
                        onClick={() => handleStageStatusChange(index + 1, 'Em Progresso')}
                        className="text-xs font-medium text-green-600 hover:text-green-700 underline"
                      >
                        Avançar para próxima etapa
                      </button>
                    </div>
                  )}
                </div>

                {index < PIPELINE_STAGES.length - 1 && (
                  <div className="h-4 border-l-2 border-gray-300 ml-7 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}