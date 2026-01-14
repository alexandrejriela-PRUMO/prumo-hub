import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckCircle, AlertCircle, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function TaxIncentives() {
  const [user, setUser] = useState(null);

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

  const { data: incentives = [] } = useQuery({
    queryKey: ['taxIncentives', user?.email],
    queryFn: () => base44.entities.TaxIncentive.filter({ applicant_email: user.email }, '-created_date', 100),
    enabled: !!user?.email
  });

  const availableIncentives = [
    {
      name: 'Redução de ITR para Áreas de Preservação',
      type: 'Redução de ITR',
      practice: 'Conservação de APP',
      benefit: 'Até 100% de desconto no ITR',
      requirements: ['APP averbada', 'CAR atualizado', 'Área preservada']
    },
    {
      name: 'Isenção de ICMS - Energia Solar',
      type: 'Isenção de ICMS',
      practice: 'Energia Renovável',
      benefit: 'Isenção total de ICMS',
      requirements: ['Sistema solar instalado', 'Registro na ANEEL']
    },
    {
      name: 'Crédito Presumido Orgânico',
      type: 'Crédito Presumido',
      practice: 'Agricultura Orgânica',
      benefit: '3% sobre faturamento',
      requirements: ['Certificação orgânica', 'Registro no MAPA']
    }
  ];

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          Incentivos Fiscais
        </h1>
        <p className="text-gray-600 mt-1">Benefícios fiscais para práticas sustentáveis</p>
      </div>

      {/* Available Incentives */}
      <Card>
        <CardHeader>
          <CardTitle>Incentivos Disponíveis</CardTitle>
          <CardDescription>Benefícios fiscais que você pode solicitar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {availableIncentives.map((inc, idx) => (
              <Card key={idx} className="border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{inc.name}</h3>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{inc.type}</Badge>
                        <Badge className="bg-green-100 text-green-800">{inc.practice}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-3"><strong>Benefício:</strong> {inc.benefit}</p>
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Requisitos:</p>
                        <ul className="space-y-1">
                          {inc.requirements.map((req, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700">Solicitar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My Incentives */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Incentivos</CardTitle>
        </CardHeader>
        <CardContent>
          {incentives.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Nenhum incentivo solicitado ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incentives.map(inc => (
                <div key={inc.id} className="p-4 border rounded-lg">
                  <h3 className="font-semibold">{inc.incentive_name}</h3>
                  <Badge className="mt-2">{inc.application_status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}