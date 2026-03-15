import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap, Marker, Popup, FeatureGroup } from 'react-leaflet';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Layers, Info, AlertTriangle, TreePine, Droplets, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LAYER_STYLES = {
  car: { color: '#f59e0b', weight: 3, fillOpacity: 0.08, fillColor: '#f59e0b', dashArray: null },
  app: { color: '#3b82f6', weight: 2, fillOpacity: 0.2, fillColor: '#3b82f6' },
  legalReserve: { color: '#10b981', weight: 2, fillOpacity: 0.2, fillColor: '#10b981' },
  recovery: { color: '#ef4444', weight: 2, fillOpacity: 0.2, fillColor: '#ef4444' },
  consolidated: { color: '#8b5cf6', weight: 2, fillOpacity: 0.15, fillColor: '#8b5cf6' },
};

function FitBoundsLayer({ geoJson }) {
  const map = useMap();
  useEffect(() => {
    if (!geoJson) return;
    try {
      const layer = L.geoJSON(geoJson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
    } catch {}
  }, [geoJson, map]);
  return null;
}

function LayerLegend({ activeLayers }) {
  const items = [
    { key: 'car', label: 'CAR (Limite da Propriedade)', color: '#f59e0b' },
    { key: 'app', label: 'APP (Área de Preservação)', color: '#3b82f6' },
    { key: 'legalReserve', label: 'Reserva Legal', color: '#10b981' },
    { key: 'recovery', label: 'Área em Recuperação', color: '#ef4444' },
    { key: 'consolidated', label: 'Área Consolidada', color: '#8b5cf6' },
  ];
  const visible = items.filter(i => activeLayers[i.key]);
  if (!visible.length) return null;
  return (
    <div className="absolute bottom-8 left-4 z-[1000] bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 border border-gray-200 max-w-[200px]">
      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Legenda</p>
      <div className="space-y-1.5">
        {visible.map(i => (
          <div key={i.key} className="flex items-center gap-2">
            <div className="w-4 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: i.color, opacity: 0.7 }} />
            <span className="text-xs text-gray-600 leading-tight">{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PropertyMapView() {
  const [user, setUser] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [activeLayers, setActiveLayers] = useState({
    satellite: false,
    car: true,
    app: true,
    legalReserve: true,
    recovery: false,
    consolidated: false,
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => {
      if (user?.user_type === 'consultor' || user?.user_type === 'equipe') {
        return base44.entities.Property.filter({ consultor_email: user.email });
      }
      return base44.entities.Property.filter({ owner_email: user.email });
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const { data: carData } = useQuery({
    queryKey: ['carManagement', selectedPropertyId],
    queryFn: () => base44.entities.CARManagement.filter({ property_id: selectedPropertyId }),
    enabled: !!selectedPropertyId,
    select: data => data[0],
  });

  const toggleLayer = (key) => setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));

  const parseGeoJson = (str) => {
    if (!str) return null;
    try { return typeof str === 'string' ? JSON.parse(str) : str; } catch { return null; }
  };

  const getCenter = () => {
    if (selectedProperty?.coordinates) {
      const [lat, lng] = selectedProperty.coordinates.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return [-15.7801, -47.9292];
  };

  const carGeoJson = parseGeoJson(selectedProperty?.boundaries);
  const carLayers = carData?.map_layers;

  const layerButtons = [
    { key: 'satellite', label: 'Satélite', icon: '🛰️' },
    { key: 'car', label: 'CAR', icon: '📋' },
    { key: 'app', label: 'APP', icon: '💧' },
    { key: 'legalReserve', label: 'Reserva Legal', icon: '🌳' },
    { key: 'recovery', label: 'Recuperação', icon: '🔴' },
    { key: 'consolidated', label: 'Consolidada', icon: '🟣' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-600" />
            Mapa Interativo da Propriedade
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Visualize e analise camadas ambientais sobrepostas</p>
        </div>
        {properties.length > 1 && (
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Selecionar propriedade..." />
            </SelectTrigger>
            <SelectContent>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.property_name} {p.city ? `— ${p.city}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Property Info Bar */}
      {selectedProperty && (
        <div className="flex flex-wrap gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm">
          <span className="font-semibold text-emerald-800">{selectedProperty.property_name}</span>
          {selectedProperty.city && <Badge variant="outline" className="text-emerald-700 border-emerald-300">{selectedProperty.city}/{selectedProperty.state}</Badge>}
          {selectedProperty.total_hectares && <Badge variant="outline" className="text-blue-700 border-blue-200">{selectedProperty.total_hectares} ha</Badge>}
          {selectedProperty.car_number && <Badge variant="outline" className="text-amber-700 border-amber-200">CAR: {selectedProperty.car_number}</Badge>}
          {carData && <Badge className={cn("text-white text-xs", carData.car_status === 'Validado' ? 'bg-emerald-600' : 'bg-amber-500')}>{carData.car_status}</Badge>}
        </div>
      )}

      {/* Layer Toggle Controls */}
      <Card className="border-gray-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 mr-2">
              <Layers className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Camadas:</span>
            </div>
            {layerButtons.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  activeLayers[key]
                    ? "bg-emerald-700 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700"
                )}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-lg" style={{ height: '520px' }}>
        {selectedProperty ? (
          <>
            <MapContainer
              center={getCenter()}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              {/* Base Layers */}
              {activeLayers.satellite ? (
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                  maxZoom={19}
                />
              ) : (
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
              )}

              {/* CAR Boundary from property.boundaries */}
              {activeLayers.car && carGeoJson && (
                <GeoJSON
                  key={`car-${selectedPropertyId}`}
                  data={carGeoJson}
                  style={LAYER_STYLES.car}
                  onEachFeature={(feature, layer) => {
                    layer.bindPopup(`<b>Limite CAR</b><br/>CAR: ${selectedProperty?.car_number || 'N/D'}`);
                  }}
                />
              )}

              {/* APP Layer */}
              {activeLayers.app && carLayers?.app_layer_url && (() => {
                const gj = parseGeoJson(carLayers.app_layer_url);
                return gj ? <GeoJSON key={`app-${selectedPropertyId}`} data={gj} style={LAYER_STYLES.app} onEachFeature={(_, l) => l.bindPopup('<b>APP</b><br/>Área de Preservação Permanente')} /> : null;
              })()}

              {/* Legal Reserve Layer */}
              {activeLayers.legalReserve && carLayers?.legal_reserve_url && (() => {
                const gj = parseGeoJson(carLayers.legal_reserve_url);
                return gj ? <GeoJSON key={`rl-${selectedPropertyId}`} data={gj} style={LAYER_STYLES.legalReserve} onEachFeature={(_, l) => l.bindPopup('<b>Reserva Legal</b>')} /> : null;
              })()}

              {/* Recovery Area Layer */}
              {activeLayers.recovery && carLayers?.recovery_area_url && (() => {
                const gj = parseGeoJson(carLayers.recovery_area_url);
                return gj ? <GeoJSON key={`rec-${selectedPropertyId}`} data={gj} style={LAYER_STYLES.recovery} onEachFeature={(_, l) => l.bindPopup('<b>Área em Recuperação (PRAD)</b>')} /> : null;
              })()}

              {/* Consolidated Area Layer */}
              {activeLayers.consolidated && carLayers?.consolidated_area_url && (() => {
                const gj = parseGeoJson(carLayers.consolidated_area_url);
                return gj ? <GeoJSON key={`cons-${selectedPropertyId}`} data={gj} style={LAYER_STYLES.consolidated} onEachFeature={(_, l) => l.bindPopup('<b>Área Consolidada</b>')} /> : null;
              })()}

              {/* Property center marker */}
              {selectedProperty?.coordinates && (() => {
                const [lat, lng] = selectedProperty.coordinates.split(',').map(Number);
                if (!isNaN(lat) && !isNaN(lng)) {
                  return (
                    <Marker position={[lat, lng]}>
                      <Popup>
                        <b>{selectedProperty.property_name}</b><br />
                        {selectedProperty.city}, {selectedProperty.state}
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              })()}

              {/* Auto-fit bounds */}
              {carGeoJson && <FitBoundsLayer geoJson={carGeoJson} />}
            </MapContainer>

            {/* Legend */}
            <LayerLegend activeLayers={activeLayers} />
          </>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhuma propriedade selecionada</p>
              <p className="text-sm">Selecione uma propriedade para visualizar o mapa</p>
            </div>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-amber-100 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <TreePine className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Reserva Legal</p>
              <p className="text-lg font-bold text-amber-900">{selectedProperty?.legal_reserve_hectares ?? '—'} <span className="text-sm font-normal">ha</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 bg-blue-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Droplets className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">APP</p>
              <p className="text-lg font-bold text-blue-900">{selectedProperty?.app_hectares ?? '—'} <span className="text-sm font-normal">ha</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 bg-emerald-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Área Total</p>
              <p className="text-lg font-bold text-emerald-900">{selectedProperty?.total_hectares ?? '—'} <span className="text-sm font-normal">ha</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Help Note */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
        <p>
          Para exibir as camadas de APP, Reserva Legal e Recuperação, cadastre os polígonos GeoJSON na seção 
          <strong> Gestão do CAR &gt; Camadas do Mapa</strong> da propriedade selecionada. 
          O limite geral (CAR) é carregado automaticamente do campo <strong>Limites Geográficos</strong> da propriedade.
        </p>
      </div>
    </div>
  );
}