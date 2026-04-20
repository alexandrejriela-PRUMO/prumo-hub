import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PropertyCard from '../components/dashboard/PropertyCard';
import QuickActions from '../components/dashboard/QuickActions';
import LicenseAlerts from '../components/dashboard/LicenseAlerts';

import BlogPreview from '../components/dashboard/BlogPreview';
import RegularityThermometer from '../components/dashboard/RegularityThermometer';
import EnvironmentalAlerts from '../components/dashboard/EnvironmentalAlerts';
import DashboardMetrics from '../components/dashboard/DashboardMetrics';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import DashboardFilters from '../components/dashboard/DashboardFilters';
import DashboardFullExport from '../components/dashboard/DashboardFullExport';
import RuteAIChat from '../components/dashboard/RuteAIChat';

import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MapPin, BarChart3, Briefcase, CheckCircle2, TrendingUp, Clock, Users, MessageSquare } from 'lucide-react';
import { subDays, isAfter, isBefore } from 'date-fns';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import ConsultorOverview from '../components/dashboard/ConsultorOverview';
import PullToRefresh from '../components/mobile/PullToRefresh';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, effectiveEmail, isEquipe, isConsultor: isConsultorHook, isLoading: effectiveLoading } = useEffectiveUser();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [ruteChatOpen, setRuteChatOpen] = useState(false);
  const [filters, setFilters] = useState({
    period: 'all',
    licenseStatus: 'all',
    alertSeverity: 'all',
    processStatus: 'all',
    startDate: null,
    endDate: null
  });
  const urlParams = new URLSearchParams(window.location.search);
  const propertyIdFromUrl = urlParams.get('property_id');

  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ['properties', effectiveEmail, isEquipe, isConsultorHook],
    queryFn: () => {
      if (isConsultorHook || isEquipe) {
        return base44.entities.Property.filter({ consultor_email: effectiveEmail });
      }
      return base44.entities.Property.filter({ owner_email: effectiveEmail });
    },
    enabled: !!effectiveEmail && !effectiveLoading,
    initialData: []
  });

  const { data: licenses = [], isLoading: loadingLicenses } = useQuery({
    queryKey: ['licenses', effectiveEmail],
    queryFn: () => base44.entities.License.filter({ owner_email: effectiveEmail }),
    enabled: !!effectiveEmail && !effectiveLoading,
    initialData: []
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', user?.email],
    queryFn: () => base44.entities.Invoice.filter({ client_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: documents = [], isLoading: loadingDocuments } = useQuery({
    queryKey: ['documents', effectiveEmail],
    queryFn: () => base44.entities.Document.filter({ owner_email: effectiveEmail }),
    enabled: !!effectiveEmail && !effectiveLoading,
    initialData: []
  });

  const { data: processes = [], isLoading: loadingProcesses } = useQuery({
    queryKey: ['processes', effectiveEmail],
    queryFn: () => base44.entities.Process.filter({ client_email: effectiveEmail }),
    enabled: !!effectiveEmail && !effectiveLoading,
    initialData: []
  });

  const { data: georeferencing = [] } = useQuery({
    queryKey: ['georeferencing', selectedPropertyId],
    queryFn: () => base44.entities.Georeferencing.filter({ property_id: selectedPropertyId }),
    enabled: !!selectedPropertyId,
    initialData: []
  });

  const { data: prads = [] } = useQuery({
    queryKey: ['prads', selectedPropertyId],
    queryFn: () => base44.entities.PRAD.filter({ property_id: selectedPropertyId }),
    enabled: !!selectedPropertyId,
    initialData: []
  });

  const { data: carManagements = [] } = useQuery({
    queryKey: ['carManagements', selectedPropertyId],
    queryFn: () => base44.entities.CARManagement.filter({ property_id: selectedPropertyId }),
    enabled: !!selectedPropertyId,
    initialData: []
  });

  const { data: environmentalAlerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['environmental-alerts'],
    queryFn: () => base44.entities.EnvironmentalAlert.list(),
    enabled: true,
    initialData: []
  });

  const isLoading = effectiveLoading || loadingProperties || loadingLicenses || loadingInvoices || loadingDocuments || loadingProcesses || loadingAlerts;

  // Auto-select first property when properties load
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  // Se vem com property_id da URL, usa esse; senão, auto-seleciona o primeiro
  useEffect(() => {
    if (propertyIdFromUrl) {
      setSelectedPropertyId(propertyIdFromUrl);
    } else if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, propertyIdFromUrl, selectedPropertyId]);

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) || properties[0];
  const isConsultor = isConsultorHook || isEquipe;
  const isDashboardView = !!propertyIdFromUrl; // Se tem property_id na URL, é o dashboard detalhado
  
  // Apply filters
  const filteredData = useMemo(() => {
    let filteredLicenses = licenses.filter(l => l.property_id === selectedPropertyId);
    let filteredDocuments = documents.filter(d => d.property_id === selectedPropertyId);
    let filteredAlerts = environmentalAlerts.filter(a => a.property_id === selectedPropertyId);
    let filteredProcesses = processes.filter(p => p.property_id === selectedPropertyId);

    // Date filter
    if (filters.period !== 'all') {
      const now = new Date();
      let startDate = null;

      if (filters.period === '7days') startDate = subDays(now, 7);
      else if (filters.period === '30days') startDate = subDays(now, 30);
      else if (filters.period === '90days') startDate = subDays(now, 90);
      else if (filters.period === 'year') startDate = subDays(now, 365);
      else if (filters.period === 'custom' && filters.startDate && filters.endDate) {
        filteredLicenses = filteredLicenses.filter(l => {
          const date = new Date(l.created_date || l.issue_date);
          return isAfter(date, filters.startDate) && isBefore(date, filters.endDate);
        });
        filteredAlerts = filteredAlerts.filter(a => {
          const date = new Date(a.detection_date);
          return isAfter(date, filters.startDate) && isBefore(date, filters.endDate);
        });
      }

      if (startDate) {
        filteredLicenses = filteredLicenses.filter(l => {
          const date = new Date(l.created_date || l.issue_date);
          return isAfter(date, startDate);
        });
        filteredAlerts = filteredAlerts.filter(a => {
          const date = new Date(a.detection_date);
          return isAfter(date, startDate);
        });
      }
    }

    // Status filters
    if (filters.licenseStatus !== 'all') {
      filteredLicenses = filteredLicenses.filter(l => l.status === filters.licenseStatus);
    }

    if (filters.alertSeverity !== 'all') {
      filteredAlerts = filteredAlerts.filter(a => a.severity === filters.alertSeverity);
    }

    if (filters.processStatus !== 'all') {
      filteredProcesses = filteredProcesses.filter(p => p.status === filters.processStatus);
    }

    return {
      licenses: filteredLicenses,
      documents: filteredDocuments,
      alerts: filteredAlerts,
      processes: filteredProcesses
    };
  }, [licenses, documents, environmentalAlerts, processes, selectedPropertyId, filters]);

  const handleResetFilters = () => {
    setFilters({
      period: 'all',
      licenseStatus: 'all',
      alertSeverity: 'all',
      processStatus: 'all',
      startDate: null,
      endDate: null
    });
  };

  // Redireciona client_consultor para o portal dedicado
  useEffect(() => {
    if (user?.user_type === 'client_consultor') {
      navigate(createPageUrl('ClientConsultorPortal'));
    }
  }, [user]);

  // Se é consultor/equipe E está na view de overview (sem property_id), mostra painel de consultoria
  if ((isConsultorHook || isEquipe) && !isDashboardView) {
    return <ConsultorOverview user={user} properties={properties} isLoading={isLoading} />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* Header with back button if viewing specific property */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
         <div className="flex items-center gap-3 flex-1 min-w-0">
           {isDashboardView && (
             <button
               onClick={() => navigate(createPageUrl('Home'))}
               className="p-2 hover:bg-emerald-100/50 rounded-xl transition-all duration-300 hover:text-emerald-700 flex-shrink-0"
             >
               <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
               </svg>
             </button>
           )}
           <div className="min-w-0">
             <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 bg-clip-text text-transparent break-words">
               Olá, {user?.full_name?.split(' ')[0] || 'Cliente'}! 👋
             </h1>
             <p className="text-gray-500 mt-2 text-xs sm:text-sm lg:text-base break-words">{user?.user_type === 'produtor' ? 'Seja bem-vindo ao PRUMO Hub. O seu software inteligente para gestão da propriedade, empresas e dados ambientais' : 'Bem-vindo ao PRUMO Hub - Consultoria Ambiental'}</p>
           </div>
         </div>
         <div />
       </div>

      {/* Property Selector */}
      {properties.length > 1 && (
      <div className="flex flex-col gap-3 p-3 sm:p-5 bg-gradient-to-r from-white to-emerald-50/40 rounded-xl border border-emerald-100/60 shadow-sm hover:shadow-md transition-all duration-300 hover:border-emerald-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 bg-emerald-100/60 rounded-lg flex-shrink-0">
              <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-700" />
            </div>
            <span className="text-gray-700 font-semibold text-sm truncate">
              Propriedade
            </span>
          </div>
          <Select value={selectedPropertyId || ''} onValueChange={setSelectedPropertyId} disabled={loadingProperties}>
            <SelectTrigger className="w-full bg-white border-emerald-200 text-xs sm:text-sm font-medium hover:border-emerald-300 transition-colors">
              <SelectValue placeholder="Selecione uma propriedade" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((prop) =>
            <SelectItem key={prop.id} value={prop.id}>
                  <span className="font-medium truncate">{prop.property_name}</span> <span className="text-gray-500 text-xs">({prop.city}/{prop.state})</span>
                </SelectItem>
            )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Property Card */}
      {isLoading ?
       <Skeleton className="h-64 rounded-2xl" /> :
       <PropertyCard property={selectedProperty} />
      }

      {/* Quick Actions */}
      <QuickActions userType={user?.user_type} />

      {/* Consultoria e Requerimentos - Para Produtores */}
      {!isConsultor && user?.user_type === 'produtor' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Consultoria Card */}
          <div className="group relative bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 border-2 border-emerald-200 rounded-2xl p-6 sm:p-8 hover:shadow-2xl hover:border-emerald-400 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-200 to-emerald-100 rounded-full -mr-12 -mt-12 opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-emerald-900">Consultoria Especializada</h3>
                  <p className="text-emerald-600 text-xs font-semibold">Orientação de Especialistas</p>
                </div>
              </div>
              <p className="text-gray-700 text-sm sm:text-base mb-6 leading-relaxed">
                Acesse consultores ambientais certificados para orientação sobre regularização ambiental, licenciamento e sustentabilidade da sua propriedade.
              </p>
              <div className="space-y-3 mb-6">
                {[
                  { icon: CheckCircle2, text: 'Análise completa da propriedade' },
                  { icon: TrendingUp, text: 'Otimização de processos' },
                  { icon: Users, text: 'Consultores especializados' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
              <Button onClick={() => navigate(createPageUrl('Requests'))} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold group/btn">
                <MessageSquare className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                Solicitar Consultoria
              </Button>
            </div>
          </div>

          {/* Requerimentos Card */}
          <div className="group relative bg-gradient-to-br from-amber-50 via-white to-amber-50/30 border-2 border-amber-200 rounded-2xl p-6 sm:p-8 hover:shadow-2xl hover:border-amber-400 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-200 to-amber-100 rounded-full -mr-12 -mt-12 opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-amber-900">Requerimentos Processados</h3>
                  <p className="text-amber-600 text-xs font-semibold">Acompanhamento em Tempo Real</p>
                </div>
              </div>
              <p className="text-gray-700 text-sm sm:text-base mb-6 leading-relaxed">
                Monitore o status de todos os seus requerimentos ambientais, licenças e autorizações em um único lugar. Notificações automáticas de atualizações.
              </p>
              <div className="space-y-3 mb-6">
                {[
                  { icon: Clock, text: 'Acompanhamento 24/7' },
                  { icon: TrendingUp, text: 'Status em tempo real' },
                  { icon: CheckCircle2, text: 'Documentação organizada' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
              <Button onClick={() => navigate(createPageUrl('Requests'))} className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold group/btn">
                <TrendingUp className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                Ver Requerimentos
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs for Overview and Analytics */}
      <Tabs defaultValue="overview" className="space-y-6 mt-8">
        <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-emerald-50 to-emerald-50 border border-emerald-100 rounded-lg p-1">
          <TabsTrigger value="overview" className="rounded-md transition-all duration-300 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-700 text-xs sm:text-sm">Visão Geral</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 rounded-md transition-all duration-300 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-700 text-xs sm:text-sm">
            <BarChart3 className="w-3 sm:w-4 h-3 sm:h-4" />
            <span className="hidden sm:inline">Análises</span>
            <span className="sm:hidden">Análise</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-8">
          {/* Licenças Ambientais */}
          {isLoading ? (
            <Skeleton className="h-80 rounded-xl" />
          ) : (
            <LicenseAlerts licenses={licenses} />
          )}

          {/* Processos e Alertas de Infrações */}
          <div className="grid lg:grid-cols-2 gap-6">
            {!isLoading && (
              <>
                <EnvironmentalAlerts alerts={filteredData.alerts} />
                {/* Processos count placeholder - pode adicionar componente específico */}
              </>
            )}
          </div>

          {/* Termômetro de Regularidade */}
          {!isLoading && selectedProperty && (
            <RegularityThermometer 
              property={selectedProperty}
              licenses={filteredData.licenses}
              documents={filteredData.documents}
              processes={filteredData.processes}
              georeferencing={georeferencing}
              prads={prads}
              carManagements={carManagements}
            />
          )}

          {/* Blog Preview */}
          <BlogPreview />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-8">
          {/* Advanced Filters */}
          {!isLoading && (
            <DashboardFilters 
              filters={filters}
              onFiltersChange={setFilters}
              onReset={handleResetFilters}
            />
          )}

          {/* Dashboard Metrics */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ) : (
            <DashboardMetrics
              licenses={filteredData.licenses}
              documents={filteredData.documents}
              processes={filteredData.processes}
              alerts={filteredData.alerts}
            />
          )}

          {/* Dashboard Charts */}
          {isLoading ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <Skeleton className="h-80 rounded-xl" />
              <Skeleton className="h-80 rounded-xl" />
            </div>
          ) : (
            <DashboardCharts
              licenses={filteredData.licenses}
              processes={filteredData.processes}
              alerts={filteredData.alerts}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Full Export Section */}
      {!isLoading && (
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-emerald-100/50">
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">Exportar Dados</h2>
            <p className="text-gray-600 text-xs sm:text-sm lg:text-base break-words">Baixe um relatório completo com suas informações em PDF ou Excel</p>
          </div>
          <DashboardFullExport user={user} />
        </div>
      )}

      {/* Botão flutuante Rute */}
      <button
        onClick={() => setRuteChatOpen(true)}
        title="RUTE - Assistente Virtual"
        style={{ position: 'fixed', bottom: '6rem', right: '1.25rem', zIndex: 9999 }}
        className="lg:bottom-8 lg:right-8 flex items-center gap-3 bg-white border border-amber-200 shadow-xl rounded-2xl px-4 py-3 hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md flex-shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.4)"/>
          </svg>
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-bold text-gray-900 leading-tight">RUTE</p>
          <p className="text-xs text-amber-600 leading-tight">Assistente Virtual</p>
        </div>
      </button>

      {/* Rute AI Chat Modal */}
      <RuteAIChat 
        user={user} 
        property={selectedProperty} 
        isOpen={ruteChatOpen} 
        onClose={() => setRuteChatOpen(false)}
      />
      </div>
      </PullToRefresh>
      );
      }