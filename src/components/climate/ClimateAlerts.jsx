import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CloudLightning, Droplets, Wind, Sun } from 'lucide-react';

export default function ClimateAlerts({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  const iconMap = {
    'Chuva Intensa': <Droplets className="w-4 h-4" />,
    'Seca': <Sun className="w-4 h-4" />,
    'Geada': <AlertTriangle className="w-4 h-4" />,
    'Tempestade': <CloudLightning className="w-4 h-4" />,
    'Vento Forte': <Wind className="w-4 h-4" />,
  };

  const severityColors = {
    'Baixa': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Média': 'bg-orange-100 text-orange-800 border-orange-300',
    'Alta': 'bg-red-100 text-red-800 border-red-300',
    'Crítica': 'bg-red-200 text-red-900 border-red-400'
  };

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          Alertas Climáticos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div key={idx} className={`p-3 rounded-lg border ${severityColors[alert.severity]}`}>
              <div className="flex items-start gap-2">
                {iconMap[alert.type] || <AlertTriangle className="w-4 h-4" />}
                <div className="flex-1">
                  <p className="font-semibold text-sm">{alert.type}</p>
                  <p className="text-xs mt-1">{alert.message}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {new Date(alert.date).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {alert.severity}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}