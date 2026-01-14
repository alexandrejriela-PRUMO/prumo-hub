import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calculator, FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GreenLoans() {
  const [user, setUser] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [simulator, setSimulator] = useState({
    amount: '',
    rate: 6.5,
    months: 60
  });

  const queryClient = useQueryClient();

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

  const { data: loans = [] } = useQuery({
    queryKey: ['greenLoans', user?.email],
    queryFn: () => base44.entities.GreenLoan.filter({ applicant_email: user.email }, '-application_date', 100),
    enabled: !!user?.email
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.GreenLoan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['greenLoans'] });
      setShowForm(false);
      toast.success('Solicitação enviada com sucesso!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GreenLoan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['greenLoans'] });
      toast.success('Solicitação removida!');
    }
  });

  const calculateLoan = () => {
    const P = parseFloat(simulator.amount);
    const r = parseFloat(simulator.rate) / 100 / 12;
    const n = parseInt(simulator.months);
    
    if (!P || !n) return null;
    
    const monthlyPayment = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalAmount = monthlyPayment * n;
    
    return {
      monthlyPayment: monthlyPayment.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      totalInterest: (totalAmount - P).toFixed(2)
    };
  };

  const result = showSimulator ? calculateLoan() : null;

  const statusColors = {
    'Em Análise': 'bg-yellow-100 text-yellow-800',
    'Aprovado': 'bg-green-100 text-green-800',
    'Liberado': 'bg-blue-100 text-blue-800',
    'Rejeitado': 'bg-red-100 text-red-800',
    'Cancelado': 'bg-gray-100 text-gray-800'
  };

  const programs = [
    {
      name: 'PRONAF Sustentável',
      institution: 'Banco do Brasil',
      rate: 4.5,
      maxAmount: 500000,
      term: '10 anos',
      purpose: 'Agricultura sustentável e agroecologia'
    },
    {
      name: 'ABC+ Reflorestamento',
      institution: 'BNDES',
      rate: 5.5,
      maxAmount: 2000000,
      term: '15 anos',
      purpose: 'Reflorestamento e recuperação de áreas'
    },
    {
      name: 'Energia Verde Rural',
      institution: 'Caixa',
      rate: 6.0,
      maxAmount: 1000000,
      term: '12 anos',
      purpose: 'Energia solar e renovável'
    }
  ];

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            Empréstimos Verdes
          </h1>
          <p className="text-gray-600 mt-1">Financiamentos sustentáveis com taxas especiais</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowSimulator(!showSimulator)} variant="outline">
            <Calculator className="w-4 h-4 mr-2" />
            Simulador
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Solicitar
          </Button>
        </div>
      </div>

      {/* Simulator */}
      {showSimulator && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              Simulador de Empréstimo Verde
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Valor Desejado (R$)</Label>
                <Input
                  type="number"
                  value={simulator.amount}
                  onChange={(e) => setSimulator({ ...simulator, amount: e.target.value })}
                  placeholder="100000"
                />
              </div>
              <div>
                <Label>Taxa de Juros Anual (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={simulator.rate}
                  onChange={(e) => setSimulator({ ...simulator, rate: e.target.value })}
                />
              </div>
              <div>
                <Label>Prazo (meses)</Label>
                <Input
                  type="number"
                  value={simulator.months}
                  onChange={(e) => setSimulator({ ...simulator, months: e.target.value })}
                />
              </div>
            </div>

            {result && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Parcela Mensal</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.monthlyPayment)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total a Pagar</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.totalAmount)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total de Juros</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.totalInterest)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Programs */}
      <Card>
        <CardHeader>
          <CardTitle>Programas de Financiamento Disponíveis</CardTitle>
          <CardDescription>Linhas de crédito com foco em sustentabilidade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {programs.map((prog, idx) => (
              <Card key={idx} className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{prog.name}</CardTitle>
                  <CardDescription>{prog.institution}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Taxa de Juros</span>
                    <span className="font-semibold text-emerald-600">{prog.rate}% a.a.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Valor Máximo</span>
                    <span className="font-semibold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(prog.maxAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Prazo</span>
                    <span className="font-semibold">{prog.term}</span>
                  </div>
                  <p className="text-xs text-gray-600 pt-2 border-t">{prog.purpose}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Nenhuma solicitação ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {loans.map(loan => (
                <div key={loan.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{loan.loan_type}</h3>
                      <Badge className={statusColors[loan.status]}>{loan.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loan.requested_amount)} 
                      • {format(new Date(loan.application_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(loan.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}