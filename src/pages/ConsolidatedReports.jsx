import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileDown, Award, TrendingUp } from 'lucide-react';
import ESGConsolidatedReport from '../components/reports/ESGConsolidatedReport';
import EnvironmentalCertificate from '../components/certificates/EnvironmentalCertificate';

export default function ConsolidatedReports() {
  const [user, setUser] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);

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

  // Calcular escore ESG simples para demo
  const calculateESGScore = (property) => {
    let score = 50; // Base score
    if (property.legal_reserve_hectares > 0) score += 10;
    if (property.app_hectares > 0) score += 10;
    if (property.activities?.includes('Reflorestamento')) score += 15;
    if (property.activities?.includes('Agricultura Orgânica')) score += 15;
    return Math.min(score, 100);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  const currentProperty = selectedProperty || properties[0];
  const esgScore = currentProperty ? calculateESGScore(currentProperty) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileDown className="w-8 h-8 text-blue-600" />
          Relatórios ESG Consolidados
        </h1>
        <p className="text-gray-600">
          Gere relatórios abrangentes integrando dados de Processos, Alertas, Créditos, PSA e Servidões
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-blue-900">Sistema de Relatórios ESG</h3>
            <p className="text-blue-800 text-sm">
              Consolide dados de todas as suas iniciativas ambientais em um único relatório customizável. 
              Selecione o período, escolha as métricas desejadas e exporte em PDF para compartilhamento ou arquivo.
            </p>
            <p className="text-blue-800 text-sm">
              <strong>Certificado de Excelência:</strong> Propriedades com ESG ≥ 70 pontos e bom desempenho 
              no Termômetro recebem certificado oficial da SANTA RUTE Engenharia Rural.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Seletor de Propriedade */}
      {properties.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Selecione a Propriedade
            </label>
            <select
              value={currentProperty?.id || ''}
              onChange={(e) => setSelectedProperty(properties.find(p => p.id === e.target.value))}
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
          {/* ESG Score Card */}
          <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Escore ESG Atual
                </CardTitle>
                <div className="text-right">
                  <div className="text-4xl font-bold text-emerald-600">{esgScore}</div>
                  <p className="text-sm text-gray-600">/ 100</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-blue-500 h-3 rounded-full transition-all"
                    style={{ width: `${esgScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>
                    {esgScore < 40 ? '🔴 Baixo' : esgScore < 70 ? '🟡 Moderado' : '🟢 Excelente'}
                  </span>
                  {esgScore >= 70 && (
                    <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Elegível para Certificado
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Disponíveis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900">Relatório ESG Consolidado</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Selecione período e métricas para gerar relatório em PDF
                    </p>
                  </div>
                  <ESGConsolidatedReport userEmail={user.email} property={currentProperty} />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900">Certificado Ambiental</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Disponível para propriedades com ESG ≥ 70 pontos
                    </p>
                  </div>
                  <EnvironmentalCertificate property={currentProperty} esgScore={esgScore} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumo de Dados */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo da Propriedade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Localização</p>
                  <p className="font-semibold text-gray-900">{currentProperty.city}, {currentProperty.state}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Área Total</p>
                  <p className="font-semibold text-gray-900">{currentProperty.total_hectares} ha</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Atividades Principais</p>
                  <p className="font-semibold text-gray-900">
                    {currentProperty.main_activity || 'Não informada'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}