import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Scale, Wallet, CalendarRange,
  ArrowUpRight, ArrowDownRight, AlertCircle, Info
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmt = (v) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00';
const fmtK = (v) => {
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
};

function normalizeStatus(s) {
  if (!s) return 'Pendente';
  if (s === 'Pago' || s === 'Paga') return 'Pago';
  if (s === 'Cancelada') return 'Cancelado';
  return s;
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[180px]">
      <p className="text-xs font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 text-xs">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="font-bold text-gray-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function FinancialDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: charges = [] } = useQuery({
    queryKey: ['fd-charges', user?.email],
    queryFn: () => base44.entities.ConsultorCharge.filter({ consultor_email: user.email }, '-due_date', 1000),
    enabled: !!user?.email,
  });

  const { data: manualEntries = [] } = useQuery({
    queryKey: ['fd-manual', user?.email],
    queryFn: () => base44.entities.Expense.filter({ consultor_email: user.email }, '-date', 1000),
    enabled: !!user?.email,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['fd-contracts', user?.email],
    queryFn: () => base44.entities.ClientContract.filter({ consultor_email: user.email }, '-start_date', 500),
    enabled: !!user?.email,
  });

  // ── Build last 12 months history ─────────────────────────────────────────
  const historico = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, 11 - i);
      return format(d, 'yyyy-MM');
    });

    const byMonth = {};
    months.forEach(m => { byMonth[m] = { receita: 0, despesa: 0 }; });

    // Stripe charges (receitas)
    charges.forEach(c => {
      const month = (c.due_date || c.paid_at || '')?.substring(0, 7);
      if (byMonth[month] && normalizeStatus(c.status) === 'Pago') {
        byMonth[month].receita += c.amount || 0;
      }
    });

    // Manual entries
    manualEntries.forEach(e => {
      const month = (e.competencia || e.date?.substring(0, 7));
      if (byMonth[month]) {
        if (e.transaction_type === 'receita') byMonth[month].receita += e.amount || 0;
        else byMonth[month].despesa += e.amount || 0;
      }
    });

    return months.map(m => ({
      mes: format(parseISO(m + '-01'), 'MMM/yy', { locale: ptBR }),
      mesKey: m,
      receita: byMonth[m].receita,
      despesa: byMonth[m].despesa,
      resultado: byMonth[m].receita - byMonth[m].despesa,
    }));
  }, [charges, manualEntries]);

  // ── Build next 12 months projection ──────────────────────────────────────
  const projecao = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 13 }, (_, i) => {
      const d = addMonths(now, i);
      return format(d, 'yyyy-MM');
    });

    const byMonth = {};
    months.forEach(m => { byMonth[m] = { receita: 0, despesa: 0, sources: [] }; });

    // Active Stripe charges still pending/upcoming
    charges.forEach(c => {
      const month = (c.due_date || '')?.substring(0, 7);
      if (byMonth[month] && ['Pendente', 'Vencido'].includes(normalizeStatus(c.status))) {
        byMonth[month].receita += c.amount || 0;
        byMonth[month].sources.push({ type: 'stripe', label: c.description, amount: c.amount });
      }
    });

    // Active contracts: estimate monthly revenue from total_value / duration
    contracts.filter(c => c.status === 'Ativo' && c.total_value && c.start_date && c.end_date).forEach(c => {
      const start = parseISO(c.start_date);
      const end = parseISO(c.end_date);
      if (!isValid(start) || !isValid(end)) return;
      // How many months is the contract active?
      let cur = startOfMonth(start);
      let count = 0;
      while (cur <= end) { count++; cur = addMonths(cur, 1); }
      const monthly = count > 0 ? c.total_value / count : 0;
      // Assign to future months within range
      months.forEach(m => {
        const mDate = parseISO(m + '-01');
        if (mDate >= startOfMonth(start) && mDate <= end) {
          if (byMonth[m]) {
            byMonth[m].receita += monthly;
            byMonth[m].sources.push({ type: 'contract', label: c.contract_type, amount: monthly });
          }
        }
      });
    });

    // Recurring expenses: look at last 3 months average of each category
    const last3Months = Array.from({ length: 3 }, (_, i) => format(subMonths(now, i + 1), 'yyyy-MM'));
    const expenseByCategory = {};
    manualEntries.filter(e => e.transaction_type === 'despesa' && last3Months.includes(e.competencia || e.date?.substring(0, 7))).forEach(e => {
      const cat = e.category || 'Outros';
      if (!expenseByCategory[cat]) expenseByCategory[cat] = [];
      expenseByCategory[cat].push(e.amount || 0);
    });
    // Average per category per month
    const avgExpensePerMonth = Object.entries(expenseByCategory).reduce((sum, [, vals]) => {
      return sum + vals.reduce((s, v) => s + v, 0) / 3;
    }, 0);

    // Also project manual income recurrence (last 3-month average)
    const incomeByMonth = {};
    last3Months.forEach(m => { incomeByMonth[m] = 0; });
    manualEntries.filter(e => e.transaction_type === 'receita' && last3Months.includes(e.competencia || e.date?.substring(0, 7))).forEach(e => {
      const m = e.competencia || e.date?.substring(0, 7);
      if (incomeByMonth[m] !== undefined) incomeByMonth[m] += e.amount || 0;
    });
    const avgManualIncomePerMonth = Object.values(incomeByMonth).reduce((s, v) => s + v, 0) / 3;

    // Build projection
    let accSaldo = 0;
    // Seed accumulated balance from last historico resultado
    historico.forEach(h => { accSaldo += h.resultado; });

    return months.map((m, i) => {
      const projReceita = byMonth[m].receita + avgManualIncomePerMonth;
      const projDespesa = byMonth[m].despesa + avgExpensePerMonth;
      const resultado = projReceita - projDespesa;
      accSaldo += resultado;
      return {
        mes: format(parseISO(m + '-01'), 'MMM/yy', { locale: ptBR }),
        mesKey: m,
        receita: Math.round(projReceita),
        despesa: Math.round(projDespesa),
        resultado: Math.round(resultado),
        saldoAcumulado: Math.round(accSaldo),
        isCurrent: i === 0,
      };
    });
  }, [charges, manualEntries, contracts, historico]);

  // ── Summary KPIs ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalReceita12 = historico.reduce((s, h) => s + h.receita, 0);
    const totalDespesa12 = historico.reduce((s, h) => s + h.despesa, 0);
    const resultado12 = totalReceita12 - totalDespesa12;
    const melhorMes = [...historico].sort((a, b) => b.resultado - a.resultado)[0];
    const piorMes = [...historico].sort((a, b) => a.resultado - b.resultado)[0];
    const projFim12 = projecao[projecao.length - 1]?.saldoAcumulado ?? 0;
    return { totalReceita12, totalDespesa12, resultado12, melhorMes, piorMes, projFim12 };
  }, [historico, projecao]);

  // Combine last 2 months of history + 12 months of projection for the flow chart
  const fluxoCombinado = useMemo(() => [
    ...historico.slice(-2).map(h => ({ ...h, tipo: 'real' })),
    ...projecao.map(p => ({ ...p, tipo: p.isCurrent ? 'atual' : 'projetado' })),
  ], [historico, projecao]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="w-7 h-7 text-emerald-600" />
          Painel Financeiro
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Balanço dos últimos 12 meses + projeção de fluxo de caixa para os próximos 12 meses</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Receita (12m)</p>
                <p className="text-xl font-bold text-emerald-600 mt-0.5">{fmt(kpis.totalReceita12)}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Despesas (12m)</p>
                <p className="text-xl font-bold text-red-600 mt-0.5">{fmt(kpis.totalDespesa12)}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={kpis.resultado12 >= 0 ? 'border-blue-100' : 'border-orange-100'}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Resultado (12m)</p>
                <p className={`text-xl font-bold mt-0.5 ${kpis.resultado12 >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>{fmt(kpis.resultado12)}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpis.resultado12 >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                <Scale className={`w-4 h-4 ${kpis.resultado12 >= 0 ? 'text-blue-600' : 'text-orange-500'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={kpis.projFim12 >= 0 ? 'border-violet-100 bg-violet-50/40' : 'border-red-200 bg-red-50/40'}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Saldo Proj. (12m)</p>
                <p className={`text-xl font-bold mt-0.5 ${kpis.projFim12 >= 0 ? 'text-violet-700' : 'text-red-700'}`}>{fmt(kpis.projFim12)}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpis.projFim12 >= 0 ? 'bg-violet-100' : 'bg-red-100'}`}>
                <CalendarRange className={`w-4 h-4 ${kpis.projFim12 >= 0 ? 'text-violet-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balanço Histórico - últimos 12 meses */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Balanço Mensal — Últimos 12 Meses
          </CardTitle>
          <p className="text-xs text-gray-400">Receitas confirmadas vs despesas lançadas por mês</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={historico} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="despesa" name="Despesa" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Line dataKey="resultado" name="Resultado" type="monotone" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6' }} />
              <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Best / Worst month callouts */}
          {kpis.melhorMes && kpis.piorMes && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
                <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Melhor mês</p>
                  <p className="text-sm font-bold text-emerald-700">{kpis.melhorMes.mes} · {fmt(kpis.melhorMes.resultado)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-red-50 rounded-xl px-4 py-3">
                <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Pior mês</p>
                  <p className="text-sm font-bold text-red-600">{kpis.piorMes.mes} · {fmt(kpis.piorMes.resultado)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fluxo de Caixa Projetado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-violet-600" />
            Fluxo de Caixa Projetado — Próximos 12 Meses
          </CardTitle>
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            Estimativa baseada em cobranças Stripe pendentes, contratos ativos e média de despesas recorrentes dos últimos 3 meses
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={projecao} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="despGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area dataKey="receita" name="Receita Proj." type="monotone" stroke="#10b981" strokeWidth={2} fill="url(#recGrad)" />
              <Area dataKey="despesa" name="Despesa Proj." type="monotone" stroke="#f87171" strokeWidth={2} fill="url(#despGrad)" />
              <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Saldo Acumulado Projetado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-600" />
            Saldo Acumulado Projetado
          </CardTitle>
          <p className="text-xs text-gray-400">Evolução do saldo líquido acumulado ao longo dos próximos 12 meses</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={projecao} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Area dataKey="saldoAcumulado" name="Saldo Acumulado" type="monotone" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#saldoGrad)" dot={{ r: 3, fill: '#8b5cf6' }} />
              <ReferenceLine y={0} stroke="#f87171" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Ponto de equilíbrio', position: 'insideTopRight', fontSize: 10, fill: '#f87171' }} />
            </AreaChart>
          </ResponsiveContainer>

          {/* Projection table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-gray-500 font-semibold">Mês</th>
                  <th className="text-right py-2 px-2 text-emerald-600 font-semibold">Receita</th>
                  <th className="text-right py-2 px-2 text-red-500 font-semibold">Despesa</th>
                  <th className="text-right py-2 px-2 text-blue-600 font-semibold">Resultado</th>
                  <th className="text-right py-2 px-2 text-violet-700 font-semibold">Saldo Acum.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projecao.map((p) => (
                  <tr key={p.mesKey} className={`hover:bg-gray-50 ${p.isCurrent ? 'bg-amber-50/50' : ''}`}>
                    <td className="py-2 px-2 font-medium text-gray-700 flex items-center gap-1.5">
                      {p.mes}
                      {p.isCurrent && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs px-1.5 py-0">atual</Badge>}
                    </td>
                    <td className="py-2 px-2 text-right text-emerald-600 font-medium">{fmt(p.receita)}</td>
                    <td className="py-2 px-2 text-right text-red-500 font-medium">{fmt(p.despesa)}</td>
                    <td className={`py-2 px-2 text-right font-bold ${p.resultado >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{fmt(p.resultado)}</td>
                    <td className={`py-2 px-2 text-right font-bold ${p.saldoAcumulado >= 0 ? 'text-violet-700' : 'text-red-600'}`}>{fmt(p.saldoAcumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {kpis.projFim12 < 0 && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Atenção: a projeção indica saldo acumulado negativo ao final dos próximos 12 meses. Considere revisar despesas recorrentes ou aumentar a captação de novos contratos.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}