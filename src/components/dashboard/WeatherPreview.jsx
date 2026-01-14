import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Cloud, CloudRain, Sun, Wind, Droplets, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function WeatherPreview({ propertyId }) {
  const { data: climateData, isLoading } = useQuery({
    queryKey: ['climate-monitoring', propertyId],
    queryFn: () => base44.entities.ClimateMonitoring.filter({ property_id: propertyId }),
    enabled: !!propertyId,
    initialData: []
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (!climateData || climateData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-gray-500">
          Sem dados de clima disponíveis
        </CardContent>
      </Card>
    );
  }

  const climate = climateData[0];

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-600" />
          Monitoramento Climático
        </CardTitle>
        <p className="text-xs text-gray-500">{climate.location_name}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Temperatura e Condição Atual */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-xs text-gray-600 mb-1">Temperatura</p>
            <p className="text-3xl font-bold text-blue-600">{climate.temperature_current}°C</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-xs text-gray-600 mb-1">Umidade</p>
            <p className="text-3xl font-bold text-cyan-600">{climate.humidity}%</p>
          </div>
        </div>

        {/* Detalhes */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-blue-100">
            <CloudRain className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-600">Precipitação</p>
              <p className="font-semibold text-gray-900">{climate.precipitation}mm</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-blue-100">
            <Wind className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-600">Vento</p>
              <p className="font-semibold text-gray-900">{climate.wind_speed}km/h</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-blue-100">
            <Droplets className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-600">Solo</p>
              <p className="font-semibold text-gray-900">{climate.soil_moisture}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-blue-100">
            <Sun className="w-4 h-4 text-yellow-500" />
            <div>
              <p className="text-xs text-gray-600">UV</p>
              <p className="font-semibold text-gray-900">{climate.uv_index}</p>
            </div>
          </div>
        </div>

        {/* Previsão 7 dias */}
        {climate.forecast_7days && climate.forecast_7days.length > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-100">
            <p className="text-xs font-semibold text-gray-700 mb-3">Previsão 7 dias</p>
            <div className="grid grid-cols-7 gap-2">
              {climate.forecast_7days.slice(0, 7).map((forecast, idx) => (
                <div key={idx} className="bg-white rounded-lg p-2 text-center border border-blue-100">
                  <p className="text-xs text-gray-600 mb-1">
                    {new Date(forecast.date).toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </p>
                  <p className="text-lg font-bold text-blue-600">{forecast.temp_max}°</p>
                  <p className="text-xs text-gray-500">{forecast.temp_min}°</p>
                  <p className="text-xs text-blue-500 mt-1">{forecast.precipitation_chance}%</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alertas Climáticos */}
        {climate.alerts && climate.alerts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-100">
            <p className="text-xs font-semibold text-gray-700 mb-2">Alertas Climáticos</p>
            <div className="space-y-2">
              {climate.alerts.map((alert, idx) => (
                <div key={idx} className={`text-xs rounded-lg p-2 ${
                  alert.severity === 'Crítica' ? 'bg-red-100 text-red-800' :
                  alert.severity === 'Alta' ? 'bg-orange-100 text-orange-800' :
                  alert.severity === 'Média' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  <p className="font-semibold">{alert.type} - {alert.severity}</p>
                  <p>{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}