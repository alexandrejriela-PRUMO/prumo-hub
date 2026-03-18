import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPageUrl } from './utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, FileText, MapPin, AlertTriangle, FileCheck, 
  Leaf, Map, Scale, TreePine, BarChart3, Plus, ChevronRight, MapPinIcon, ScrollText
} from 'lucide-react';
import PropertySelector from '@/components/properties/PropertySelector';
import DocumentsHub from './DocumentsHub';
import Licenses from './Licenses';
import CARModule from './CARModule';
import PropertyMapView from './PropertyMapView';
import Processes from './Processes';
import EnvironmentalAlerts from './EnvironmentalAlerts';
import RegularityReport from './RegularityReport';
import PRAD from './PRAD';
import Georeferencing from './Georeferencing';
import Contracts from './Contracts';

export default function PropertyCentral() {
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch properties
  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => base44.entities.Property.filter(
      { owner_email: user.email },
      '-created_date'
    ),
    enabled: !!user?.email,
  });

  // Set first property as default
  React.useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const selectedProperty = useMemo(
    () => properties.find(p => p.id === selectedPropertyId),
    [properties, selectedPropertyId]
  );

  // Fetch contracts count
  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', selectedPropertyId],
    queryFn: () => base44.entities.ClientContract.filter(
      { property_id: selectedPropertyId },
      '-created_date',
      5
    ),
    enabled: !!selectedPropertyId,
  });

  // Fetch documents count
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', selectedPropertyId],
    queryFn: () => base44.entities.UnifiedDocument.filter(
      { entity_id: selectedPropertyId },
      '-created_date',
      5
    ),
    enabled: !!selectedPropertyId,
  });

  // Fetch licenses count
  const { data: licenses = [] } = useQuery({
    queryKey: ['licenses', selectedPropertyId],
    queryFn: () => base44.entities.License.filter(
      { property_id: selectedPropertyId },
      '-created_date',
      5
    ),
    enabled: !!selectedPropertyId,
  });

  // Fetch alerts count
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', selectedPropertyId],
    queryFn: () => base44.entities.EnvironmentalAlert.filter(
      { property_id: selectedPropertyId },
      '-detection_date',
      5
    ),
    enabled: !!selectedPropertyId,
  });

  // Fetch PRAD count
  const { data: prads = [] } = useQuery({
    queryKey: ['prads', selectedPropertyId],
    queryFn: () => base44.entities.PRAD.filter(
      { property_id: selectedPropertyId },
      '-created_date',
      5
    ),
    enabled: !!selectedPropertyId,
  });

  if (propertiesLoading || !selectedProperty) {
    return (
      <div className="flex items-center justify-center w-full h-96">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">Central da Propriedade</h1>
          <p className="text-sm text-emerald-600 mt-1">Gerencie todos os dados, documentos e análises de sua propriedade em um só lugar</p>
        </div>
        <PropertySelector
          selectedPropertyId={selectedPropertyId}
          onPropertyChange={setSelectedPropertyId}
          properties={properties}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          icon={FileText}
          label="Documentos"
          value={documents.length}
          color="blue"
          onClick={() => setActiveTab('documentos')}
        />
        <StatCard
          icon={FileCheck}
          label="Licenças"
          value={licenses.length}
          color="purple"
          onClick={() => setActiveTab('licencas')}
        />
        <StatCard
          icon={ScrollText}
          label="Contratos"
          value={contracts.length}
          color="green"
          onClick={() => setActiveTab('contratos')}
        />
        <StatCard
          icon={AlertTriangle}
          label="Alertas"
          value={alerts.length}
          color="orange"
          onClick={() => setActiveTab('alertas')}
        />
        <StatCard
          icon={Leaf}
          label="PRAD"
          value={prads.length}
          color="emerald"
          onClick={() => setActiveTab('prad')}
        />
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-x-auto">
          <TabsList className="w-full justify-start bg-transparent border-b border-emerald-100 rounded-none h-auto p-0">
            <TabTrigger value="overview" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Visão Geral
            </TabTrigger>
            <TabTrigger value="mapa" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600">
              <Map className="w-4 h-4 mr-2" />
              Mapa
            </TabTrigger>
            <TabTrigger value="documentos" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600">
              <FileText className="w-4 h-4 mr-2" />
              Documentos
            </TabTrigger>
            <TabTrigger value="licencas" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600">
              <FileCheck className="w-4 h-4 mr-2" />
              Licenças
            </TabTrigger>
            <TabTrigger value="car" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600">
              <TreePine className="w-4 h-4 mr-2" />
              CAR
            </TabTrigger>
            <TabTrigger value="contratos" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600">
              <FileText className="w-4 h-4 mr-2" />
              Contratos
            </TabTrigger>
            <TabTrigger value="processos" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600">
              <Scale className="w-4 h-4 mr-2" />
              Processos
            </TabTrigger>
            <TabTrigger value="alertas" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Alertas
            </TabTrigger>
            <TabTrigger value="regularidade" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Regularidade
            </TabTrigger>
            <TabTrigger value="prad" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600">
              <Leaf className="w-4 h-4 mr-2" />
              PRAD
            </TabTrigger>
            <TabTrigger value="geo" className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600">
              <MapPinIcon className="w-4 h-4 mr-2" />
              Geo
            </TabTrigger>
          </TabsList>
        </div>

        {/* Tab Contents */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <OverviewTab property={selectedProperty} contracts={contracts} documents={documents} licenses={licenses} alerts={alerts} />
        </TabsContent>

        <TabsContent value="mapa" className="mt-6">
          <PropertyMapView propertyId={selectedPropertyId} />
        </TabsContent>

        <TabsContent value="documentos" className="mt-6">
          <DocumentsHub propertyId={selectedPropertyId} />
        </TabsContent>

        <TabsContent value="licencas" className="mt-6">
          <Licenses propertyId={selectedPropertyId} />
        </TabsContent>

        <TabsContent value="car" className="mt-6">
          <CARModule propertyId={selectedPropertyId} />
        </TabsContent>

        <TabsContent value="contratos" className="mt-6">
          <Contracts propertyId={selectedPropertyId} />
        </TabsContent>

        <TabsContent value="processos" className="mt-6">
          <Processes propertyId={selectedPropertyId} />
        </TabsContent>

        <TabsContent value="alertas" className="mt-6">
          <EnvironmentalAlerts propertyId={selectedPropertyId} />
        </TabsContent>

        <TabsContent value="regularidade" className="mt-6">
          <RegularityReport propertyId={selectedPropertyId} />
        </TabsContent>

        <TabsContent value="prad" className="mt-6">
          <PRAD propertyId={selectedPropertyId} />
        </TabsContent>

        <TabsContent value="geo" className="mt-6">
          <Georeferencing propertyId={selectedPropertyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const iconColorMap = {
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100',
    green: 'text-green-600 bg-green-100',
    orange: 'text-orange-600 bg-orange-100',
    emerald: 'text-emerald-600 bg-emerald-100',
  };

  return (
    <button
      onClick={onClick}
      className={`${colorMap[color]} p-4 rounded-xl border transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`${iconColorMap[color]} p-2.5 rounded-lg`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-xs font-medium opacity-75">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 opacity-50" />
      </div>
    </button>
  );
}

function OverviewTab({ property, contracts, documents, licenses, alerts }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Property Info */}
      <Card className="lg:col-span-2 p-6">
        <h2 className="text-lg font-bold text-emerald-900 mb-4">Informações da Propriedade</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Nome:</span>
            <span className="text-sm font-semibold text-gray-900">{property.property_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-600">Tipo:</span>
            <Badge className="bg-emerald-100 text-emerald-700">{property.property_type === 'rural' ? 'Rural' : 'Urbano'}</Badge>
          </div>
          {property.city && (
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Localização:</span>
              <span className="text-sm text-gray-900">{property.city}, {property.state}</span>
            </div>
          )}
          {property.total_hectares && (
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Área Total:</span>
              <span className="text-sm font-semibold text-emerald-700">{property.total_hectares} ha</span>
            </div>
          )}
          {property.coordinates && (
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Coordenadas:</span>
              <span className="text-sm text-gray-600 font-mono">{property.coordinates}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-emerald-900 mb-4">Atividade Recente</h2>
        <div className="space-y-2">
          <div className="text-xs">
            <p className="text-gray-600">{documents.length} documentos</p>
            <p className="text-gray-600">{licenses.length} licenças</p>
            <p className="text-gray-600">{contracts.length} contratos</p>
            <p className="text-gray-600">{alerts.length} alertas</p>
          </div>
        </div>
      </Card>
    </div>
  );
}