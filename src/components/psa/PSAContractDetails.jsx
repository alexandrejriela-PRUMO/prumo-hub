import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Edit, Trash2, Droplets, MapPin, Calendar, DollarSign, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PSAContractDetails({ contract, property, onClose, onEdit, onDelete }) {
  const statusConfig = {
    'Ativo': 'bg-green-100 text-green-800',
    'Em Aprovação': 'bg-yellow-100 text-yellow-800',
    'Suspenso': 'bg-orange-100 text-orange-800',
    'Concluído': 'bg-blue-100 text-blue-800',
    'Cancelado': 'bg-red-100 text-red-800'
  };

  const totalReceived = (contract.payments_received || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const progressPercent = contract.total_contract_value > 0
    ? (totalReceived / contract.total_contract_value * 100).toFixed(1)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{contract.contract_name}</CardTitle>
              {contract.contract_number && (
                <p className="text-sm text-gray-600 mt-1">Nº {contract.contract_number}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Status */}
          <div>
            <Badge className={cn('text-sm px-3 py-1', statusConfig[contract.status])}>
              {contract.status}
            </Badge>
          </div>

          {/* Property Info */}
          {property && (
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">{property.property_name}</span>
              {property.city && <span className="text-gray-500">• {property.city}/{property.state}</span>}
            </div>
          )}

          {/* Key Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Área do Contrato</p>
              <p className="text-2xl font-bold text-gray-900">{contract.area_hectares}</p>
              <p className="text-xs text-gray-500">hectares</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Valor do Contrato</p>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.total_contract_value || 0)}
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Pagamento</p>
              <p className="text-2xl font-bold text-blue-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.payment_value || 0)}
              </p>
              <p className="text-xs text-gray-500">{contract.payment_periodicity}</p>
            </div>

            {contract.compliance_score !== undefined && (
              <div className="bg-emerald-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Conformidade</p>
                <p className="text-2xl font-bold text-emerald-600">{contract.compliance_score}%</p>
              </div>
            )}
          </div>

          {/* Progress */}
          {contract.total_contract_value > 0 && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span className="font-medium">Progresso de Pagamento</span>
                <span className="font-semibold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>Recebido: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceived)}</span>
                <span>Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.total_contract_value || 0)}</span>
              </div>
            </div>
          )}

          {/* Contract Details */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Detalhes do Contrato</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contract.program_name && (
                <div>
                  <p className="text-sm text-gray-600">Programa</p>
                  <p className="font-medium text-gray-900">{contract.program_name}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Pagador</p>
                <p className="font-medium text-gray-900">{contract.payer}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Beneficiário</p>
                <p className="font-medium text-gray-900">{contract.beneficiary_email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Forma de Pagamento</p>
                <p className="font-medium text-gray-900">{contract.payment_method || 'Não especificado'}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contract.start_date && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Data de Início</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}

            {contract.end_date && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Data de Término</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Environmental Services */}
          {contract.environmental_services && contract.environmental_services.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Serviços Ambientais Prestados</h3>
              <div className="flex flex-wrap gap-2">
                {contract.environmental_services.map((service, idx) => (
                  <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Payments Received */}
          {contract.payments_received && contract.payments_received.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Histórico de Pagamentos</h3>
              <div className="space-y-2">
                {contract.payments_received.map((payment, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount || 0)}
                        </p>
                        {payment.period_reference && (
                          <p className="text-sm text-gray-600">Período: {payment.period_reference}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {payment.date && format(new Date(payment.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monitoring */}
          {contract.monitoring && contract.monitoring.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Registros de Monitoramento</h3>
              <div className="space-y-3">
                {contract.monitoring.map((record, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{record.type}</p>
                        <p className="text-sm text-gray-600">
                          {record.date && format(new Date(record.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <Badge className={
                        record.compliance_status === 'Conforme' ? 'bg-green-100 text-green-800' :
                        record.compliance_status === 'Não Conforme' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {record.compliance_status}
                      </Badge>
                    </div>
                    {record.observations && (
                      <p className="text-sm text-gray-700 mt-2">{record.observations}</p>
                    )}
                    {record.monitored_by && (
                      <p className="text-xs text-gray-500 mt-1">Monitorado por: {record.monitored_by}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {contract.notes && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Observações</h3>
              <p className="text-gray-700">{contract.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}