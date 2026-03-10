import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Circle, Clock, Pencil, Zap } from 'lucide-react';

const PIPELINE_STAGES = [
  { name: "Em Elaboração",        icon: "📋", color: "blue"    },
  { name: "Aguardando Documentos",icon: "📄", color: "amber"   },
  { name: "Protocolado",          icon: "✅", color: "green"   },
  { name: "Complementações",      icon: "🔄", color: "purple"  },
  { name: "Deferido",             icon: "👍", color: "emerald" },
  { name: "Indeferido",           icon: "❌", color: "red"     },
  { name: "Em Execução",          icon: "⚙️", color: "cyan"    },
  { name: "Pedido de Desembargo", icon: "🔓", color: "yellow"  },
  { name: "Em Averbação",         icon: "🏛️", color: "indigo"  },
];

const colorMap = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-300',    badge: 'bg-blue-600',    dot: 'bg-blue-500',    text: 'text-blue-700'    },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-300',   badge: 'bg-amber-600',   dot: 'bg-amber-500',   text: 'text-amber-700'   },
  green:   { bg: 'bg-green-50',   border: 'border-green-300',   badge: 'bg-green-600',   dot: 'bg-green-500',   text: 'text-green-700'   },
  purple:  { bg: 'bg-purple-50',  border: 'border-purple-300',  badge: 'bg-purple-600',  dot: 'bg-purple-500',  text: 'text-purple-700'  },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', badge: 'bg-emerald-600', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  red:     { bg: 'bg-red-50',     border: 'border-red-300',     badge: 'bg-red-600',     dot: 'bg-red-500',     text: 'text-red-700'     },
  cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-300',    badge: 'bg-cyan-600',    dot: 'bg-cyan-500',    text: 'text-cyan-700'    },
  yellow:  { bg: 'bg-yellow-50',  border: 'border-yellow-300',  badge: 'bg-yellow-600',  dot: 'bg-yellow-500',  text: 'text-yellow-700'  },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-300',  badge: 'bg-indigo-600',  dot: 'bg-indigo-500',  text: 'text-indigo-700'  },
};

function StatusIcon({ status }) {
  if (status === 'Concluído')   return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  if (status === 'Em Progresso') return <Zap className="w-5 h-5 text-blue-500" />;
  return <Circle className="w-5 h-5 text-gray-300" />;
}

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

  const handleEditSave = (stageIndex) => {
    const updatedPipeline = [...(prad.pipeline_status || [])];
    if (!updatedPipeline[stageIndex]) {
      updatedPipeline[stageIndex] = {
        stage_order: stageIndex,
        stage_name: PIPELINE_STAGES[stageIndex].name,
        current_status: 'Pendente',
        status_date: new Date().toISOString(),
      };
    }
    updatedPipeline[stageIndex] = { ...updatedPipeline[stageIndex], ...editData, status_date: new Date().toISOString() };
    updateMutation.mutate({ id: prad.id, data: { pipeline_status: updatedPipeline } });
  };

  const completedCount = (prad.pipeline_status || []).filter(s => s.current_status === 'Concluído').length;
  const inProgressCount = (prad.pipeline_status || []).filter(s => s.current_status === 'Em Progresso').length;
  const progressPct = Math.round((completedCount / PIPELINE_STAGES.length) * 100);

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white pb-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5" />
              Jornada Interativa do PRAD
            </CardTitle>
            <p className="text-emerald-200 text-sm mt-1">Clique em uma etapa para editar o status</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="bg-white/20 rounded-full px-3 py-1 font-semibold">{completedCount} concluídas</span>
            {inProgressCount > 0 && (
              <span className="bg-blue-500/60 rounded-full px-3 py-1 font-semibold">{inProgressCount} em progresso</span>
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-emerald-200 mb-1">
            <span>Progresso geral</span>
            <span className="font-bold">{progressPct}%</span>
          </div>
          <div className="bg-white/20 rounded-full h-2.5">
            <div
              className="bg-white rounded-full h-2.5 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PIPELINE_STAGES.map((stage, index) => {
            const stageData = (prad.pipeline_status || []).find(s => s.stage_order === index);
            const status = stageData?.current_status || 'Pendente';
            const isCompleted = status === 'Concluído';
            const isActive = status === 'Em Progresso';
            const c = colorMap[stage.color];

            return (
              <Dialog
                key={index}
                open={editingStage === index}
                onOpenChange={(open) => {
                  if (!open) { setEditingStage(null); return; }
                  setEditingStage(index);
                  setEditData(stageData || { current_status: 'Pendente', notes: '' });
                }}
              >
                <DialogTrigger asChild>
                  <div
                    className={`
                      relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200
                      hover:shadow-md hover:-translate-y-0.5 group
                      ${isCompleted ? `${c.bg} ${c.border} shadow-sm` : ''}
                      ${isActive ? `${c.bg} ${c.border} shadow-md ring-2 ring-offset-1 ring-blue-300` : ''}
                      ${!isCompleted && !isActive ? 'bg-gray-50 border-gray-200 hover:border-gray-300' : ''}
                    `}
                  >
                    {/* Ícone + nome + número */}
                    <div className="flex items-start gap-3 mb-3">
                      <span className={`shrink-0 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5
                        ${isCompleted || isActive ? `${c.text} ${c.bg}` : 'text-gray-400 bg-gray-200'}`}>
                        {index + 1}
                      </span>
                      <span className="text-2xl leading-none">{stage.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-tight ${isCompleted || isActive ? c.text : 'text-gray-600'}`}>
                          {stage.name}
                        </p>
                      </div>
                    </div>
                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                      <StatusIcon status={status} />
                      <Badge className={`text-xs ${
                        isCompleted ? `${c.badge} text-white` :
                        isActive    ? 'bg-blue-500 text-white' :
                                      'bg-gray-200 text-gray-600'
                      }`}>
                        {status}
                      </Badge>
                    </div>

                    {/* Observação */}
                    {stageData?.notes && (
                      <p className="mt-2 text-xs text-gray-500 line-clamp-2 italic border-t border-gray-200 pt-2">
                        {stageData.notes}
                      </p>
                    )}

                    {/* Editar hint */}
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </div>
                </DialogTrigger>

                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <span>{stage.icon}</span> {stage.name}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Status da etapa</label>
                      <Select
                        value={editData.current_status || 'Pendente'}
                        onValueChange={(value) => setEditData({ ...editData, current_status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendente">
                            <span className="flex items-center gap-2"><Circle className="w-3.5 h-3.5 text-gray-400" /> Pendente</span>
                          </SelectItem>
                          <SelectItem value="Em Progresso">
                            <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-blue-500" /> Em Progresso</span>
                          </SelectItem>
                          <SelectItem value="Concluído">
                            <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Concluído</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Observações</label>
                      <Textarea
                        value={editData.notes || ''}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        placeholder="Adicione observações sobre esta etapa..."
                        className="h-24 resize-none"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <Button variant="outline" size="sm" onClick={() => setEditingStage(null)}>Cancelar</Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleEditSave(index)}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-500 border-t pt-4">
          <span className="flex items-center gap-1.5"><Circle className="w-4 h-4 text-gray-300" /> Pendente</span>
          <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-blue-500" /> Em Progresso</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Concluído</span>
          <span className="ml-auto text-gray-400">Clique em qualquer etapa para editar</span>
        </div>
      </CardContent>
    </Card>
  );
}