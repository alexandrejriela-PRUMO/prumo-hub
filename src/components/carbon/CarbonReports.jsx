import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Download, 
  Filter,
  TrendingUp,
  DollarSign,
  Calendar,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CarbonReports({ credits, properties }) {
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');

  // Calculate stock by status
  const stockByStatus = {
    estimated: credits.reduce((sum, c) => sum + (c.estimated_credits || 0), 0),
    verified: credits.reduce((sum, c) => sum + (c.verified_credits || 0), 0),
    available: credits.reduce((sum, c) => sum + (c.available_credits || 0), 0),
    sold: credits.reduce((sum, c) => sum + (c.sold_credits || 0), 0)
  };

  // Collect all transactions with project info
  const allTransactions = credits.flatMap(credit => 
    (credit.transactions || []).map(transaction => ({
      ...transaction,
      projectName: credit.project_name,
      projectId: credit.id,
      propertyName: properties.find(p => p.id === credit.property_id)?.property_name || 'N/A'
    }))
  );

  // Filter transactions by date and type
  const filteredTransactions = allTransactions.filter(transaction => {
    const transDate = new Date(transaction.date);
    const startMatch = !dateRange.start || transDate >= new Date(dateRange.start);
    const endMatch = !dateRange.end || transDate <= new Date(dateRange.end);
    const typeMatch = transactionTypeFilter === 'all' || transaction.type === transactionTypeFilter;
    
    return startMatch && endMatch && typeMatch;
  });

  // Calculate financial metrics
  const financialMetrics = credits.reduce((acc, credit) => {
    const projectRevenue = (credit.transactions || []).reduce((sum, t) => 
      sum + (t.type === 'Venda' ? (t.quantity * t.price_per_credit) : 0), 0
    );
    const investment = credit.financial_data?.total_investment || 0;

    return {
      totalRevenue: acc.totalRevenue + projectRevenue,
      totalInvestment: acc.totalInvestment + investment,
      projects: acc.projects + 1
    };
  }, { totalRevenue: 0, totalInvestment: 0, projects: 0 });

  const roi = financialMetrics.totalInvestment > 0 
    ? ((financialMetrics.totalRevenue - financialMetrics.totalInvestment) / financialMetrics.totalInvestment * 100).toFixed(2)
    : 0;

  // Export to CSV
  const exportStockToCSV = () => {
    const headers = ['Status', 'Quantidade (tCO2e)'];
    const rows = [
      ['Estimados', stockByStatus.estimated.toFixed(2)],
      ['Verificados', stockByStatus.verified.toFixed(2)],
      ['Disponíveis', stockByStatus.available.toFixed(2)],
      ['Vendidos', stockByStatus.sold.toFixed(2)]
    ];

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `estoque_creditos_carbono_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Relatório de estoque exportado!');
  };

  const exportTransactionsToCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('Nenhuma transação para exportar');
      return;
    }

    const headers = ['Data', 'Projeto', 'Propriedade', 'Tipo', 'Quantidade (tCO2e)', 'Preço/Crédito (R$)', 'Total (R$)', 'Comprador'];
    const rows = filteredTransactions.map(t => [
      t.date ? format(new Date(t.date), 'dd/MM/yyyy') : 'N/A',
      t.projectName,
      t.propertyName,
      t.type,
      t.quantity?.toFixed(2) || '0',
      t.price_per_credit?.toFixed(2) || '0',
      ((t.quantity || 0) * (t.price_per_credit || 0)).toFixed(2),
      t.buyer || 'N/A'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transacoes_creditos_carbono_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Relatório de transações exportado!');
  };

  const exportFinancialToCSV = () => {
    const headers = ['Métrica', 'Valor'];
    const rows = [
      ['Total de Projetos', financialMetrics.projects],
      ['Receita Total (R$)', financialMetrics.totalRevenue.toFixed(2)],
      ['Investimento Total (R$)', financialMetrics.totalInvestment.toFixed(2)],
      ['ROI (%)', roi],
      ['Créditos Vendidos (tCO2e)', stockByStatus.sold.toFixed(2)]
    ];

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `desempenho_financeiro_carbono_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Relatório financeiro exportado!');
  };

  return (
    <div className="space-y-6">
      {/* Stock Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-600" />
                Estoque de Créditos por Status
              </CardTitle>
              <CardDescription>Resumo total de créditos de carbono</CardDescription>
            </div>
            <Button onClick={exportStockToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Créditos Estimados</p>
              <p className="text-3xl font-bold text-green-600">{stockByStatus.estimated.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">tCO2e</p>
            </div>

            <div className="bg-emerald-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Créditos Verificados</p>
              <p className="text-3xl font-bold text-emerald-600">{stockByStatus.verified.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">tCO2e</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Disponíveis para Venda</p>
              <p className="text-3xl font-bold text-blue-600">{stockByStatus.available.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">tCO2e</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Créditos Vendidos</p>
              <p className="text-3xl font-bold text-purple-600">{stockByStatus.sold.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">tCO2e</p>
            </div>
          </div>

          {/* Progress visualization */}
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Taxa de Verificação</p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-emerald-600 h-3 rounded-full transition-all"
                style={{ 
                  width: `${stockByStatus.estimated > 0 ? (stockByStatus.verified / stockByStatus.estimated * 100) : 0}%` 
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stockByStatus.estimated > 0 
                ? `${(stockByStatus.verified / stockByStatus.estimated * 100).toFixed(1)}% dos créditos estimados foram verificados`
                : 'Nenhum crédito estimado'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Histórico de Transações
              </CardTitle>
              <CardDescription>Registro completo de vendas e transferências</CardDescription>
            </div>
            <Button 
              onClick={exportTransactionsToCSV} 
              variant="outline" 
              size="sm"
              disabled={filteredTransactions.length === 0}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <div>
                <Label className="text-xs">Tipo de Transação</Label>
                <select
                  value={transactionTypeFilter}
                  onChange={(e) => setTransactionTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Todas</option>
                  <option value="Venda">Venda</option>
                  <option value="Transferência">Transferência</option>
                  <option value="Aposentadoria">Aposentadoria</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total de Transações</p>
              <p className="text-2xl font-bold text-blue-600">{filteredTransactions.length}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Volume Transacionado</p>
              <p className="text-2xl font-bold text-purple-600">
                {filteredTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">tCO2e</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Valor Total</p>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  filteredTransactions.reduce((sum, t) => sum + ((t.quantity || 0) * (t.price_per_credit || 0)), 0)
                )}
              </p>
            </div>
          </div>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Projeto</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Tipo</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Quantidade</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Preço/Crédito</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Total</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Comprador</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTransactions.map((transaction, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">
                        {transaction.date ? format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 font-medium">{transaction.projectName}</div>
                        <div className="text-xs text-gray-500">{transaction.propertyName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={
                          transaction.type === 'Venda' ? 'bg-green-100 text-green-800' :
                          transaction.type === 'Transferência' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {transaction.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {(transaction.quantity || 0).toFixed(2)} tCO2e
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.price_per_credit || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          (transaction.quantity || 0) * (transaction.price_per_credit || 0)
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{transaction.buyer || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Performance Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Desempenho Financeiro
              </CardTitle>
              <CardDescription>Análise de receitas e investimentos</CardDescription>
            </div>
            <Button onClick={exportFinancialToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total de Projetos</p>
              <p className="text-3xl font-bold text-gray-900">{financialMetrics.projects}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Receita Total</p>
              <p className="text-3xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(financialMetrics.totalRevenue)}
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Investimento Total</p>
              <p className="text-3xl font-bold text-blue-600">
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(financialMetrics.totalInvestment)}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${roi >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <p className="text-sm text-gray-600 mb-1">ROI</p>
              <p className={`text-3xl font-bold ${roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {roi}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Retorno sobre Investimento</p>
            </div>
          </div>

          {/* Financial breakdown by project */}
          {credits.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-gray-900 mb-3">Desempenho por Projeto</h4>
              <div className="space-y-2">
                {credits
                  .filter(c => c.transactions && c.transactions.length > 0)
                  .map(credit => {
                    const projectRevenue = (credit.transactions || []).reduce((sum, t) => 
                      sum + (t.type === 'Venda' ? (t.quantity * t.price_per_credit) : 0), 0
                    );
                    const projectInvestment = credit.financial_data?.total_investment || 0;
                    const projectROI = projectInvestment > 0 
                      ? ((projectRevenue - projectInvestment) / projectInvestment * 100).toFixed(1)
                      : 0;

                    return (
                      <div key={credit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{credit.project_name}</p>
                          <p className="text-sm text-gray-600">
                            {properties.find(p => p.id === credit.property_id)?.property_name || 'N/A'}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-right">
                          <div>
                            <p className="text-xs text-gray-500">Receita</p>
                            <p className="font-semibold text-green-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectRevenue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Investimento</p>
                            <p className="font-semibold text-blue-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectInvestment)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">ROI</p>
                            <p className={`font-semibold ${projectROI >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {projectROI}%
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}