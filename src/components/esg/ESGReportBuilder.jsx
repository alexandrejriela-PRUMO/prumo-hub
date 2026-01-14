import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, BarChart3, TrendingUp } from 'lucide-react';

export default function ESGReportBuilder({ onGenerateReport, isLoading }) {
  const [selectedMetrics, setSelectedMetrics] = useState({
    greenLoans: true,
    taxIncentives: true,
    certifications: true,
    financialSummary: true,
    environmentalImpact: true,
    socialBenefits: true,
  });

  const metrics = [
    {
      id: 'greenLoans',
      label: 'Empréstimos Verdes',
      description: 'Dados de financiamentos sustentáveis',
      section: 'environmental'
    },
    {
      id: 'taxIncentives',
      label: 'Incentivos Fiscais',
      description: 'Benefícios fiscais e subsídios',
      section: 'environmental'
    },
    {
      id: 'certifications',
      label: 'Certificações Sustentáveis',
      description: 'Status de certificações ambientais',
      section: 'environmental'
    },
    {
      id: 'financialSummary',
      label: 'Resumo Financeiro',
      description: 'Visão geral de investimentos e retorno',
      section: 'economic'
    },
    {
      id: 'environmentalImpact',
      label: 'Impacto Ambiental',
      description: 'Sequestro de carbono e biodiversidade',
      section: 'environmental'
    },
    {
      id: 'socialBenefits',
      label: 'Benefícios Sociais',
      description: 'Impacto social e comunitário',
      section: 'social'
    },
  ];

  const toggleMetric = (metricId) => {
    setSelectedMetrics(prev => ({
      ...prev,
      [metricId]: !prev[metricId]
    }));
  };

  const handleGenerateReport = () => {
    onGenerateReport(selectedMetrics);
  };

  const selectedCount = Object.values(selectedMetrics).filter(Boolean).length;

  return (
    <Card className="bg-gradient-to-br from-white to-emerald-50/30 border-emerald-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-700" />
              Construtor de Relatórios ESG
            </CardTitle>
            <CardDescription>
              Selecione as métricas que deseja incluir no seu relatório personalizado
            </CardDescription>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700">
            {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Métricas Ambientais */}
        <div className="space-y-3">
          <h3 className="font-semibold text-emerald-900 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-600" />
            Métricas Ambientais
          </h3>
          <div className="grid md:grid-cols-2 gap-3 ml-4">
            {metrics.filter(m => m.section === 'environmental').map(metric => (
              <div key={metric.id} className="flex items-start gap-3 p-3 rounded-lg border border-emerald-100 hover:bg-emerald-50/50 cursor-pointer" onClick={() => toggleMetric(metric.id)}>
                <Checkbox
                  checked={selectedMetrics[metric.id]}
                  onChange={() => toggleMetric(metric.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label className="font-medium text-sm text-gray-900 cursor-pointer">
                    {metric.label}
                  </label>
                  <p className="text-xs text-gray-600">{metric.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Métricas Econômicas */}
        <div className="space-y-3">
          <h3 className="font-semibold text-blue-900 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            Métricas Econômicas
          </h3>
          <div className="grid md:grid-cols-2 gap-3 ml-4">
            {metrics.filter(m => m.section === 'economic').map(metric => (
              <div key={metric.id} className="flex items-start gap-3 p-3 rounded-lg border border-blue-100 hover:bg-blue-50/50 cursor-pointer" onClick={() => toggleMetric(metric.id)}>
                <Checkbox
                  checked={selectedMetrics[metric.id]}
                  onChange={() => toggleMetric(metric.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label className="font-medium text-sm text-gray-900 cursor-pointer">
                    {metric.label}
                  </label>
                  <p className="text-xs text-gray-600">{metric.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Métricas Sociais */}
        <div className="space-y-3">
          <h3 className="font-semibold text-purple-900 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-600" />
            Métricas Sociais
          </h3>
          <div className="grid md:grid-cols-2 gap-3 ml-4">
            {metrics.filter(m => m.section === 'social').map(metric => (
              <div key={metric.id} className="flex items-start gap-3 p-3 rounded-lg border border-purple-100 hover:bg-purple-50/50 cursor-pointer" onClick={() => toggleMetric(metric.id)}>
                <Checkbox
                  checked={selectedMetrics[metric.id]}
                  onChange={() => toggleMetric(metric.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label className="font-medium text-sm text-gray-900 cursor-pointer">
                    {metric.label}
                  </label>
                  <p className="text-xs text-gray-600">{metric.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botão Gerar */}
        <div className="flex gap-3 pt-4 border-t border-emerald-100">
          <Button
            onClick={handleGenerateReport}
            disabled={!selectedCount || isLoading}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            {isLoading ? 'Gerando relatório...' : 'Gerar Relatório Personalizado'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}