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

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: climateData = [] } = useQuery({
    queryKey: ['climateMonitoring', selectedProperty?.id],
    queryFn: () => base44.entities.ClimateMonitoring.filter({ property_id: selectedProperty?.id }, '-created_date'),
    enabled: !!selectedProperty?.id
  });

  const updateClimateDataMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProperty?.coordinates) {
        toast.error('Propriedade sem coordenadas');
        return;
      }

      const [lat, lng] = selectedProperty.coordinates.split(',').map(c => c.trim());
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Forneça dados climáticos atuais e previsão de 7 dias para as coordenadas ${lat},${lng}. 
        Inclua: temperatura atual, umidade, precipitação recente, velocidade do vento, direção do vento, índice UV, 
        umidade do solo, e previsão detalhada para cada dia dos próximos 7 dias.`,
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

      const mainLocation = climateData.find(c => c.location_name === `Principal - ${selectedProperty.property_name}`);
      
      if (mainLocation) {
        await base44.entities.ClimateMonitoring.update(mainLocation.id, {
          ...response,
          last_update: new Date().toISOString()
        });
      } else {
        await base44.entities.ClimateMonitoring.create({
          property_id: selectedProperty.id,
          location_name: `Principal - ${selectedProperty.property_name}`,
          coordinates: selectedProperty.coordinates,
          ...response,
          last_update: new Date().toISOString(),
          data_source: 'API Pública'
        });
      }

      queryClient.invalidateQueries({ queryKey: ['climateMonitoring'] });
      toast.success('Dados climáticos atualizados com sucesso!');
    }
  });

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-600">Carregando...</p></div>;
  }

  const currentProperty = selectedProperty || properties[0];
  const currentLocation = selectedLocation || climateData[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Cloud className="w-8 h-8 text-blue-600" />
          Monitoramento Climático e Previsões
        </h1>
        <p className="text-gray-600">Acompanhe dados meteorológicos em tempo real por localização na propriedade</p>
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
            <label className="text-sm font-medium text-gray-700 mb-2 block">Selecione a Propriedade</label>
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
          <div className="flex gap-2">
            <Button
              onClick={() => updateClimateDataMutation.mutate()}
              disabled={updateClimateDataMutation.isPending}
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