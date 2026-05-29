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
  AlertTriangle, CheckCircle2, ChevronLeft, Sparkles, Layers, Trash2
} from 'lucide-react';
import CARSmartUpload from '@/components/car/CARSmartUpload';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import ConsultorPropertySelector from '@/components/consultor/ConsultorPropertySelector';
import CARStatusBadge from '@/components/car/CARStatusBadge';
import CARAlerts from '@/components/car/CARAlerts';
import CARForm from '@/components/car/CARForm';
import CARMapLayers from '@/components/car/CARMapLayers';
import CARDocuments from '@/components/car/CARDocuments';
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

const R2_BASE = 'https://pub-619a5d7497a843dc84ca61263b654ac5.r2.dev/car/sicar-rs';

const SICAR_LAYER_KEYS = {
  app: 'app_layer_url',
  legal_reserve: 'legal_reserve_url',
  car_polygon: 'car_polygon_url',
  consolidated_area: 'consolidated_area_url',
  remanescente: 'remanescente_url',
  pousio: 'pousio_url',
  servidao: 'servidoes_url',
  uso_restrito: 'outro_uso_restrito_url',
};

const SICAR_LAYER_COLORS = {
  car_polygon: '#f59e0b',
  app: '#3b82f6',
  legal_reserve: '#10b981',
  consolidated_area: '#8b5cf6',
  remanescente: '#0f766e',
  pousio: '#f59e0b',
  hidrografia: '#0284c7',
  servidao: '#be123c',
  uso_restrito: '#7c3aed',
};

const SICAR_LAYER_NAMES = {
  car_polygon: 'Polígono do CAR',
  app: 'APP',
  legal_reserve: 'Reserva Legal',
  consolidated_area: 'Área Consolidada',
  remanescente: 'Vegetação Nativa',
  pousio: 'Pousio',
  hidrografia: 'Hidrografia',
  servidao: 'Servidão Administrativa',
  uso_restrito: 'Uso Restrito',
};

async function fetchSICARLayers(carNumber) {
  const res = await fetch(`${R2_BASE}/${carNumber}.geojson`);
  if (!res.ok) return null;
  const geojson = await res.json();
  if (!geojson.features?.length) return null;

  const byLayer = {};
  geojson.features.forEach(f => {
    const layer = f.properties?._layer;
    if (!layer) return;
    if (!byLayer[layer]) byLayer[layer] = { type: 'FeatureCollection', features: [] };
    byLayer[layer].features.push(f);
  });

  const mapLayers = {};
  const kmlItems = [];

  Object.entries(byLayer).forEach(([layer, fc]) => {
    const mapKey = SICAR_LAYER_KEYS[layer];
    if (mapKey) mapLayers[mapKey] = JSON.stringify(fc);

    kmlItems.push({
      id: `sicar-${carNumber}-${layer}`,
      name: SICAR_LAYER_NAMES[layer] || layer,
      geojson: fc,
      color: SICAR_LAYER_COLORS[layer] || '#6b7280',
      visible: true,
      car_number: carNumber,
      layer_type: layer,
      source: 'SICAR',
    });
  });

  return Object.keys(mapLayers).length > 0 ? { mapLayers, kmlItems } : null;
}

