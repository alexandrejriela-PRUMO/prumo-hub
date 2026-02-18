import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, TrendingUp, Calendar } from 'lucide-react';

export default function ClientFinancialSummary({ crm }) {
  if (!crm) return null;

  // Calcula total de serviços
  const totalServices = crm.services?.length || 0;
  const activeServices = crm.services?.filter(s => s.status === 'Contratado' || s.status === 'Em Andamento').length || 0;
  const totalRevenue = crm.services?.reduce((sum, s) => sum + (s.value || 0), 0) || 0;

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* Total Revenue */}
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Receita Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-900">
            R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-emerald-700 mt-1">De serviços contratados</p>
        </CardContent>
      </Card>

      {/* Active Services */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-blue-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Serviços Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900">
            {activeServices} <span className="text-sm text-blue-700">de {totalServices}</span>
          </div>
          <div className="flex gap-1 mt-2 flex-wrap">
            {crm.services?.slice(0, 2).map((service, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {service.name?.substring(0, 15)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Client Status */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-purple-900 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Status do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={`
            ${crm.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' :
              crm.status === 'Em Negociação' ? 'bg-blue-100 text-blue-800' :
              crm.status === 'Prospect' ? 'bg-amber-100 text-amber-800' :
              'bg-gray-100 text-gray-800'}
          `}>
            {crm.status}
          </Badge>
          <p className="text-xs text-purple-700 mt-2">
            {crm.tags?.length > 0 ? `${crm.tags.join(', ')}` : 'Sem tags'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}