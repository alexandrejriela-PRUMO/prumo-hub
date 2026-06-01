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
  AlertTriangle, CheckCircle2, ChevronLeft, Sparkles, Layers, Trash2, Pencil
} from 'lucide-react';
import CARSmartUpload from '@/components/car/CARSmartUpload';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import ConsultorPropertySelector from '@/components/consultor/ConsultorPropertySelector';
import PropertySelector from '@/components/produtor/PropertySelector';
import CARStatusBadge from '@/components/car/CARStatusBadge';
import CARAlerts from '@/components/car/CARAlerts';
import CARForm from '@/components/car/CARForm';
import CARMapLayers from '@/components/car/CARMapLayers';
import CARDocuments from '@/components/car/CARDocuments';
import CARSelector from '@/components/car/CARSelector';
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

  const [produtorPropertyId, setProdutorPropertyId] = useState(null);

  // Para produtor: usa o seletor se tiver mais de 1 propriedade, senão usa a primeira
  const effectivePropertyId = isConsultor
    ? consultorPropertyId
    : (properties.length > 1 ? produtorPropertyId : (properties[0]?.id || null));
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
  const [selectedCarId, setSelectedCarId] = useState(null);
  const [editingTitle, setEditingTitle] = useState(null);
  const [titleValue, setTitleValue] = useState('');

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let carData;
      if (editingCarId) {
        carData = await base44.entities.CARManagement.update(editingCarId, data);
      } else {
        carData = await base44.entities.CARManagement.create({
          ...data,
          property_id: effectivePropertyId,
          owner_email: selectedProperty?.owner_email || effectiveEmail,
          consultor_email: isConsultor ? effectiveEmail : undefined,
        });
      }

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
          // Lê o registro atual antes de atualizar map_layers para não sobrescrever campos já salvos
          await base44.entities.CARManagement.update(carData.id, {
            ...carData,
            ...data,
            map_layers: sicar?.mapLayers || carData?.map_layers || data?.map_layers,
          });

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
      const activeId = selectedCarId && carRecords.find(c => c.id === selectedCarId) ? selectedCarId : carRecords[0]?.id;
      return activeId
        ? base44.entities.CARManagement.update(activeId, data)
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

  const updateCarField = useMutation({
    mutationFn: ({ id, ...data }) => base44.entities.CARManagement.update(id, data),
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

      {/* Property Selector (consultor ou produtor com múltiplas propriedades) */}
      {isConsultor ? (
        <ConsultorPropertySelector
          properties={properties}
          selectedPropertyId={consultorPropertyId}
          onSelect={setConsultorPropertyId}
          isLoading={propsLoading}
        />
      ) : properties.length > 1 && (
        <PropertySelector
          properties={properties}
          selectedPropertyId={produtorPropertyId}
          onSelect={setProdutorPropertyId}
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
      {((isConsultor && !consultorPropertyId) || (!isConsultor && properties.length > 1 && !produtorPropertyId)) && (
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

      {carRecords.length > 0 && (() => {
        const activeCarId = selectedCarId && carRecords.find(c => c.id === selectedCarId) ? selectedCarId : carRecords[0].id;
        const carRecord = carRecords.find(c => c.id === activeCarId);
        const idx = carRecords.findIndex(c => c.id === activeCarId);
        const rawPassivo = carRecord.passive_rl_balance_hectares;
        const passivo = (rawPassivo !== null && rawPassivo !== undefined && rawPassivo !== '')
          ? parseFloat(String(rawPassivo).replace(',', '.'))
          : null;
        const _areaTotal = parseFloat(String(carRecord.car_area_hectares || '0').replace(',', '.'));
        const _rlDeclarada = parseFloat(String(carRecord.legal_reserve_hectares || '0').replace(',', '.'));
        const _vegNativa = parseFloat(String(carRecord.native_vegetation_hectares || '0').replace(',', '.'));
        const _rlMinima = _areaTotal * 0.20;
        const passivocalc = (_rlDeclarada > 0 || _vegNativa > 0) ? Math.min(_rlDeclarada, _vegNativa) - _rlMinima : null;
        const passivofinal = (passivo !== null && !isNaN(passivo)) ? passivo : passivocalc;

        const somaTotal = carRecords.reduce((s, c) => s + (parseFloat(c.car_area_hectares) || 0), 0);
        const somaApp = carRecords.reduce((s, c) => s + (parseFloat(c.app_hectares) || 0), 0);
        const somaRL = carRecords.reduce((s, c) => s + (parseFloat(c.legal_reserve_hectares) || 0), 0);
        const somaRLRecompor = carRecords.reduce((s, c) => s + (parseFloat(c.legal_reserve_to_recover_hectares) || 0), 0);
        const somaAppRecompor = carRecords.reduce((s, c) => s + (parseFloat(c.app_to_recover_hectares) || 0), 0);
        const somaDeficitRL = carRecords.reduce((s, c) => {
          const rawPassivo = c.passive_rl_balance_hectares;
          const passivo = (rawPassivo !== null && rawPassivo !== undefined && rawPassivo !== '')
            ? parseFloat(String(rawPassivo).replace(',', '.'))
            : null;
          const areaTotal = parseFloat(String(c.car_area_hectares || '0').replace(',', '.'));
          const rlDeclarada = parseFloat(String(c.legal_reserve_hectares || '0').replace(',', '.'));
          const vegNativa = parseFloat(String(c.native_vegetation_hectares || '0').replace(',', '.'));
          const rlMinima = areaTotal * 0.20;
          const passivocalc = (rlDeclarada > 0 || vegNativa > 0) ? Math.min(rlDeclarada, vegNativa) - rlMinima : null;
          const pf = (passivo !== null && !isNaN(passivo)) ? passivo : passivocalc;
          return s + ((pf !== null && pf < 0) ? Math.abs(pf) : 0);
        }, 0);
        const temPassivos = somaRLRecompor > 0 || somaAppRecompor > 0 || somaDeficitRL > 0;

        return (
          <div className="space-y-4">
            {/* Seletor de CAR */}
            <CARSelector
              carRecords={carRecords}
              selectedCarId={activeCarId}
              onSelectCar={setSelectedCarId}
              onEdit={(id) => { setEditingCarId(id); setEditOpen(true); }}
              onDelete={(id) => setDeleteConfirmId(id)}
              canEdit={canEdit}
            />

            {/* Somatório (apenas quando múltiplos CARs) */}
            {carRecords.length > 1 && (
              <Card className="border-2 border-emerald-200 bg-emerald-50/50">
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
                    {somaDeficitRL > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-red-100">
                        <p className="text-xs text-gray-500 mb-1">Déf. RL Total</p>
                        <p className="text-xl font-bold text-red-600">{somaDeficitRL.toFixed(2).replace('.', ',')}</p>
                        <p className="text-[10px] text-gray-400">hectares</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detalhe do CAR selecionado */}
            <Card className="border-2 border-emerald-200 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent pb-3 border-b border-emerald-100">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-emerald-900 flex items-center gap-1 flex-wrap">
                      {selectedProperty?.property_name || 'Propriedade'}
                      {carRecords.length > 1 && (
                        <>
                          {' • '}
                          {editingTitle === carRecord.id ? (
                            <input
                              autoFocus
                              className="text-base font-bold text-emerald-900 bg-transparent border-b border-emerald-400 outline-none w-36"
                              value={titleValue}
                              onChange={e => setTitleValue(e.target.value)}
                              onBlur={() => { updateCarField.mutate({ id: carRecord.id, car_custom_title: titleValue }); setEditingTitle(null); }}
                              onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingTitle(null); }}
                            />
                          ) : (
                            <>
                              <span>{carRecord.car_custom_title || `CAR ${idx + 1}`}</span>
                              {canEdit && (
                                <button onClick={() => { setEditingTitle(carRecord.id); setTitleValue(carRecord.car_custom_title || ''); }} className="ml-1 opacity-40 hover:opacity-100">
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </h2>
                    {carRecord.car_number && <p className="text-sm text-emerald-600 mt-1 font-mono text-xs">{carRecord.car_number}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {carRecord.native_vegetation_hectares ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold">
                        🌿 {carRecord.native_vegetation_hectares} ha veg. nativa
                      </span>
                    ) : canEdit && (
                      <button
                        type="button"
                        onClick={() => { setEditingCarId(carRecord.id); setEditOpen(true); }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] hover:bg-amber-100 transition-colors"
                      >
                        🌿 Informar Veg. Nativa
                      </button>
                    )}
                    <CARStatusBadge status={carRecord.car_status} large />
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
                  <CARAlerts carRecord={carRecord} />

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
                      <div><p className="text-gray-500">APP</p><p className={`font-semibold ${carRecord.app_hectares ? 'text-blue-600' : 'text-gray-300'}`}>{carRecord.app_hectares ? `${carRecord.app_hectares} ha` : '—'}</p></div>
                      <div><p className="text-gray-500">Reserva Legal</p><p className={`font-semibold ${carRecord.legal_reserve_hectares ? 'text-green-600' : 'text-gray-300'}`}>{carRecord.legal_reserve_hectares ? `${carRecord.legal_reserve_hectares} ha` : '—'}</p></div>
                      <div>
                        <p className="text-gray-500">Passivo/Excedente RL</p>
                        {(() => {
                          const passiveVal = parseFloat(carRecord.passive_rl_balance_hectares);
                          if (isNaN(passiveVal) || carRecord.passive_rl_balance_hectares === null || carRecord.passive_rl_balance_hectares === undefined) {
                            return <p className="text-gray-300">—</p>;
                          }
                          const abs = Math.abs(passiveVal).toFixed(2).replace('.', ',');
                          return (
                            <p className={`font-semibold ${passiveVal < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {abs} ha
                              <span className="text-[10px] font-normal ml-1 opacity-70">
                                {passiveVal < 0 ? '(déficit)' : '(excedente)'}
                              </span>
                            </p>
                          );
                        })()}
                      </div>
                      {carRecord.consolidated_area_hectares ? <div><p className="text-gray-500">Área Consolidada</p><p className="font-semibold text-purple-600">{carRecord.consolidated_area_hectares} ha</p></div> : null}
                      <div><p className="text-gray-500">Veg. Nativa Remanescente</p><p className={`font-semibold ${carRecord.native_vegetation_hectares ? 'text-teal-600' : 'text-gray-300'}`}>{carRecord.native_vegetation_hectares ? `${carRecord.native_vegetation_hectares} ha` : '—'}</p></div>
                      <div><p className="text-gray-500">RL a Recompor</p><p className={`font-semibold ${carRecord.legal_reserve_to_recover_hectares > 0 ? 'text-orange-600' : carRecord.legal_reserve_to_recover_hectares === 0 ? 'text-green-600' : 'text-gray-300'}`}>{carRecord.legal_reserve_to_recover_hectares != null ? `${carRecord.legal_reserve_to_recover_hectares} ha` : '—'}</p></div>
                      <div><p className="text-gray-500">APP a Recompor</p><p className={`font-semibold ${carRecord.app_to_recover_hectares > 0 ? 'text-orange-600' : carRecord.app_to_recover_hectares === 0 ? 'text-green-600' : 'text-gray-300'}`}>{carRecord.app_to_recover_hectares != null ? `${carRecord.app_to_recover_hectares} ha` : '—'}</p></div>
                      {carRecord.owner_name && <div><p className="text-gray-500">Proprietário</p><p className="font-semibold">{carRecord.owner_name}</p></div>}
                      {carRecord.registration_numbers && <div><p className="text-gray-500">Matrículas</p><p className="font-semibold">{carRecord.registration_numbers}</p></div>}
                      {carRecord.municipality && <div><p className="text-gray-500">Município/UF</p><p className="font-semibold">{carRecord.municipality}/{carRecord.state}</p></div>}
                      {carRecord.owner_cpf_cnpj && (
                        <div><p className="text-gray-500">CPF/CNPJ</p>
                        <p className="font-semibold font-mono text-sm">{carRecord.owner_cpf_cnpj}</p></div>
                      )}
                      {carRecord.last_rectification_date && (
                        <div><p className="text-gray-500">Última Retificação</p>
                        <p className="font-semibold">{new Date(carRecord.last_rectification_date).toLocaleDateString('pt-BR')}</p></div>
                      )}
                      {carRecord.registration_details && (
                        <div className="col-span-3">
                          <p className="text-gray-500 mb-1">Matrículas Detalhadas</p>
                          <p className="text-xs text-gray-700 whitespace-pre-line bg-gray-50 p-2 rounded border">{carRecord.registration_details}</p>
                        </div>
                      )}
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

                  {carRecord.ai_analysis && (
                    <div className="rounded-xl overflow-hidden border border-purple-200">
                      <div className="flex items-center gap-2 px-4 py-3 bg-purple-600">
                        <Sparkles className="w-4 h-4 text-white flex-shrink-0" />
                        <span className="text-xs font-bold text-white uppercase tracking-wide">Análise Técnica Ambiental (IA)</span>
                      </div>
                      <div className="p-4 bg-purple-50">
                        <p className="text-xs text-purple-900 leading-relaxed">{carRecord.ai_analysis}</p>
                      </div>
                    </div>
                  )}

                  {(carRecord.environmental_liabilities?.length > 0 || (passivofinal !== null && !isNaN(passivofinal) && passivofinal < 0) || carRecord.legal_reserve_to_recover_hectares > 0 || carRecord.app_to_recover_hectares > 0 || carRecord.use_restriction_to_recover_hectares > 0) && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span className="text-xs font-semibold text-orange-800">Passivos Ambientais</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(carRecord.environmental_liabilities || [])
                          .filter(l => !['Déficit de Reserva Legal', 'RL Declarada Inconsistente', 'Déficit de APP', 'Uso Restrito Inconsistente'].includes(l))
                          .map(l => <Badge key={l} className="bg-orange-100 text-orange-800 border border-orange-200 text-xs">{l}</Badge>)
                        }
                        {passivofinal !== null && !isNaN(passivofinal) && passivofinal < 0 && (
                          <Badge className="bg-red-100 text-red-800 border border-red-200 text-xs">Déficit de RL: {Math.abs(passivofinal).toFixed(2).replace('.', ',')} ha</Badge>
                        )}
                        {carRecord.legal_reserve_to_recover_hectares > 0 && <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-xs">RL Declarada Inconsistente: {parseFloat(carRecord.legal_reserve_to_recover_hectares).toFixed(2).replace('.', ',')} ha</Badge>}
                        {carRecord.app_to_recover_hectares > 0 && <Badge className="bg-red-100 text-red-800 border border-red-200 text-xs">Déficit de APP: {parseFloat(carRecord.app_to_recover_hectares).toFixed(2).replace('.', ',')} ha</Badge>}
                        {carRecord.use_restriction_to_recover_hectares > 0 && <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs">Uso Restrito Inconsistente: {parseFloat(carRecord.use_restriction_to_recover_hectares).toFixed(2).replace('.', ',')} ha</Badge>}
                      </div>
                      {passivofinal !== null && !isNaN(passivofinal) && passivofinal < 0 && (
                        <div className="grid grid-cols-1 gap-2 mb-2">
                          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                            <p className="text-[10px] text-gray-500 mb-0.5">Déficit de Declaração de RL</p>
                            <p className="text-lg font-bold text-red-600">{Math.abs(passivofinal).toFixed(2).replace('.', ',')} ha</p>
                            <p className="text-[10px] text-red-400 mt-0.5">
                              RL exigida por lei (20%) − RL declarada = falta declarar esta área
                            </p>
                          </div>
                        </div>
                      )}
                      {passivofinal !== null && !isNaN(passivofinal) && passivofinal > 0 && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200 mb-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">Excedente de RL Declarada</p>
                          <p className="text-lg font-bold text-green-600">+{passivofinal.toFixed(2).replace('.', ',')} ha</p>
                          <p className="text-[10px] text-green-400 mt-0.5">RL declarada supera o mínimo legal exigido</p>
                        </div>
                      )}
                      {(carRecord.legal_reserve_to_recover_hectares > 0 || carRecord.app_to_recover_hectares > 0 || carRecord.use_restriction_to_recover_hectares > 0) && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {carRecord.legal_reserve_to_recover_hectares > 0 && (
                            <div className="bg-white rounded-lg p-2 border border-orange-100 text-center">
                              <p className="text-[10px] text-gray-500">RL a Recompor</p>
                              <p className="text-sm font-bold text-orange-600">{carRecord.legal_reserve_to_recover_hectares} ha</p>
                            </div>
                          )}
                          {carRecord.app_to_recover_hectares > 0 && (
                            <div className="bg-white rounded-lg p-2 border border-orange-100 text-center">
                              <p className="text-[10px] text-gray-500">APP a Recompor</p>
                              <p className="text-sm font-bold text-orange-600">{carRecord.app_to_recover_hectares} ha</p>
                            </div>
                          )}
                          {carRecord.use_restriction_to_recover_hectares > 0 && (
                            <div className="bg-white rounded-lg p-2 border border-orange-100 text-center">
                              <p className="text-[10px] text-gray-500">Uso Restrito a Recompor</p>
                              <p className="text-sm font-bold text-orange-600">{carRecord.use_restriction_to_recover_hectares} ha</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <CARDocuments
                    carRecord={carRecord}
                    onUpdate={(data) => updateMapLayers.mutate(data)}
                    canEdit={canEdit}
                  />

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
                    onPropertyUpdate={() => {
                      queryClient.invalidateQueries(['properties', effectiveEmail, userType]);
                    }}
                  />
                </TabsContent>
              </Tabs>
              </CardContent>
            </Card>
          </div>
        );
      })()}

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

          {/* Smart Upload (criação ou edição) */}
          {showSmartUpload ? (
            <CARSmartUpload
              onDataExtracted={(data) => {
                setPrefillData(data);
                setShowSmartUpload(false);
              }}
              onClose={() => setShowSmartUpload(false)}
            />
          ) : (
            <>
              {/* Botão de IA — sempre disponível */}
              {!prefillData && (
                <div className="mb-2 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                    onClick={() => setShowSmartUpload(true)}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {editingCarId ? 'Atualizar campos com PDF' : 'Preencher com PDF do CAR'}
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
                key={editingCarId || (prefillData ? 'prefill' : 'new')}
                initial={(() => {
                  const base = editingCarId ? (carRecords.find(c => c.id === editingCarId) || {}) : {};
                  if (!cleanedPrefillData) return base;
                  // Mescla: prefill preenche campos nulos/vazios do registro existente
                  const merged = { ...base };
                  Object.entries(cleanedPrefillData).forEach(([k, v]) => {
                    if (k.startsWith('_')) return;
                    if (v != null && v !== '' && (merged[k] == null || merged[k] === '')) {
                      merged[k] = v;
                    }
                  });
                  return merged;
                })()}
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
                aiAnalysis={prefillData?.ai_analysis || undefined}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}