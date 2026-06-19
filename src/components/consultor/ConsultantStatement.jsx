import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import {
  Wallet, TrendingUp, ArrowLeftRight, Clock, ChevronDown, ChevronUp,
  PiggyBank, Building, CreditCard, Receipt, DollarSign, Filter,
  ArrowDown, ArrowUp, Info
} from 'lucide-react';
import { toast } from 'sonner';

const paymentMethodIcons = {
  PIX: DollarSign,
  BOLETO: Receipt,
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
};

const paymentMethodLabels = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
};

export default function ConsultantStatement({ meta }) {
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [statement, setStatement] = useState([]);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementPage, setStatementPage] = useState(0);
  const [statementHasMore, setStatementHasMore] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [expandedTx, setExpandedTx] = useState(null);
  const [periodFilter, setPeriodFilter] = useState('all'); // all, 7d, 30d, 90d

  useEffect(() => {
    if (meta?.asaas_subaccount_id) {
      loadBalance();
      loadStatement();
      loadSummary();
    }
  }, [meta?.asaas_subaccount_id, periodFilter]);

  const getDateRange = () => {
    const now = new Date();
    if (periodFilter === '7d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { startDate: d.toISOString().split('T')[0] };
    }
    if (periodFilter === '30d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return { startDate: d.toISOString().split('T')[0] };
    }
    if (periodFilter === '90d') {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return { startDate: d.toISOString().split('T')[0] };
    }
    return {};
  };

  const loadBalance = async () => {
    setBalanceLoading(true);
    try {
      const res = await base44.functions.invoke('consultantWallet', { action: 'balance' });
      if (res.data?.error) { toast.error(res.data.error); return; }
      setBalance(res.data?.balance ?? 0);
    } catch (e) {
      toast.error('Erro ao consultar saldo');
    } finally { setBalanceLoading(false); }
  };

  const loadStatement = async (page = 0) => {
    setStatementLoading(true);
    try {
      const dateRange = getDateRange();
      const res = await base44.functions.invoke('consultantWallet', {
        action: 'statement',
        offset: page * 20,
        limit: 20,
        ...dateRange,
      });
      if (res.data?.error) { toast.error(res.data.error); return; }
      setStatement(res.data?.data || []);
      setStatementHasMore(res.data?.hasMore || false);
      setStatementPage(page);
    } catch (e) {
      toast.error('Erro ao carregar extrato');
    } finally { setStatementLoading(false); }
  };

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const dateRange = getDateRange();
      const res = await base44.functions.invoke('consultantWallet', {
        action: 'summary',
        ...dateRange,
      });
      if (res.data?.error) { toast.error(res.data.error); return; }
      setSummary(res.data);
    } catch (e) {
      console.error('Erro ao carregar resumo:', e);
    } finally { setSummaryLoading(false); }
  };

  const getMethodIcon = (method) => {
    const key = method?.toUpperCase?.() || '';
    const Icon = paymentMethodIcons[key] || DollarSign;
    return <Icon className="w-3.5 h-3.5" />;
  };

  const getMethodLabel = (method) => {
    const key = method?.toUpperCase?.() || '';
    return paymentMethodLabels[key] || method || '—';
  };

  const getPaymentTimelineClass = (method) => {
    const key = method?.toUpperCase?.() || '';
    switch (key) {
      case 'PIX': return { label: 'Instantâneo', badgeClass: 'bg-emerald-100 text-emerald-600', dotClass: 'bg-emerald-500' };
      case 'BOLETO': return { label: 'Mesmo dia', badgeClass: 'bg-blue-100 text-blue-600', dotClass: 'bg-blue-500' };
      case 'CREDIT_CARD': return { label: '32 dias', badgeClass: 'bg-red-100 text-red-600', dotClass: 'bg-red-500' };
      case 'DEBIT_CARD': return { label: '3 dias úteis', badgeClass: 'bg-amber-100 text-amber-600', dotClass: 'bg-amber-500' };
      default: return { label: '—', badgeClass: 'bg-gray-100 text-gray-500', dotClass: 'bg-gray-400' };
    }
  };

  const formatCurrency = (val) => {
    if (val == null) return '—';
    return Math.abs(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      {/* Saldo */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-700 font-medium mb-0.5">Saldo disponível na carteira</p>
              {balanceLoading ? (
                <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mt-1" />
              ) : (
                <p className="text-3xl font-bold text-emerald-800">
                  {formatCurrency(balance ?? 0)}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={loadBalance} disabled={balanceLoading} className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" /> Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Recebido</p>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatCurrency(summary.totalCredit)}</p>
              <p className="text-[9px] text-slate-400">{summary.count} transações</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Taxas Asaas</p>
              <p className="text-lg font-bold text-red-600 mt-0.5">{formatCurrency(summary.totalFees)}</p>
              <p className="text-[9px] text-slate-400">
                {summary.totalCredit > 0
                  ? `${((summary.totalFees / summary.totalCredit) * 100).toFixed(1)}% do recebido`
                  : '—'}
              </p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Líquido</p>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatCurrency(summary.netResult)}</p>
              <p className="text-[9px] text-slate-400">após taxas</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Retido</p>
              <p className="text-lg font-bold text-amber-700 mt-0.5">{formatCurrency(summary.totalDebit)}</p>
              <p className="text-[9px] text-slate-400">saídas/transferências</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detalhamento por método */}
      {summary?.byMethod && Object.keys(summary.byMethod).length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <PiggyBank className="w-4 h-4" /> Taxas por forma de pagamento
            </p>
            <div className="space-y-2">
              {Object.entries(summary.byMethod).map(([method, data]) => {
                const tl = getPaymentTimelineClass(method);
                const taxPercent = data.totalValue > 0
                  ? ((data.totalFees / data.totalValue) * 100).toFixed(1)
                  : '0.0';
                return (
                  <div key={method} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                    {getMethodIcon(method)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-700">{getMethodLabel(method)}</span>
                      <Badge className={`${tl.badgeClass} border-0 text-[9px]`}>{tl.label}</Badge>
                    </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px]">
                        <span className="text-slate-500">{data.count} tx</span>
                        <span className="text-slate-500">Bruto: <strong className="text-slate-700">{formatCurrency(data.totalValue)}</strong></span>
                        <span className="text-red-500">Taxa: <strong>{formatCurrency(data.totalFees)}</strong> ({taxPercent}%)</span>
                        <span className="text-emerald-600">Líq: <strong>{formatCurrency(data.totalNet)}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtro de período */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <ArrowLeftRight className="w-4 h-4" /> Extrato de Transações
        </p>
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'Tudo' },
            { key: '7d', label: '7d' },
            { key: '30d', label: '30d' },
            { key: '90d', label: '90d' },
          ].map(f => (
            <Button
              key={f.key}
              variant={periodFilter === f.key ? 'default' : 'outline'}
              size="sm"
              className={`text-[10px] h-7 px-2 ${periodFilter === f.key ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              onClick={() => setPeriodFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabela de extrato */}
      {statementLoading ? (
        <div className="text-center py-10">
          <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : statement.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">Nenhuma movimentação no período</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-500">Data</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-500">Descrição</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-500">Método</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-slate-500">Valor Bruto</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-slate-500">Taxa Asaas</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-slate-500">Líquido</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statement.map(tx => {
                    const isCredit = tx.value >= 0;
                    const isExpanded = expandedTx === tx.id;
                    const method = tx.paymentMethod || tx.type;
                    const tl = getPaymentTimelineClass(method);
                    const feePercent = tx.value > 0 ? ((tx.feeValue || 0) / tx.value * 100).toFixed(1) : '0.0';
                    return (
                      <React.Fragment key={tx.id}>
                        <tr
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                        >
                          <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                            {tx.date ? format(parseISO(tx.date), 'dd/MM/yy HH:mm') : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700 max-w-[200px] truncate">
                            {tx.description || tx.type}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {getMethodIcon(method)}
                              <span className="text-slate-600">{getMethodLabel(method)}</span>
                              <Badge className={`${tl.badgeClass} border-0 text-[8px]`}>{tl.label}</Badge>
                            </div>
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                            {isCredit ? '+' : '−'}{formatCurrency(tx.value)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-red-500 whitespace-nowrap">
                            {tx.feeValue ? (
                              <span>−{formatCurrency(tx.feeValue)} <span className="text-[9px] text-red-400">({feePercent}%)</span></span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-700 whitespace-nowrap">
                            {tx.netValue != null ? formatCurrency(tx.netValue) : '—'}
                          </td>
                          <td className="px-2 py-2.5">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${tx.id}-detail`} className="bg-slate-50/50">
                            <td colSpan={7} className="px-4 py-3">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase">Valor Bruto</p>
                                  <p className="font-semibold text-slate-700 mt-0.5">{formatCurrency(tx.value)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase">Taxa Asaas</p>
                                  <p className="font-semibold text-red-600 mt-0.5">
                                    {tx.feeValue ? `−${formatCurrency(tx.feeValue)}` : 'Isento'}
                                  </p>
                                  {tx.feeValue > 0 && (
                                    <p className="text-[9px] text-slate-400">{feePercent}% do valor bruto</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase">Comissão PRUMO (10%)</p>
                                  <p className="font-semibold text-amber-600 mt-0.5">
                                    {tx.netValue != null && tx.value > 0
                                      ? `−${formatCurrency((tx.netValue || 0) * 0.10)}`
                                      : '—'}
                                  </p>
                                  <p className="text-[9px] text-slate-400">sobre o líquido Asaas</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase">Você Recebe</p>
                                  <p className="font-semibold text-emerald-700 mt-0.5">
                                    {tx.netValue != null
                                      ? formatCurrency((tx.netValue || 0) * 0.90)
                                      : '—'}
                                  </p>
                                  <p className="text-[9px] text-slate-400">líquido final estimado</p>
                                </div>
                                {tx.balanceBefore != null && (
                                  <div className="col-span-2 sm:col-span-4 flex items-center gap-4 pt-2 border-t border-slate-200">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-slate-400">Saldo antes:</span>
                                      <span className="text-xs font-medium text-slate-600">{formatCurrency(tx.balanceBefore)}</span>
                                    </div>
                                    <ArrowDown className="w-3 h-3 text-slate-300" />
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-slate-400">Saldo depois:</span>
                                      <span className="text-xs font-medium text-slate-600">{formatCurrency(tx.balanceAfter)}</span>
                                    </div>
                                  </div>
                                )}
                                {tx.installmentInfo && (
                                  <div className="col-span-2 sm:col-span-4 pt-1">
                                    <p className="text-[10px] text-slate-400">
                                      Parcela {tx.installmentInfo.current}/{tx.installmentInfo.total}
                                      {tx.installmentInfo.current > 1 && ` — valor original: ${formatCurrency(tx.originalValue)}`}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {statement.map(tx => {
                const isCredit = tx.value >= 0;
                const isExpanded = expandedTx === tx.id;
                const method = tx.paymentMethod || tx.type;
                const tl = getPaymentTimelineClass(method);
                return (
                  <div key={tx.id} className="p-3 space-y-2 cursor-pointer" onClick={() => setExpandedTx(isExpanded ? null : tx.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isCredit ? '+' : '−'}{formatCurrency(tx.netValue ?? tx.value)}
                        </span>
                        <Badge className={`${tl.badgeClass} border-0 text-[8px]`}>{getMethodLabel(method)}</Badge>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {tx.date ? format(parseISO(tx.date), 'dd/MM/yy') : '—'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">{tx.description || tx.type}</p>
                    {isExpanded && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[10px]">
                        <div><span className="text-slate-400">Bruto:</span> <span className="font-medium">{formatCurrency(tx.value)}</span></div>
                        <div><span className="text-slate-400">Taxa:</span> <span className="font-medium text-red-500">{tx.feeValue ? `−${formatCurrency(tx.feeValue)}` : 'Isento'}</span></div>
                        <div><span className="text-slate-400">Líquido:</span> <span className="font-medium">{formatCurrency(tx.netValue)}</span></div>
                        <div className="flex items-center gap-1">
                          {getMethodIcon(method)}
                          <span>Prazo: <Badge className={`${tl.badgeClass} border-0 text-[8px]`}>{tl.label}</Badge></span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end">
                      {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-300" /> : <ChevronDown className="w-3 h-3 text-slate-300" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            {statementHasMore && (
              <div className="flex justify-center gap-2 py-3 border-t">
                {statementPage > 0 && (
                  <Button variant="outline" size="sm" onClick={() => loadStatement(statementPage - 1)} className="text-xs">
                    ← Anterior
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => loadStatement(statementPage + 1)} className="text-xs">
                  Próxima →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info de prazos */}
      <Card className="border-slate-200 bg-slate-50/50">
        <CardContent className="pt-4 pb-3">
          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Prazos de compensação do Asaas
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-emerald-100">
              <p className="font-medium text-slate-700">PIX</p>
              <p className="text-emerald-600 font-semibold">Instantâneo</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-blue-100">
              <p className="font-medium text-slate-700">Boleto</p>
              <p className="text-blue-600 font-semibold">No mesmo dia</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-amber-100">
              <p className="font-medium text-slate-700">Débito</p>
              <p className="text-amber-600 font-semibold">3 dias úteis</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-red-100">
              <p className="font-medium text-slate-700">Crédito</p>
              <p className="text-red-600 font-semibold">32 dias</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            O dinheiro só aparece no seu saldo após a compensação. Depois disso, você pode sacar via PIX para sua conta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}