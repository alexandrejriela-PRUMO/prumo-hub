import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PropertySelector from '@/components/properties/PropertySelector';
import { 
  Building2, FileText, MapPin, AlertTriangle, FileCheck, 
  Leaf, Map, Scale, TreePine, BarChart3, ChevronRight, ScrollText
} from 'lucide-react';

export default function PropertyCentral() {
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

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

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  if (propertiesLoading || !selectedProperty) {
    return (
      <div className="flex items-center justify-center w-full h-96">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const modules = [
    { name: 'Minhas Propriedades', page: 'Properties', icon: Building2, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { name: 'Meus Contratos', page: 'Contracts', icon: ScrollText, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { name: 'Documentos', page: 'DocumentsHub', icon: FileText, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { name: 'Licenças e Projetos', page: 'Licenses', icon: FileCheck, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { name: 'Gestão do CAR', page: 'CARModule', icon: TreePine, color: 'bg-green-50 text-green-700 border-green-200' },
    { name: 'Mapa Interativo', page: 'PropertyMapView', icon: Map, color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { name: 'Processos', page: 'Processes', icon: Scale, color: 'bg-gray-50 text-gray-700 border-gray-200' },
    { name: 'Alertas de Infrações', page: 'EnvironmentalAlerts', icon: AlertTriangle, color: 'bg-red-50 text-red-700 border-red-200' },
    { name: 'Termômetro de Regularidade', page: 'RegularityReport', icon: BarChart3, color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { name: 'PRAD - Recuperação de Área', page: 'PRAD', icon: Leaf, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name: 'Georreferenciamento', page: 'Georeferencing', icon: MapPin, color: 'bg-teal-50 text-teal-700 border-teal-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">Central da Propriedade</h1>
          <p className="text-sm text-emerald-600 mt-1">Acesse e gerencie todos os módulos de sua propriedade</p>
        </div>
        <PropertySelector
          selectedPropertyId={selectedPropertyId}
          onPropertyChange={setSelectedPropertyId}
          properties={properties}
        />
      </div>

      {/* Property Info */}
      <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-emerald-900 mb-4">Propriedade Selecionada</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-600">Nome</p>
            <p className="text-sm font-semibold text-gray-900">{selectedProperty.property_name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">Tipo</p>
            <p className="text-sm font-semibold text-gray-900">{selectedProperty.property_type === 'rural' ? 'Rural' : 'Urbano'}</p>
          </div>
          {selectedProperty.city && (
            <div>
              <p className="text-xs font-medium text-gray-600">Localização</p>
              <p className="text-sm font-semibold text-gray-900">{selectedProperty.city}, {selectedProperty.state}</p>
            </div>
          )}
          {selectedProperty.total_hectares && (
            <div>
              <p className="text-xs font-medium text-gray-600">Área Total</p>
              <p className="text-sm font-semibold text-emerald-700">{selectedProperty.total_hectares} ha</p>
            </div>
          )}
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.page}
              to={createPageUrl(module.page)}
              className={`${module.color} p-6 rounded-xl border transition-all hover:shadow-md group`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-white/50 rounded-lg group-hover:bg-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{module.name}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}