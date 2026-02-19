import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Trees, Leaf, Activity, Building2, Ruler } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Parse coordinates from string like "-16.6869° S, -49.2648° W"
const parseCoordinates = (coordString) => {
  if (!coordString) return null;
  try {
    const parts = coordString.split(',');
    if (parts.length !== 2) return null;
    
    let lat = parseFloat(parts[0].replace(/[°\s]/g, '').replace('S', '').replace('N', ''));
    let lng = parseFloat(parts[1].replace(/[°\s]/g, '').replace('W', '').replace('E', ''));
    
    if (coordString.includes('S')) lat = -Math.abs(lat);
    if (coordString.includes('W')) lng = -Math.abs(lng);
    
    if (isNaN(lat) || isNaN(lng)) return null;
    return [lat, lng];
  } catch {
    return null;
  }
};

export default function PropertyCard({ property, isConsultor }) {
  const isUrban = property?.property_type === 'urbano';

  if (!property) {
    return (
      <Card className="bg-gradient-to-br from-emerald-900 to-emerald-950 border-0 overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center py-8 text-emerald-200">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nenhuma propriedade cadastrada</p>
            <p className="text-sm text-emerald-400 mt-2">Entre em contato com o suporte</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const coordinates = parseCoordinates(property.coordinates);

  const stats = isUrban
    ? [
        { label: 'Área Total', value: property.total_area_m2 ? `${property.total_area_m2} m²` : '—', icon: Ruler, color: 'from-blue-400 to-blue-600' },
        { label: 'Área Construída', value: property.built_area_m2 ? `${property.built_area_m2} m²` : '—', icon: Building2, color: 'from-indigo-400 to-indigo-600' },
      ]
    : [
        { label: 'Área Total', value: property.total_hectares ? `${property.total_hectares} ha` : '—', icon: Trees, color: 'from-emerald-400 to-emerald-600' },
        { label: 'APP', value: property.app_hectares ? `${property.app_hectares} ha` : '—', icon: Leaf, color: 'from-teal-400 to-teal-600' },
        { label: 'Reserva Legal', value: property.legal_reserve_hectares ? `${property.legal_reserve_hectares} ha` : '—', icon: Trees, color: 'from-green-400 to-green-600' },
      ];

  return (
    <Card className="bg-gradient-to-br from-emerald-900 via-emerald-900 to-emerald-950 border-0 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-600/20 to-transparent rounded-full translate-y-24 -translate-x-24" />
      
      <CardContent className="p-6 relative">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Property Info */}
          <div className="flex-1">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-emerald-400 text-xs uppercase tracking-wide mb-1">
                  {isUrban ? 'Empreendimento' : 'Propriedade Rural'}
                </p>
                <h2 className="text-2xl font-bold text-white">{property.property_name}</h2>
                <p className="text-emerald-300 flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4" />
                  {property.city}, {property.state}
                </p>
              </div>
            </div>

            {property.main_activity && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-300 text-sm mb-4">
                <Activity className="w-4 h-4" />
                <span>Atividade Principal: {property.main_activity}</span>
              </div>
            )}

            {property.coordinates && (
              <p className="text-emerald-400 text-sm">
                📍 {property.coordinates}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className={`grid gap-3 lg:gap-4 ${isUrban ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {stats.map((stat, index) => (
              <div key={index} className="bg-emerald-800/40 backdrop-blur rounded-2xl p-4 text-center">
                <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-white font-bold text-lg">{stat.value}</p>
                <p className="text-emerald-400 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Activities */}
        {property.activities && (
          <div className="mt-6 pt-6 border-t border-emerald-800/50">
            <p className="text-emerald-400 text-sm mb-3">Atividades:</p>
            <div className="flex flex-wrap gap-2">
              {(typeof property.activities === 'string' ? property.activities.split(',').map(a => a.trim()) : property.activities).map((activity, index) => (
                <span key={index} className="px-3 py-1 rounded-full bg-emerald-800/50 text-emerald-200 text-sm">
                  {activity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        {coordinates && (
          <div className="mt-6 pt-6 border-t border-emerald-800/50">
            <p className="text-emerald-400 text-sm mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Localização no Mapa
            </p>
            <div className="rounded-xl overflow-hidden border-2 border-emerald-700/50 h-64">
              <MapContainer 
                center={coordinates} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                />
                <Marker position={coordinates}>
                  <Popup>
                    <div className="text-center">
                      <strong>{property.property_name}</strong><br />
                      {property.total_hectares} hectares<br />
                      {property.city}, {property.state}
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}