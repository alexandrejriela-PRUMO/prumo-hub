import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, FileText, TrendingUp, CheckCircle } from 'lucide-react';
import CRAOriginSimple from '../components/cra/CRAOriginSimple';
import CRATitleSection from '../components/cra/CRATitleSection';
import CRATransactionSection from '../components/cra/CRATransactionSection';
import CRACompensationSection from '../components/cra/CRACompensationSection';

export default function CRASimple() {
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
    queryFn: () => base44.entities.CRAOrigin.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0
  });

  const { data: craTitles = [] } = useQuery({
    queryKey: ['cra-titles', user?.email],
    queryFn: () => base44.entities.CRATitle.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0
  });

  const { data: craTransactions = [] } = useQuery({
    queryKey: ['cra-transactions', user?.email],
    queryFn: () => base44.entities.CRATransaction.filter({ seller_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0
  });

  const { data: craCompensations = [] } = useQuery({
    queryKey: ['cra-compensations', user?.email],
    queryFn: () => base44.entities.CRACompensation.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-emerald-100 rounded-xl">
          <Leaf className="w-8 h-8 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cotas de Reserva Ambiental</h1>
          <p className="text-gray-600 mt-1">Gestão de geração, registro e transação de CRA</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Propriedades</p>
            <p className="text-2xl font-bold text-emerald-700">{craOrigins.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">CRA Emitidas</p>
            <p className="text-2xl font-bold text-blue-700">{craTitles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Transações</p>
            <p className="text-2xl font-bold text-purple-700">{craTransactions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Compensações</p>
            <p className="text-2xl font-bold text-green-700">{craCompensations.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="origem" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="origem">Origem</TabsTrigger>
          <TabsTrigger value="titulos">Títulos</TabsTrigger>
          <TabsTrigger value="transacoes">Transações</TabsTrigger>
          <TabsTrigger value="compensacoes">Compensações</TabsTrigger>
        </TabsList>

        <TabsContent value="origem" className="mt-6">
          {user && <CRAOriginSimple user={user} />}
        </TabsContent>

        <TabsContent value="titulos" className="mt-6">
          {user && <CRATitleSection user={user} />}
        </TabsContent>

        <TabsContent value="transacoes" className="mt-6">
          {user && <CRATransactionSection user={user} />}
        </TabsContent>

        <TabsContent value="compensacoes" className="mt-6">
          {user && <CRACompensationSection user={user} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}