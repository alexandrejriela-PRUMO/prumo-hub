import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Award, DollarSign, CheckCircle, Bell } from 'lucide-react';
import { toast } from 'sonner';
import TaxIncentiveForm from './TaxIncentiveForm';

export default function TaxIncentives() {
  const [user, setUser] = useState(null);
  const [selectedIncentive, setSelectedIncentive] = useState(null);
  const [showForm, setShowForm] = useState(false);

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
    queryFn: () => base44.entities.Property.filter({ owner_email: user.email }),
    enabled: !!user?.email
  });
  const [eligibilityData, setEligibilityData] = useState({
    area_hectares: '',
    has_car: false,
    has_environmental_license: false,
    annual_revenue: ''
  });
  const [eligibleIncentives, setEligibleIncentives] = useState([]);

  const incentives = [
    {
      name: 'Isenção de ITR para Reserva Legal',
      type: 'Isenção de Imposto',
      description: 'Isenção do Imposto Territorial Rural (ITR) para áreas de Reserva Legal e APP preservadas',
      requirements: ['Possui CAR', 'Área de Reserva Legal averbada', 'APP preservada'],
      benefit: 'Até 100% de isenção do ITR sobre áreas preservadas',
      estimatedValue: 'Economia de R$ 50 a R$ 200 por hectare/ano',
      status: 'Disponível'
    },
    {
      name: 'Crédito de ICMS Ecológico',
      type: 'Crédito Fiscal',
      description: 'Crédito de ICMS para propriedades que adotam práticas sustentáveis e conservação ambiental',
      requirements: ['Área protegida certificada', 'Programa de conservação ativo', 'Licenciamento ambiental regular'],
      benefit: 'Até 5% de crédito sobre ICMS devido',
      estimatedValue: 'R$ 2.000 a R$ 15.000 por ano',
      status: 'Disponível'
    },
    {
      name: 'Subsídio para Energia Renovável',
      type: 'Subsídio',
      description: 'Subsídio para instalação de sistemas de energia solar e eólica em propriedades rurais',
      requirements: ['Projeto de energia renovável', 'Licenciamento ambiental', 'Capacidade instalada mínima'],
      benefit: 'Subsídio de 30% a 50% do investimento',
      estimatedValue: 'R$ 20.000 a R$ 150.000 por projeto',
      status: 'Em aprovação'
    },
    {
      name: 'Redução de Taxas Ambientais',
      type: 'Redução de Taxas',
      description: 'Redução de taxas de licenciamento ambiental para propriedades certificadas',
      requirements: ['Certificação ambiental', 'Histórico de conformidade', 'Adesão a programa estadual'],
      benefit: 'Redução de 40% a 70% nas taxas de licenciamento',
      estimatedValue: 'R$ 1.500 a R$ 8.000 por ano',
      status: 'Disponível'
    },
    {
      name: 'Incentivo para Agricultura Orgânica',
      type: 'Subsídio + Isenção',
      description: 'Incentivos múltiplos para produtores com certificação orgânica',
      requirements: ['Certificação orgânica válida', 'CAR regularizado', 'Área mínima de 5 hectares'],
      benefit: 'Isenção de taxas + subsídio para insumos',
      estimatedValue: 'R$ 5.000 a R$ 30.000 por ano',
      status: 'Disponível'
    },
    {
      name: 'Programa Estadual de PSA Fiscal',
      type: 'Pagamento + Redução',
      description: 'Pagamento por serviços ambientais combinado com redução de impostos estaduais',
      requirements: ['Área de conservação ≥ 20 ha', 'Índice de biodiversidade aprovado', 'Monitoramento periódico'],
      benefit: 'Pagamento anual + redução de 50% em impostos estaduais',
      estimatedValue: 'R$ 10.000 a R$ 80.000 por ano',
      status: 'Em aprovação'
    }
  ];

  const checkEligibility = () => {
    const area = parseFloat(eligibilityData.area_hectares);
    const revenue = parseFloat(eligibilityData.annual_revenue);

    const eligible = incentives.filter(incentive => {
      if (incentive.requirements.includes('Possui CAR') && !eligibilityData.has_car) return false;
      if (incentive.requirements.includes('Licenciamento ambiental') && !eligibilityData.has_environmental_license) return false;
      if (incentive.requirements.includes('Área mínima de 5 hectares') && area < 5) return false;
      if (incentive.requirements.includes('Área de conservação ≥ 20 ha') && area < 20) return false;
      return true;
    });

    setEligibleIncentives(eligible);
    toast.success(`${eligible.length} incentivos disponíveis para você!`);
  };

  return (
    <div className="space-y-6">
      {/* Eligibility Checker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Verificar Elegibilidade
          </CardTitle>
          <CardDescription>Descubra quais incentivos fiscais você pode solicitar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Área Total (hectares)
              </label>
              <Input
                type="number"
                placeholder="Ex: 50"
                value={eligibilityData.area_hectares}
                onChange={(e) => setEligibilityData({ ...eligibilityData, area_hectares: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Receita Anual (R$)
              </label>
              <Input
                type="number"
                placeholder="Ex: 500000"
                value={eligibilityData.annual_revenue}
                onChange={(e) => setEligibilityData({ ...eligibilityData, annual_revenue: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={eligibilityData.has_car}
                onChange={(e) => setEligibilityData({ ...eligibilityData, has_car: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Possui CAR</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={eligibilityData.has_environmental_license}
                onChange={(e) => setEligibilityData({ ...eligibilityData, has_environmental_license: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Licença Ambiental Regular</span>
            </label>
          </div>

          <Button onClick={checkEligibility} className="bg-blue-600 hover:bg-blue-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            Verificar Elegibilidade
          </Button>

          {eligibleIncentives.length > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900">
                ✓ Você está elegível para {eligibleIncentives.length} incentivo(s) fiscal(is)!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incentives List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {incentives.map((incentive, idx) => {
          const isEligible = eligibleIncentives.some(e => e.name === incentive.name);
          
          return (
            <Card key={idx} className={`hover:shadow-lg transition-shadow ${isEligible ? 'border-2 border-blue-300' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{incentive.name}</CardTitle>
                    <CardDescription className="mt-1">{incentive.type}</CardDescription>
                  </div>
                  <Badge className={
                    incentive.status === 'Disponível' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {incentive.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEligible && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-blue-900">✓ Você está elegível!</p>
                  </div>
                )}

                <p className="text-sm text-gray-700">{incentive.description}</p>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Requisitos:</p>
                  <div className="space-y-1">
                    {incentive.requirements.map((req, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <div className="w-1 h-1 rounded-full bg-gray-400 mt-1.5" />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <p className="text-xs font-semibold text-green-900">Benefício:</p>
                  </div>
                  <p className="text-sm text-gray-900">{incentive.benefit}</p>
                  <p className="text-xs text-green-700 mt-1">{incentive.estimatedValue}</p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setSelectedIncentive(incentive);
                      setShowForm(true);
                    }}
                  >
                    Solicitar
                  </Button>
                  <Button variant="outline" size="icon">
                    <Bell className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tax Incentive Application Form */}
      {showForm && (
        <TaxIncentiveForm
          incentive={selectedIncentive}
          property={properties[0]}
          onClose={() => {
            setShowForm(false);
            setSelectedIncentive(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedIncentive(null);
          }}
        />
      )}
    </div>
  );
}