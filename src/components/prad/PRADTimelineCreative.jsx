import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Circle, AlertCircle, ChevronRight, Edit2, Zap } from 'lucide-react';

const PIPELINE_STAGES = [
  { name: "Em Elaboração", icon: "📋", color: "from-blue-100 to-blue-50", borderColor: "border-blue-400" },
  { name: "Aguardando Documentos", icon: "📄", color: "from-amber-100 to-amber-50", borderColor: "border-amber-400" },
  { name: "Protocolado", icon: "✅", color: "from-green-100 to-green-50", borderColor: "border-green-400" },
  { name: "Complementações", icon: "🔄", color: "from-purple-100 to-purple-50", borderColor: "border-purple-400" },
  { name: "Deferido", icon: "👍", color: "from-emerald-100 to-emerald-50", borderColor: "border-emerald-400" },
  { name: "Indeferido", icon: "❌", color: "from-red-100 to-red-50", borderColor: "border-red-400" },
  { name: "Em Execução", icon: "⚙️", color: "from-cyan-100 to-cyan-50", borderColor: "border-cyan-400" },
  { name: "Pedido de Desembargo", icon: "🔓", color: "from-yellow-100 to-yellow-50", borderColor: "border-yellow-400" },
  { name: "Em Averbação", icon: "🏛️", color: "from-indigo-100 to-indigo-50", borderColor: "border-indigo-400" }
];

export default function PRADTimelineCreative({ prad, onUpdate }) {
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
      updatedPipeline[stageIndex] = { stage_order: stageIndex, stage_name: PIPELINE_STAGES[stageIndex].name, current_status: 'Pendente', status_date: new Date().toISOString() };
    } else {
      updatedPipeline[stageIndex].current_status = newStatus;
      updatedPipeline[stageIndex].status_date = new Date().toISOString();
    }
    updateMutation.mutate({ id: prad.id, data: { pipeline_status: updatedPipeline } });
  };

  const handleEditSave = (stageIndex) => {
    const updatedPipeline = [...(prad.pipeline_status || [])];
    if (!updatedPipeline[stageIndex]) {
      updatedPipeline[stageIndex] = { stage_order: stageIndex, stage_name: PIPELINE_STAGES[stageIndex].name, current_status: 'Pendente', status_date: new Date().toISOString() };
    }
    updatedPipeline[stageIndex] = {
      ...updatedPipeline[stageIndex],
      ...editData,
      status_date: new Date().toISOString()
    };
    updateMutation.mutate({ id: prad.id, data: { pipeline_status: updatedPipeline } });
  };

  const getStatusIcon = (status) => {
    if (status === 'Concluído') return <CheckCircle2 className="w-6 h-6 text-green-600" />;
    if (status === 'Em Progresso') return <Zap className="w-6 h-6 text-blue-600 animate-bounce" />;
    return <Circle className="w-6 h-6 text-gray-400" />;
  };

  const currentStageIndex = (prad.pipeline_status || []).findIndex(s => s.current_status === 'Em Progresso');

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-6 h-6" />
          Jornada do PRAD - Timeline Interativa
        </CardTitle>
        <p className="text-emerald-100 text-sm mt-2">Acompanhe cada etapa da recuperação</p>
      </CardHeader>
      <CardContent className="pt-8 pb-8">
        {/* Timeline Visual */}
        <div className="relative">
          {/* Linha conectora */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300" style={{ zIndex: 1 }} />

          {/* Estágios */}
          <div className="relative flex justify-between mb-12" style={{ zIndex: 2 }}>
            {PIPELINE_STAGES.map((stage, index) => {
              const stageData = (prad.pipeline_status || []).find(s => s.stage_order === index);
              const status = stageData?.current_status || 'Pendente';
              const isCompleted = status === 'Concluído';
              const isActive = status === 'Em Progresso';
              const isPast = isCompleted || isActive;

              return (
                <div
                  key={index}
                  className="flex flex-col items-center flex-1"
                  style={{ position: 'relative' }}
                >
                  {/* Bolinha do timeline */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-300 transform hover:scale-110 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-400/50'
                        : isActive
                        ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-400/50 scale-110'
                        : 'bg-gradient-to-br from-gray-300 to-gray-400 shadow-md'
                    }`}
                  >
                    <span className="text-xl">{stage.icon}</span>
                  </div>

                  {/* Card da etapa */}
                  <Dialog open={editingStage === index} onOpenChange={(open) => {
                    if (!open) setEditingStage(null);
                    if (open) {
                      setEditingStage(index);
                      setEditData(stageData || { current_status: 'Pendente', notes: '' });
                    }
                  }}>
                    <DialogTrigger asChild>
                      <div
                        className={`w-full px-3 py-4 rounded-lg mb-3 cursor-pointer transition-all duration-300 transform hover:scale-105 bg-gradient-to-br ${
                          stage.color
                        } border-2 ${stage.borderColor} ${
                          isCompleted
                            ? 'ring-2 ring-green-300 shadow-lg'
                            : isActive
                            ? 'ring-2 ring-blue-300 shadow-xl'
                            : 'shadow-md'
                        }`}
                      >
                        <p className="text-xs font-bold text-gray-700 mb-2 text-center">{stage.name}</p>
                        <Badge
                          className={`mx-auto flex w-fit justify-center text-xs ${
                            isCompleted
                              ? 'bg-green-600'
                              : isActive
                              ? 'bg-blue-600 animate-pulse'
                              : 'bg-gray-500'
                          }`}
                        >
                          {status}
                        </Badge>
                        {stageData?.notes && (
                          <p className="text-xs text-gray-600 mt-2 italic text-center truncate">{stageData.notes}</p>
                        )}
                      </div>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{stage.name}</DialogTitle>
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
                            Salvar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Botão de avanço */}
                  {status !== 'Concluído' && index < PIPELINE_STAGES.length - 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mb-4 text-xs h-8"
                      onClick={() => handleStageStatusChange(index + 1, 'Em Progresso')}
                    >
                      <ChevronRight className="w-3 h-3 mr-1" />
                      Avançar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Barra de progresso */}
          <div className="mt-8 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full transition-all duration-500"
              style={{
                width: `${currentStageIndex >= 0 ? ((currentStageIndex + 1) / PIPELINE_STAGES.length) * 100 : 0}%`
              }}
            />
          </div>

          {/* Status info */}
          <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
            <p className="text-sm text-gray-700">
              <span className="font-bold text-emerald-700">Progresso:</span>{' '}
              {currentStageIndex >= 0
                ? `${((currentStageIndex + 1) / PIPELINE_STAGES.length * 100).toFixed(0)}% - ${PIPELINE_STAGES[currentStageIndex].name}`
                : 'Não iniciado'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}