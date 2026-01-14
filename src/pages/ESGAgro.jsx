import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Leaf, 
  DollarSign, 
  Award, 
  Users, 
  Shield, 
  TrendingUp,
  ChevronRight,
  Sprout
} from 'lucide-react';
import { createPageUrl } from './utils';
import { Link } from 'react-router-dom';

export default function ESGAgro() {
  const [user, setUser] = useState(null);

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

  const esgPillars = [
    {
      title: 'Environmental (Ambiental)',
      icon: Leaf,
      color: 'green',
      description: 'Gestão de impactos no meio ambiente',
      points: [
        'Redução de emissões de CO₂',
        'Compensação com créditos de carbono',
        'Reflorestamento e uso responsável de recursos',
        'Preservação da biodiversidade'
      ],
      application: 'Ajudamos produtores a implementar práticas sustentáveis como reflorestamento, gestão de recursos naturais e compensação de emissões.'
    },
    {
      title: 'Social',
      icon: Users,
      color: 'blue',
      description: 'Impacto social das atividades',
      points: [
        'Direitos humanos e condições de trabalho',
        'Benefícios para comunidades locais',
        'Agricultura sustentável',
        'Educação e inclusão social'
      ],
      application: 'Promovemos práticas que beneficiam comunidades rurais através de consultoria acessível e preservação de áreas verdes.'
    },
    {
      title: 'Governance (Governança)',
      icon: Shield,
      color: 'purple',
      description: 'Gestão corporativa e ética empresarial',
      points: [
        'Transparência e compliance',
        'Conformidade com legislação ambiental',
        'Relatórios de conformidade',
        'Comunicação com stakeholders'
      ],
      application: 'Fornecemos ferramentas para gestão transparente de ações ambientais e licenciamento, promovendo boas práticas de governança.'
    }
  ];

  const modules = [
    {
      title: 'Empréstimos Verdes',
      description: 'Financiamentos sustentáveis com taxas especiais',
      icon: DollarSign,
      color: 'emerald',
      link: 'GreenLoans',
      features: ['Simulador de empréstimos', 'Taxas reduzidas', 'Programas de apoio']
    },
    {
      title: 'Incentivos Fiscais',
      description: 'Benefícios fiscais para práticas sustentáveis',
      icon: TrendingUp,
      color: 'blue',
      link: 'TaxIncentives',
      features: ['Isenções e subsídios', 'Simulação de elegibilidade', 'Notificações']
    },
    {
      title: 'Certificações',
      description: 'Certificação de produtos sustentáveis',
      icon: Award,
      color: 'amber',
      link: 'Certifications',
      features: ['Orgânica, Fair Trade', 'Acompanhamento de status', 'Conexão com certificadoras']
    }
  ];

  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    amber: 'bg-amber-600 hover:bg-amber-700'
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Sprout className="w-12 h-12 text-green-600" />
          <h1 className="text-4xl font-bold text-gray-900">ESG para o Agro</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Práticas sustentáveis que geram valor econômico, ambiental e social para sua propriedade rural
        </p>
      </div>

      {/* What is ESG */}
      <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Leaf className="w-6 h-6 text-green-600" />
            O que é ESG?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            <strong>ESG</strong> é um conjunto de critérios usados por investidores, empresas e organizações para avaliar os 
            <strong> impactos ambientais, sociais e de governança</strong> das operações de uma empresa. Esses critérios são 
            fundamentais para entender como as empresas gerenciam seus riscos e oportunidades relacionados à sustentabilidade.
          </p>

          {/* ESG Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {esgPillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <Card key={idx} className={`border-2 ${colorClasses[pillar.color]}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-6 h-6" />
                      <CardTitle className="text-lg">{pillar.title}</CardTitle>
                    </div>
                    <CardDescription className="text-sm font-medium text-gray-700">
                      {pillar.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-2">
                      {pillar.points.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-3 border-t">
                      <p className="text-xs text-gray-600 italic">
                        <strong>No seu contexto:</strong> {pillar.application}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modules */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Ferramentas ESG</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modules.map((module, idx) => {
            const Icon = module.icon;
            return (
              <Card key={idx} className="hover:shadow-xl transition-all group">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7 text-gray-700" />
                  </div>
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                  <CardDescription className="text-gray-600">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {module.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <ChevronRight className="w-4 h-4 text-green-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={createPageUrl(module.link)}>
                    <Button className={`w-full ${colorClasses[module.color]}`}>
                      Acessar
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Benefits */}
      <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="text-xl">Benefícios da Adoção ESG</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Acesso a Financiamentos', desc: 'Taxas de juros reduzidas e crédito facilitado' },
              { title: 'Valorização de Mercado', desc: 'Produtos certificados têm maior valor comercial' },
              { title: 'Redução de Custos', desc: 'Incentivos fiscais e eficiência operacional' },
              { title: 'Sustentabilidade', desc: 'Preservação ambiental e legado para futuras gerações' }
            ].map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
                  <ChevronRight className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{benefit.title}</h4>
                  <p className="text-sm text-gray-600">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}