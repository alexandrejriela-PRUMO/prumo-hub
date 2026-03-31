import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, Plus, Edit, Leaf, MapPin, Clock, Building2,
  AlertTriangle, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import ConsultorPropertySelector from '@/components/consultor/ConsultorPropertySelector';
import CARStatusBadge from '@/components/car/CARStatusBadge';
import CARAlerts from '@/components/car/CARAlerts';
import CARForm from '@/components/car/CARForm';
import CARMapLayers from '@/components/car/CARMapLayers';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

function fmtDate(d) {
  if (!d) return '—';
  const p = parseISO(d);
  return isValid(p) ? format(p, 'dd/MM/yyyy') : '—';
}

const praStatusColors = {
  'Não aderido': 'bg-gray-100 text-gray-700',
  'Em processo de adesão': 'bg-blue-100 text-blue-700',
  'Aderido': 'bg-teal-100 text-teal-700',
  'Em execução': 'bg-amber-100 text-amber-700',
  'Concluído': 'bg-green-100 text-green-700',
};

const recoveryColors = {
  'Não possui': 'bg-gray-100 text-gray-600',
  'PRAD em elaboração': 'bg-blue-100 text-blue-700',
  'PRAD aprovado': 'bg-teal-100 text-teal-700',
  'PRAD em execução': 'bg-amber-100 text-amber-700',
  'PRAD concluído': 'bg-green-100 text-green-700',
};

