import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
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
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import ESGReportBuilder from '../components/esg/ESGReportBuilder';
import ESGReportDisplay from '../components/esg/ESGReportDisplay';
import ESGScoreCard from '../components/esg/ESGScoreCard';
import ESGDashboard from '../components/esg/ESGDashboard';
import ESGRecommendations from '../components/esg/ESGRecommendations';
import GreenLoanWizard from '../components/esg/GreenLoanWizard';
import TaxIncentiveWizard from '../components/esg/TaxIncentiveWizard';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

export default function ESGAgro() {
  const [user, setUser] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');
  const [generatedReport, setGeneratedReport] = useState(null);
  const [selectedMetrics, setSelectedMetrics] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showLoanWizard, setShowLoanWizard] = useState(false);
  const [showIncentiveWizard, setShowIncentiveWizard] = useState(false);

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

  const { effectiveEmail, userType } = useEffectiveUser();
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

  const { data: greenLoans = [] } = useQuery({
    queryKey: ['greenLoans', effectiveEmail],
    queryFn: async () => {
      if (isConsultor) {
        const res = await base44.functions.invoke('listConsultorPropertyRecords', { entity_name: 'GreenLoan', field_name: 'property_id', email_field: 'applicant_email' });
        return res.data?.records || [];
      }
      return base44.entities.GreenLoan.filter({ applicant_email: effectiveEmail });
    },
    enabled: !!effectiveEmail
  });

  const { data: taxIncentives = [] } = useQuery({
    queryKey: ['taxIncentives', effectiveEmail],
    queryFn: async () => {
      if (isConsultor) {
        const res = await base44.functions.invoke('listConsultorPropertyRecords', { entity_name: 'TaxIncentive', field_name: 'property_id', email_field: 'applicant_email' });
        return res.data?.records || [];
      }
      return base44.entities.TaxIncentive.filter({ applicant_email: effectiveEmail });
    },
    enabled: !!effectiveEmail
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ['certifications', effectiveEmail],
    queryFn: async () => {
      if (isConsultor) {
        const res = await base44.functions.invoke('listConsultorPropertyRecords', { entity_name: 'Certification', field_name: 'property_id', email_field: 'applicant_email' });
        return res.data?.records || [];
      }
      return base44.entities.Certification.filter({ applicant_email: effectiveEmail });
    },
    enabled: !!effectiveEmail
  });

  const generateReport = async (metrics) => {
    setIsGeneratingReport(true);
    setSelectedMetrics(metrics);

    try {
      const greenLoansData = metrics.greenLoans ? {
        totalRequested: greenLoans.reduce((sum, loan) => sum + (loan.requested_amount || 0), 0),
        totalApproved: greenLoans.reduce((sum, loan) => sum + (loan.approved_amount || 0), 0),
        averageRate: greenLoans.length > 0 
          ? (greenLoans.reduce((sum, loan) => sum + (loan.interest_rate || 0), 0) / greenLoans.length).toFixed(2)
          : 0,
        chartData: greenLoans.map(loan => ({
          name: loan.loan_type,
          value: loan.approved_amount || 0
        }))
      } : null;

      const taxIncentivesData = metrics.taxIncentives ? {
        estimatedBenefit: taxIncentives.reduce((sum, incentive) => sum + (incentive.estimated_benefit || 0), 0),
        activeCount: taxIncentives.filter(i => i.application_status === 'Ativo').length,
        underAnalysisCount: taxIncentives.filter(i => i.application_status === 'Em Análise').length,
        statusBreakdown: [
          { name: 'Ativo', value: taxIncentives.filter(i => i.application_status === 'Ativo').length, color: '#10b981' },
          { name: 'Em Análise', value: taxIncentives.filter(i => i.application_status === 'Em Análise').length, color: '#f59e0b' },
          { name: 'Rejeitado', value: taxIncentives.filter(i => i.application_status === 'Rejeitado').length, color: '#ef4444' }
        ]
      } : null;

      const certificationsData = metrics.certifications ? {
        list: certifications.map(cert => ({
          type: cert.certification_type,
          status: cert.status,
          expirationDate: cert.expiration_date
        }))
      } : null;

      let esgScore = 0;
      if (greenLoans.length > 0) esgScore += 25;
      if (taxIncentives.length > 0) esgScore += 25;
      if (certifications.length > 0) esgScore += 25;
      esgScore += Math.min(25, Math.floor(Math.random() * 25));

      const report = {
        esgScore,
        carbonReduction: greenLoans.reduce((sum, loan) => sum + (loan.sustainability_metrics?.carbon_reduction || 0), 0),
        totalInvestment: greenLoans.reduce((sum, loan) => sum + (loan.approved_amount || 0), 0) + taxIncentives.reduce((sum, tax) => sum + (tax.estimated_benefit || 0), 0),
        greenLoans: greenLoansData,
        taxIncentives: taxIncentivesData,
        certifications: certificationsData,
        environmentalImpact: {
          timeline: [
            { month: 'Jan', carbon: 100, water: 5000 },
            { month: 'Fev', carbon: 120, water: 4800 },
            { month: 'Mar', carbon: 150, water: 4500 },
            { month: 'Abr', carbon: 180, water: 4200 },
            { month: 'Mai', carbon: 220, water: 3900 },
            { month: 'Jun', carbon: 250, water: 3600 }
          ]
        }
      };

      setGeneratedReport(report);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

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
      {/* Em Construção Banner */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">!</span>
        </div>
        <div>
          <p className="font-semibold text-amber-900">Em Construção</p>
          <p className="text-sm text-amber-800">Este módulo está sendo desenvolvido. Algumas funcionalidades podem não estar disponíveis.</p>
        </div>
      </div>

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Sprout className="w-12 h-12 text-green-600" />
          <h1 className="text-4xl font-bold text-gray-900">ESG para o Agro</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Práticas sustentáveis que geram valor econômico, ambiental e social para sua propriedade ou empreendimento
        </p>
      </div>

      {/* Property Selector */}
      {(properties.length > 1 || isConsultor) && (
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-green-100 shadow-sm">
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="text-gray-700 font-medium whitespace-nowrap">Propriedade ou Empreendimento:</span>
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-full sm:w-96 bg-green-50 border-green-200">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Propriedades e Empreendimentos</SelectItem>
              {properties.map(prop => (
                <SelectItem key={prop.id} value={prop.id}>{prop.property_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Dashboards Interativos */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Seu Perfil ESG</h2>
          <ESGScoreCard
            score={(() => {
              let score = 0;
              if (greenLoans.length > 0) score += 25;
              if (taxIncentives.length > 0) score += 25;
              if (certifications.length > 0) score += 25;
              score += Math.min(25, greenLoans.length * 5 + taxIncentives.length * 3 + certifications.length * 4);
              return Math.min(100, score);
            })()}
            greenLoans={greenLoans.length}
            taxIncentives={taxIncentives.length}
            certifications={certifications.length}
          />
        </div>

        {user && properties.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recomendações de Melhoria</h2>
            <ESGRecommendations
              userEmail={user.email}
              properties={properties}
              greenLoans={greenLoans}
              taxIncentives={taxIncentives}
              certifications={certifications}
            />
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Métricas Detalhadas</h2>
          <ESGDashboard
            greenLoans={greenLoans}
            taxIncentives={taxIncentives}
            certifications={certifications}
          />
        </div>
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

      {/* Wizards */}
      {showLoanWizard && user && properties.length > 0 && (
        <GreenLoanWizard
          user={user}
          properties={properties}
          onClose={() => {
            const confirmed = window.confirm('Você tem alterações não salvas. Deseja fechar sem salvar?');
            if (confirmed) setShowLoanWizard(false);
          }}
        />
      )}

      {showIncentiveWizard && user && properties.length > 0 && (
        <TaxIncentiveWizard
          user={user}
          properties={properties}
          onClose={() => {
            const confirmed = window.confirm('Você tem alterações não salvas. Deseja fechar sem salvar?');
            if (confirmed) setShowIncentiveWizard(false);
          }}
        />
      )}

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
                  <div className="space-y-2">
                    <Link to={createPageUrl(module.link)}>
                      <Button className={`w-full ${colorClasses[module.color]}`}>
                        Acessar
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    {properties.length > 0 && module.link === 'GreenLoans' && (
                      <Button
                        onClick={() => setShowLoanWizard(true)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Sprout className="w-4 h-4 mr-2" />
                        Novo Empréstimo
                      </Button>
                    )}
                    {properties.length > 0 && module.link === 'TaxIncentives' && (
                      <Button
                        onClick={() => setShowIncentiveWizard(true)}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Novo Incentivo
                      </Button>
                    )}
                  </div>
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

      {/* Relatórios ESG */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Relatórios e Análises</h2>
        {!generatedReport ? (
          <ESGReportBuilder 
            onGenerateReport={generateReport}
            isLoading={isGeneratingReport}
          />
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setGeneratedReport(null);
                setSelectedMetrics(null);
              }}
            >
              ← Voltar ao Construtor de Relatórios
            </Button>
            <ESGReportDisplay 
              reportData={generatedReport}
              selectedMetrics={selectedMetrics}
            />
          </>
        )}
      </div>
    </div>
  );
}