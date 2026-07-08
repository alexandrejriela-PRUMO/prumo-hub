import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, Droplets, Wind, Sun, AlertTriangle, Loader2, RefreshCw, MapPin, History } from 'lucide-react';
import { toast } from 'sonner';
import ClimateCard from '../components/climate/ClimateCard';
import WeatherForecast from '../components/climate/WeatherForecast';
import ClimateAlerts from '../components/climate/ClimateAlerts';
import ClimateHistory from '../components/history/ClimateHistory';
import ClimateHistoryExport from '../components/climate/ClimateHistoryExport';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

export default function ClimateMonitoring() {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const queryClient = useQueryClient();

  const { effectiveEmail, userType, isLoading: loadingUser } = useEffectiveUser();
  const isConsultor = userType === 'consultor' || userType === 'equipe_consultor' || userType === 'equipe';

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', effectiveEmail, userType],
    queryFn: async () => {
      if (isConsultor) {
        const res = await base44.functions.invoke('listConsultorClients', {});
        return res.data?.properties || [];
      }
      return base44.entities.Property.filter({ owner_email: effectiveEmail });
    },
    enabled: !!effectiveEmail
  });

  useEffect(() => {
    if (properties.length > 0 && !selectedProperty) {
      setSelectedProperty(properties[0]);
    }
  }, [properties, selectedProperty]);

  const { data: climateData = [], refetch: refetchClimateData } = useQuery({
    queryKey: ['climateMonitoring', selectedProperty?.id],
    queryFn: async () => {
      if (isConsultor) {
        const res = await base44.functions.invoke('listConsultorPropertyRecords', { entity_name: 'ClimateMonitoring', field_name: 'property_id' });
        return (res.data?.records || []).filter(r => r.property_id === selectedProperty?.id);
      }
      return base44.entities.ClimateMonitoring.filter({ property_id: selectedProperty?.id }, '-created_date');
    },
    enabled: !!selectedProperty?.id,
    staleTime: 0,
    refetchOnWindowFocus: true
  });

  const importHistoryMutation = useMutation({
    mutationFn: async () => {
      const prop = selectedProperty;
      let lat, lng;

      if (prop?.coordinates) {
        const parts = prop.coordinates.split(',');
        lat = parseFloat(parts[0]?.trim());
        lng = parseFloat(parts[1]?.trim());
      }

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        toast.error('Propriedade sem coordenadas GPS. Configure latitude/longitude para importar histórico real.');
        return;
      }

      const response = await base44.functions.invoke('fetchClimateHistory', {
        property_id: prop.id,
        lat,
        lng,
        days: 365
      });

      if (response.data?.error) throw new Error(response.data.error);

      await refetchClimateData();
      toast.success(`Histórico importado: ${response.data.days_imported} dias (${response.data.start_date} a ${response.data.end_date})`);
    },
    onError: (error) => {
      toast.error(error?.message || 'Erro ao importar histórico climático');
    }
  });

  const updateClimateDataMutation = useMutation({
    mutationFn: async () => {
      const prop = selectedProperty;

      // Requer coordenadas GPS para dados precisos via Open-Meteo
      let lat, lng;
      if (prop?.coordinates && typeof prop.coordinates === 'string') {
        const parts = prop.coordinates.split(',');
        if (parts.length === 2) {
          const parsedLat = parseFloat(parts[0].trim());
          const parsedLng = parseFloat(parts[1].trim());
          if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
            lat = parsedLat;
            lng = parsedLng;
          }
        }
      }

      if (!lat || !lng) {
        toast.error('Coordenadas GPS obrigatórias para dados climáticos precisos. Configure latitude/longitude na propriedade.');
        return;
      }

      // Open-Meteo Forecast API — dados oficiais WMO/ECMWF, gratuita, sem API key
      // Inclui dados atuais (current) + previsão 7 dias (daily) + umidade do solo (hourly)
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,uv_index` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode` +
        `&hourly=soil_moisture_0_to_1cm` +
        `&timezone=America%2FSao_Paulo&forecast_days=7`;

      const resp = await fetch(forecastUrl);
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Open-Meteo Forecast error: ${txt}`);
      }
      const data = await resp.json();

      const cur = data.current;
      const daily = data.daily;
      const hourly = data.hourly;

      // Direção do vento: graus → cardinal
      const windDegToCardinal = (deg) => {
        const dirs = ['N','NE','L','SE','S','SO','O','NO'];
        return dirs[Math.round(deg / 45) % 8] || 'N';
      };

      // WMO Weather code → descrição em português
      const wmoDescription = (code) => {
        if (code <= 1) return 'Céu limpo';
        if (code <= 3) return 'Parcialmente nublado';
        if (code <= 49) return 'Neblina / névoa';
        if (code <= 59) return 'Garoa';
        if (code <= 69) return 'Chuva';
        if (code <= 79) return 'Neve / granizo';
        if (code <= 82) return 'Chuva forte';
        if (code <= 86) return 'Neve forte';
        if (code <= 99) return 'Tempestade';
        return 'Sem informação';
      };

      // Umidade do solo: média das primeiras 6 horas disponíveis (0-1 cm, escala 0-1 → %)
      const soilRaw = hourly?.soil_moisture_0_to_1cm?.slice(0, 6) || [];
      const soilMoisture = soilRaw.length > 0
        ? Math.round(soilRaw.reduce((a, v) => a + (v ?? 0), 0) / soilRaw.length * 100)
        : 0;

      const cleanedResponse = {
        temperature_current: cur?.temperature_2m ?? 0,
        humidity: Math.min(100, Math.max(0, cur?.relative_humidity_2m ?? 0)),
        precipitation: cur?.precipitation ?? 0,
        wind_speed: cur?.wind_speed_10m ?? 0,
        wind_direction: windDegToCardinal(cur?.wind_direction_10m ?? 0),
        uv_index: cur?.uv_index ?? 0,
        soil_moisture: Math.min(100, Math.max(0, soilMoisture)),
        forecast_7days: (daily?.time || []).map((date, i) => ({
          date,
          temp_max: daily.temperature_2m_max?.[i] ?? 0,
          temp_min: daily.temperature_2m_min?.[i] ?? 0,
          precipitation_chance: Math.min(100, Math.max(0, daily.precipitation_probability_max?.[i] ?? 0)),
          description: wmoDescription(daily.weathercode?.[i] ?? 0)
        }))
      };

      const mainLocation = climateData.find(c => c.location_name === `Principal - ${selectedProperty.property_name}`);

      // Montar entrada histórica do dia com dados reais da API
      const todayStr = new Date().toISOString().split('T')[0];
      const newHistoricalEntry = {
        date: todayStr,
        temperature_max: daily?.temperature_2m_max?.[0] ?? cleanedResponse.temperature_current,
        temperature_min: daily?.temperature_2m_min?.[0] ?? cleanedResponse.temperature_current,
        precipitation: daily?.precipitation_sum?.[0] ?? cleanedResponse.precipitation,
        humidity_avg: cleanedResponse.humidity,
        climate_events: []
      };

      if (mainLocation) {
        const existingHistory = Array.isArray(mainLocation.historical_records) ? mainLocation.historical_records : [];
        const filteredHistory = existingHistory.filter(r => r.date !== todayStr);
        const updatedHistory = [...filteredHistory, newHistoricalEntry].slice(-365);

        await base44.entities.ClimateMonitoring.update(mainLocation.id, {
          ...cleanedResponse,
          last_update: new Date().toISOString(),
          data_source: 'Open-Meteo (WMO/ECMWF)',
          historical_records: updatedHistory
        });
      } else {
        await base44.entities.ClimateMonitoring.create({
          property_id: selectedProperty.id,
          location_name: `Principal - ${selectedProperty.property_name}`,
          coordinates: selectedProperty.coordinates,
          ...cleanedResponse,
          last_update: new Date().toISOString(),
          data_source: 'Open-Meteo (WMO/ECMWF)',
          alerts: [],
          historical_records: [newHistoricalEntry]
        });
      }

      await refetchClimateData();
      setSelectedLocation(null);
      toast.success('Dados climáticos atualizados — fonte: Open-Meteo (WMO/ECMWF)');
    },
    onError: (error) => {
      console.error('[CLIMATE] Erro na mutação:', error);
      toast.error(error?.message || 'Erro ao atualizar dados climáticos');
    }
  });

  if (loadingUser) {
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
                  <p className="text-sm text-amber-900">
                    <strong>Coordenadas GPS obrigatórias.</strong> Configure latitude/longitude na propriedade para buscar dados climáticos oficiais (Open-Meteo / WMO).
                  </p>
                </CardContent>
              </Card>
            )}
            <Button
              onClick={() => updateClimateDataMutation.mutate()}
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

            {climateData.length > 0 && (
              <Button
                onClick={() => importHistoryMutation.mutate()}
                disabled={importHistoryMutation.isPending || !currentProperty?.coordinates}
                variant="outline"
                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                title={!currentProperty?.coordinates ? 'Coordenadas GPS necessárias para importar histórico real' : ''}
              >
                {importHistoryMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <History className="w-4 h-4 mr-2" />
                    Importar Histórico Real (1 ano)
                  </>
                )}
              </Button>
            )}
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
                      <p className="font-medium text-sm text-gray-900">{location.location_name || currentProperty.property_name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {location.temperature_current != null ? `${location.temperature_current}°C` : 
                         location.historical_records?.length > 0 ? `${location.historical_records.length} dias` : 'Sem dados atuais'}
                      </p>
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

          {/* Histórico Exportável — usa o primeiro registro com historical_records, independente de currentLocation */}
          {climateData.length > 0 && (() => {
            const recordWithHistory = climateData.find(r => r.historical_records && r.historical_records.length > 0) || climateData[0];
            return (
              <>
                <ClimateHistoryExport
                  climateRecord={recordWithHistory}
                  propertyName={currentProperty.property_name}
                />
              </>
            );
          })()}

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