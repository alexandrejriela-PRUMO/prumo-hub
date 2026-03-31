import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Edit2, MapPin, Layers, Sprout } from 'lucide-react';

export default function PRADDiagnosisMappedAreas({ prad, onUpdate }) {
  const queryClient = useQueryClient();
  const [editingAreaIdx, setEditingAreaIdx] = useState(null);
  const [newArea, setNewArea] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PRAD.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['prad']);
      setShowDialog(false);
      setEditingAreaIdx(null);
      setNewArea(null);
      onUpdate?.();
    },
  });

  const handleAddArea = () => {
    const mappedAreas = [...(prad.environmental_diagnosis?.mapped_areas || [])];
    const areaNumber = mappedAreas.length + 1;
    
    if (editingAreaIdx !== null) {
      mappedAreas[editingAreaIdx] = newArea;
    } else {
      mappedAreas.push({
        area_name: `Área ${String(areaNumber).padStart(2, '0')}`,
        area_hectares: 0,
        vegetation_stages: [],
        soil_characterization: {},
        photos: []
      });
    }

    const diagnosis = { ...prad.environmental_diagnosis, mapped_areas: mappedAreas };
    updateMutation.mutate({ id: prad.id, data: { environmental_diagnosis: diagnosis } });
  };

  const handleDeleteArea = (idx) => {
    const mappedAreas = prad.environmental_diagnosis?.mapped_areas?.filter((_, i) => i !== idx) || [];
    const diagnosis = { ...prad.environmental_diagnosis, mapped_areas: mappedAreas };
    updateMutation.mutate({ id: prad.id, data: { environmental_diagnosis: diagnosis } });
  };

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
      <CardHeader className="flex flex-row items-center justify-between border-b border-green-200">
        <CardTitle className="flex items-center gap-2 text-green-900">
          <MapPin className="w-5 h-5 text-green-600" />
          Áreas Mapeadas com Caracterização
        </CardTitle>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setEditingAreaIdx(null);
                setNewArea(null);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Nova Área
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAreaIdx !== null ? 'Editar Área' : 'Nova Área'}</DialogTitle>
            </DialogHeader>
            <AreaForm 
              area={newArea} 
              setArea={setNewArea}
              onSave={handleAddArea}
              onCancel={() => setShowDialog(false)}
              isPending={updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="pt-6">
        {prad.environmental_diagnosis?.mapped_areas && prad.environmental_diagnosis.mapped_areas.length > 0 ? (
          <div className="grid gap-4">
            {prad.environmental_diagnosis.mapped_areas.map((area, idx) => (
              <div 
                key={idx} 
                className="p-4 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors"
              >
                <Tabs defaultValue="vegetation" className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-green-900">{area.area_name}</h3>
                      <p className="text-sm text-green-700">{area.area_hectares} hectares</p>
                    </div>
                    <div className="flex gap-1">
                      <Dialog open={editingAreaIdx === idx} onOpenChange={(open) => {
                        if (open) {
                          setEditingAreaIdx(idx);
                          setNewArea(area);
                          setShowDialog(true);
                        } else {
                          setEditingAreaIdx(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Editar {area.area_name}</DialogTitle>
                          </DialogHeader>
                          <AreaForm 
                            area={newArea} 
                            setArea={setNewArea}
                            onSave={handleAddArea}
                            onCancel={() => setEditingAreaIdx(null)}
                            isPending={updateMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteArea(idx)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="vegetation" className="text-xs">Vegetação</TabsTrigger>
                    <TabsTrigger value="soil" className="text-xs">Solo</TabsTrigger>
                  </TabsList>

                  <TabsContent value="vegetation" className="space-y-3 mt-4">
                    {area.vegetation_stages && area.vegetation_stages.length > 0 ? (
                      <div className="space-y-2">
                        {area.vegetation_stages.map((stage, stIdx) => (
                          <div key={stIdx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-green-600">{stage.stage_type}</Badge>
                              <span className="font-semibold text-green-900">{stage.area_percentage}%</span>
                            </div>
                            {stage.description && <p className="text-sm text-gray-700">{stage.description}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Nenhum estágio cadastrado</p>
                    )}
                  </TabsContent>

                  <TabsContent value="soil" className="space-y-3 mt-4">
                    {area.soil_characterization && Object.keys(area.soil_characterization).length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {area.soil_characterization.soil_type && (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-xs text-amber-700 font-medium">Tipo de Solo</p>
                            <p className="font-semibold text-amber-900">{area.soil_characterization.soil_type}</p>
                          </div>
                        )}
                        {area.soil_characterization.texture && (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-xs text-amber-700 font-medium">Textura</p>
                            <p className="font-semibold text-amber-900">{area.soil_characterization.texture}</p>
                          </div>
                        )}
                        {area.soil_characterization.ph && (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-xs text-amber-700 font-medium">pH</p>
                            <p className="font-semibold text-amber-900">{area.soil_characterization.ph}</p>
                          </div>
                        )}
                        {area.soil_characterization.slope && (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-xs text-amber-700 font-medium">Declividade</p>
                            <p className="font-semibold text-amber-900">{area.soil_characterization.slope}%</p>
                          </div>
                        )}
                        {area.soil_characterization.erosion_risk && (
                          <div className="p-3 bg-red-50 rounded-lg border border-red-200 col-span-2">
                            <p className="text-xs text-red-700 font-medium">Risco de Erosão</p>
                            <Badge className={
                              area.soil_characterization.erosion_risk === 'Muito Alto' ? 'bg-red-600' :
                              area.soil_characterization.erosion_risk === 'Alto' ? 'bg-orange-600' :
                              area.soil_characterization.erosion_risk === 'Médio' ? 'bg-yellow-600' :
                              'bg-green-600'
                            }>
                              {area.soil_characterization.erosion_risk}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Nenhuma caracterização cadastrada</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma área mapeada. Clique em "Nova Área" para começar.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AreaForm({ area, setArea, onSave, onCancel, isPending }) {
  const [activeTab, setActiveTab] = useState('basic');

  const currentArea = area || {
    area_name: '',
    area_hectares: 0,
    vegetation_stages: [],
    soil_characterization: {},
    photos: []
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">Básico</TabsTrigger>
        <TabsTrigger value="vegetation">Vegetação</TabsTrigger>
        <TabsTrigger value="soil">Solo</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4 mt-4">
        <div>
          <label className="text-sm font-medium">Nome da Área *</label>
          <Input
            value={currentArea.area_name}
            onChange={(e) => setArea({ ...currentArea, area_name: e.target.value })}
            placeholder="ex: Área 01, Setor Norte"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Hectares *</label>
          <Input
            type="number"
            step="0.1"
            value={currentArea.area_hectares}
            onChange={(e) => setArea({ ...currentArea, area_hectares: parseFloat(e.target.value) })}
            placeholder="0.00"
          />
        </div>
      </TabsContent>

      <TabsContent value="vegetation" className="space-y-4 mt-4">
        <div className="space-y-3">
          {currentArea.vegetation_stages?.map((stage, idx) => (
            <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Estágio {idx + 1}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const updated = currentArea.vegetation_stages.filter((_, i) => i !== idx);
                    setArea({ ...currentArea, vegetation_stages: updated });
                  }}
                >
                  ✕
                </Button>
              </div>
              <Select
                value={stage.stage_type || ''}
                onValueChange={(value) => {
                  const updated = [...currentArea.vegetation_stages];
                  updated[idx].stage_type = value;
                  setArea({ ...currentArea, vegetation_stages: updated });
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Tipo de estágio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inicial">Inicial</SelectItem>
                  <SelectItem value="Médio">Médio</SelectItem>
                  <SelectItem value="Avançado">Avançado</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="1"
                max="100"
                value={stage.area_percentage || ''}
                onChange={(e) => {
                  const updated = [...currentArea.vegetation_stages];
                  updated[idx].area_percentage = parseFloat(e.target.value);
                  setArea({ ...currentArea, vegetation_stages: updated });
                }}
                placeholder="% da área"
                className="h-8"
              />
              <Textarea
                value={stage.description || ''}
                onChange={(e) => {
                  const updated = [...currentArea.vegetation_stages];
                  updated[idx].description = e.target.value;
                  setArea({ ...currentArea, vegetation_stages: updated });
                }}
                placeholder="Descrição"
                className="h-16 text-sm"
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const updated = [...(currentArea.vegetation_stages || [])];
              updated.push({ stage_type: '', area_percentage: 0, description: '' });
              setArea({ ...currentArea, vegetation_stages: updated });
            }}
            className="w-full"
          >
            <Plus className="w-3 h-3 mr-1" />
            Adicionar Estágio
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="soil" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Tipo de Solo</label>
            <Input
              value={currentArea.soil_characterization?.soil_type || ''}
              onChange={(e) => setArea({
                ...currentArea,
                soil_characterization: { ...currentArea.soil_characterization, soil_type: e.target.value }
              })}
              placeholder="ex: Latossolo"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Textura</label>
            <Select
              value={currentArea.soil_characterization?.texture || ''}
              onValueChange={(value) => setArea({
                ...currentArea,
                soil_characterization: { ...currentArea.soil_characterization, texture: value }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arenosa">Arenosa</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Argilosa">Argilosa</SelectItem>
                <SelectItem value="Muito Argilosa">Muito Argilosa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">pH</label>
            <Input
              type="number"
              step="0.1"
              value={currentArea.soil_characterization?.ph || ''}
              onChange={(e) => setArea({
                ...currentArea,
                soil_characterization: { ...currentArea.soil_characterization, ph: parseFloat(e.target.value) }
              })}
              placeholder="6.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Declividade (%)</label>
            <Input
              type="number"
              step="0.1"
              value={currentArea.soil_characterization?.slope || ''}
              onChange={(e) => setArea({
                ...currentArea,
                soil_characterization: { ...currentArea.soil_characterization, slope: parseFloat(e.target.value) }
              })}
              placeholder="0.0"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Matéria Orgânica (g/dm³)</label>
            <Input
              type="number"
              step="0.1"
              value={currentArea.soil_characterization?.organic_matter || ''}
              onChange={(e) => setArea({
                ...currentArea,
                soil_characterization: { ...currentArea.soil_characterization, organic_matter: parseFloat(e.target.value) }
              })}
              placeholder="25.0"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Risco de Erosão</label>
            <Select
              value={currentArea.soil_characterization?.erosion_risk || ''}
              onValueChange={(value) => setArea({
                ...currentArea,
                soil_characterization: { ...currentArea.soil_characterization, erosion_risk: value }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Baixo">Baixo</SelectItem>
                <SelectItem value="Médio">Médio</SelectItem>
                <SelectItem value="Alto">Alto</SelectItem>
                <SelectItem value="Muito Alto">Muito Alto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium">Hidrologia Local</label>
            <Textarea
              value={currentArea.soil_characterization?.local_hydrology || ''}
              onChange={(e) => setArea({
                ...currentArea,
                soil_characterization: { ...currentArea.soil_characterization, local_hydrology: e.target.value }
              })}
              placeholder="Descrição da hidrologia"
              className="h-16"
            />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium">Restrições Ambientais</label>
            <Textarea
              value={currentArea.soil_characterization?.environmental_restrictions || ''}
              onChange={(e) => setArea({
                ...currentArea,
                soil_characterization: { ...currentArea.soil_characterization, environmental_restrictions: e.target.value }
              })}
              placeholder="Descreva as restrições"
              className="h-16"
            />
          </div>
        </div>
      </TabsContent>

      <div className="flex gap-2 justify-end mt-6">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={onSave}
          disabled={!currentArea.area_name || isPending}
        >
          Salvar Área
        </Button>
      </div>
    </Tabs>
  );
}