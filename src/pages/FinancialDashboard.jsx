import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart, Line
} from 'recharts';
import {
  TrendingUp, TrendingDown, Scale, Wallet, CalendarRange,
  ArrowUpRight, ArrowDownRight, AlertCircle, Info, Settings2
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AccountsManager from '../components/financial/AccountsManager';

const fmt  = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtK = (v) => { if (Math.abs(v) >= 1000) return `R$ ${(v/1000).toFixed(1)}k`; return `R$ ${(v??0).toFixed(0)}`; };

function normalizeStatus(s) {
  if (!s) return 'Pendente';
  if (s === 'Pago' || s === 'Paga') return 'Pago';
  return s;
}

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
  const [filterAccount, setFilterAccount] = useState('__all');

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
  const { data: accounts = [] } = useQuery({
    queryKey: ['fin-accounts', user?.email],
    queryFn: () => base44.entities.FinancialAccount.filter({ consultor_email: user.email }, 'name', 100),
    enabled: !!user?.email,
  });
  const accountMap = useMemo(() => { const m={}; accounts.forEach(a=>{m[a.id]=a;}); return m; }, [accounts]);

  // Filter entries by account
  const filteredCharges = useMemo(() => {
    if (!filterAccount || filterAccount === '__stripe') return filterAccount === '__stripe' ? charges : filterAccount ? [] : charges;
    return filterAccount === '__stripe' ? charges : [];
  }, [charges, filterAccount]);

  const filteredManual = useMemo(() => {
    if (!filterAccount) return manualEntries;
    if (filterAccount === '__caixa') return manualEntries.filter(e => !e.account_id);
    return manualEntries.filter(e => e.account_id === filterAccount);
  }, [manualEntries, filterAccount]);

  const effectiveCharges = filterAccount && filterAccount !== '__stripe' ? [] : charges;
  const effectiveManual  = filteredManual;

  // ── Last 12 months history ────────────────────────────────────────────────
  const historico = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => format(subMonths(now, 11-i), 'yyyy-MM'));
    const byMonth = {};
    months.forEach(m => { byMonth[m] = { receita: 0, despesa: 0 }; });

    effectiveCharges.forEach(c => {
      const month = (c.due_date || c.paid_at || '')?.substring(0,7);
      if (byMonth[month] && normalizeStatus(c.status) === 'Pago') byMonth[month].receita += c.amount || 0;
    });
    effectiveManual.forEach(e => {
      const month = e.competencia || e.date?.substring(0,7);
      if (byMonth[month]) {
        if (e.transaction_type === 'receita') byMonth[month].receita += e.amount || 0;
        else byMonth[month].despesa += e.amount || 0;
      }
    });
    return months.map(m => ({
      mes: format(parseISO(m+'-01'), 'MMM/yy', { locale: ptBR }),
      mesKey: m,
      receita: byMonth[m].receita,
      despesa: byMonth[m].despesa,
      resultado: byMonth[m].receita - byMonth[m].despesa,
    }));
  }, [effectiveCharges, effectiveManual]);

  // ── Next 12 months projection ─────────────────────────────────────────────
  const projecao = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 13 }, (_, i) => format(addMonths(now, i), 'yyyy-MM'));
    const byMonth = {};
    months.forEach(m => { byMonth[m] = { receita: 0, despesa: 0 }; });

    // Pending Stripe charges
    if (!filterAccount || filterAccount === '__stripe') {
      charges.forEach(c => {
        const month = c.due_date?.substring(0,7);
        if (byMonth[month] && ['Pendente','Vencido'].includes(normalizeStatus(c.status))) {
          byMonth[month].receita += c.amount || 0;
        }
      });
    }
    // Active contracts monthly split
    contracts.filter(c => c.status==='Ativo' && c.total_value && c.start_date && c.end_date).forEach(c => {
      const start = parseISO(c.start_date), end = parseISO(c.end_date);
      if (!isValid(start) || !isValid(end)) return;
      let cur = startOfMonth(start), count = 0;
      while (cur <= end) { count++; cur = addMonths(cur,1); }
      const monthly = count > 0 ? c.total_value / count : 0;
      months.forEach(m => {
        const mDate = parseISO(m+'-01');
        if (byMonth[m] && mDate >= startOfMonth(start) && mDate <= end) byMonth[m].receita += monthly;
      });
    });

    // Recurring expense average from last 3 months
    const last3 = Array.from({ length:3 }, (_,i) => format(subMonths(now, i+1), 'yyyy-MM'));
    const expCats = {};
    effectiveManual.filter(e => e.transaction_type==='despesa' && last3.includes(e.competencia||e.date?.substring(0,7))).forEach(e => {
      const cat = e.category||'Outros';
      if (!expCats[cat]) expCats[cat] = [];
      expCats[cat].push(e.amount || 0);
    });
    const avgExp = Object.values(expCats).reduce((s, vals) => s + vals.reduce((a,v)=>a+v,0)/3, 0);

    // Recurring income average (manual)
    const incByMonth = {}; last3.forEach(m=>{incByMonth[m]=0;});
    effectiveManual.filter(e => e.transaction_type==='receita' && last3.includes(e.competencia||e.date?.substring(0,7))).forEach(e => {
      const m = e.competencia||e.date?.substring(0,7);
      if (incByMonth[m]!==undefined) incByMonth[m] += e.amount||0;
    });
    const avgInc = Object.values(incByMonth).reduce((s,v)=>s+v,0)/3;

    let accSaldo = historico.reduce((s,h)=>s+h.resultado, 0);
    return months.map((m,i) => {
      const projReceita = byMonth[m].receita + avgInc;
      const projDespesa = byMonth[m].despesa + avgExp;
      const resultado = projReceita - projDespesa;
      accSaldo += resultado;
      return { mes: format(parseISO(m+'-01'), 'MMM/yy', {locale:ptBR}), mesKey:m,
        receita: Math.round(projReceita), despesa: Math.round(projDespesa),
        resultado: Math.round(resultado), saldoAcumulado: Math.round(accSaldo), isCurrent: i===0 };
    });
  }, [charges, effectiveManual, contracts, historico, filterAccount]);

  const kpis = useMemo(() => {
    const totalReceita12 = historico.reduce((s,h)=>s+h.receita, 0);
    const totalDespesa12 = historico.reduce((s,h)=>s+h.despesa, 0);
    const resultado12 = totalReceita12 - totalDespesa12;
    const melhorMes = [...historico].sort((a,b)=>b.resultado-a.resultado)[0];
    const piorMes   = [...historico].sort((a,b)=>a.resultado-b.resultado)[0];
    const projFim12 = projecao[projecao.length-1]?.saldoAcumulado ?? 0;
    return { totalReceita12, totalDespesa12, resultado12, melhorMes, piorMes, projFim12 };
  }, [historico, projecao]);

  // Account filter options
  const accountFilterOptions = useMemo(() => [
    { value: '__all', label: 'Todas as contas' },
    { value: '__stripe', label: 'Conta Stripe' },
    { value: '__caixa', label: 'Caixa Manual' },
    ...accounts.filter(a=>!a.is_stripe).map(a=>({ value: a.id, label: a.name })),
  ], [accounts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-emerald-600"/>Painel Financeiro
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Balanço histórico + projeção de fluxo de caixa</p>
        </div>
      </div>

      <Tabs defaultValue="analytics">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="analytics">Análises</TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5"/>Contas</TabsTrigger>
        </TabsList>

        {/* ── ACCOUNTS TAB ── */}
        <TabsContent value="accounts" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-600"/>Gerenciar Contas Financeiras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AccountsManager consultorEmail={user?.email} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ANALYTICS TAB ── */}
        <TabsContent value="analytics" className="mt-4 space-y-6">
          {/* Account filter */}
          <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
            <Label className="text-sm font-medium text-gray-600 whitespace-nowrap">Filtrar por conta:</Label>
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger className="w-56"><SelectValue/></SelectTrigger>
              <SelectContent>
                {accountFilterOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {filterAccount && (
              <Button variant="outline" size="sm" onClick={()=>setFilterAccount('')}>Limpar filtro</Button>
            )}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-emerald-100"><CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div><p className="text-xs text-gray-500 font-medium">Receita (12m)</p>
                  <p className="text-xl font-bold text-emerald-600 mt-0.5">{fmt(kpis.totalReceita12)}</p></div>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-emerald-600"/></div>
              </div>
            </CardContent></Card>
            <Card className="border-red-100"><CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div><p className="text-xs text-gray-500 font-medium">Despesas (12m)</p>
                  <p className="text-xl font-bold text-red-600 mt-0.5">{fmt(kpis.totalDespesa12)}</p></div>
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center"><ArrowDownRight className="w-4 h-4 text-red-500"/></div>
              </div>
            </CardContent></Card>
            <Card className={kpis.resultado12>=0?'border-blue-100':'border-orange-100'}><CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div><p className="text-xs text-gray-500 font-medium">Resultado (12m)</p>
                  <p className={`text-xl font-bold mt-0.5 ${kpis.resultado12>=0?'text-blue-700':'text-orange-600'}`}>{fmt(kpis.resultado12)}</p></div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpis.resultado12>=0?'bg-blue-100':'bg-orange-100'}`}><Scale className={`w-4 h-4 ${kpis.resultado12>=0?'text-blue-600':'text-orange-500'}`}/></div>
              </div>
            </CardContent></Card>
            <Card className={kpis.projFim12>=0?'border-violet-100 bg-violet-50/40':'border-red-200 bg-red-50/40'}><CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div><p className="text-xs text-gray-500 font-medium">Saldo Proj. (12m)</p>
                  <p className={`text-xl font-bold mt-0.5 ${kpis.projFim12>=0?'text-violet-700':'text-red-700'}`}>{fmt(kpis.projFim12)}</p></div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpis.projFim12>=0?'bg-violet-100':'bg-red-100'}`}><CalendarRange className={`w-4 h-4 ${kpis.projFim12>=0?'text-violet-600':'text-red-600'}`}/></div>
              </div>
            </CardContent></Card>
          </div>

          {/* Balanço histórico */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600"/>Balanço Mensal — Últimos 12 Meses
              </CardTitle>
              <p className="text-xs text-gray-400">Receitas confirmadas vs despesas lançadas por mês</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={historico} margin={{top:8,right:8,left:8,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                  <XAxis dataKey="mes" tick={{fontSize:11,fill:'#6b7280'}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={fmtK} tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} width={70}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Legend wrapperStyle={{fontSize:12,paddingTop:8}}/>
                  <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[4,4,0,0]} maxBarSize={36}/>
                  <Bar dataKey="despesa" name="Despesa" fill="#f87171" radius={[4,4,0,0]} maxBarSize={36}/>
                  <Line dataKey="resultado" name="Resultado" type="monotone" stroke="#3b82f6" strokeWidth={2.5} dot={{r:3,fill:'#3b82f6'}}/>
                  <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5}/>
                </ComposedChart>
              </ResponsiveContainer>
              {kpis.melhorMes && kpis.piorMes && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
                    <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0"/>
                    <div><p className="text-xs text-gray-500">Melhor mês</p><p className="text-sm font-bold text-emerald-700">{kpis.melhorMes.mes} · {fmt(kpis.melhorMes.resultado)}</p></div>
                  </div>
                  <div className="flex items-center gap-3 bg-red-50 rounded-xl px-4 py-3">
                    <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0"/>
                    <div><p className="text-xs text-gray-500">Pior mês</p><p className="text-sm font-bold text-red-600">{kpis.piorMes.mes} · {fmt(kpis.piorMes.resultado)}</p></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fluxo de caixa projetado */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-violet-600"/>Fluxo de Caixa Projetado — Próximos 12 Meses
              </CardTitle>
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Info className="w-3 h-3"/>Estimativa baseada em cobranças Stripe pendentes, contratos ativos e média de despesas dos últimos 3 meses
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={projecao} margin={{top:8,right:8,left:8,bottom:0}}>
                  <defs>
                    <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="despGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.25}/><stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                  <XAxis dataKey="mes" tick={{fontSize:11,fill:'#6b7280'}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={fmtK} tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} width={70}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Legend wrapperStyle={{fontSize:12,paddingTop:8}}/>
                  <Area dataKey="receita" name="Receita Proj." type="monotone" stroke="#10b981" strokeWidth={2} fill="url(#recGrad)"/>
                  <Area dataKey="despesa" name="Despesa Proj." type="monotone" stroke="#f87171" strokeWidth={2} fill="url(#despGrad)"/>
                  <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1.5}/>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Saldo acumulado */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600"/>Saldo Acumulado Projetado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={projecao} margin={{top:8,right:8,left:8,bottom:0}}>
                  <defs>
                    <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                  <XAxis dataKey="mes" tick={{fontSize:11,fill:'#6b7280'}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={fmtK} tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} width={70}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area dataKey="saldoAcumulado" name="Saldo Acumulado" type="monotone" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#saldoGrad)" dot={{r:3,fill:'#8b5cf6'}}/>
                  <ReferenceLine y={0} stroke="#f87171" strokeDasharray="4 4" strokeWidth={1.5}/>
                </AreaChart>
              </ResponsiveContainer>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 text-gray-500 font-semibold">Mês</th>
                    <th className="text-right py-2 px-2 text-emerald-600 font-semibold">Receita</th>
                    <th className="text-right py-2 px-2 text-red-500 font-semibold">Despesa</th>
                    <th className="text-right py-2 px-2 text-blue-600 font-semibold">Resultado</th>
                    <th className="text-right py-2 px-2 text-violet-700 font-semibold">Saldo Acum.</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {projecao.map(p => (
                      <tr key={p.mesKey} className={`hover:bg-gray-50 ${p.isCurrent?'bg-amber-50/50':''}`}>
                        <td className="py-2 px-2 font-medium text-gray-700">
                          {p.mes}{p.isCurrent&&<Badge className="ml-1 bg-amber-100 text-amber-700 border-0 text-xs px-1.5 py-0">atual</Badge>}
                        </td>
                        <td className="py-2 px-2 text-right text-emerald-600 font-medium">{fmt(p.receita)}</td>
                        <td className="py-2 px-2 text-right text-red-500 font-medium">{fmt(p.despesa)}</td>
                        <td className={`py-2 px-2 text-right font-bold ${p.resultado>=0?'text-blue-600':'text-orange-600'}`}>{fmt(p.resultado)}</td>
                        <td className={`py-2 px-2 text-right font-bold ${p.saldoAcumulado>=0?'text-violet-700':'text-red-600'}`}>{fmt(p.saldoAcumulado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {kpis.projFim12 < 0 && (
                <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
                  <span>Atenção: a projeção indica saldo acumulado negativo ao final dos próximos 12 meses. Considere revisar despesas recorrentes ou aumentar a captação de novos contratos.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}