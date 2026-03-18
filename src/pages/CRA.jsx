import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, FileText, TrendingUp, CheckCircle } from 'lucide-react';
import CRAOriginSection from '../components/cra/CRAOriginSection';
import CRATitleSection from '../components/cra/CRATitleSection';
import CRATransactionSection from '../components/cra/CRATransactionSection';
import CRACompensationSection from '../components/cra/CRACompensationSection';

export default function CRA() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
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

  const { data: craOrigins = [] } = useQuery({
    queryKey: ['cra-origins', user?.email],
    queryFn: () => base44.entities.CRAOrigin.filter({ 
      owner_email: user?.email 
    }),
    enabled: !!user?.email,
    staleTime: 0
  });

  const { data: craTitles = [] } = useQuery({
    queryKey: ['cra-titles', user?.email],
    queryFn: () => base44.entities.CRATitle.filter({ 
      owner_email: user?.email 
    }),
    enabled: !!user?.email,
    staleTime: 0
  });

  const { data: craTransactions = [] } = useQuery({
    queryKey: ['cra-transactions', user?.email],
    queryFn: () => base44.entities.CRATransaction.filter({ 
      seller_email: user?.email 
    }),
    enabled: !!user?.email
  });

  const { data: craCompensations = [] } = useQuery({
    queryKey: ['cra-compensations', user?.email],
    queryFn: () => base44.entities.CRACompensation.filter({ 
      owner_email: user?.email 
    }),
    enabled: !!user?.email
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-emerald-100 rounded-xl">
          <Leaf className="w-8 h-8 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cotas de Reserva Ambiental</h1>
          <p className="text-gray-600 mt-1">Gestão de geração, registro e transação de CRA (Lei nº 12.651/2012)</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Propriedades com Potencial</p>
                <p className="text-2xl font-bold text-emerald-700">{craOrigins.filter(o => o.status === 'Aprovado').length}</p>
              </div>
              <Leaf className="w-8 h-8 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">CRA Emitidas</p>
                <p className="text-2xl font-bold text-blue-700">{craTitles.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transações Realizadas</p>
                <p className="text-2xl font-bold text-purple-700">{craTransactions.filter(t => t.status === 'Concluída').length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Compensações Registradas</p>
                <p className="text-2xl font-bold text-green-700">{craCompensations.filter(c => c.status === 'Registrada').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="origem" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="origem">Origem das CRA</TabsTrigger>
          <TabsTrigger value="titulos">Títulos de CRA</TabsTrigger>
          <TabsTrigger value="transacoes">Transações</TabsTrigger>
          <TabsTrigger value="compensacoes">Compensações</TabsTrigger>
        </TabsList>

        <TabsContent value="origem" className="mt-6">
          <CRAOriginSection user={user} />
        </TabsContent>

        <TabsContent value="titulos" className="mt-6">
          <CRATitleSection user={user} />
        </TabsContent>

        <TabsContent value="transacoes" className="mt-6">
          <CRATransactionSection user={user} />
        </TabsContent>

        <TabsContent value="compensacoes" className="mt-6">
          <CRACompensationSection user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}