export default function CARModule() {
  const [consultorPropertyId, setConsultorPropertyId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const { effectiveEmail, userType, isEquipe, memberRole, user } = useEffectiveUser();
  const isConsultor = userType === 'consultor' || userType === 'equipe';
  const canEdit = !isEquipe || memberRole === 'Administrador' || memberRole === 'Engenheiro';

  const { data: properties = [], isLoading: propsLoading } = useQuery({
    queryKey: ['properties', effectiveEmail, userType],
    queryFn: () => isConsultor
      ? base44.entities.Property.filter({ consultor_email: effectiveEmail })
      : base44.entities.Property.filter({ owner_email: effectiveEmail }),
    enabled: !!effectiveEmail,
    initialData: [],
  });

  const effectivePropertyId = isConsultor ? consultorPropertyId : (properties[0]?.id || null);
  const selectedProperty = properties.find(p => p.id === effectivePropertyId);

  const { data: carRecords = [], isLoading: carLoading } = useQuery({
    queryKey: ['car', effectivePropertyId],
    queryFn: () => base44.entities.CARManagement.filter({ property_id: effectivePropertyId }),
    enabled: !!effectivePropertyId,
    initialData: [],
  });

  const [editingCarId, setEditingCarId] = useState(null);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const carData = editingCarId
        ? await base44.entities.CARManagement.update(editingCarId, data)
        : await base44.entities.CARManagement.create({
            ...data,
            property_id: effectivePropertyId,
            owner_email: selectedProperty?.owner_email || effectiveEmail,
            consultor_email: isConsultor ? effectiveEmail : undefined,
          });
      
      // Atualizar Property com o CAR cadastrado
      if (data.car_number && selectedProperty) {
        const existingCars = selectedProperty.car_numbers || [];
        const newCars = existingCars.includes(data.car_number) 
          ? existingCars 
          : [...existingCars, data.car_number];
        
        await base44.entities.Property.update(selectedProperty.id, {
          car_numbers: newCars
        });
      }
      
      return carData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['car', effectivePropertyId]);
      queryClient.invalidateQueries(['properties', effectiveEmail, userType]);
      setEditOpen(false);
      setEditingCarId(null);
      toast.success('CAR salvo com sucesso!');
    },
  });

  const updateMapLayers = useMutation({
    mutationFn: (data) => {
      const firstRecord = carRecords[0];
      return firstRecord
        ? base44.entities.CARManagement.update(firstRecord.id, data)
        : base44.entities.CARManagement.create({
            ...data,
            property_id: effectivePropertyId,
            owner_email: selectedProperty?.owner_email || effectiveEmail,
            consultor_email: isConsultor ? effectiveEmail : undefined,
            car_status: 'Pendente de análise',
          });
    },
    onSuccess: () => queryClient.invalidateQueries(['car', effectivePropertyId]),
  });

  if (!effectiveEmail) return <div className="flex items-center justify-center h-64"><Skeleton className="w-48 h-8" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Link */}
      {!isConsultor && (
        <a
          href="javascript:history.back()"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-medium"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </a>
      )}

      {/* Property Selector (consultor) */}
      {isConsultor && (
        <ConsultorPropertySelector
          properties={properties}
          selectedPropertyId={consultorPropertyId}
          onSelect={setConsultorPropertyId}
          isLoading={propsLoading}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-8 h-8 text-emerald-600" />
            Gestão do CAR
          </h1>
          <p className="text-gray-500 mt-1">Cadastro Ambiental Rural e Regularização Ambiental</p>
        </div>
        {effectivePropertyId && canEdit && (
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditingCarId(null); setEditOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Adicionar CAR
          </Button>
        )}
      </div>

      {/* Sem propriedade selecionada */}
      {isConsultor && !consultorPropertyId && (
        <Card className="border-dashed border-2 border-amber-200">
          <CardContent className="py-16 text-center">
            <Building2 className="w-16 h-16 mx-auto text-amber-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Selecione uma propriedade</h3>
            <p className="text-gray-500 mt-1">Escolha a propriedade acima para gerenciar o CAR</p>
          </CardContent>
        </Card>
      )}

      {carLoading && <Skeleton className="h-64 rounded-xl" />}

      {/* Listagem de CARs */}
      {effectivePropertyId && !carLoading && carRecords.length === 0 && (
        <Card className="border-dashed border-2 border-emerald-200">
          <CardContent className="py-16 text-center">
            <FileText className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Nenhum CAR cadastrado</h3>
            <p className="text-gray-500 mt-2 mb-6">Cadastre os CARs desta propriedade</p>
            {canEdit && <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditingCarId(null); setEditOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />Cadastrar Primeiro CAR
            </Button>}
          </CardContent>
        </Card>
      )}

      {carRecords.length > 0 && (
        <div className="space-y-4">
          {carRecords.map((carRecord) => (
            <div key={carRecord.id}>
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid grid-cols-3 w-full max-w-md">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="pra">PRA / Recuperação</TabsTrigger>
                  <TabsTrigger value="map">Mapa / Camadas</TabsTrigger>
                </TabsList>

                {/* OVERVIEW */}
                <TabsContent value="overview" className="space-y-4">
                  {/* Alertas */}
                  <CARAlerts carRecord={carRecord} />

                  {/* Status Card */}
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                          <CardTitle className="text-lg">{selectedProperty?.property_name || 'Propriedade'}</CardTitle>
                          {carRecord.car_number && <p className="text-sm text-gray-500 mt-1">CAR: {carRecord.car_number}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <CARStatusBadge status={carRecord.car_status} large />
                          {canEdit && <Button variant="outline" size="sm" onClick={() => { setEditingCarId(carRecord.id); setEditOpen(true); }}>
                            <Edit className="w-4 h-4" />
                            </Button>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Data de Cadastro</p>
                        <p className="font-semibold">{fmtDate(carRecord.car_registration_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Última Atualização</p>
                        <p className="font-semibold">{fmtDate(carRecord.car_last_update)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Área Declarada</p>
                        <p className="font-semibold">{carRecord.car_area_hectares ? `${carRecord.car_area_hectares} ha` : '—'}</p>
                      </div>
                      {carRecord.car_inconsistencies && (
                        <div className="sm:col-span-2 md:col-span-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-xs font-medium text-red-700 mb-1">Inconsistências:</p>
                          <p className="text-sm text-red-800">{carRecord.car_inconsistencies}</p>
                        </div>
                      )}
                      {carRecord.car_notes && (
                        <div className="sm:col-span-2 md:col-span-3">
                          <p className="text-gray-500">Observações</p>
                          <p className="text-gray-700">{carRecord.car_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Summary badges */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <Leaf className="w-8 h-8 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Status do PRA</p>
                          <Badge className={`${praStatusColors[carRecord.pra_status] || 'bg-gray-100 text-gray-600'} mt-1`}>
                            {carRecord.pra_status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <MapPin className="w-8 h-8 text-blue-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Projeto de Recuperação</p>
                          <Badge className={`${recoveryColors[carRecord.recovery_project_status] || 'bg-gray-100 text-gray-600'} mt-1`}>
                            {carRecord.recovery_project_status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* PRA / RECUPERAÇÃO */}
                <TabsContent value="pra" className="space-y-4">
                  {/* PRA */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-green-600" />
                        Programa de Regularização Ambiental (PRA)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div><p className="text-gray-500">Status</p><Badge className={praStatusColors[carRecord.pra_status] || 'bg-gray-100'}>{carRecord.pra_status}</Badge></div>
                        {carRecord.pra_term_number && <div><p className="text-gray-500">Nº do Termo</p><p className="font-semibold">{carRecord.pra_term_number}</p></div>}
                        {carRecord.pra_adhesion_date && <div><p className="text-gray-500">Data de Adesão</p><p className="font-semibold">{fmtDate(carRecord.pra_adhesion_date)}</p></div>}
                        {carRecord.pra_deadline && <div><p className="text-gray-500">Prazo de Regularização</p><p className="font-semibold">{fmtDate(carRecord.pra_deadline)}</p></div>}
                        {carRecord.pra_environmental_agency && <div><p className="text-gray-500">Órgão Responsável</p><p className="font-semibold">{carRecord.pra_environmental_agency}</p></div>}
                        {carRecord.pra_notes && <div className="sm:col-span-2"><p className="text-gray-500">Observações</p><p className="text-gray-700">{carRecord.pra_notes}</p></div>}
                      </div>

                      {carRecord.environmental_liabilities?.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Passivos Ambientais</p>
                          <div className="flex flex-wrap gap-2">
                            {carRecord.environmental_liabilities.map(l => (
                              <Badge key={l} className="bg-orange-100 text-orange-800 border border-orange-200">{l}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Projeto de Recuperação */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        Projeto de Recuperação Ambiental
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div className="sm:col-span-2"><p className="text-gray-500">Status</p><Badge className={recoveryColors[carRecord.recovery_project_status] || 'bg-gray-100'}>{carRecord.recovery_project_status}</Badge></div>
                        {carRecord.recovery_technician && <div><p className="text-gray-500">Responsável Técnico</p><p className="font-semibold">{carRecord.recovery_technician}</p></div>}
                        {carRecord.recovery_area_hectares && <div><p className="text-gray-500">Área em Recuperação</p><p className="font-semibold">{carRecord.recovery_area_hectares} ha</p></div>}
                        {carRecord.recovery_start_date && <div><p className="text-gray-500">Data de Início</p><p className="font-semibold">{fmtDate(carRecord.recovery_start_date)}</p></div>}
                        {carRecord.recovery_deadline && <div><p className="text-gray-500">Prazo de Execução</p><p className="font-semibold">{fmtDate(carRecord.recovery_deadline)}</p></div>}
                        {carRecord.recovery_notes && <div className="sm:col-span-2"><p className="text-gray-500">Observações</p><p className="text-gray-700">{carRecord.recovery_notes}</p></div>}
                      </div>
                      {carRecord.recovery_project_status === 'Não possui' && (
                        <p className="text-gray-400 text-sm text-center py-4">Nenhum projeto de recuperação cadastrado</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* MAPA */}
                <TabsContent value="map">
                  <CARMapLayers carRecord={carRecord} onUpdate={(data) => updateMapLayers.mutate(data)} />
                </TabsContent>
              </Tabs>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCarId ? 'Editar CAR' : 'Adicionar Novo CAR'}</DialogTitle>
          </DialogHeader>
          <CARForm
            initial={editingCarId ? carRecords.find(c => c.id === editingCarId) || {} : {}}
            onSubmit={(data) => saveMutation.mutate(data)}
            onCancel={() => { setEditOpen(false); setEditingCarId(null); }}
            isLoading={saveMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}