import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, Droplets, Wind, Sun, AlertTriangle, Loader2, RefreshCw, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import ClimateCard from '../components/climate/ClimateCard';
import WeatherForecast from '../components/climate/WeatherForecast';
import ClimateAlerts from '../components/climate/ClimateAlerts';
import ClimateHistory from '../components/history/ClimateHistory';
import ClimateHistoryExport from '../components/climate/ClimateHistoryExport';

export default function ClimateMonitoring() {
  const [user, setUser] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const queryClient = useQueryClient();

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

  const isConsultor = user?.user_type === 'consultor' || user?.user_type === 'equipe';

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => isConsultor
      ? base44.entities.Property.filter({ consultor_email: user.email })
      : base44.entities.Property.filter({ owner_email: user.email }),
    enabled: !!user?.email
  });

  useEffect(() => {
    if (properties.length > 0 && !selectedProperty) {
      setSelectedProperty(properties[0]);
    }
  }, [properties, selectedProperty]);

  const { data: climateData = [], refetch: refetchClimateData } = useQuery({
    queryKey: ['climateMonitoring', selectedProperty?.id],
    queryFn: () => base44.entities.ClimateMonitoring.filter({ property_id: selectedProperty?.id }, '-created_date'),
    enabled: !!selectedProperty?.id,
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const updateClimateDataMutation = useMutation({
    mutationFn: async () => {
      // 🔴 CRÍTICO #1: Validação de coordenadas
      if (!selectedProperty?.coordinates || typeof selectedProperty.coordinates !== 'string') {
        toast.error('Propriedade sem coordenadas válidas. Configure antes de atualizar.');
        console.warn('[CLIMATE] Coordenadas inválidas:', selectedProperty?.coordinates);
        return;
      }

      const parts = selectedProperty.coordinates.split(',');
      if (parts.length !== 2) {
        toast.error('Formato de coordenadas inválido. Use: latitude,longitude');
        console.warn('[CLIMATE] Formato de coordenadas errado:', selectedProperty.coordinates);
        return;
      }

      let lat, lng;
      try {
        lat = parseFloat(parts[0].trim());
        lng = parseFloat(parts[1].trim());
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          throw new Error('Coordenadas fora do intervalo válido');
        }
        console.log('[CLIMATE] Coordenadas validadas:', { lat, lng });
      } catch (e) {
        toast.error('Coordenadas inválidas. Verifique: latitude (-90 a 90), longitude (-180 a 180)');
        console.error('[CLIMATE] Erro ao parsear coordenadas:', e);
        return;
      }
      
      try {
        // 🔴 CRÍTICO #2: Tratamento de erro API robusto
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Forneça dados climáticos atuais e previsão de 7 dias para as coordenadas ${lat},${lng}. 
          Inclua: temperatura atual (número), umidade (0-100%), precipitação (mm), velocidade do vento (km/h), 
          direção do vento, índice UV (0-11), umidade do solo (0-100%), e previsão detalhada para cada dia dos próximos 7 dias.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              temperature_current: { type: "number" },
              humidity: { type: "number" },
              precipitation: { type: "number" },
              wind_speed: { type: "number" },
              wind_direction: { type: "string" },
              uv_index: { type: "number" },
              soil_moisture: { type: "number" },
              forecast_7days: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    temp_max: { type: "number" },
                    temp_min: { type: "number" },
                    precipitation_chance: { type: "number" },
                    description: { type: "string" }
                  }
                }
              }
            }
          }
        });

        // Validar resposta
        if (!response || typeof response !== 'object') {
          throw new Error('Resposta inválida da API');
        }

        console.log('[CLIMATE] Resposta da API recebida:', response);

        const cleanedResponse = {
          temperature_current: Math.isFinite(response.temperature_current) ? response.temperature_current : 0,
          humidity: Math.min(100, Math.max(0, response.humidity ?? 0)),
          precipitation: Math.isFinite(response.precipitation) ? response.precipitation : 0,
          wind_speed: Math.isFinite(response.wind_speed) ? response.wind_speed : 0,
          wind_direction: response.wind_direction?.toString() || 'N',
          uv_index: Math.isFinite(response.uv_index) ? response.uv_index : 0,
          soil_moisture: Math.min(100, Math.max(0, response.soil_moisture ?? 0)),
          forecast_7days: Array.isArray(response.forecast_7days) ? (response.forecast_7days || []).map(day => ({
            date: day?.date?.toString() || new Date().toISOString().split('T')[0],
            temp_max: Math.isFinite(day?.temp_max) ? day.temp_max : 25,
            temp_min: Math.isFinite(day?.temp_min) ? day.temp_min : 15,
            precipitation_chance: Math.min(100, Math.max(0, day?.precipitation_chance ?? 0)),
            description: day?.description?.toString() || 'Sem informação'
          })) : []
        };

        const mainLocation = climateData.find(c => c.location_name === `Principal - ${selectedProperty.property_name}`);
        
        if (mainLocation) {
          await base44.entities.ClimateMonitoring.update(mainLocation.id, {
            ...cleanedResponse,
            last_update: new Date().toISOString()
          });
          console.log('[CLIMATE] Registro atualizado:', mainLocation.id);
        } else {
          await base44.entities.ClimateMonitoring.create({
            property_id: selectedProperty.id,
            location_name: `Principal - ${selectedProperty.property_name}`,
            coordinates: selectedProperty.coordinates,
            ...cleanedResponse,
            last_update: new Date().toISOString(),
            data_source: 'API Pública',
            alerts: []
          });
          console.log('[CLIMATE] Novo registro criado');
        }

        await refetchClimateData();
        setSelectedLocation(null);
        toast.success('Dados climáticos atualizados com sucesso!');
      } catch (error) {
        console.error('[CLIMATE] Erro ao buscar dados:', error);
        toast.error(error?.message || 'Erro ao buscar dados climáticos. Tente novamente.');
      }
    },
    onError: (error) => {
      console.error('[CLIMATE] Erro na mutação:', error);
      toast.error('Erro ao atualizar dados climáticos');
    }
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <h1 className="text-3xl font-bold">Monitoramento Climático</h1>
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Cloud className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma propriedade encontrada. Cadastre uma propriedade para começar.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentProperty = selectedProperty || properties[0];
  const currentLocation = selectedLocation || climateData[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Cloud className="w-8 h-8 text-blue-600" />
          Monitoramento Climático e Previsões
        </h1>
        <p className="text-gray-600">{isConsultor ? 'Acompanhe dados meteorológicos em tempo real por localização do cliente' : 'Acompanhe dados meteorológicos em tempo real da sua propriedade'}</p>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-blue-800 text-sm">
            Monitore temperatura, umidade, precipitação e outras variáveis climáticas por zona da propriedade. 
            Receba alertas para eventos climáticos extremos e planeje melhor suas atividades agrícolas.
          </p>
        </CardContent>
      </Card>

      {/* Seletor de Propriedade */}
      {properties.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <label className="text-sm font-medium text-gray-700 mb-2 block">{isConsultor ? 'Selecione o Cliente' : 'Selecione a Propriedade'}</label>
            <select
              value={currentProperty?.id || ''}
              onChange={(e) => {
                const prop = properties.find(p => p.id === e.target.value);
                setSelectedProperty(prop);
                setSelectedLocation(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {properties.map(prop => (
                <option key={prop.id} value={prop.id}>
                  {prop.property_name} - {prop.city}/{prop.state}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {currentProperty && (
        <>
          {/* Botão Atualizar */}
          <div className="flex gap-2 flex-wrap">
            {!currentProperty?.coordinates && (
              <Card className="w-full border-amber-200 bg-amber-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-900"><strong>Aviso:</strong> Esta propriedade não possui coordenadas GPS. Configure as coordenadas antes de atualizar.</p>
                </CardContent>
              </Card>
            )}
            <Button
              onClick={() => {
                if (!currentProperty?.coordinates) {
                  toast.error('Propriedade sem coordenadas. Configure antes de atualizar.');
                  return;
                }
                updateClimateDataMutation.mutate();
              }}
              disabled={updateClimateDataMutation.isPending || !currentProperty?.coordinates}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateClimateDataMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar Dados Climáticos
                </>
              )}
            </Button>
          </div>

          {/* Localizações */}
          {climateData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Localizações Monitoradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {climateData.map(location => (
                    <button
                      key={location.id}
                      onClick={() => setSelectedLocation(location)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedLocation?.id === location.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <p className="font-medium text-sm text-gray-900">{location.location_name}</p>
                      <p className="text-xs text-gray-600 mt-1">{location.temperature_current}°C</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dados Climáticos Atuais */}
          {currentLocation && (
            <>
              <ClimateCard location={currentLocation} />
              <WeatherForecast forecast={currentLocation.forecast_7days} />
              {currentLocation.alerts?.length > 0 && (
                <ClimateAlerts alerts={currentLocation.alerts} />
              )}
              <ClimateHistoryExport 
                climateRecord={currentLocation} 
                propertyName={currentProperty.property_name} 
              />
              <ClimateHistory records={climateData} />
            </>
          )}

          {climateData.length === 0 && (
            <Card className="bg-gray-50 border-dashed">
              <CardContent className="pt-6 text-center">
                <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Clique em "Atualizar Dados Climáticos" para começar o monitoramento</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}