import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Zap, Calendar, TrendingDown, Leaf } from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';

export default function MapBiomasAlerts({ selectedProperty, selectedPropertyId }) {
  const [isManualSyncRunning, setIsManualSyncRunning] = useState(false);
  const queryClient = useQueryClient();

  const { data: mapbiomasAlerts = [], isLoading } = useQuery({
    queryKey: ['mapbiomas-alerts', selectedPropertyId],
    queryFn: () => base44.entities.EnvironmentalAlert.filter(
      { property_id: selectedPropertyId, data_source: 'MapBiomas' },
      '-detection_date'
    ),
    enabled: !!selectedPropertyId
  });

  const handleManualSync = async () => {
    setIsManualSyncRunning(true);
    try {
      const response = await base44.functions.invoke('syncMapBiomasAlerts', {});
      
      if (response.data.success) {
        const { synced, cars_monitored, total_alerts_found } = response.data;
        if (synced > 0) {
          toast.success(`✅ ${synced} alerta(s) sincronizado(s)! ${cars_monitored} CAR(s) monitorado(s).`);
          await queryClient.invalidateQueries(['mapbiomas-alerts']);
          await queryClient.invalidateQueries(['environmental-alerts']);
        } else {
          toast.info(`ℹ️ Sincronização concluída. ${cars_monitored} CAR(s) monitorado(s), ${total_alerts_found} alerta(s) encontrado(s). Nenhum novo alerta para adicionar.`);
        }
      } else {
        toast.info(response.data.message || 'Nenhum novo alerta detectado');
      }
    } catch (error) {
      toast.error('Erro ao sincronizar: ' + error.message);
    } finally {
      setIsManualSyncRunning(false);
    }
  };

  if (!selectedProperty?.car_number) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900">CAR Não Cadastrado</h3>
              <p className="text-sm text-amber-800 mt-1">
                Para sincronizar alertas do MapBiomas, é necessário cadastrar o número do CAR desta propriedade.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Leaf className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-emerald-900">Integração MapBiomas Alerta</h3>
                  <p className="text-sm text-emerald-800 mt-1">
                    Sincronização automática mensal de alertas de desmatamento da plataforma MapBiomas Alerta para o CAR <strong>{selectedProperty.car_number}</strong>.
                  </p>
                  <p className="text-xs text-emerald-700 mt-2">
                    ⏰ Próxima sincronização automática: 1º de cada mês às 01h00 (horário de São Paulo)
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleManualSync}
                disabled={isManualSyncRunning}
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isManualSyncRunning ? 'animate-spin' : ''}`} />
                Sincronizar Agora
              </Button>
            </div>
            
            {/* Manual Alert Registration */}
            <div className="border-t pt-4 mt-4">
              <p className="text-xs font-medium text-emerald-700 mb-3">
                💡 Não consegue sincronizar? Registre manualmente o alerta PDF:
              </p>
              <div className="flex gap-2">
                <input 
                  type="file" 
                  id="pdf-upload"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      toast.info('Funcionalidade em desenvolvimento - envie o PDF para análise manual');
                    }
                  }}
                />
                <Button 
                  onClick={() => document.getElementById('pdf-upload').click()}
                  variant="ghost"
                  size="sm"
                  className="text-emerald-700 hover:bg-emerald-100"
                >
                  📄 Importar PDF do Alerta
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Alertas</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{mapbiomasAlerts.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Críticos</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {mapbiomasAlerts.filter(a => a.severity === 'Crítica').length}
                </p>
              </div>
              <Zap className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Abertos</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {mapbiomasAlerts.filter(a => a.status === 'Aberto').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Carregando alertas...</p>
          </CardContent>
        </Card>
      ) : mapbiomasAlerts.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-12 text-center">
            <Leaf className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Nenhum alerta MapBiomas</h3>
            <p className="text-gray-500 mt-1">Esta propriedade está sem alertas de desmatamento detectados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {mapbiomasAlerts.map(alert => (
            <Card key={alert.id} className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                    </div>
                    <Badge className={
                      alert.severity === 'Crítica' ? 'bg-red-100 text-red-700' :
                      alert.severity === 'Alta' ? 'bg-orange-100 text-orange-700' :
                      alert.severity === 'Média' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }>
                      {alert.severity}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-gray-600">
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
                    <Badge variant="outline" className="text-xs">
                      {alert.status}
                    </Badge>
                  </div>

                  {alert.recommended_actions && alert.recommended_actions.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-gray-700 mb-2">Ações Recomendadas:</p>
                      <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                        {alert.recommended_actions.map((action, idx) => (
                          <li key={idx}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}