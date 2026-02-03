import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, Droplets, Wind, Sun, Thermometer, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClimateHistory({ records }) {
  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.last_update || b.created_date) - new Date(a.last_update || a.created_date)
  );

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'Crítica': return '🚨';
      case 'Alta': return '⚠️';
      case 'Média': return '⚡';
      case 'Baixa': return 'ℹ️';
      default: return '📊';
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'Crítica': return 'bg-red-100 text-red-700 border-red-300';
      case 'Alta': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'Média': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Baixa': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-emerald-600" />
          Histórico Climático
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Cloud className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum registro climático disponível</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRecords.map((record, index) => (
              <div 
                key={record.id || index}
                className="relative pl-8 pb-4 border-l-2 border-blue-200 last:border-l-0 last:pb-0"
              >
                <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-600 border-4 border-white" />
                
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg border border-blue-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-900">
                          {record.last_update ? 
                            format(parseISO(record.last_update), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) :
                            format(parseISO(record.created_date), "dd/MM/yyyy", { locale: ptBR })
                          }
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{record.location_name}</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700">
                      {record.data_source || 'API Pública'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {record.temperature_current !== undefined && (
                      <div className="bg-white rounded-md p-2 border border-blue-100">
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                          <Thermometer className="w-3 h-3" />
                          Temperatura
                        </div>
                        <p className="text-lg font-bold text-gray-900">{record.temperature_current}°C</p>
                      </div>
                    )}
                    
                    {record.humidity !== undefined && (
                      <div className="bg-white rounded-md p-2 border border-blue-100">
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                          <Droplets className="w-3 h-3" />
                          Umidade
                        </div>
                        <p className="text-lg font-bold text-gray-900">{record.humidity}%</p>
                      </div>
                    )}
                    
                    {record.precipitation !== undefined && (
                      <div className="bg-white rounded-md p-2 border border-blue-100">
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                          <Cloud className="w-3 h-3" />
                          Precipitação
                        </div>
                        <p className="text-lg font-bold text-gray-900">{record.precipitation}mm</p>
                      </div>
                    )}
                    
                    {record.wind_speed !== undefined && (
                      <div className="bg-white rounded-md p-2 border border-blue-100">
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                          <Wind className="w-3 h-3" />
                          Vento
                        </div>
                        <p className="text-lg font-bold text-gray-900">{record.wind_speed}km/h</p>
                      </div>
                    )}
                  </div>

                  {record.alerts && record.alerts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-700">Alertas:</p>
                      {record.alerts.map((alert, idx) => (
                        <div 
                          key={idx}
                          className={`flex items-start gap-2 p-2 rounded-lg border ${getAlertColor(alert.severity)}`}
                        >
                          <span className="text-lg">{getAlertIcon(alert.severity)}</span>
                          <div className="flex-1">
                            <p className="text-xs font-semibold">{alert.type}</p>
                            <p className="text-xs mt-1">{alert.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}