import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MapLegend() {
  const severityItems = [
    { label: 'Crítica', color: '#dc2626' },
    { label: 'Alta', color: '#ea580c' },
    { label: 'Média', color: '#ca8a04' },
    { label: 'Baixa', color: '#2563eb' }
  ];

  const dataLayers = [
    { name: 'PRODES', description: 'Desmatamento (INPE)', available: false },
    { name: 'DETER', description: 'Alertas em tempo real', available: false },
    { name: 'MapBiomas', description: 'Uso e cobertura do solo', available: false },
    { name: 'Google Earth Engine', description: 'Índices de vegetação', available: false }
  ];

  return (
    <Card className="absolute bottom-4 left-4 z-[1000] max-w-xs shadow-lg">
      <CardContent className="p-3">
        <div className="space-y-3">
          {/* Severity Legend */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Gravidade dos Alertas</h4>
            <div className="space-y-1">
              {severityItems.map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-gray-700">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Layers Info */}
          <div className="border-t pt-2">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Camadas Geoespaciais</h4>
            <div className="space-y-1">
              {dataLayers.map(layer => (
                <div key={layer.name} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-gray-700">{layer.name}</p>
                    <p className="text-[10px] text-gray-500">{layer.description}</p>
                  </div>
                  {!layer.available && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      Backend
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-2">
            <p className="text-[10px] text-gray-600">
              💡 Use o controle de camadas (canto superior direito) para alternar visualizações
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}