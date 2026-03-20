import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  TreePine, 
  MapPin, 
  Leaf, 
  Filter,
  Calendar,
  TrendingDown,
  CheckCircle2,
  Eye,
  X,
  MapPinned,
  Info,
  Plus,
  Edit,
  Trash2,
  FileText,
  Image as ImageIcon,
  User,
  ChevronLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import moment from 'moment';
import { toast } from 'sonner';
import AlertHistory from '../components/alerts/AlertHistory';
import MapLayers from '../components/alerts/MapLayers';
import MapLegend from '../components/alerts/MapLegend';
import AlertForm from '../components/alerts/AlertForm';
import ConsultorPropertySelector from '../components/consultor/ConsultorPropertySelector';
import PullToRefresh from '../components/mobile/PullToRefresh';
import { useEffectiveUser } from '../hooks/useEffectiveUser';
import MobileSelect from '../components/mobile/MobileSelect';
import MapBiomasAlerts from '../components/alerts/MapBiomasAlerts';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function EnvironmentalAlerts() {
  const [user, setUser] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  
  const queryClient = useQueryClient();

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

  const { effectiveEmail, userType } = useEffectiveUser();
  const isConsultorFamily = userType === 'consultor' || userType === 'equipe';

  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', effectiveEmail, userType],
    queryFn: () => isConsultorFamily
      ? base44.entities.Property.filter({ consultor_email: effectiveEmail })
      : base44.entities.Property.filter({ owner_email: effectiveEmail }),
    enabled: !!effectiveEmail
  });

  const { data: allAlerts = [] } = useQuery({
    queryKey: ['environmental-alerts', selectedPropertyId],
    queryFn: () => base44.entities.EnvironmentalAlert.list('-detection_date'),
    enabled: !!selectedPropertyId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EnvironmentalAlert.create(data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries(['environmental-alerts']);
      const previous = queryClient.getQueryData(['environmental-alerts']);
      queryClient.setQueryData(['environmental-alerts'], (old = []) => [
        { ...newData, id: `temp-${Date.now()}` },
        ...old,
      ]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['environmental-alerts'], ctx.previous);
    },
    onSuccess: async (newAlert) => {
      queryClient.invalidateQueries(['environmental-alerts']);
      setFormDialogOpen(false);
      setEditingAlert(null);
      toast.success('Alerta criado com sucesso!');
      
      // Enviar notificação por email se configurado
      if (newAlert.notification_config?.email && newAlert.responsible_email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: newAlert.responsible_email,
            subject: `🚨 Nova Infração Registrada: ${newAlert.title}`,
            body: `
              Uma nova infração foi registrada:
              
              Título: ${newAlert.title}
              Tipo: ${newAlert.alert_type}
              Gravidade: ${newAlert.severity}
              Status: ${newAlert.status}
              Data: ${moment(newAlert.detection_date).format('DD/MM/YYYY')}
              
              Descrição: ${newAlert.description}
              
              Acesse o sistema para mais detalhes.
            `
          });
        } catch (e) {
          console.error('Erro ao enviar notificação:', e);
        }
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EnvironmentalAlert.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries(['environmental-alerts']);
      const previous = queryClient.getQueryData(['environmental-alerts']);
      queryClient.setQueryData(['environmental-alerts'], (old = []) =>
        old.map((a) => (a.id === id ? { ...a, ...data } : a))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['environmental-alerts'], ctx.previous);
    },
    onSuccess: async (updatedAlert) => {
      queryClient.invalidateQueries(['environmental-alerts']);
      setFormDialogOpen(false);
      setEditingAlert(null);
      setSelectedAlert(null);
      toast.success('Alerta atualizado com sucesso!');
      
      // Notificar mudança de status
      if (updatedAlert.notification_config?.email && updatedAlert.responsible_email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: updatedAlert.responsible_email,
            subject: `📋 Infração Atualizada: ${updatedAlert.title}`,
            body: `
              A infração foi atualizada:
              
              Título: ${updatedAlert.title}
              Novo Status: ${updatedAlert.status}
              
              Acesse o sistema para mais detalhes.
            `
          });
        } catch (e) {
          console.error('Erro ao enviar notificação:', e);
        }
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EnvironmentalAlert.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries(['environmental-alerts']);
      const previous = queryClient.getQueryData(['environmental-alerts']);
      queryClient.setQueryData(['environmental-alerts'], (old = []) => old.filter((a) => a.id !== id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['environmental-alerts'], ctx.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['environmental-alerts']);
      setSelectedAlert(null);
      toast.success('Alerta removido com sucesso!');
    }
  });

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId && !isConsultorFamily) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId, isConsultorFamily]);

  useEffect(() => {
    // Invalidate mapbiomas-alerts cache when selectedPropertyId changes
    if (selectedPropertyId) {
      queryClient.invalidateQueries(['mapbiomas-alerts']);
    }
  }, [selectedPropertyId, queryClient]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const propertyAlerts = allAlerts.filter(a => a.property_id === selectedPropertyId);

  const filteredAlerts = propertyAlerts.filter(alert => {
    const severityMatch = filterSeverity === 'all' || alert.severity === filterSeverity;
    const typeMatch = filterType === 'all' || alert.alert_type === filterType;
    return severityMatch && typeMatch;
  });

  const activeAlerts = filteredAlerts.filter(a => a.status === 'Aberto' || a.status === 'Em Análise');
  const resolvedAlerts = filteredAlerts.filter(a => a.status === 'Resolvido');

  const severityConfig = {
    'Crítica': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: 'text-red-600' },
    'Alta': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', icon: 'text-orange-600' },
    'Média': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', icon: 'text-yellow-600' },
    'Baixa': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', icon: 'text-blue-600' }
  };

  const typeIcons = {
    'Desmatamento': TreePine,
    'Mudança de Uso da Terra': MapPin,
    'Índice de Vegetação': Leaf,
    'APP': AlertTriangle,
    'Reserva Legal': AlertTriangle
  };

  const parseCoordinates = (coordString) => {
    if (!coordString) return null;
    try {
      const parts = coordString.split(',').map(p => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const AlertCard = ({ alert }) => {
    const severity = severityConfig[alert.severity];
    const TypeIcon = typeIcons[alert.alert_type] || AlertTriangle;

    return (
      <Card className={`border-2 ${severity.border} hover:shadow-lg transition-all`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-lg ${severity.bg} border ${severity.border}`}>
              <TypeIcon className={`w-6 h-6 ${severity.icon}`} />
            </div>
            
            <div className="flex-1" onClick={() => setSelectedAlert(alert)} style={{cursor: 'pointer'}}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{alert.title}</h3>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={`${severity.bg} ${severity.text} text-xs`}>
                      {alert.severity}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {alert.alert_type}
                    </Badge>
                  </div>
                </div>
                <Badge className={
                  alert.status === 'Aberto' ? 'bg-red-100 text-red-700' : 
                  alert.status === 'Em Análise' ? 'bg-yellow-100 text-yellow-700' :
                  alert.status === 'Resolvido' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }>
                  {alert.status}
                </Badge>
              </div>

              <p className="text-sm text-gray-700 mb-3 line-clamp-2">{alert.description}</p>

              <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {moment(alert.detection_date).format('DD/MM/YYYY')}
                </div>
                {alert.affected_area_hectares && (
                  <div className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    {alert.affected_area_hectares.toFixed(2)} ha
                  </div>
                )}
                {alert.responsible_email && (
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {alert.responsible_email.split('@')[0]}
                  </div>
                )}
                {alert.attachments?.length > 0 && (
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {alert.attachments.length} anexo(s)
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingAlert(alert);
                  setFormDialogOpen(true);
                }}
              >
                <Edit className="w-4 h-4 text-blue-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Deseja realmente excluir este alerta?')) {
                    deleteMutation.mutate(alert.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(['environmental-alerts']);
    await queryClient.invalidateQueries(['properties', user?.email]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="max-w-7xl mx-auto space-y-6">
      <Link
        to={createPageUrl('PropertyCentral')}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-medium"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>

      {/* Consultor/Equipe Selector */}
      {isConsultorFamily && (
        <ConsultorPropertySelector
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onSelect={setSelectedPropertyId}
          isLoading={propertiesLoading}
        />
      )}

      {/* Tabs for Manual and MapBiomas Alerts */}
      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="manual">
            Alertas Manuais
          </TabsTrigger>
          <TabsTrigger value="mapbiomas">
            🗺️ MapBiomas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          {/* Info Card */}
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-orange-900">Alertas Manuais de Infrações</h3>
                  </div>
                </div>
                <p className="text-orange-800 text-sm">
                  <strong>Registre manualmente</strong> alertas de infrações detectadas por você ou sua equipe. Você pode criar, acompanhar e resolver alertas (desmatamento, mudança de uso da terra, APP, Reserva Legal, etc.).
                </p>
                <p className="text-orange-800 text-sm">
                  Use este módulo para documentar alertas conhecidos e gerenciar as ações de resolução necessárias.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapbiomas" className="space-y-4">
          <MapBiomasAlerts selectedProperty={selectedProperty} selectedPropertyId={selectedPropertyId} />
        </TabsContent>
      </Tabs>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-emerald-600" />
            Alertas de Infrações
          </h1>
          <p className="text-gray-500 mt-1">Monitoramento e gestão de alertas de infrações</p>
        </div>
        <Button 
          onClick={() => {
            setEditingAlert(null);
            setFormDialogOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Infração
        </Button>
      </div>

      {isConsultorFamily && !selectedPropertyId && (
        <Card className="border-dashed border-2 border-amber-200">
          <CardContent className="py-16 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto text-amber-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Selecione uma propriedade</h3>
            <p className="text-gray-500 mt-2">Escolha a propriedade acima para visualizar os alertas</p>
          </CardContent>
        </Card>
      )}

      {/* Property Selector */}
      {!isConsultor && properties.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPinned className="w-5 h-5 text-emerald-600" />
              <span className="text-gray-700 font-medium">Propriedade ou Empreendimento:</span>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="w-96">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(prop => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.property_name} - {prop.city}/{prop.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Infrações Ativas', count: activeAlerts.length, color: 'red', icon: AlertTriangle },
          { label: 'Críticas', count: activeAlerts.filter(a => a.severity === 'Crítica').length, color: 'red', icon: AlertTriangle },
          { label: 'Resolvidas', count: resolvedAlerts.length, color: 'green', icon: CheckCircle2 },
          { label: 'Monitoradas', count: propertyAlerts.length, color: 'blue', icon: Eye }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className={`bg-${stat.color}-50 border-${stat.color}-200`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.count}</p>
                  </div>
                  <Icon className={`w-8 h-8 text-${stat.color}-600`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters - only for manual tab */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtros:</span>
            </div>

            <MobileSelect
              value={filterSeverity}
              onValueChange={setFilterSeverity}
              placeholder="Gravidade"
              title="Filtrar por Gravidade"
              triggerClassName="w-40"
              options={[
                { value: 'all', label: 'Todas' },
                { value: 'Crítica', label: 'Crítica' },
                { value: 'Alta', label: 'Alta' },
                { value: 'Média', label: 'Média' },
                { value: 'Baixa', label: 'Baixa' },
              ]}
            />

            <MobileSelect
              value={filterType}
              onValueChange={setFilterType}
              placeholder="Tipo"
              title="Filtrar por Tipo"
              triggerClassName="w-56"
              options={[
                { value: 'all', label: 'Todos os Tipos' },
                { value: 'Desmatamento', label: 'Desmatamento' },
                { value: 'Mudança de Uso da Terra', label: 'Mudança de Uso da Terra' },
                { value: 'Índice de Vegetação', label: 'Índice de Vegetação' },
                { value: 'APP', label: 'APP' },
                { value: 'Reserva Legal', label: 'Reserva Legal' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Active/Resolved */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active">
            Ativos ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolvidos ({resolvedAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Nenhum alerta ativo</h3>
                <p className="text-gray-500 mt-1">Sua propriedade está em conformidade ambiental</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          {resolvedAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Info className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">Nenhum alerta resolvido</h3>
                <p className="text-gray-500 mt-1">Alertas resolvidos aparecerão aqui</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {resolvedAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Alert Detail Modal */}
      {selectedAlert && selectedProperty && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b sticky top-0 bg-white z-10">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedAlert.title}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge className={severityConfig[selectedAlert.severity].bg + ' ' + severityConfig[selectedAlert.severity].text}>
                      {selectedAlert.severity}
                    </Badge>
                    <Badge variant="outline">{selectedAlert.alert_type}</Badge>
                    <Badge variant="outline">{selectedAlert.data_source}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedAlert(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Descrição</h3>
                <p className="text-gray-700">{selectedAlert.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Informações</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Data de Detecção:</span>
                      <span className="font-medium">{moment(selectedAlert.detection_date).format('DD/MM/YYYY')}</span>
                    </div>
                    {selectedAlert.affected_area_hectares && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Área Afetada:</span>
                        <span className="font-medium">{selectedAlert.affected_area_hectares.toFixed(2)} ha</span>
                      </div>
                    )}
                    {selectedAlert.ndvi_value && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Índice NDVI:</span>
                        <span className="font-medium">{selectedAlert.ndvi_value.toFixed(3)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                     <span className="text-gray-600">Status:</span>
                     <Badge className={
                       selectedAlert.status === 'Aberto' ? 'bg-red-100 text-red-700' : 
                       selectedAlert.status === 'Em Análise' ? 'bg-yellow-100 text-yellow-700' :
                       selectedAlert.status === 'Resolvido' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                     }>
                       {selectedAlert.status}
                     </Badge>
                    </div>
                    {selectedAlert.responsible_email && (
                     <div className="flex justify-between">
                       <span className="text-gray-600">Responsável:</span>
                       <span className="font-medium">{selectedAlert.responsible_email}</span>
                     </div>
                    )}
                  </div>
                </div>

                {selectedAlert.recommended_actions && selectedAlert.recommended_actions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Ações Recomendadas</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      {selectedAlert.recommended_actions.map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Map */}
              {(selectedAlert.coordinates || selectedProperty.coordinates) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Localização e Camadas Geoespaciais</h3>
                  <div className="h-96 rounded-lg overflow-hidden border-2 border-gray-200 relative">
                    <MapContainer
                      center={parseCoordinates(selectedAlert.coordinates || selectedProperty.coordinates) || [-15.7939, -47.8828]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <MapLayers alerts={[selectedAlert]} />
                      <MapLegend />
                      {parseCoordinates(selectedAlert.coordinates || selectedProperty.coordinates) && (
                        <>
                          <Marker position={parseCoordinates(selectedAlert.coordinates || selectedProperty.coordinates)}>
                            <Popup>{selectedAlert.title}</Popup>
                          </Marker>
                          {selectedAlert.affected_area_hectares && (
                            <Circle
                              center={parseCoordinates(selectedAlert.coordinates || selectedProperty.coordinates)}
                              radius={Math.sqrt(selectedAlert.affected_area_hectares * 10000 / Math.PI)}
                              pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }}
                            />
                          )}
                        </>
                      )}
                    </MapContainer>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    💡 Use o controle de camadas no canto superior direito para alternar entre mapas base e overlays de dados geoespaciais (PRODES, MapBiomas, DETER)
                  </p>
                </div>
              )}

              {/* Anexos */}
              {selectedAlert.attachments?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Anexos</h3>
                  <div className="grid md:grid-cols-2 gap-2">
                    {selectedAlert.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border"
                      >
                        {att.type === 'foto' ? <ImageIcon className="w-5 h-5 text-blue-600" /> : <FileText className="w-5 h-5 text-gray-600" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{att.name}</p>
                          <p className="text-xs text-gray-500">{moment(att.uploaded_date).format('DD/MM/YYYY HH:mm')}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{att.type}</Badge>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              <AlertHistory alert={selectedAlert} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAlert ? 'Editar Infração' : 'Nova Infração'}
            </DialogTitle>
          </DialogHeader>
          <AlertForm
            alert={editingAlert}
            properties={properties}
            user={user}
            onSubmit={(data) => {
              if (editingAlert) {
                updateMutation.mutate({ id: editingAlert.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setFormDialogOpen(false);
              setEditingAlert(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
    </PullToRefresh>
  );
}