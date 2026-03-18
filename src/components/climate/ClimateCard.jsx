import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Droplets, Wind, Sun, Eye, Gauge } from 'lucide-react';

export default function ClimateCard({ location }) {
  if (!location) return null;

  const temp = location.temperature_current ?? '--';
  const humidity = location.humidity ?? '--';
  const precipitation = location.precipitation ?? '--';
  const windSpeed = location.wind_speed ?? '--';
  const windDir = location.wind_direction || '--';
  const uvIndex = location.uv_index ?? '--';
  const soilMoisture = location.soil_moisture ?? '--';
  const lastUpdate = location.last_update ? new Date(location.last_update).toLocaleString('pt-BR') : 'N/A';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{location.location_name || 'Localização'}</CardTitle>
        <p className="text-xs text-gray-500 mt-1">Atualizado: {lastUpdate}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Temperatura */}
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-orange-600" />
              <p className="text-xs text-orange-600 font-medium">Temperatura</p>
            </div>
            <p className="text-3xl font-bold text-orange-700">{temp}°C</p>
          </div>

          {/* Umidade */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-blue-600 font-medium">Umidade</p>
            </div>
            <p className="text-3xl font-bold text-blue-700">{humidity}%</p>
          </div>

          {/* Precipitação */}
          <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="w-4 h-4 text-cyan-600" />
              <p className="text-xs text-cyan-600 font-medium">Precipitação</p>
            </div>
            <p className="text-3xl font-bold text-cyan-700">{precipitation}mm</p>
          </div>

          {/* Vento */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Wind className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-purple-600 font-medium">Vento</p>
            </div>
            <p className="text-2xl font-bold text-purple-700">{windSpeed}km/h</p>
            <p className="text-xs text-purple-600 mt-1">{windDir}</p>
          </div>

          {/* UV */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-red-600" />
              <p className="text-xs text-red-600 font-medium">Índice UV</p>
            </div>
            <p className="text-3xl font-bold text-red-700">{uvIndex}</p>
          </div>

          {/* Umidade do Solo */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-green-600" />
              <p className="text-xs text-green-600 font-medium">Umidade Solo</p>
            </div>
            <p className="text-3xl font-bold text-green-700">{soilMoisture}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}