import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, TrendingUp, Calendar, Loader2, CheckCircle2, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLOR = {
  'Em Proposta': 'bg-blue-100 text-blue-700',
  'Contratado': 'bg-purple-100 text-purple-700',
  'Em Andamento': 'bg-amber-100 text-amber-700',
  'Concluído': 'bg-green-100 text-green-700',
  'Cancelado': 'bg-red-100 text-red-700',
};

export default function ClientFinancialSummary({ client }) {
  const queryClient = useQueryClient();
  const firstRealProperty = client?.properties?.find(p => !p.is_client_only) || client?.properties?.[0];
  const propertyId = firstRealProperty?.id || client?.id;
  const crmConsultorEmail = firstRealProperty?.consultor_email;
  const crmOwnerEmail = firstRealProperty?.owner_email;

  const { data: crm, isLoading } = useQuery({
    queryKey: ['client-crm-financial', propertyId],
    queryFn: async () => {
      const results = await base44.entities.ClientCRM.filter({ property_id: propertyId });
      return results[0] || null;
    },
    enabled: !!propertyId,
  });

  const upsertCRM = useMutation({
    mutationFn: (data) => {
      if (crm?.id) return base44.entities.ClientCRM.update(crm.id, data);
      return base44.entities.ClientCRM.create({ property_id: propertyId, consultor_email: crmConsultorEmail, client_email: crmOwnerEmail, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-crm-financial', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['client-crm', propertyId] });
    },
  });

  const toggleReceived = (index) => {
     const services = (crm?.services || []).map((s, i) =>
       i === index ? { ...s, received: !s.received, received_at: !s.received ? new Date().toISOString() : null } : s
     );
     upsertCRM.mutate({ services }, {
       onSuccess: () => {
         toast.success('Status de recebimento atualizado!');
       },
       onError: (error) => {
         toast.error('Erro ao atualizar status: ' + (error?.message || 'Tente novamente'));
       }
     });
   };

  if (isLoading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
    </div>
  );

  const services = crm?.services || [];
   const activeServices = services.filter(s => s.status === 'Contratado' || s.status === 'Em Andamento');
   const totalRevenue = services.reduce((sum, s) => {
     const value = parseFloat(s.value);
     return sum + (isNaN(value) ? 0 : value);
   }, 0);
   const receivedRevenue = services.filter(s => s.received).reduce((sum, s) => {
     const value = parseFloat(s.value);
     return sum + (isNaN(value) ? 0 : value);
   }, 0);
   const pendingRevenue = Math.max(0, totalRevenue - receivedRevenue);

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-700" />
              <p className="text-xs font-semibold text-emerald-800">Total Contratado</p>
            </div>
            <p className="text-xl font-bold text-emerald-900">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">{services.length} serviço(s)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-700" />
              <p className="text-xs font-semibold text-green-800">Recebido</p>
            </div>
            <p className="text-xl font-bold text-green-900">
              R$ {receivedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-green-600 mt-0.5">{services.filter(s => s.received).length} serviço(s)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-700" />
              <p className="text-xs font-semibold text-amber-800">A Receber</p>
            </div>
            <p className="text-xl font-bold text-amber-900">
              R$ {pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">{services.filter(s => !s.received && s.status !== 'Cancelado').length} serviço(s)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <p className="text-xs font-semibold text-blue-800">Ativos</p>
            </div>
            <p className="text-xl font-bold text-blue-900">{activeServices.length}</p>
            <p className="text-xs text-blue-600 mt-0.5">em andamento / contratados</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progresso de recebimento */}
      {totalRevenue > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold text-gray-700">Progresso de Recebimento</p>
              <span className="text-sm font-bold text-emerald-700">
                {Math.round((receivedRevenue / totalRevenue) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(receivedRevenue / totalRevenue) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>R$ {receivedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebidos</span>
              <span>R$ {pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendentes</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalhamento por serviço */}
      {services.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Detalhamento por Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {services.map((service, i) => {
                const installmentValue = service.payment_type === 'parcelado' && service.installments
                  ? parseFloat(service.value) / parseInt(service.installments)
                  : null;

                return (
                  <div key={i} className={`px-4 py-3 flex items-start gap-3 ${service.received ? 'bg-green-50/40' : service.status === 'Cancelado' ? 'opacity-50' : ''}`}>
                    <div className="mt-0.5">
                      {service.received
                        ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        : <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start gap-2 justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                          {service.notes && <p className="text-xs text-gray-500">{service.notes}</p>}
                          {service.start_date && <p className="text-xs text-gray-400">Início: {new Date(service.start_date).toLocaleDateString('pt-BR')}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {parseFloat(service.value) > 0 && (
                            <p className="text-sm font-bold text-gray-900">
                              R$ {parseFloat(service.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                          {installmentValue && (
                            <p className="text-xs text-gray-500">
                              {service.installments}x de R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge className={`${STATUS_COLOR[service.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                          {service.status}
                        </Badge>
                        {service.payment_method && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">{service.payment_method}</span>
                        )}
                        {service.payment_type === 'parcelado'
                          ? <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md">{service.installments || '?'}x Parcelado</span>
                          : <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">À Vista</span>
                        }
                        <Button
                          size="sm"
                          variant={service.received ? 'outline' : 'default'}
                          className={`h-6 text-xs px-2 ${service.received ? 'border-green-300 text-green-700 hover:bg-green-50' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                          onClick={() => toggleReceived(i)}
                        >
                          {service.received ? '✓ Recebido' : 'Marcar Recebido'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">Nenhum serviço cadastrado. Adicione serviços na aba CRM.</p>
      )}
    </div>
  );
}