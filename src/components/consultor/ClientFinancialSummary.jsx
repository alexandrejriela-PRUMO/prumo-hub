import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, Zap } from 'lucide-react';

export default function ClientFinancialSummary({ crm }) {
  if (!crm?.services || crm.services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Controle Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">Nenhum serviço registrado</p>
        </CardContent>
      </Card>
    );
  }

  const activeServices = crm.services.filter(s => s.status === 'Contratado' || s.status === 'Em Andamento');
  const totalHonorarios = crm.services.reduce((sum, s) => sum + (s.value || 0), 0);
  
  // Encontra próximo vencimento
  let nextExpiry = null;
  if (activeServices.length > 0) {
    activeServices.forEach(s => {
      if (s.start_date) {
        const startDate = new Date(s.start_date);
        // Assumindo contrato de 12 meses como padrão
        const expiryDate = new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
        
        if (!nextExpiry || expiryDate < nextExpiry) {
          nextExpiry = expiryDate;
        }
      }
    });
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const daysUntilExpiry = nextExpiry ? Math.ceil((nextExpiry - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Honorários Totais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-700">{formatCurrency(totalHonorarios)}</div>
          <p className="text-xs text-gray-500 mt-1">{crm.services.length} serviço(s)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            Serviços Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-700">{activeServices.length}</div>
          <p className="text-xs text-gray-500 mt-1">Em andamento ou contratado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            Próx. Vencimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextExpiry ? (
            <>
              <div className={`text-2xl font-bold ${daysUntilExpiry < 30 ? 'text-orange-700' : 'text-gray-700'}`}>
                {daysUntilExpiry}d
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {nextExpiry.toLocaleDateString('pt-BR')}
              </p>
              {daysUntilExpiry < 30 && (
                <Badge className="mt-2 bg-orange-100 text-orange-800">Vence em breve</Badge>
              )}
            </>
          ) : (
            <div className="text-gray-500 text-sm">-</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}