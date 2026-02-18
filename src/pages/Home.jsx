import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PropertyCard from '../components/dashboard/PropertyCard';
import QuickActions from '../components/dashboard/QuickActions';
import LicenseAlerts from '../components/dashboard/LicenseAlerts';
import InvoicesSummary from '../components/dashboard/InvoicesSummary';
import BlogPreview from '../components/dashboard/BlogPreview';
import RegularityThermometer from '../components/dashboard/RegularityThermometer';
import EnvironmentalAlerts from '../components/dashboard/EnvironmentalAlerts';
import DashboardMetrics from '../components/dashboard/DashboardMetrics';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import DashboardFilters from '../components/dashboard/DashboardFilters';
import DashboardFullExport from '../components/dashboard/DashboardFullExport';
import ConsultorPanel from '../components/consultor/ConsultorPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MapPin, BarChart3, ChevronLeft } from 'lucide-react';
import { subDays, isAfter, isBefore } from 'date-fns';

export default function Home() {
  const [user, setUser] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [consultorMode, setConsultorMode] = useState('panel'); // 'panel' | 'property'
  const [filters, setFilters] = useState({
    period: 'all',
    licenseStatus: 'all',
    alertSeverity: 'all',
    processStatus: 'all',
    startDate: null,
    endDate: null
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);

  const isConsultor = user?.user_type === 'consultor';

  const { data: properties, isLoading: loadingProperties } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => isConsultor
      ? base44.entities.Property.filter({ consultor_email: user.email })
      : base44.entities.Property.filter({ owner_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: licenses, isLoading: loadingLicenses } = useQuery({
    queryKey: ['licenses', user?.email],
    queryFn: () => base44.entities.License.filter({ owner_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', user?.email],
    queryFn: () => base44.entities.Invoice.filter({ client_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: documents, isLoading: loadingDocuments } = useQuery({
    queryKey: ['documents', user?.email],
    queryFn: () => base44.entities.Document.filter({ owner_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: processes, isLoading: loadingProcesses } = useQuery({
    queryKey: ['processes', user?.email],
    queryFn: () => base44.entities.Process.filter({ client_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: environmentalAlerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['environmental-alerts'],
    queryFn: () => base44.entities.EnvironmentalAlert.list(),
    enabled: true,
    initialData: []
  });

  const isLoading = loadingProperties || loadingLicenses || loadingInvoices || loadingDocuments || loadingProcesses || loadingAlerts;

  // Auto-select first property when properties load
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) || properties[0];
  
  // Apply filters
  const filteredData = useMemo(() => {
    let filteredLicenses = licenses.filter(l => l.property_id === selectedPropertyId);
    let filteredDocuments = documents.filter(d => d.property_id === selectedPropertyId);
    let filteredAlerts = environmentalAlerts.filter(a => a.property_id === selectedPropertyId);
    let filteredProcesses = [...processes];

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

  // Consultor: show panel initially
  if (isConsultor && consultorMode === 'panel') {
    return (
      <ConsultorPanel
        user={user}
        onEnterProperty={(property) => {
          setSelectedPropertyId(property.id);
          setConsultorMode('property');
        }}
      />
    );
  }

  return (
  <div className="max-w-7xl mx-auto space-y-8">
      {/* Header with Export */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          {isConsultor && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConsultorMode('panel')}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Painel
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Olá, {user?.full_name?.split(' ')[0] || 'Cliente'}! 👋
            </h1>
            <p className="text-gray-500 mt-1">Bem-vindo à sua área do cliente Santa Rute - Engenharia Rural</p>
          </div>
        </div>
      </div>

      {/* Property Selector */}
      {!isLoading && properties.length > 1 &&
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-gray-700 font-medium text-sm sm:text-base whitespace-nowrap">
              {selectedProperty?.property_type === 'urbano' ? 'Empreendimento:' : 'Propriedade:'}
            </span>
          </div>
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-full sm:w-72 bg-emerald-50 border-emerald-200 text-sm">
              <SelectValue placeholder="Selecione uma propriedade" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((prop) =>
            <SelectItem key={prop.id} value={prop.id}>
                  {prop.property_name} - {prop.city}/{prop.state}
                </SelectItem>
            )}
            </SelectContent>
          </Select>
        </div>
      }

      {/* Property Card */}
      {isLoading ?
      <Skeleton className="h-64 rounded-2xl" /> :
      <PropertyCard property={selectedProperty} isConsultor={isConsultor} />
      }

      {/* Quick Actions */}
      <QuickActions />

      {/* Tabs for Overview and Analytics */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Análises
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
            />
          )}

          {/* Faturas/Boletos */}
          {isLoading ? (
            <Skeleton className="h-80 rounded-xl" />
          ) : (
            <InvoicesSummary invoices={invoices} />
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
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Exportar Dados</h2>
            <p className="text-gray-600 text-sm">Baixe um relatório completo com todas as suas informações no sistema</p>
          </div>
          <DashboardFullExport user={user} />
        </div>
      )}
      </div>);

      }