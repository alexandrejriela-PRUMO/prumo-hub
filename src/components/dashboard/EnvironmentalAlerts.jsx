import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AlertTriangle, TreePine, MapPin, Leaf, ChevronRight, Calendar, TrendingUp } from 'lucide-react';
import moment from 'moment';

export default function EnvironmentalAlerts({ alerts = [] }) {
  const activeAlerts = alerts.filter(a => a.status === 'Ativo').slice(0, 4);

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

  const totalCritical = alerts.filter(a => a.severity === 'Crítica' && a.status === 'Ativo').length;
  const totalHigh = alerts.filter(a => a.severity === 'Alta' && a.status === 'Ativo').length;
  const totalActive = alerts.filter(a => a.status === 'Ativo').length;

  return (
    <Card className="border-2 border-emerald-100 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-emerald-600" />
            Alertas Ambientais
          </CardTitle>
          {(totalCritical > 0 || totalHigh > 0) && (
            <div className="flex gap-2">
              {totalCritical > 0 && (
                <Badge className="bg-red-100 text-red-700 border border-red-300">
                  {totalCritical} Crítico{totalCritical > 1 ? 's' : ''}
                </Badge>
              )}
              {totalHigh > 0 && (
                <Badge className="bg-orange-100 text-orange-700 border border-orange-300">
                  {totalHigh} Alta{totalHigh > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Summary Stats */}
        {totalActive > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs text-gray-600 mb-1">Total Ativo</p>
              <p className="text-2xl font-bold text-red-700">{totalActive}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs text-gray-600 mb-1">Alta/Crítica</p>
              <p className="text-2xl font-bold text-orange-700">{totalCritical + totalHigh}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Últimos 7 dias</p>
              <p className="text-2xl font-bold text-blue-700">
                {alerts.filter(a => {
                  const daysDiff = moment().diff(moment(a.detection_date), 'days');
                  return daysDiff <= 7;
                }).length}
              </p>
            </div>
          </div>
        )}

        {activeAlerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Leaf className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-600 font-medium">Nenhum alerta ambiental ativo</p>
            <p className="text-sm text-gray-500 mt-1">Sua propriedade está em conformidade ambiental</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((alert, idx) => {
              const severity = severityConfig[alert.severity];
              const TypeIcon = typeIcons[alert.alert_type] || AlertTriangle;

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-2 ${severity.border} ${severity.bg} transition-all hover:shadow-md`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-white border ${severity.border}`}>
                      <TypeIcon className={`w-5 h-5 ${severity.icon}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-semibold ${severity.text} text-sm`}>
                          {alert.title}
                        </h4>
                        <Badge className={`${severity.bg} ${severity.text} text-xs px-2 py-0.5`}>
                          {alert.alert_type}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                        {alert.description}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {moment(alert.detection_date).format('DD/MM/YYYY')}
                        </div>
                        {alert.affected_area_hectares && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {alert.affected_area_hectares.toFixed(2)} ha
                          </div>
                        )}
                        {alert.data_source && (
                          <Badge variant="outline" className="text-xs">
                            {alert.data_source}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <Link to={createPageUrl('EnvironmentalAlerts')}>
              <Button variant="outline" className="w-full mt-4 group">
                Ver Todos os Alertas Ambientais
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}