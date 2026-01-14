import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Info
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import moment from 'moment';

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

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ owner_email: user.email }),
    enabled: !!user?.email
  });

  const { data: allAlerts = [] } = useQuery({
    queryKey: ['environmental-alerts'],
    queryFn: () => base44.entities.EnvironmentalAlert.list(),
    enabled: true
  });

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const propertyAlerts = allAlerts.filter(a => a.property_id === selectedPropertyId);

  const filteredAlerts = propertyAlerts.filter(alert => {
    const severityMatch = filterSeverity === 'all' || alert.severity === filterSeverity;
    const typeMatch = filterType === 'all' || alert.alert_type === filterType;
    return severityMatch && typeMatch;
  });

  const activeAlerts = filteredAlerts.filter(a => a.status === 'Ativo');
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
      <Card className={`border-2 ${severity.border} hover:shadow-lg transition-all cursor-pointer`}
            onClick={() => setSelectedAlert(alert)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-3 rounded-lg ${severity.bg} border ${severity.border}`}>
              <TypeIcon className={`w-6 h-6 ${severity.icon}`} />
            </div>
            
            <div className="flex-1">
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
                <Badge className={alert.status === 'Ativo' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
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
                {alert.data_source && (
                  <div className="flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    {alert.data_source}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-emerald-600" />
          Alertas Ambientais
        </h1>
        <p className="text-gray-500 mt-1">Monitoramento de desmatamento, mudanças no uso da terra e índices de vegetação</p>
      </div>

      {/* Property Selector */}
      {properties.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPinned className="w-5 h-5 text-emerald-600" />
              <span className="text-gray-700 font-medium">Propriedade:</span>
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
          { label: 'Alertas Ativos', count: activeAlerts.length, color: 'red', icon: AlertTriangle },
          { label: 'Críticos', count: activeAlerts.filter(a => a.severity === 'Crítica').length, color: 'red', icon: AlertTriangle },
          { label: 'Resolvidos', count: resolvedAlerts.length, color: 'green', icon: CheckCircle2 },
          { label: 'Monitorados', count: propertyAlerts.length, color: 'blue', icon: Eye }
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtros:</span>
            </div>
            
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Gravidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Crítica">Crítica</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="Desmatamento">Desmatamento</SelectItem>
                <SelectItem value="Mudança de Uso da Terra">Mudança de Uso da Terra</SelectItem>
                <SelectItem value="Índice de Vegetação">Índice de Vegetação</SelectItem>
                <SelectItem value="APP">APP</SelectItem>
                <SelectItem value="Reserva Legal">Reserva Legal</SelectItem>
              </SelectContent>
            </Select>
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
                      <Badge className={selectedAlert.status === 'Ativo' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                        {selectedAlert.status}
                      </Badge>
                    </div>
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
                  <h3 className="font-semibold text-gray-900 mb-2">Localização</h3>
                  <div className="h-96 rounded-lg overflow-hidden border-2 border-gray-200">
                    <MapContainer
                      center={parseCoordinates(selectedAlert.coordinates || selectedProperty.coordinates) || [-15.7939, -47.8828]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}