import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Filter, DollarSign, BarChart3, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PSAReports({ contracts, properties }) {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Filter payments by date
  const allPayments = contracts.flatMap(contract => 
    (contract.payments_received || []).map(payment => ({
      ...payment,
      contractName: contract.contract_name,
      contractId: contract.id,
      propertyName: properties.find(p => p.id === contract.property_id)?.property_name || 'N/A',
      payer: contract.payer
    }))
  );

  const filteredPayments = allPayments.filter(payment => {
    const payDate = new Date(payment.date);
    const startMatch = !dateRange.start || payDate >= new Date(dateRange.start);
    const endMatch = !dateRange.end || payDate <= new Date(dateRange.end);
    return startMatch && endMatch;
  });

  // Calculate payment metrics
  const paymentMetrics = {
    totalReceived: filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    totalContracts: contracts.length,
    totalContractValue: contracts.reduce((sum, c) => sum + (c.total_contract_value || 0), 0),
    pendingValue: contracts.reduce((sum, c) => {
      const received = (c.payments_received || []).reduce((pSum, p) => pSum + (p.amount || 0), 0);
      return sum + ((c.total_contract_value || 0) - received);
    }, 0)
  };

  // Compliance metrics
  const complianceMetrics = {
    totalMonitoring: contracts.reduce((sum, c) => sum + (c.monitoring?.length || 0), 0),
    compliant: contracts.filter(c => 
      c.monitoring?.some(m => m.compliance_status === 'Conforme')
    ).length,
    avgScore: contracts.length > 0
      ? contracts.reduce((sum, c) => sum + (c.compliance_score || 0), 0) / contracts.length
      : 0
  };

  // Export payment report
  const exportPaymentsCSV = () => {
    if (filteredPayments.length === 0) {
      toast.error('Nenhum pagamento para exportar');
      return;
    }

    const headers = ['Data', 'Contrato', 'Propriedade', 'Pagador', 'Valor (R$)', 'Período Referência'];
    const rows = filteredPayments.map(p => [
      p.date ? format(new Date(p.date), 'dd/MM/yyyy') : 'N/A',
      p.contractName,
      p.propertyName,
      p.payer,
      (p.amount || 0).toFixed(2),
      p.period_reference || 'N/A'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pagamentos_psa_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Relatório de pagamentos exportado!');
  };

  // Export compliance report
  const exportComplianceCSV = () => {
    if (contracts.length === 0) {
      toast.error('Nenhum contrato para exportar');
      return;
    }

    const headers = ['Contrato', 'Propriedade', 'Status', 'Score Conformidade (%)', 'Monitoramentos', 'Último Monitoramento'];
    const rows = contracts.map(c => {
      const lastMonitoring = c.monitoring?.length > 0 
        ? c.monitoring[c.monitoring.length - 1] 
        : null;
      
      return [
        c.contract_name,
        properties.find(p => p.id === c.property_id)?.property_name || 'N/A',
        c.status,
        c.compliance_score || '0',
        c.monitoring?.length || '0',
        lastMonitoring?.date ? format(new Date(lastMonitoring.date), 'dd/MM/yyyy') : 'N/A'
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `conformidade_psa_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Relatório de conformidade exportado!');
  };

  return (
    <div className="space-y-6">
      {/* Payment Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Relatório de Pagamentos
              </CardTitle>
              <CardDescription>Histórico de pagamentos recebidos</CardDescription>
            </div>
            <Button 
              onClick={exportPaymentsCSV} 
              variant="outline" 
              size="sm"
              disabled={filteredPayments.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-700">Filtros</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Data Início</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Data Fim</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Recebido</p>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentMetrics.totalReceived)}
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Valor Total Contratos</p>
              <p className="text-2xl font-bold text-blue-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentMetrics.totalContractValue)}
              </p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">A Receber</p>
              <p className="text-2xl font-bold text-orange-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentMetrics.pendingValue)}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Nº de Pagamentos</p>
              <p className="text-2xl font-bold text-gray-900">{filteredPayments.length}</p>
            </div>
          </div>

          {/* Payments List */}
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Nenhum pagamento encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Contrato</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Pagador</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Valor</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Período</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPayments.map((payment, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">
                        {payment.date ? format(new Date(payment.date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 font-medium">{payment.contractName}</div>
                        <div className="text-xs text-gray-500">{payment.propertyName}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{payment.payer}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount || 0)}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{payment.period_reference || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                Relatório de Conformidade
              </CardTitle>
              <CardDescription>Monitoramento e cumprimento de obrigações</CardDescription>
            </div>
            <Button 
              onClick={exportComplianceCSV} 
              variant="outline" 
              size="sm"
              disabled={contracts.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Score Médio</p>
              <p className="text-3xl font-bold text-blue-600">{complianceMetrics.avgScore.toFixed(1)}%</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Contratos Conformes</p>
              <p className="text-3xl font-bold text-green-600">{complianceMetrics.compliant}</p>
              <p className="text-xs text-gray-500">de {contracts.length} contratos</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total de Monitoramentos</p>
              <p className="text-3xl font-bold text-gray-900">{complianceMetrics.totalMonitoring}</p>
            </div>
          </div>

          {/* Contracts List */}
          {contracts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Nenhum contrato cadastrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map(contract => {
                const property = properties.find(p => p.id === contract.property_id);
                const lastMonitoring = contract.monitoring?.length > 0 
                  ? contract.monitoring[contract.monitoring.length - 1] 
                  : null;

                return (
                  <div key={contract.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{contract.contract_name}</h4>
                        <p className="text-sm text-gray-600">{property?.property_name || 'N/A'}</p>
                      </div>
                      {contract.compliance_score !== undefined && (
                        <Badge className={
                          contract.compliance_score >= 80 ? 'bg-green-100 text-green-800' :
                          contract.compliance_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {contract.compliance_score}% Conformidade
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Status</p>
                        <p className="font-medium text-gray-900">{contract.status}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Monitoramentos</p>
                        <p className="font-medium text-gray-900">{contract.monitoring?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Último Monitoramento</p>
                        <p className="font-medium text-gray-900">
                          {lastMonitoring?.date 
                            ? format(new Date(lastMonitoring.date), 'dd/MM/yyyy', { locale: ptBR })
                            : 'Nenhum'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Última Avaliação</p>
                        <p className="font-medium text-gray-900">
                          {lastMonitoring?.compliance_status || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}