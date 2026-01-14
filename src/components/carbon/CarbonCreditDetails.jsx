import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Edit, Trash2, Leaf, MapPin, Calendar, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CarbonCreditDetails({ credit, property, onClose, onEdit, onDelete }) {
  const statusConfig = {
    'Planejamento': 'bg-gray-100 text-gray-800',
    'Em Implementação': 'bg-blue-100 text-blue-800',
    'Em Validação': 'bg-yellow-100 text-yellow-800',
    'Validado': 'bg-green-100 text-green-800',
    'Certificado': 'bg-emerald-100 text-emerald-800',
    'Comercializado': 'bg-purple-100 text-purple-800',
    'Cancelado': 'bg-red-100 text-red-800'
  };

  const totalRevenue = (credit.transactions || []).reduce((sum, t) => 
    sum + (t.type === 'Venda' ? (t.quantity * t.price_per_credit) : 0), 0
  );

  const completionRate = credit.verified_credits && credit.estimated_credits
    ? (credit.verified_credits / credit.estimated_credits * 100).toFixed(1)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{credit.project_name}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{credit.project_type}</p>
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
            <Badge className={cn('text-sm px-3 py-1', statusConfig[credit.status])}>
              {credit.status}
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

          {/* Description */}
          {credit.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Descrição do Projeto</h3>
              <p className="text-gray-700">{credit.description}</p>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Área do Projeto</p>
              <p className="text-2xl font-bold text-gray-900">{credit.area_hectares}</p>
              <p className="text-xs text-gray-500">hectares</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Créditos Estimados</p>
              <p className="text-2xl font-bold text-green-600">{(credit.estimated_credits || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500">tCO2e</p>
            </div>

            <div className="bg-emerald-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Créditos Verificados</p>
              <p className="text-2xl font-bold text-emerald-600">{(credit.verified_credits || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500">tCO2e</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Disponíveis</p>
              <p className="text-2xl font-bold text-blue-600">{(credit.available_credits || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500">tCO2e</p>
            </div>
          </div>

          {/* Progress */}
          {credit.estimated_credits > 0 && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span className="font-medium">Progresso de Verificação</span>
                <span className="font-semibold">{completionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(completionRate, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {credit.start_date && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Data de Início</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(credit.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}

            {credit.end_date && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Término Previsto</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(credit.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Certification */}
          {(credit.certification_standard || credit.validator || credit.methodology) && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Certificação e Validação</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {credit.certification_standard && (
                  <div>
                    <p className="text-sm text-gray-600">Padrão de Certificação</p>
                    <p className="font-medium text-gray-900">{credit.certification_standard}</p>
                  </div>
                )}
                {credit.validator && (
                  <div>
                    <p className="text-sm text-gray-600">Validador</p>
                    <p className="font-medium text-gray-900">{credit.validator}</p>
                  </div>
                )}
                {credit.methodology && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-600">Metodologia</p>
                    <p className="font-medium text-gray-900">{credit.methodology}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Financial Overview */}
          {((credit.sold_credits > 0) || totalRevenue > 0) && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Resumo Financeiro</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Créditos Vendidos</p>
                  <p className="text-2xl font-bold text-purple-600">{(credit.sold_credits || 0).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">tCO2e</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Receita Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Transactions */}
          {credit.transactions && credit.transactions.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Histórico de Transações</h3>
              <div className="space-y-2">
                {credit.transactions.map((transaction, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{transaction.type}</p>
                        <p className="text-sm text-gray-600">
                          {transaction.quantity} tCO2e • {transaction.buyer}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          transaction.quantity * transaction.price_per_credit
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {transaction.date && format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          {(credit.responsible_email || credit.notes) && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Informações Adicionais</h3>
              <div className="space-y-3">
                {credit.responsible_email && (
                  <div>
                    <p className="text-sm text-gray-600">Responsável</p>
                    <p className="font-medium text-gray-900">{credit.responsible_email}</p>
                  </div>
                )}
                {credit.notes && (
                  <div>
                    <p className="text-sm text-gray-600">Observações</p>
                    <p className="text-gray-700">{credit.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}