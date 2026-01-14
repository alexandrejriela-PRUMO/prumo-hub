import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Edit, Trash2, Shield, MapPin, Calendar, DollarSign, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function EasementDetails({ easement, property, onClose, onEdit, onDelete }) {
  const statusConfig = {
    'Ativa': 'bg-green-100 text-green-800',
    'Registrada': 'bg-blue-100 text-blue-800',
    'Em Aprovação': 'bg-yellow-100 text-yellow-800',
    'Suspensa': 'bg-orange-100 text-orange-800',
    'Cancelada': 'bg-red-100 text-red-800',
    'Expirada': 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{easement.easement_name}</CardTitle>
              {easement.easement_number && (
                <p className="text-sm text-gray-600 mt-1">Nº {easement.easement_number}</p>
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
          {/* Status & Type */}
          <div className="flex items-center gap-2">
            <Badge className={cn('text-sm px-3 py-1', statusConfig[easement.status])}>
              {easement.status}
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {easement.easement_type}
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
              <p className="text-sm text-gray-600 mb-1">Área Protegida</p>
              <p className="text-2xl font-bold text-gray-900">{easement.area_hectares}</p>
              <p className="text-xs text-gray-500">hectares</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Vegetação</p>
              <p className="text-lg font-bold text-green-600">{easement.vegetation_type}</p>
            </div>

            {easement.environmental_indicators?.carbon_stock && (
              <div className="bg-teal-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Carbono</p>
                <p className="text-2xl font-bold text-teal-600">
                  {easement.environmental_indicators.carbon_stock}
                </p>
                <p className="text-xs text-gray-500">tCO2e</p>
              </div>
            )}

            {easement.compensation?.has_compensation && (
              <div className="bg-emerald-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Compensação</p>
                <p className="text-lg font-bold text-emerald-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    easement.compensation.compensation_value || 0
                  )}
                </p>
                <p className="text-xs text-gray-500">{easement.compensation.payment_type}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Período</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {easement.start_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Data de Início</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(easement.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}

              {easement.end_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Data de Término</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(easement.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}

              {easement.duration_years && (
                <div>
                  <p className="text-xs text-gray-500">Duração</p>
                  <p className="font-medium text-gray-900">{easement.duration_years} anos</p>
                </div>
              )}
            </div>
          </div>

          {/* Conservation Purpose */}
          {easement.conservation_purpose && easement.conservation_purpose.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Finalidades de Conservação</h3>
              <div className="flex flex-wrap gap-2">
                {easement.conservation_purpose.map((purpose, idx) => (
                  <Badge key={idx} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {purpose}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Beneficiary */}
          {(easement.beneficiary || easement.beneficiary_email) && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Beneficiário</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {easement.beneficiary && (
                  <div>
                    <p className="text-sm text-gray-600">Nome</p>
                    <p className="font-medium text-gray-900">{easement.beneficiary}</p>
                  </div>
                )}
                {easement.beneficiary_email && (
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{easement.beneficiary_email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Registry Info */}
          {easement.registry_info && Object.keys(easement.registry_info).length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Informações de Registro</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {easement.registry_info.registry_office && (
                  <div>
                    <p className="text-sm text-gray-600">Cartório</p>
                    <p className="font-medium text-gray-900">{easement.registry_info.registry_office}</p>
                  </div>
                )}
                {easement.registry_info.registration_number && (
                  <div>
                    <p className="text-sm text-gray-600">Matrícula</p>
                    <p className="font-medium text-gray-900">{easement.registry_info.registration_number}</p>
                  </div>
                )}
                {easement.registry_info.registration_date && (
                  <div>
                    <p className="text-sm text-gray-600">Data de Registro</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(easement.registry_info.registration_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compensation Details */}
          {easement.compensation?.has_compensation && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Detalhes da Compensação</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      easement.compensation.compensation_value || 0
                    )}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Já Pago</p>
                  <p className="text-lg font-bold text-green-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      easement.compensation.total_paid || 0
                    )}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Tipo</p>
                  <p className="font-semibold text-gray-900">{easement.compensation.payment_type}</p>
                </div>
              </div>
            </div>
          )}

          {/* Monitoring */}
          {easement.monitoring && easement.monitoring.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Monitoramento</h3>
              <div className="space-y-3">
                {easement.monitoring.map((record, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {record.date && format(new Date(record.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                        {record.inspector && (
                          <p className="text-sm text-gray-600">Responsável: {record.inspector}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge className={
                          record.compliance_status === 'Conforme' ? 'bg-green-100 text-green-800' :
                          record.compliance_status === 'Não Conforme' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {record.compliance_status}
                        </Badge>
                        {record.vegetation_condition && (
                          <Badge variant="outline">
                            {record.vegetation_condition}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {record.observations && (
                      <p className="text-sm text-gray-700 mt-2">{record.observations}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {easement.notes && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Observações</h3>
              <p className="text-gray-700">{easement.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}