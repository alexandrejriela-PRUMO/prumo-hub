import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  AlertTriangle,
  Target,
  Layers,
  Sprout,
  Calendar,
  TrendingUp,
  Satellite,
  FileText,
  Bell
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PRADDetails({ prad }) {
  return (
    <Tabs defaultValue="identification" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="identification">Identificação</TabsTrigger>
        <TabsTrigger value="diagnosis">Diagnóstico</TabsTrigger>
        <TabsTrigger value="execution">Execução</TabsTrigger>
        <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
        <TabsTrigger value="documents">Documentos</TabsTrigger>
      </TabsList>

      {/* Identificação */}
      <TabsContent value="identification" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Identificação da Área
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Área Total Degradada</p>
              <p className="font-semibold">{prad.area_identification?.total_area_ha || 0} hectares</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Talhão / Gleba</p>
              <p className="font-semibold">{prad.area_identification?.plot_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tipo de Degradação</p>
              <Badge>{prad.area_identification?.degradation_type || '-'}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Data do Diagnóstico</p>
              <p className="font-semibold">
                {prad.area_identification?.diagnosis_date 
                  ? format(parseISO(prad.area_identification.diagnosis_date), 'dd/MM/yyyy', { locale: ptBR })
                  : '-'}
              </p>
            </div>
            {prad.area_identification?.coordinates && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Coordenadas</p>
                <p className="font-semibold font-mono text-sm">{prad.area_identification.coordinates}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Objetivo da Recuperação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="font-semibold text-green-900 mb-2">
                {prad.recovery_objective?.main_objective || 'Não especificado'}
              </p>
              {prad.recovery_objective?.objective_details && (
                <p className="text-sm text-green-800">{prad.recovery_objective.objective_details}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Diagnóstico */}
      <TabsContent value="diagnosis" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Diagnóstico Ambiental
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prad.environmental_diagnosis?.impact_level && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Grau de Impacto</p>
                <Badge className={
                  prad.environmental_diagnosis.impact_level === 'Alto' ? 'bg-red-600' :
                  prad.environmental_diagnosis.impact_level === 'Médio' ? 'bg-yellow-600' :
                  'bg-green-600'
                }>
                  {prad.environmental_diagnosis.impact_level}
                </Badge>
              </div>
            )}
            {prad.environmental_diagnosis?.degradation_description && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Descrição da Degradação</p>
                <p className="text-gray-700">{prad.environmental_diagnosis.degradation_description}</p>
              </div>
            )}
            {prad.environmental_diagnosis?.probable_cause && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Causa Provável</p>
                <p className="text-gray-700">{prad.environmental_diagnosis.probable_cause}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Caracterização do Solo
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Tipo de Solo</p>
              <p className="font-semibold">{prad.soil_characterization?.soil_type || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Declividade</p>
              <p className="font-semibold">{prad.soil_characterization?.slope || '-'}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Risco de Erosão</p>
              <Badge>{prad.soil_characterization?.erosion_risk || '-'}</Badge>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Execução */}
      <TabsContent value="execution" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="w-5 h-5" />
              Métodos de Recuperação
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prad.recovery_methods && prad.recovery_methods.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {prad.recovery_methods.map((method, idx) => (
                  <Badge key={idx} variant="outline">{method}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhum método cadastrado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Cronograma de Execução
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prad.execution_schedule && prad.execution_schedule.length > 0 ? (
              <div className="space-y-3">
                {prad.execution_schedule.map((stage, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border-l-4 border-green-500">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{stage.stage}</p>
                      <Badge className={
                        stage.status === 'Concluído' ? 'bg-green-600' :
                        stage.status === 'Em Execução' ? 'bg-blue-600' :
                        stage.status === 'Atrasado' ? 'bg-red-600' :
                        'bg-gray-600'
                      }>
                        {stage.status}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>📅 {stage.deadline ? format(parseISO(stage.deadline), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</span>
                      <span>👤 {stage.responsible || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhuma etapa cadastrada</p>
            )}
          </CardContent>
        </Card>

        {prad.species_and_techniques?.species_list && prad.species_and_techniques.species_list.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Espécies Indicadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {prad.species_and_techniques.species_list.map((species, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-green-50 rounded">
                    <span className="font-medium">{species.common_name || species.scientific_name}</span>
                    <span className="text-sm text-gray-600">{species.quantity} mudas</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Monitoramento */}
      <TabsContent value="monitoring" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Indicadores de Monitoramento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 mb-1">Taxa de Sobrevivência</p>
                <p className="text-3xl font-bold text-green-900">{prad.monitoring?.survival_rate || 0}%</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-emerald-700 mb-1">Cobertura Vegetal</p>
                <p className="text-3xl font-bold text-emerald-900">{prad.monitoring?.vegetation_cover || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Satellite className="w-5 h-5" />
              Monitoramento por Imagem (NDVI)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prad.image_monitoring?.ndvi_evolution && prad.image_monitoring.ndvi_evolution.length > 0 ? (
              <div className="space-y-2">
                {prad.image_monitoring.ndvi_evolution.slice(-6).reverse().map((record, idx) => (
                  <div key={idx} className="flex justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm">{format(parseISO(record.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    <span className="font-bold text-purple-900">NDVI: {record.ndvi}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhum dado de NDVI disponível</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Alertas e Riscos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prad.alerts_and_risks && prad.alerts_and_risks.length > 0 ? (
              <div className="space-y-2">
                {prad.alerts_and_risks.map((alert, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'Crítica' ? 'bg-red-50 border-red-500' :
                    alert.severity === 'Alta' ? 'bg-orange-50 border-orange-500' :
                    alert.severity === 'Média' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-blue-50 border-blue-500'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold">{alert.alert_type}</p>
                      <Badge className={
                        alert.status === 'Resolvido' ? 'bg-green-600' :
                        alert.status === 'Em Tratamento' ? 'bg-blue-600' :
                        'bg-red-600'
                      }>
                        {alert.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">{alert.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhum alerta registrado</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Documentos */}
      <TabsContent value="documents" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documentos e Relatórios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prad.documents && prad.documents.length > 0 ? (
              <div className="space-y-2">
                {prad.documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{doc.type}</Badge>
                        <span className="text-xs text-gray-500">
                          {doc.upload_date && format(parseISO(doc.upload_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <FileText className="w-5 h-5 text-gray-400" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhum documento cadastrado</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}