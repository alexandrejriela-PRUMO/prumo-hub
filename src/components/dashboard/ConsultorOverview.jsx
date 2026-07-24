import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, TrendingUp, Building2, BarChart3, Sparkles, X } from 'lucide-react';
import RuteAIChat from './RuteAIChat';
import GrowthRingCard from './GrowthRingCard';
import ManualRegularityDialog from './ManualRegularityDialog';

const fetchRecords = (entity_name, field_name, email_field) =>
  base44.functions.invoke('listConsultorPropertyRecords', { entity_name, field_name, email_field })
    .then(r => r.data?.records || []);

export default function ConsultorOverview({ user, properties, isLoading }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [ruteChatOpen, setRuteChatOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [manualDialogProperty, setManualDialogProperty] = useState(null);

  const enabled = !!user?.email;

  const { data: licenses = [] } = useQuery({
    queryKey: ['licenses-overview', user?.email],
    queryFn: () => fetchRecords('License', 'property_id'),
    enabled,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts-overview', user?.email],
    queryFn: () => fetchRecords('EnvironmentalAlert', 'property_id'),
    enabled,
  });

  const { data: allDocuments = [] } = useQuery({
    queryKey: ['documents-overview', user?.email],
    queryFn: async () => {
      const [docs, unified] = await Promise.all([
        fetchRecords('Document', 'property_id', 'owner_email'),
        fetchRecords('UnifiedDocument', 'entity_id'),
      ]);
      const seen = new Set();
      return [...docs, ...unified].filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });
    },
    enabled,
  });

  const { data: allGeo = [] } = useQuery({
    queryKey: ['geo-overview', user?.email],
    queryFn: () => fetchRecords('Georeferencing', 'property_id'),
    enabled,
  });

  const { data: allProcesses = [] } = useQuery({
    queryKey: ['processes-overview', user?.email],
    queryFn: () => fetchRecords('Process', 'property_id', 'client_email'),
    enabled,
  });

  const { data: allPrads = [] } = useQuery({
    queryKey: ['prads-overview', user?.email],
    queryFn: () => fetchRecords('PRAD', 'property_id'),
    enabled,
  });

  // Calcula regularidade usando a mesma lógica do termômetro
  const calcRegularity = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    if (property?.manual_regularity_enabled) {
      if (property.manual_regularity_status === 'conforme') return 100;
      if (property.manual_regularity_status === 'attention') return 55;
      return 20;
    }
    let score = 0;

    // Licenças (35 pts)
    const propLicenses = licenses.filter(l => l.property_id === propertyId);
    if (propLicenses.length === 0) {
      score += 0;
    } else {
      const now = new Date();
      const expired = propLicenses.filter(l => !l.expiry_date || new Date(l.expiry_date) <= now);
      const expiringSoon = propLicenses.filter(l => {
        if (!l.expiry_date) return false;
        const days = Math.floor((new Date(l.expiry_date) - now) / (1000 * 60 * 60 * 24));
        return days > 0 && days <= 30;
      });
      if (expired.length === 0 && expiringSoon.length === 0) score += 35;
      else if (expired.length === 0) score += 22;
      else score += 10;
    }

    // Documentos (25 pts)
    const prop = properties.find(p => p.id === propertyId);
    const propDocs = allDocuments.filter(d => d.property_id === propertyId || d.entity_id === propertyId || (prop?.owner_email && d.owner_email === prop.owner_email));
    const hasCAR = propDocs.some(d => d.document_type === 'CAR');
    const hasCCIR = propDocs.some(d => d.document_type === 'CCIR');
    const hasGeoDoc = propDocs.some(d => d.document_type === 'Georreferenciamento');
    if (hasCAR) score += 10;
    if (hasCCIR) score += 8;
    if (hasGeoDoc) score += 7;

    // Georreferenciamento (15 pts)
    const propGeo = allGeo.filter(g => g.property_id === propertyId);
    const regularGeo = propGeo.find(g => g.status === 'Regular');
    if (regularGeo) score += 15;
    else if (propGeo.length > 0) score += 10;
    else if (property?.coordinates) score += 15;

    // Processos (10 pts)
    const propForProc = properties.find(p => p.id === propertyId);
    const propProcesses = allProcesses.filter(p => p.property_id === propertyId || (propForProc?.owner_email && p.client_email === propForProc.owner_email));
    const activeProcesses = propProcesses.filter(p => p.status === 'Em Andamento');
    if (activeProcesses.length === 0) score += 10;
    else score += 4;

    // Alertas de Infrações (15 pts)
    const propAlerts = alerts.filter(a => a.property_id === propertyId && (a.status === 'Aberto' || a.status === 'Em Análise'));
    const criticalAlerts2 = propAlerts.filter(a => a.severity === 'Crítica' || a.severity === 'Alta');
    if (propAlerts.length === 0) score += 15;
    else if (criticalAlerts2.length > 0) score += 0;
    else score += 8;

    return score;
  };

  // Conta alertas por propriedade
  const countAlertsByProperty = (propertyId, severity) => {
    return alerts.filter(a => a.property_id === propertyId && (severity ? a.severity === severity : true)).length;
  };

  // Categoriza propriedades por status
  const getPropertyStatus = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    if (property?.manual_regularity_enabled) {
      if (property.manual_regularity_status === 'conforme') return 'normal';
      if (property.manual_regularity_status === 'attention') return 'attention';
      return 'critical';
    }
    const regularity = calcRegularity(propertyId);
    const criticalAlerts = countAlertsByProperty(propertyId, 'Crítica');
    const highAlerts = countAlertsByProperty(propertyId, 'Alta');

    if (criticalAlerts > 0 || regularity < 30) return 'critical';
    if (highAlerts > 0 || regularity < 60) return 'attention';
    return 'normal';
  };

  // Filter out client-only records without properties
  const propertiesWithClients = useMemo(() => properties.filter(p => p && !p.is_client_only), [properties]);

  // Memoize per-property computed metrics to avoid recalculating on every render
  const propertyMetrics = useMemo(() => {
    return propertiesWithClients.map(property => {
      const status = getPropertyStatus(property.id);
      const regularity = calcRegularity(property.id);
      const totalAlerts = countAlertsByProperty(property.id);
      const propLicensesArr = licenses.filter(l => l.property_id === property.id);
      const licensesValid = propLicensesArr.filter(l => l.status === 'Vigente' && (!l.expiry_date || new Date(l.expiry_date) > new Date())).length;
      const propDocs = allDocuments.filter(d => d.property_id === property.id || d.entity_id === property.id || (property.owner_email && d.owner_email === property.owner_email)).length;
      const propProcessesArr = allProcesses.filter(p => p.property_id === property.id || (property.owner_email && p.client_email === property.owner_email));
      const openProcesses = propProcessesArr.filter(p => p.status === 'Em Andamento').length;
      const propPradsCount = allPrads.filter(p => p.property_id === property.id).length;
      return { property, status, regularity, totalAlerts, licensesValid, licensesTotal: propLicensesArr.length, propDocs, openProcesses, propPradsCount };
    });
  }, [propertiesWithClients, licenses, alerts, allDocuments, allProcesses, allPrads, allGeo]);

  const criticalCount = propertyMetrics.filter(m => m.status === 'critical').length;
  const attentionCount = propertyMetrics.filter(m => m.status === 'attention').length;
  const avgRegularity = propertyMetrics.length > 0
    ? Math.round(propertyMetrics.reduce((acc, m) => acc + m.regularity, 0) / propertyMetrics.length)
    : 0;

  const filteredProperties = filterStatus === 'all'
    ? propertyMetrics
    : propertyMetrics.filter(m => m.status === filterStatus);

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-64 rounded-xl" /></div>;
  }

  const filterLabels = {
    all: 'Todas',
    critical: 'Críticas',
    attention: 'Em Atenção',
    normal: 'Normais',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Olá, {user?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Resumo da carteira de clientes
          </p>
        </div>
        <button
          onClick={() => setRuteChatOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 group hover:scale-105 flex-shrink-0"
          title="Consultar com IA Rute"
        >
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform flex-shrink-0">
            <circle cx="50" cy="50" r="45" fill="white" opacity="0.2" stroke="white" strokeWidth="2"/>
            <path d="M50 20C35 20 25 30 25 50C25 70 50 85 50 85C50 85 75 70 75 50C75 30 65 20 50 20Z" fill="white"/>
            <circle cx="50" cy="50" r="8" fill="#10b981"/>
          </svg>
          <div className="text-left">
            <span className="text-sm font-semibold block leading-tight">IA Rute</span>
            <span className="text-[10px] text-emerald-100 leading-tight block">Assistente Virtual</span>
          </div>
        </button>
      </div>

      {/* Rute AI Chat Modal */}
      <RuteAIChat
        user={user}
        property={propertiesWithClients[0]}
        isOpen={ruteChatOpen}
        onClose={() => setRuteChatOpen(false)}
      />

      {/* Summary Cards - Clickable Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total */}
        <button
          onClick={() => setFilterStatus('all')}
          className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 ${
            filterStatus === 'all'
              ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-xl shadow-emerald-500/30 ring-2 ring-emerald-400 scale-[1.02]'
              : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-lg'
          }`}
        >
          <div className={`p-2 rounded-xl mb-2 inline-flex ${filterStatus === 'all' ? 'bg-white/20' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
            <Building2 className={`w-4 h-4 sm:w-5 sm:h-5 ${filterStatus === 'all' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${filterStatus === 'all' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{propertiesWithClients.length}</p>
          <p className={`text-[10px] sm:text-xs font-medium mt-0.5 ${filterStatus === 'all' ? 'text-emerald-100' : 'text-gray-500 dark:text-gray-400'}`}>Total de Propriedades</p>
        </button>

        {/* Critical */}
        <button
          onClick={() => setFilterStatus(filterStatus === 'critical' ? 'all' : 'critical')}
          className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 ${
            filterStatus === 'critical'
              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-xl shadow-red-500/30 ring-2 ring-red-400 scale-[1.02]'
              : 'bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-800 hover:shadow-lg'
          }`}
        >
          <div className={`p-2 rounded-xl mb-2 inline-flex ${filterStatus === 'critical' ? 'bg-white/20' : 'bg-red-100 dark:bg-red-900/40'}`}>
            <AlertTriangle className={`w-4 h-4 sm:w-5 sm:h-5 ${filterStatus === 'critical' ? 'text-white' : 'text-red-600 dark:text-red-400'}`} />
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${filterStatus === 'critical' ? 'text-white' : 'text-red-700 dark:text-red-400'}`}>{criticalCount}</p>
          <p className={`text-[10px] sm:text-xs font-medium mt-0.5 ${filterStatus === 'critical' ? 'text-red-100' : 'text-red-700 dark:text-red-400'}`}>Alerta Crítico</p>
        </button>

        {/* Attention */}
        <button
          onClick={() => setFilterStatus(filterStatus === 'attention' ? 'all' : 'attention')}
          className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 ${
            filterStatus === 'attention'
              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl shadow-amber-500/30 ring-2 ring-amber-400 scale-[1.02]'
              : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 hover:border-amber-300 dark:hover:border-amber-800 hover:shadow-lg'
          }`}
        >
          <div className={`p-2 rounded-xl mb-2 inline-flex ${filterStatus === 'attention' ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-900/40'}`}>
            <TrendingUp className={`w-4 h-4 sm:w-5 sm:h-5 ${filterStatus === 'attention' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${filterStatus === 'attention' ? 'text-white' : 'text-amber-700 dark:text-amber-400'}`}>{attentionCount}</p>
          <p className={`text-[10px] sm:text-xs font-medium mt-0.5 ${filterStatus === 'attention' ? 'text-amber-100' : 'text-amber-700 dark:text-amber-400'}`}>Em Atenção</p>
        </button>

        {/* Regularity - info card */}
        <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-800 to-slate-900 text-white border border-slate-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          <div className="p-2 rounded-xl mb-2 inline-flex bg-white/10">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{avgRegularity}%</p>
          <p className="text-[10px] sm:text-xs font-medium mt-0.5 text-slate-400">Regularidade Média</p>
        </div>
      </div>

      {/* Active Filter Banner */}
      {filterStatus !== 'all' && (
        <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
              Filtrando: <strong>{filterLabels[filterStatus]}</strong> ({filteredProperties.length} {filteredProperties.length === 1 ? 'propriedade' : 'propriedades'})
            </span>
          </div>
          <button
            onClick={() => setFilterStatus('all')}
            className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            Limpar
          </button>
        </div>
      )}

      {/* Properties Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Propriedades e Empreendimentos</h2>
          {filterStatus === 'all' && (
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{filteredProperties.length} {filteredProperties.length === 1 ? 'item' : 'itens'}</span>
          )}
        </div>

        {filteredProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {filterStatus !== 'all' ? `Nenhuma propriedade com status "${filterLabels[filterStatus]}"` : 'Nenhuma propriedade cadastrada'}
            </p>
            {filterStatus !== 'all' && (
              <button
                onClick={() => setFilterStatus('all')}
                className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Ver todas as propriedades
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredProperties.map((m) => (
              <GrowthRingCard
                key={m.property.id}
                property={m.property}
                status={m.status}
                regularity={m.regularity}
                alerts={m.totalAlerts}
                processes={m.openProcesses}
                licensesValid={m.licensesValid}
                licensesTotal={m.licensesTotal}
                documents={m.propDocs}
                prads={m.propPradsCount}
                onClick={() => navigate(`${createPageUrl('Home')}?property_id=${m.property.id}`)}
                onManualReview={() => setManualDialogProperty(m.property)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Manual Regularity Dialog */}
      <ManualRegularityDialog
        property={manualDialogProperty}
        user={user}
        isOpen={!!manualDialogProperty}
        onClose={() => setManualDialogProperty(null)}
        onSaved={() => queryClient.invalidateQueries()}
      />
    </div>
  );
}