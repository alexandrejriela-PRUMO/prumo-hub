import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, TrendingUp, Calendar, Loader2 } from 'lucide-react';

const STATUS_COLOR = {
  'Em Proposta': 'bg-blue-100 text-blue-700',
  'Contratado': 'bg-purple-100 text-purple-700',
  'Em Andamento': 'bg-amber-100 text-amber-700',
  'Concluído': 'bg-green-100 text-green-700',
  'Cancelado': 'bg-red-100 text-red-700',
};

export default function ClientFinancialSummary({ client }) {
  // Resolve property_id para buscar o CRM
  const firstRealProperty = client?.properties?.find(p => !p.is_client_only) || client?.properties?.[0];
  const propertyId = firstRealProperty?.id || client?.id;

  const { data: crm, isLoading } = useQuery({
    queryKey: ['client-crm-financial', propertyId],
    queryFn: async () => {
      const results = await base44.entities.ClientCRM.filter({ property_id: propertyId });
      return results[0] || null;
    },
    enabled: !!propertyId,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
    </div>
  );

  const services = crm?.services || [];
  const totalServices = services.length;
  const activeServices = services.filter(s => s.status === 'Contratado' || s.status === 'Em Andamento').length;
  const totalRevenue = services.reduce((sum, s) => sum + (parseFloat(s.value) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
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
            <p className="text-xs text-emerald-700 mt-1">De todos os serviços</p>
          </CardContent>
        </Card>

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
            <p className="text-xs text-blue-700 mt-1">Contratados ou em andamento</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-purple-900 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Status do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`
              ${crm?.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' :
                crm?.status === 'Em Negociação' ? 'bg-blue-100 text-blue-800' :
                crm?.status === 'Prospect' ? 'bg-amber-100 text-amber-800' :
                'bg-gray-100 text-gray-800'}
            `}>
              {crm?.status || 'Ativo'}
            </Badge>
            <p className="text-xs text-purple-700 mt-2">
              {crm?.tags?.length > 0 ? crm.tags.join(', ') : 'Sem tags'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de serviços */}
      {services.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-800">Detalhamento de Serviços</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {services.map((service, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    {service.notes && <p className="text-xs text-gray-400">{service.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${STATUS_COLOR[service.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                      {service.status}
                    </Badge>
                    {service.value > 0 && (
                      <span className="text-sm font-bold text-emerald-700 w-28 text-right">
                        R$ {parseFloat(service.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">Nenhum serviço cadastrado. Adicione serviços na aba CRM.</p>
      )}
    </div>
  );
}