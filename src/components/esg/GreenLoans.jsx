import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calculator, FileText, CheckCircle } from 'lucide-react';
import GreenLoanForm from './GreenLoanForm';

export default function GreenLoans() {
  const [user, setUser] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
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
  const [simulator, setSimulator] = useState({
    amount: '',
    term: '12',
    purpose: ''
  });
  const [simulationResult, setSimulationResult] = useState(null);

  const loanOptions = [
    {
      name: 'Crédito Rural Sustentável',
      bank: 'Banco do Brasil',
      interestRate: 6.5,
      maxAmount: 500000,
      maxTerm: 60,
      purpose: 'Reflorestamento, recuperação de APP, sistemas agroflorestais',
      benefits: ['Taxa reduzida', 'Carência de até 12 meses', 'Sem taxa de abertura']
    },
    {
      name: 'ABC (Agricultura de Baixo Carbono)',
      bank: 'BNDES',
      interestRate: 7.0,
      maxAmount: 2000000,
      maxTerm: 120,
      purpose: 'Recuperação de pastagens degradadas, plantio direto, tratamento de dejetos',
      benefits: ['Juros subsidiados', 'Prazo estendido', 'Financiamento até 100%']
    },
    {
      name: 'Pronaf Eco',
      bank: 'Caixa Econômica',
      interestRate: 4.5,
      maxAmount: 150000,
      maxTerm: 36,
      purpose: 'Agricultura familiar sustentável, energia renovável, biodigestores',
      benefits: ['Menor taxa do mercado', 'Sem garantias exigidas', 'Processo simplificado']
    },
    {
      name: 'Financiamento Verde Cooperativo',
      bank: 'Sicredi',
      interestRate: 8.0,
      maxAmount: 300000,
      maxTerm: 48,
      purpose: 'Projetos de carbono, certificações sustentáveis, energia solar',
      benefits: ['Análise rápida', 'Suporte técnico incluído', 'Bônus por meta alcançada']
    }
  ];

  const handleSimulate = () => {
    const amount = parseFloat(simulator.amount);
    const term = parseInt(simulator.term);
    
    if (!amount || !term) return;

    // Find best matching loan option
    const matchedLoan = loanOptions.find(loan => amount <= loan.maxAmount && term <= loan.maxTerm);
    
    if (matchedLoan) {
      const monthlyRate = matchedLoan.interestRate / 100 / 12;
      const monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
      const totalAmount = monthlyPayment * term;
      const totalInterest = totalAmount - amount;

      setSimulationResult({
        loan: matchedLoan,
        monthlyPayment,
        totalAmount,
        totalInterest
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-green-600" />
            Simulador de Empréstimos Verdes
          </CardTitle>
          <CardDescription>Calcule as condições do seu financiamento sustentável</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Valor Desejado (R$)</Label>
              <Input
                type="number"
                placeholder="Ex: 100000"
                value={simulator.amount}
                onChange={(e) => setSimulator({ ...simulator, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Prazo (meses)</Label>
              <select
                value={simulator.term}
                onChange={(e) => setSimulator({ ...simulator, term: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="12">12 meses</option>
                <option value="24">24 meses</option>
                <option value="36">36 meses</option>
                <option value="48">48 meses</option>
                <option value="60">60 meses</option>
                <option value="120">120 meses</option>
              </select>
            </div>
            <div>
              <Label>Finalidade</Label>
              <Input
                placeholder="Ex: Reflorestamento"
                value={simulator.purpose}
                onChange={(e) => setSimulator({ ...simulator, purpose: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={handleSimulate} className="bg-green-600 hover:bg-green-700">
            <Calculator className="w-4 h-4 mr-2" />
            Simular
          </Button>

          {simulationResult && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Resultado da Simulação</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Linha de Crédito:</span>
                  <span className="font-semibold text-gray-900">{simulationResult.loan.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Instituição:</span>
                  <span className="font-medium text-gray-900">{simulationResult.loan.bank}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Taxa de Juros:</span>
                  <span className="font-semibold text-green-600">{simulationResult.loan.interestRate}% a.a.</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Parcela Mensal:</span>
                    <span className="text-xl font-bold text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(simulationResult.monthlyPayment)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total a Pagar:</span>
                    <span className="font-semibold text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(simulationResult.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total de Juros:</span>
                    <span className="font-medium text-gray-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(simulationResult.totalInterest)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loanOptions.map((loan, idx) => (
          <Card key={idx} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{loan.name}</CardTitle>
                  <CardDescription>{loan.bank}</CardDescription>
                </div>
                <Badge className="bg-green-100 text-green-800">{loan.interestRate}% a.a.</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Até</p>
                  <p className="font-semibold text-gray-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(loan.maxAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Prazo</p>
                  <p className="font-semibold text-gray-900">{loan.maxTerm} meses</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Finalidade:</p>
                <p className="text-sm text-gray-700">{loan.purpose}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Benefícios:</p>
                <div className="space-y-1">
                  {loan.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setSelectedLoan(loan);
                  setShowForm(true);
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Solicitar Financiamento
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loan Application Form */}
      {showForm && (
        <GreenLoanForm
          loan={selectedLoan}
          property={properties[0]}
          onClose={() => {
            setShowForm(false);
            setSelectedLoan(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedLoan(null);
          }}
        />
      )}
    </div>
  );
}