import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  AlertTriangle,
  Target,
  Layers,
  Sprout,
  Calendar,
  TrendingUp,
  Satellite,
  FileText,
  Bell,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PRADTimelineCreative from './PRADTimelineCreative';
import PRADAnnualReports from './PRADAnnualReports';
import PRADAlerts from './PRADAlerts';
import PRADDocuments from './PRADDocuments';
import PRADImageMonitoring from './PRADImageMonitoring';
import PRADDiagnosisMappedAreas from './PRADDiagnosisMappedAreas';
import { toast } from 'sonner';

export default function PRADDetails({ prad }) {
  const [editingMethod, setEditingMethod] = useState(null);
  const [editingStage, setEditingStageIdx] = useState(null);
  const [newMethod, setNewMethod] = useState('');
  const [newStage, setNewStage] = useState({});
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PRAD.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['prad']);
      setEditingMethod(null);
      setEditingStageIdx(null);
      toast.success('PRAD atualizado!');
    },
  });
  return (
    <Tabs defaultValue="identification" className="w-full">
      <div className="w-full overflow-x-auto pb-1">
        <TabsList className="inline-flex w-max h-auto gap-1 p-1 rounded-lg bg-muted">
          <TabsTrigger value="identification" className="text-xs px-3 py-1.5 whitespace-nowrap rounded-md">Identificação</TabsTrigger>
          <TabsTrigger value="diagnosis" className="text-xs px-3 py-1.5 whitespace-nowrap rounded-md">Diagnóstico</TabsTrigger>
          <TabsTrigger value="execution" className="text-xs px-3 py-1.5 whitespace-nowrap rounded-md">Execução</TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs px-3 py-1.5 whitespace-nowrap rounded-md">Monitoramento</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs px-3 py-1.5 whitespace-nowrap rounded-md">Documentos</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs px-3 py-1.5 whitespace-nowrap rounded-md">Timeline</TabsTrigger>
        </TabsList>
      </div>

      {/* Identificação */}
      <TabsContent value="identification" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Identificação da Área
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Área Total Degradada</p>
              <p className="font-semibold">{prad.area_identification?.total_area_ha || 0} hectares</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Talhão / Gleba</p>
              <p className="font-semibold">{prad.area_identification?.plot_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tipo de Degradação</p>
              <Badge>{prad.area_identification?.degradation_type || '-'}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Data do Diagnóstico</p>
              <p className="font-semibold">
                {prad.area_identification?.diagnosis_date 
                  ? format(parseISO(prad.area_identification.diagnosis_date), 'dd/MM/yyyy', { locale: ptBR })
                  : '-'}
              </p>
            </div>
            {prad.area_identification?.coordinates && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Coordenadas</p>
                <p className="font-semibold font-mono text-sm">{prad.area_identification.coordinates}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Objetivo da Recuperação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="font-semibold text-green-900 mb-2">
                {prad.recovery_objective?.main_objective || 'Não especificado'}
              </p>
              {prad.recovery_objective?.objective_details && (
                <p className="text-sm text-green-800">{prad.recovery_objective.objective_details}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Diagnóstico */}
      <TabsContent value="diagnosis" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Diagnóstico Ambiental
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prad.environmental_diagnosis?.impact_level && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Grau de Impacto</p>
                <Badge className={
                  prad.environmental_diagnosis.impact_level === 'Alto' ? 'bg-red-600' :
                  prad.environmental_diagnosis.impact_level === 'Médio' ? 'bg-yellow-600' :
                  'bg-green-600'
                }>
                  {prad.environmental_diagnosis.impact_level}
                </Badge>
              </div>
            )}
            {prad.environmental_diagnosis?.degradation_description && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Descrição da Degradação</p>
                <p className="text-gray-700">{prad.environmental_diagnosis.degradation_description}</p>
              </div>
            )}
            {prad.environmental_diagnosis?.probable_cause && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Causa Provável</p>
                <p className="text-gray-700">{prad.environmental_diagnosis.probable_cause}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <PRADDiagnosisMappedAreas prad={prad} onUpdate={() => queryClient.invalidateQueries(['prad'])} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Caracterização do Solo
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Tipo de Solo</p>
              <p className="font-semibold">{prad.soil_characterization?.soil_type || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Declividade</p>
              <p className="font-semibold">{prad.soil_characterization?.slope || '-'}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Risco de Erosão</p>
              <Badge>{prad.soil_characterization?.erosion_risk || '-'}</Badge>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Execução */}
      <TabsContent value="execution" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sprout className="w-5 h-5" />
              Métodos de Recuperação
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Selecionar Método de Recuperação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Select value={newMethod} onValueChange={setNewMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regeneração Natural Assistida">Regeneração Natural Assistida</SelectItem>
                      <SelectItem value="Plantio de Espécies Nativas">Plantio de Espécies Nativas</SelectItem>
                      <SelectItem value="Isolamento da Área">Isolamento da Área</SelectItem>
                      <SelectItem value="Controle de Erosão">Controle de Erosão</SelectItem>
                      <SelectItem value="Bioengenharia do Solo">Bioengenharia do Solo</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline">Cancelar</Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        if (newMethod && !prad.recovery_methods?.includes(newMethod)) {
                          updateMutation.mutate({
                            id: prad.id,
                            data: { recovery_methods: [...(prad.recovery_methods || []), newMethod] }
                          });
                          setNewMethod('');
                        }
                      }}
                    >
                      Adicionar Método
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {prad.recovery_methods && prad.recovery_methods.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {prad.recovery_methods.map((method, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer hover:bg-red-50"
                    onClick={() => {
                      const updated = prad.recovery_methods.filter((_, i) => i !== idx);
                      updateMutation.mutate({ id: prad.id, data: { recovery_methods: updated } });
                    }}
                  >
                    {method} ✕
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhum método cadastrado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Cronograma de Execução
            </CardTitle>
            <Dialog open={editingStage === -1} onOpenChange={(open) => {
              if (open) {
                setEditingStageIdx(-1);
                setNewStage({ stage: '', deadline: '', status: 'Pendente', responsible: '', notes: '' });
              } else {
                setEditingStageIdx(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-1" />
                  Nova Etapa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Etapa do Cronograma</DialogTitle>
                </DialogHeader>
                <ScheduleForm data={newStage} setData={setNewStage} onSave={() => {
                  const schedule = [...(prad.execution_schedule || []), newStage];
                  updateMutation.mutate({ id: prad.id, data: { execution_schedule: schedule } });
                }} />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {prad.execution_schedule && prad.execution_schedule.length > 0 ? (
              <div className="space-y-3">
                {prad.execution_schedule.map((stage, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border-l-4 border-green-500 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">{stage.stage}</p>
                        <Badge className={
                          stage.status === 'Concluído' ? 'bg-green-600' :
                          stage.status === 'Em Execução' ? 'bg-blue-600' :
                          stage.status === 'Atrasado' ? 'bg-red-600' :
                          'bg-gray-600'
                        }>
                          {stage.status}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600 mb-1">
                        <span>📅 {stage.deadline ? format(parseISO(stage.deadline), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</span>
                        <span>👤 {stage.responsible || '-'}</span>
                      </div>
                      {stage.notes && <p className="text-xs text-gray-600">{stage.notes}</p>}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Dialog open={editingStage === idx} onOpenChange={(open) => {
                        if (open) {
                          setEditingStageIdx(idx);
                          setNewStage(stage);
                        } else {
                          setEditingStageIdx(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Etapa</DialogTitle>
                          </DialogHeader>
                          <ScheduleForm data={newStage} setData={setNewStage} onSave={() => {
                            const schedule = prad.execution_schedule.map((s, i) => i === idx ? newStage : s);
                            updateMutation.mutate({ id: prad.id, data: { execution_schedule: schedule } });
                          }} />
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" variant="destructive" onClick={() => {
                        const schedule = prad.execution_schedule.filter((_, i) => i !== idx);
                        updateMutation.mutate({ id: prad.id, data: { execution_schedule: schedule } });
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhuma etapa cadastrada</p>
            )}
          </CardContent>
        </Card>

        {prad.species_and_techniques?.species_list && prad.species_and_techniques.species_list.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Espécies Indicadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {prad.species_and_techniques.species_list.map((species, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-green-50 rounded">
                    <span className="font-medium">{species.common_name || species.scientific_name}</span>
                    <span className="text-sm text-gray-600">{species.quantity} mudas</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Monitoramento */}
      <TabsContent value="monitoring" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Indicadores de Monitoramento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 mb-1">Taxa de Sobrevivência</p>
                <p className="text-3xl font-bold text-green-900">{prad.monitoring?.survival_rate || 0}%</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-emerald-700 mb-1">Cobertura Vegetal</p>
                <p className="text-3xl font-bold text-emerald-900">{prad.monitoring?.vegetation_cover || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <PRADImageMonitoring prad={prad} onUpdate={() => queryClient.invalidateQueries(['prad'])} />

        <PRADAlerts prad={prad} onUpdate={() => queryClient.invalidateQueries(['prad'])} />
      </TabsContent>

      {/* Documentos */}
      <TabsContent value="documents" className="space-y-4">
        <PRADDocuments prad={prad} userEmail={prad.owner_email} onUpdate={() => queryClient.invalidateQueries(['prad'])} />
      </TabsContent>

      {/* Timeline */}
      <TabsContent value="timeline" className="space-y-4">
        <div className="grid lg:grid-cols-2 gap-6">
          <PRADTimelineCreative prad={prad} onUpdate={() => queryClient.invalidateQueries(['prad'])} />
          <PRADAnnualReports prad={prad} onUpdate={() => queryClient.invalidateQueries(['prad'])} />
        </div>
      </TabsContent>
      </Tabs>
  );
}

function ScheduleForm({ data, setData, onSave }) {
  return (
    <div className="space-y-4 mt-4">
      <div>
        <label className="text-sm font-medium">Etapa *</label>
        <Input value={data.stage || ''} onChange={(e) => setData({ ...data, stage: e.target.value })} placeholder="Ex: Preparação da Área" />
      </div>
      <div>
        <label className="text-sm font-medium">Prazo</label>
        <Input type="date" value={data.deadline || ''} onChange={(e) => setData({ ...data, deadline: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium">Status</label>
        <Select value={data.status || 'Pendente'} onValueChange={(value) => setData({ ...data, status: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Em Execução">Em Execução</SelectItem>
            <SelectItem value="Concluído">Concluído</SelectItem>
            <SelectItem value="Atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Responsável</label>
        <Input value={data.responsible || ''} onChange={(e) => setData({ ...data, responsible: e.target.value })} placeholder="Nome do responsável" />
      </div>
      <div>
        <label className="text-sm font-medium">Observações</label>
        <Textarea value={data.notes || ''} onChange={(e) => setData({ ...data, notes: e.target.value })} placeholder="Notas desta etapa" className="h-16" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => {}}>Cancelar</Button>
        <Button className="bg-green-600 hover:bg-green-700" onClick={onSave}>Salvar Etapa</Button>
      </div>
    </div>
  );
}