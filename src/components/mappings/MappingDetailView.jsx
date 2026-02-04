import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Map,
  Layers,
  TrendingUp,
  Droplets,
  Wind,
  Mountain,
  Target,
  Tractor,
  FileText
} from 'lucide-react';

export default function MappingDetailView({ mapping }) {
  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="general">Geral</TabsTrigger>
        <TabsTrigger value="technical">Técnico</TabsTrigger>
        <TabsTrigger value="analysis">Análise</TabsTrigger>
        <TabsTrigger value="prescription">Prescrição</TabsTrigger>
      </TabsList>

      {/* General Tab */}
      <TabsContent value="general" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Título</p>
              <p className="font-semibold">{mapping.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tipo</p>
              <Badge>{mapping.mapping_type}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Data do Mapeamento</p>
              <p className="font-semibold">{new Date(mapping.mapping_date).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Área</p>
              <p className="font-semibold">{mapping.area_hectares} ha</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Descrição</p>
              <p className="text-gray-700">{mapping.description || 'Sem descrição'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Talhões */}
        {mapping.field_plots && mapping.field_plots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Talhões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mapping.field_plots.map((plot, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border-l-4 border-emerald-500">
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Talhão</p>
                        <p className="font-semibold">{plot.plot_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Área</p>
                        <p className="font-semibold">{plot.area_ha} ha</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cultura</p>
                        <p className="font-semibold">{plot.crop}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Safra</p>
                        <p className="font-semibold">{plot.harvest_year}</p>
                      </div>
                      {plot.usage_history && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-500">Histórico de Uso</p>
                          <p className="text-sm text-gray-700">{plot.usage_history}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Technical Tab */}
      <TabsContent value="technical" className="space-y-4">
        {/* Dados de Solo */}
        {mapping.soil_data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Mapa de Solo
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-700 mb-1">Textura</p>
                <p className="text-lg font-bold text-amber-900">{mapping.soil_data.texture || 'Não informado'}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-700 mb-1">Teor de Argila</p>
                <p className="text-lg font-bold text-amber-900">{mapping.soil_data.clay_content ? `${mapping.soil_data.clay_content}%` : 'Não informado'}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-700 mb-1">pH</p>
                <p className="text-lg font-bold text-amber-900">{mapping.soil_data.ph || 'Não informado'}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-700 mb-1">Matéria Orgânica</p>
                <p className="text-lg font-bold text-amber-900">{mapping.soil_data.organic_matter ? `${mapping.soil_data.organic_matter} g/dm³` : 'Não informado'}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg md:col-span-2">
                <p className="text-xs text-amber-700 mb-1">Capacidade Produtiva</p>
                <p className="text-lg font-bold text-amber-900">{mapping.soil_data.productive_capacity || 'Não avaliada'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fertilidade */}
        {mapping.soil_fertility && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Fertilidade do Solo
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700 mb-1">Fósforo (P)</p>
                <p className="text-lg font-bold text-green-900">{mapping.soil_fertility.phosphorus ? `${mapping.soil_fertility.phosphorus} mg/dm³` : 'Não informado'}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700 mb-1">Potássio (K)</p>
                <p className="text-lg font-bold text-green-900">{mapping.soil_fertility.potassium ? `${mapping.soil_fertility.potassium} mmolc/dm³` : 'Não informado'}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700 mb-1">Cálcio</p>
                <p className="text-lg font-bold text-green-900">{mapping.soil_fertility.calcium ? `${mapping.soil_fertility.calcium} mmolc/dm³` : 'Não informado'}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700 mb-1">Magnésio</p>
                <p className="text-lg font-bold text-green-900">{mapping.soil_fertility.magnesium ? `${mapping.soil_fertility.magnesium} mmolc/dm³` : 'Não informado'}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700 mb-1">Saturação por Bases</p>
                <p className="text-lg font-bold text-green-900">{mapping.soil_fertility.base_saturation ? `${mapping.soil_fertility.base_saturation}%` : 'Não informado'}</p>
              </div>
              {mapping.soil_fertility.correction_needed && (
                <div className="p-3 bg-yellow-50 rounded-lg md:col-span-3">
                  <p className="text-xs text-yellow-700 mb-1">Necessidade de Correção</p>
                  <p className="text-sm text-yellow-900">{mapping.soil_fertility.correction_needed}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Umidade e Drenagem */}
        {mapping.moisture_drainage && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="w-5 h-5" />
                Umidade e Drenagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 mb-1">Umidade do Solo</p>
                  <p className="text-lg font-bold text-blue-900">{mapping.moisture_drainage.soil_moisture ? `${mapping.moisture_drainage.soil_moisture}%` : 'Não medida'}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 mb-1">Risco de Compactação</p>
                  <Badge className={
                    mapping.moisture_drainage.compaction_risk === 'Alto' ? 'bg-red-600' :
                    mapping.moisture_drainage.compaction_risk === 'Médio' ? 'bg-yellow-600' :
                    'bg-green-600'
                  }>{mapping.moisture_drainage.compaction_risk || 'Não avaliado'}</Badge>
                </div>
              </div>
              {mapping.moisture_drainage.waterlogged_areas && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 mb-1">Áreas Encharcadas</p>
                  <p className="text-sm text-blue-900">{mapping.moisture_drainage.waterlogged_areas}</p>
                </div>
              )}
              {mapping.moisture_drainage.water_deficit && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-semibold text-red-900">⚠️ Deficiência hídrica detectada</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Curvas de Nível */}
        {mapping.contour_slope && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mountain className="w-5 h-5" />
                Curvas de Nível e Declividade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-700 mb-1">Declividade</p>
                  <p className="text-lg font-bold text-slate-900">{mapping.contour_slope.terrain_slope ? `${mapping.contour_slope.terrain_slope}%` : 'Não medida'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-700 mb-1">Risco de Erosão</p>
                  <Badge className={
                    mapping.contour_slope.erosion_risk === 'Muito Alto' || mapping.contour_slope.erosion_risk === 'Alto' ? 'bg-red-600' :
                    mapping.contour_slope.erosion_risk === 'Médio' ? 'bg-yellow-600' :
                    'bg-green-600'
                  }>{mapping.contour_slope.erosion_risk || 'Não avaliado'}</Badge>
                </div>
              </div>
              {mapping.contour_slope.planting_direction && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-700 mb-1">Direcionamento de Plantio</p>
                  <p className="text-sm text-slate-900">{mapping.contour_slope.planting_direction}</p>
                </div>
              )}
              {mapping.contour_slope.terrace_planning && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-700 mb-1">Planejamento de Terraços</p>
                  <p className="text-sm text-slate-900">{mapping.contour_slope.terrace_planning}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tráfego e Compactação */}
        {mapping.traffic_compaction && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tractor className="w-5 h-5" />
                Tráfego e Compactação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mapping.traffic_compaction.traffic_lines && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-orange-700 mb-1">Linhas de Tráfego</p>
                  <p className="text-sm text-orange-900">{mapping.traffic_compaction.traffic_lines}</p>
                </div>
              )}
              {mapping.traffic_compaction.compacted_areas && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-orange-700 mb-1">Áreas Compactadas</p>
                  <p className="text-sm text-orange-900">{mapping.traffic_compaction.compacted_areas}</p>
                </div>
              )}
              {mapping.traffic_compaction.subsoiling_suggestion && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 mb-1">💡 Sugestão de Subsolagem</p>
                  <p className="text-sm text-green-900">{mapping.traffic_compaction.subsoiling_suggestion}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Analysis Tab */}
      <TabsContent value="analysis" className="space-y-4">
        {/* Índices de Vegetação */}
        {mapping.vegetation_indices && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Índices de Vegetação (NDVI)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-700 mb-1">NDVI</p>
                  <p className="text-2xl font-bold text-purple-900">{mapping.vegetation_indices.ndvi || 'N/A'}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-700 mb-1">NDRE</p>
                  <p className="text-2xl font-bold text-purple-900">{mapping.vegetation_indices.ndre || 'N/A'}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-700 mb-1">Vigor da Cultura</p>
                  <Badge className="text-sm">{mapping.vegetation_indices.crop_vigor || 'Não avaliado'}</Badge>
                </div>
              </div>
              {(mapping.vegetation_indices.early_stress || mapping.vegetation_indices.planting_failures) && (
                <div className="space-y-2">
                  {mapping.vegetation_indices.early_stress && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Badge className="bg-yellow-600">⚠️ Alerta</Badge>
                      <span className="text-sm text-yellow-900">Estresse precoce detectado</span>
                    </div>
                  )}
                  {mapping.vegetation_indices.planting_failures && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <Badge className="bg-red-600">⚠️ Alerta</Badge>
                      <span className="text-sm text-red-900">Falhas de plantio detectadas</span>
                    </div>
                  )}
                </div>
              )}
              {mapping.vegetation_indices.cycle_evolution && mapping.vegetation_indices.cycle_evolution.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Evolução ao Longo do Ciclo</p>
                  <div className="space-y-2">
                    {mapping.vegetation_indices.cycle_evolution.map((ev, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-600">{new Date(ev.date).toLocaleDateString('pt-BR')}</span>
                        <span className="font-semibold">NDVI: {ev.ndvi_value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Produtividade */}
        {mapping.productivity_data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Mapa de Produtividade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mapping.productivity_data.productivity_by_plot && mapping.productivity_data.productivity_by_plot.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-3">Produtividade por Talhão</p>
                  <div className="space-y-2">
                    {mapping.productivity_data.productivity_by_plot.map((plot, idx) => (
                      <div key={idx} className="flex justify-between p-3 bg-emerald-50 rounded-lg">
                        <span className="font-medium">{plot.plot_name}</span>
                        <span className="text-emerald-700 font-bold">{plot.productivity} sc/ha</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {mapping.productivity_data.harvest_comparison && mapping.productivity_data.harvest_comparison.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-3">Comparativo Entre Safras</p>
                  <div className="space-y-2">
                    {mapping.productivity_data.harvest_comparison.map((comp, idx) => (
                      <div key={idx} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">{comp.year}</span>
                        <span className="text-gray-700 font-bold">{comp.avg_productivity} sc/ha</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mapping.productivity_data.high_performance_zones && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 mb-1">💰 Pontos de Alta Performance</p>
                  <p className="text-sm text-green-900">{mapping.productivity_data.high_performance_zones}</p>
                </div>
              )}

              {mapping.productivity_data.low_performance_zones && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-red-700 mb-1">📉 Pontos de Baixa Performance</p>
                  <p className="text-sm text-red-900">{mapping.productivity_data.low_performance_zones}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Prescription Tab */}
      <TabsContent value="prescription" className="space-y-4">
        {mapping.agronomic_prescription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Prescrição Agronômica (Taxa Variável)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mapping.agronomic_prescription.variable_rate_liming && (
                <div className="p-4 bg-lime-50 rounded-lg border border-lime-200">
                  <p className="text-sm font-semibold text-lime-900 mb-2">Calagem em Taxa Variável</p>
                  <p className="text-sm text-lime-800">{mapping.agronomic_prescription.variable_rate_liming}</p>
                </div>
              )}

              {mapping.agronomic_prescription.variable_rate_fertilization && (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-sm font-semibold text-emerald-900 mb-2">Adubação em Taxa Variável</p>
                  <p className="text-sm text-emerald-800">{mapping.agronomic_prescription.variable_rate_fertilization}</p>
                </div>
              )}

              {mapping.agronomic_prescription.variable_rate_seeding && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-semibold text-amber-900 mb-2">Sementes em Taxa Variável</p>
                  <p className="text-sm text-amber-800">{mapping.agronomic_prescription.variable_rate_seeding}</p>
                </div>
              )}

              {mapping.agronomic_prescription.exportable_maps && mapping.agronomic_prescription.exportable_maps.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-3">💰 Mapas Exportáveis para Máquinas</p>
                  <div className="space-y-2">
                    {mapping.agronomic_prescription.exportable_maps.map((map, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-blue-900">{map.map_type}</p>
                            {map.machine_compatible && (
                              <Badge className="mt-1 bg-green-600 text-xs">Compatível com Máquinas</Badge>
                            )}
                          </div>
                        </div>
                        {map.file_url && (
                          <a
                            href={map.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                          >
                            Baixar
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border-2 border-emerald-300">
                <p className="text-center text-emerald-900 font-semibold">
                  💰 Aqui vira dinheiro real no bolso do produtor!
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}