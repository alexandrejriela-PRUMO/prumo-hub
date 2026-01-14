import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Leaf, TrendingUp, Award, Info } from 'lucide-react';
import GreenLoans from '../components/esg/GreenLoans';
import TaxIncentives from '../components/esg/TaxIncentives';
import SustainableCertifications from '../components/esg/SustainableCertifications';

export default function ESGAgro() {
  const [activeTab, setActiveTab] = useState('intro');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Leaf className="w-8 h-8 text-green-600" />
          ESG para o Agro
        </h1>
        <p className="text-gray-600 mt-1">Sustentabilidade e impacto socioambiental no agronegócio</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="intro">
            <Info className="w-4 h-4 mr-2" />
            O que é ESG?
          </TabsTrigger>
          <TabsTrigger value="loans">
            <TrendingUp className="w-4 h-4 mr-2" />
            Financiamentos
          </TabsTrigger>
          <TabsTrigger value="incentives">
            <Award className="w-4 h-4 mr-2" />
            Incentivos Fiscais
          </TabsTrigger>
          <TabsTrigger value="certifications">
            <Leaf className="w-4 h-4 mr-2" />
            Certificações
          </TabsTrigger>
        </TabsList>

        {/* Introduction Tab */}
        <TabsContent value="intro" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>O que é ESG?</CardTitle>
              <CardDescription>
                Critérios para avaliar impactos ambientais, sociais e de governança
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-700">
                ESG é um conjunto de critérios usados por investidores, empresas e organizações para avaliar os 
                impactos ambientais, sociais e de governança das operações. Esses critérios ajudam a entender como 
                as empresas gerenciam riscos e oportunidades relacionados à sustentabilidade.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Environmental */}
                <Card className="border-2 border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                        <Leaf className="w-5 h-5 text-white" />
                      </div>
                      Environmental (Ambiental)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-700">
                      Como a empresa gerencia impactos ambientais: emissões de carbono, uso de recursos naturais, 
                      gestão de resíduos e preservação da biodiversidade.
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <p className="text-xs font-semibold text-green-800 mb-2">No seu agronegócio:</p>
                      <p className="text-xs text-gray-700">
                        Redução de emissões de CO₂, compensação com créditos de carbono, reflorestamento e 
                        uso responsável de recursos naturais.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Social */}
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      Social (Social)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-700">
                      Impacto social das atividades: direitos humanos, condições de trabalho, comunidade, 
                      educação e inclusão social.
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-xs font-semibold text-blue-800 mb-2">No seu agronegócio:</p>
                      <p className="text-xs text-gray-700">
                        Consultoria acessível, práticas que beneficiam comunidades locais, preservação de 
                        áreas verdes e agricultura sustentável.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Governance */}
                <Card className="border-2 border-purple-200 bg-purple-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      Governance (Governança)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-700">
                      Gestão corporativa e ética empresarial: transparência, compliance, governança e 
                      comunicação com stakeholders.
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <p className="text-xs font-semibold text-purple-800 mb-2">No seu agronegócio:</p>
                      <p className="text-xs text-gray-700">
                        Relatórios de conformidade, gestão transparente de ações ambientais, licenciamento 
                        e compliance com legislação ambiental.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Benefícios de adotar práticas ESG:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5" />
                    <span>Acesso a linhas de crédito com taxas reduzidas</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5" />
                    <span>Incentivos fiscais e subsídios governamentais</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5" />
                    <span>Valorização de produtos no mercado com certificações sustentáveis</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5" />
                    <span>Redução de riscos operacionais e maior resiliência</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5" />
                    <span>Melhor reputação e atração de investidores conscientes</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Green Loans Tab */}
        <TabsContent value="loans">
          <GreenLoans />
        </TabsContent>

        {/* Tax Incentives Tab */}
        <TabsContent value="incentives">
          <TaxIncentives />
        </TabsContent>

        {/* Certifications Tab */}
        <TabsContent value="certifications">
          <SustainableCertifications />
        </TabsContent>
      </Tabs>
    </div>
  );
}