export default function CARModule() {
  const [consultorPropertyId, setConsultorPropertyId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const queryClient = useQueryClient();

  const { effectiveEmail, userType, isEquipe, isEquipeProdutor, memberRole, user } = useEffectiveUser();
  // equipe de produtor deve buscar como produtor (owner_email), não como consultor
  const isConsultor = (userType === 'consultor' || (userType === 'equipe' && !isEquipeProdutor));
  const canEdit = !isEquipe || memberRole === 'Administrador' || memberRole === 'Engenheiro';

  const { data: properties = [], isLoading: propsLoading } = useQuery({
    queryKey: ['properties', effectiveEmail, userType],
    queryFn: async () => {
      if (isConsultor) {
        return base44.entities.Property.filter({ consultor_email: effectiveEmail });
      }
      // Produtor: busca por owner_email OU por authorized_users (via owner_email)
      const byOwner = await base44.entities.Property.filter({ owner_email: effectiveEmail });
      return byOwner;
    },
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
  const [showSmartUpload, setShowSmartUpload] = useState(false);
  const [prefillData, setPrefillData] = useState(null);

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

      if (data.car_number && selectedProperty) {
        const existingCars = selectedProperty.car_numbers || [];
        const newCars = existingCars.includes(data.car_number)
          ? existingCars
          : [...existingCars, data.car_number];
        await base44.entities.Property.update(selectedProperty.id, { car_numbers: newCars });
      }

      let sicarLoaded = false;
      if (data.car_number) {
        const sicar = await fetchSICARLayers(data.car_number).catch(() => null);
        if (sicar) {
          await base44.entities.CARManagement.update(carData.id, { map_layers: sicar.mapLayers });

          const prop = await base44.entities.Property.get(effectivePropertyId);
          const existingKml = (prop.kml_layers || []).filter(
            l => l.car_number !== data.car_number || l.source !== 'SICAR'
          );
          await base44.entities.Property.update(effectivePropertyId, {
            kml_layers: [...existingKml, ...sicar.kmlItems],
          });

          sicarLoaded = true;
        }
      }

      return { sicarLoaded };
    },
    onSuccess: ({ sicarLoaded }) => {
      queryClient.invalidateQueries(['car', effectivePropertyId]);
      queryClient.invalidateQueries(['properties', effectiveEmail, userType]);
      setEditOpen(false);
      setEditingCarId(null);
      toast.success(
        sicarLoaded
          ? 'CAR salvo! Polígonos SICAR carregados automaticamente no mapa.'
          : 'CAR salvo com sucesso!'
      );
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

  const deleteMutation = useMutation({
    mutationFn: async (carId) => {
      const carRecord = carRecords.find(c => c.id === carId);
      const carNumber = carRecord?.car_number;

      // 1. Deleta o CAR
      await base44.entities.CARManagement.delete(carId);

      if (carNumber && selectedProperty) {
        // 2. Limpa kml_layers — por car_number OU pelo padrão do id
        const kmlAtual = selectedProperty.kml_layers || [];
        const kmlLimpo = kmlAtual.filter(l => {
          if (l.car_number === carNumber) return false;
          if (l.id && l.id.startsWith(`sicar-${carNumber}-`)) return false;
          // Camadas órfãs SICAR sem car_number — tenta extrair do id
          if (l.source === 'SICAR' && !l.car_number) {
            const SICAR_LAYER_TYPES = ['car_polygon','app','legal_reserve','consolidated_area','remanescente','pousio','hidrografia','servidoes','outro_uso_restrito'];
            if (l.id && l.id.startsWith('sicar-')) {
              const withoutPrefix = l.id.slice(6);
              const layerSuffix = SICAR_LAYER_TYPES.find(lt => withoutPrefix.endsWith('-' + lt));
              if (layerSuffix) {
                const extractedCar = withoutPrefix.slice(0, -(layerSuffix.length + 1));
                if (extractedCar === carNumber) return false;
              }
            }
          }
          return true;
        });
        await base44.entities.Property.update(selectedProperty.id, { kml_layers: kmlLimpo });

        // 3. Remove de car_numbers
        const carsAtuais = selectedProperty.car_numbers || [];
        const carsFiltrados = carsAtuais.filter(n => n !== carNumber);
        await base44.entities.Property.update(selectedProperty.id, { car_numbers: carsFiltrados });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['car', effectivePropertyId]);
      queryClient.invalidateQueries(['properties', effectiveEmail, userType]);
      setDeleteConfirmId(null);
    },
  });

  const cleanedPrefillData = prefillData ? (() => {
    const cleaned = Object.fromEntries(
      Object.entries(prefillData).filter(([key]) => !key.startsWith('_'))
    );
    if (!cleaned.ai_analysis && prefillData._ai_analysis) {
      cleaned.ai_analysis = prefillData._ai_analysis;
    }
    return cleaned;
  })() : null;

  if (!effectiveEmail) return <div className="flex items-center justify-center h-64"><Skeleton className="w-48 h-8" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Link */}
      <a
        href="javascript:history.back()"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-medium"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </a>

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
        {(!isConsultor || effectivePropertyId) && canEdit && (
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
        <div className="space-y-6">
          {(() => {
            const somaTotal = carRecords.reduce((s, c) => s + (parseFloat(c.car_area_hectares) || 0), 0);
            const somaApp = carRecords.reduce((s, c) => s + (parseFloat(c.app_hectares) || 0), 0);
            const somaRL = carRecords.reduce((s, c) => s + (parseFloat(c.legal_reserve_hectares) || 0), 0);
            const somaRLRecompor = carRecords.reduce((s, c) => s + (parseFloat(c.legal_reserve_to_recover_hectares) || 0), 0);
            const somaAppRecompor = carRecords.reduce((s, c) => s + (parseFloat(c.app_to_recover_hectares) || 0), 0);
            const temPassivos = somaRLRecompor > 0 || somaAppRecompor > 0;
            return carRecords.length > 1 ? (
              <Card className="border-2 border-emerald-200 bg-emerald-50/50 mb-2">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-800">Somatório dos Imóveis</span>
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">
                      {carRecords.length} imóveis
                    </Badge>
                  </div>
                  <div className={`grid gap-4 text-center ${temPassivos ? 'grid-cols-3 md:grid-cols-5' : 'grid-cols-3'}`}>
                    <div className="bg-white rounded-lg p-3 border border-emerald-100">
                      <p className="text-xs text-gray-500 mb-1">Área Total</p>
                      <p className="text-xl font-bold text-emerald-700">{somaTotal.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400">hectares</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <p className="text-xs text-gray-500 mb-1">APP Total</p>
                      <p className="text-xl font-bold text-blue-600">{somaApp > 0 ? somaApp.toFixed(2) : '—'}</p>
                      <p className="text-[10px] text-gray-400">hectares</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-100">
                      <p className="text-xs text-gray-500 mb-1">Reserva Legal</p>
                      <p className="text-xl font-bold text-green-600">{somaRL > 0 ? somaRL.toFixed(2) : '—'}</p>
                      <p className="text-[10px] text-gray-400">hectares</p>
                    </div>
                    {somaRLRecompor > 0 && <div className="bg-white rounded-lg p-3 border border-orange-100"><p className="text-xs text-gray-500 mb-1">RL a Recompor</p><p className="text-xl font-bold text-orange-600">{somaRLRecompor.toFixed(2)}</p><p className="text-[10px] text-gray-400">hectares</p></div>}
                    {somaAppRecompor > 0 && <div className="bg-white rounded-lg p-3 border border-orange-100"><p className="text-xs text-gray-500 mb-1">APP a Recompor</p><p className="text-xl font-bold text-orange-600">{somaAppRecompor.toFixed(2)}</p><p className="text-[10px] text-gray-400">hectares</p></div>}
                  </div>
                </CardContent>
              </Card>
            ) : null;
          })()}
          {carRecords.map((carRecord, idx) => (
            <Card key={carRecord.id} className="border-2 border-emerald-200 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent pb-3 border-b border-emerald-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-emerald-900">
                      {selectedProperty?.property_name || 'Propriedade'} {carRecords.length > 1 && `• CAR ${idx + 1}`}
                    </h2>
                    {carRecord.car_number && <p className="text-sm text-emerald-600 mt-1">CAR: {carRecord.car_number}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <CARStatusBadge status={carRecord.car_status} large />
                    {canEdit && <Button variant="outline" size="sm" onClick={() => { setEditingCarId(carRecord.id); setEditOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>}
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 border-red-200 hover:bg-red-50 hover:border-red-400"
                        onClick={() => setDeleteConfirmId(carRecord.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
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

                  {/* Tarja de cadastro incompleto */}
                  {(() => {
                    const camposFaltantes = [
                      !carRecord.car_area_hectares && 'Área Total',
                      !carRecord.app_hectares && 'APP (ha)',
                      !carRecord.legal_reserve_hectares && 'Reserva Legal (ha)',
                      !carRecord.car_registration_date && 'Data de Cadastro',
                      !carRecord.ai_analysis && 'Diagnóstico IA',
                    ].filter(Boolean);
                    return camposFaltantes.length > 0 ? (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-amber-800 mb-1.5">Cadastro incompleto</p>
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {camposFaltantes.map(campo => (
                              <span key={campo} className="text-[10px] bg-amber-100 border border-amber-300 text-amber-700 rounded px-1.5 py-0.5">
                                {campo}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-amber-600">
                            Use "Preencher com PDF do CAR" para completar automaticamente →
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Status Info */}
                  <Card className="border border-gray-100">
                    <CardContent className="pt-4 grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
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
                      {carRecord.app_hectares && <div><p className="text-gray-500">APP</p><p className="font-semibold text-blue-600">{carRecord.app_hectares} ha</p></div>}
                      {carRecord.legal_reserve_hectares && <div><p className="text-gray-500">Reserva Legal</p><p className="font-semibold text-green-600">{carRecord.legal_reserve_hectares} ha</p></div>}
                      {carRecord.consolidated_area_hectares && <div><p className="text-gray-500">Área Consolidada</p><p className="font-semibold text-purple-600">{carRecord.consolidated_area_hectares} ha</p></div>}
                      {carRecord.legal_reserve_to_recover_hectares && <div><p className="text-gray-500">RL a Recompor</p><p className="font-semibold text-orange-600">{carRecord.legal_reserve_to_recover_hectares} ha</p></div>}
                      {carRecord.app_to_recover_hectares && <div><p className="text-gray-500">APP a Recompor</p><p className="font-semibold text-orange-600">{carRecord.app_to_recover_hectares} ha</p></div>}
                      {carRecord.owner_name && <div><p className="text-gray-500">Proprietário</p><p className="font-semibold">{carRecord.owner_name}</p></div>}
                      {carRecord.registration_numbers && <div><p className="text-gray-500">Matrículas</p><p className="font-semibold">{carRecord.registration_numbers}</p></div>}
                      {carRecord.municipality && <div><p className="text-gray-500">Município/UF</p><p className="font-semibold">{carRecord.municipality}/{carRecord.state}</p></div>}
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

                  {/* Diagnóstico IA */}
                  {carRecord.ai_analysis && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <p className="text-xs font-semibold text-purple-800">Diagnóstico Ambiental (IA)</p>
                        <span className="text-[10px] text-purple-400 ml-auto">Gerado automaticamente via Smart Upload</span>
                      </div>
                      <p className="text-xs text-purple-900 leading-relaxed">{carRecord.ai_analysis}</p>
                    </div>
                  )}

                  {carRecord.environmental_liabilities?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs font-semibold text-orange-700">Passivos:</span>
                      {carRecord.environmental_liabilities.map(l => (
                        <Badge key={l} className="bg-orange-100 text-orange-800 border border-orange-200 text-xs">{l}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Documentos */}
                  <CARDocuments
                    carRecord={carRecord}
                    onUpdate={(data) => updateMapLayers.mutate(data)}
                    canEdit={canEdit}
                  />

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
                  <CARMapLayers
                    carRecord={carRecord}
                    onUpdate={(data) => updateMapLayers.mutate(data)}
                    property={selectedProperty}
                    onPropertyUpdate={(updatedKmlLayers) => {
                      queryClient.invalidateQueries(['properties', effectiveEmail, userType]);
                    }}
                  />
                </TabsContent>
              </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Excluir CAR
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-gray-700">Tem certeza? Esta ação irá excluir o CAR e remover todas as camadas do Mapa Interativo.</p>
            {(() => {
              const car = carRecords.find(c => c.id === deleteConfirmId);
              return car?.car_number ? (
                <p className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded border break-all">{car.car_number}</p>
              ) : null;
            })()}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteConfirmId)}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open);
        if (!open) { setEditingCarId(null); setShowSmartUpload(false); setPrefillData(null); }
      }}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingCarId ? 'Editar CAR' : showSmartUpload ? <><Sparkles className="w-4 h-4 text-emerald-600" /> Preencher CAR com IA</> : 'Adicionar Novo CAR'}
            </DialogTitle>
          </DialogHeader>

          {/* Novo CAR: mostrar smart upload ou formulário */}
          {!editingCarId && showSmartUpload ? (
            <CARSmartUpload
              onDataExtracted={(data) => {
                setPrefillData(data);
                setShowSmartUpload(false);
              }}
              onClose={() => setShowSmartUpload(false)}
            />
          ) : (
            <>
              {/* Botão de IA apenas no modo criação */}
              {!editingCarId && !prefillData && (
                <div className="mb-2 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                    onClick={() => setShowSmartUpload(true)}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Preencher com PDF do CAR
                  </Button>
                </div>
              )}
              {prefillData && (
                <div className="mb-3 flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Dados extraídos pela IA — revise e salve</span>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                    onClick={() => { setPrefillData(null); setShowSmartUpload(true); }}
                  >
                    Refazer upload
                  </button>
                </div>
              )}
              <CARForm
                initial={editingCarId ? carRecords.find(c => c.id === editingCarId) || {} : (cleanedPrefillData || {})}
                onSubmit={async (data) => {
                  // Se veio de prefillData, atualiza Property com dados extras extraídos pela IA
                  if (prefillData && selectedProperty) {
                    const updates = {};
                    if (prefillData._coordinates && !selectedProperty.coordinates) updates.coordinates = prefillData._coordinates;
                    if (prefillData._municipality && !selectedProperty.city) updates.city = prefillData._municipality;
                    if (prefillData._state && !selectedProperty.state) updates.state = prefillData._state;
                    if (prefillData._app_hectares && !selectedProperty.app_hectares) updates.app_hectares = prefillData._app_hectares;
                    if (prefillData._legal_reserve_hectares && !selectedProperty.legal_reserve_hectares) updates.legal_reserve_hectares = prefillData._legal_reserve_hectares;
                    if (prefillData._registration_numbers && !selectedProperty.registration_numbers) updates.registration_numbers = prefillData._registration_numbers;
                    if (Object.keys(updates).length > 0) {
                      await base44.entities.Property.update(selectedProperty.id, updates);
                      queryClient.invalidateQueries(['properties', effectiveEmail, userType]);
                    }
                    // Add PDF as document in CAR
                    if (prefillData._file_url) {
                      const docType = prefillData._doc_type === 'recibo' ? 'Recibo de Cadastro' : 'CAR PDF';
                      data.documents = [{
                        name: prefillData._doc_type === 'recibo' ? 'Recibo de Inscrição CAR' : 'Demonstrativo CAR',
                        url: prefillData._file_url,
                        type: docType,
                        upload_date: new Date().toISOString(),
                      }];
                    }
                  }
                  saveMutation.mutate(data);
                }}
                onCancel={() => { setEditOpen(false); setEditingCarId(null); setPrefillData(null); setShowSmartUpload(false); }}
                isLoading={saveMutation.isPending}
                aiAnalysis={cleanedPrefillData?.ai_analysis}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}