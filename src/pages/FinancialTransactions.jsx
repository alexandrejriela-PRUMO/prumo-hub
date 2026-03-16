import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Scale, Download, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TYPE_COLORS = {
  receita: 'text-emerald-600',
  despesa: 'text-red-600',
};

const STATUS_BADGES = {
  'Pago': 'bg-emerald-100 text-emerald-700',
  'Pendente': 'bg-amber-100 text-amber-700',
  'Paga': 'bg-emerald-100 text-emerald-700',
  'Vencido': 'bg-red-100 text-red-700',
  'Cancelado': 'bg-gray-100 text-gray-500',
  'Cancelada': 'bg-gray-100 text-gray-500',
};

function normalizeStatus(s) {
  if (!s) return 'Pendente';
  if (s === 'Pago' || s === 'Paga') return 'Pago';
  return s;
}

export default function FinancialTransactions() {
  const [user, setUser] = useState(null);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterType, setFilterType] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: invoices = [] } = useQuery({
    queryKey: ['fin-invoices', user?.email],
    queryFn: () => base44.entities.Invoice.filter({ client_email: user.email }, '-due_date', 500),
    enabled: !!user?.email,
  });

  const { data: charges = [] } = useQuery({
    queryKey: ['fin-charges', user?.email],
    queryFn: () => base44.entities.ConsultorCharge.filter({ consultor_email: user.email }, '-due_date', 500),
    enabled: !!user?.email,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['fin-expenses', user?.email],
    queryFn: () => base44.entities.Expense.filter({ consultor_email: user.email }, '-date', 500),
    enabled: !!user?.email,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['fin-properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ consultor_email: user.email }),
    enabled: !!user?.email,
  });

  const propertyMap = useMemo(() => {
    const m = {};
    properties.forEach(p => { m[p.id] = p; });
    return m;
  }, [properties]);

  // Normalize all transactions into a common format
  const allTransactions = useMemo(() => {
    const txns = [];

    // Receitas: ConsultorCharge (cobranças emitidas para clientes)
    charges.forEach(c => {
      const prop = propertyMap[c.property_id];
      const clientName = prop?.client_name || c.client_email?.split('@')[0] || '—';
      txns.push({
        id: `charge-${c.id}`,
        type: 'receita',
        source: 'Cobrança de Cliente',
        description: c.description || 'Cobrança',
        client: clientName,
        client_email: c.client_email,
        amount: c.amount || 0,
        date: c.due_date || c.created_date?.substring(0, 10),
        competencia: (c.due_date || c.created_date?.substring(0, 10))?.substring(0, 7),
        status: normalizeStatus(c.status),
        payment_method: c.payment_method,
        raw: c,
      });
    });

    // Receitas: Invoices da plataforma (faturas do consultor com a plataforma)
    invoices.forEach(inv => {
      txns.push({
        id: `inv-${inv.id}`,
        type: 'receita',
        source: 'Fatura Plataforma',
        description: inv.description || 'Fatura',
        client: inv.client_email?.split('@')[0] || '—',
        client_email: inv.client_email,
        amount: inv.amount || 0,
        date: inv.due_date,
        competencia: inv.due_date?.substring(0, 7),
        status: normalizeStatus(inv.status),
        payment_method: null,
        raw: inv,
      });
    });

    // Despesas
    expenses.forEach(exp => {
      txns.push({
        id: `exp-${exp.id}`,
        type: 'despesa',
        source: exp.category || 'Despesa',
        description: exp.description,
        client: null,
        client_email: null,
        amount: exp.amount || 0,
        date: exp.date,
        competencia: exp.competencia || exp.date?.substring(0, 7),
        status: normalizeStatus(exp.status),
        payment_method: exp.payment_method,
        raw: exp,
      });
    });

    return txns;
  }, [charges, invoices, expenses, propertyMap]);

  // Distinct clients for filter dropdown
  const clients = useMemo(() => {
    const set = new Set();
    allTransactions.forEach(t => { if (t.client) set.add(t.client); });
    return Array.from(set).sort();
  }, [allTransactions]);

  // Apply filters
  const filtered = useMemo(() => {
    return allTransactions.filter(t => {
      const matchMonth = !filterMonth || t.competencia === filterMonth ||
        (t.date && t.date.startsWith(filterMonth));
      const matchType = !filterType || t.type === filterType;
      const matchClient = !filterClient || t.client === filterClient;
      const matchStatus = !filterStatus || t.status === filterStatus;
      const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.client?.toLowerCase().includes(search.toLowerCase());
      return matchMonth && matchType && matchClient && matchStatus && matchSearch;
    });
  }, [allTransactions, filterMonth, filterType, filterClient, filterStatus, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === 'amount') { va = a.amount; vb = b.amount; }
      if (typeof va === 'string') va = va?.toLowerCase();
      if (typeof vb === 'string') vb = vb?.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const totalReceitas = filtered.filter(t => t.type === 'receita').reduce((s, t) => s + t.amount, 0);
  const totalDespesas = filtered.filter(t => t.type === 'despesa').reduce((s, t) => s + t.amount, 0);
  const resultado = totalReceitas - totalDespesas;

  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  const exportCSV = () => {
    const header = 'Tipo,Origem,Descrição,Cliente,Competência,Data,Valor,Status,Forma Pagamento';
    const rows = sorted.map(t =>
      [t.type, t.source, `"${t.description}"`, t.client || '', t.competencia || '', t.date || '', t.amount, t.status, t.payment_method || ''].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `transacoes_${filterMonth || 'todas'}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Scale className="w-7 h-7 text-emerald-600" />
            Transações Financeiras
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Visão consolidada de receitas, despesas e resultado</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-100 bg-emerald-50/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-700 font-medium">Receitas</p>
                <p className="text-xl font-bold text-emerald-700">{fmt(totalReceitas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-100 bg-red-50/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-red-700 font-medium">Despesas</p>
                <p className="text-xl font-bold text-red-600">{fmt(totalDespesas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${resultado >= 0 ? 'border-blue-100 bg-blue-50/50' : 'border-orange-100 bg-orange-50/50'}`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${resultado >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                <Scale className={`w-5 h-5 ${resultado >= 0 ? 'text-blue-600' : 'text-orange-500'}`} />
              </div>
              <div>
                <p className={`text-xs font-medium ${resultado >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Resultado Líquido</p>
                <p className={`text-xl font-bold ${resultado >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>{fmt(resultado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs">Competência</Label>
            <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todos</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Cliente</Label>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todos</SelectItem>
                {clients.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todos</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-40">
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Descrição ou cliente..." className="pl-9" />
            </div>
          </div>
          {(filterType || filterClient || filterStatus || search) && (
            <Button variant="outline" size="sm" onClick={() => { setFilterType(''); setFilterClient(''); setFilterStatus(''); setSearch(''); }}>
              Limpar
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">{sorted.length} transaç{sorted.length !== 1 ? 'ões' : 'ão'} encontrada{sorted.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => toggleSort('type')}>
                  Tipo <SortIcon field="type" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Origem</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => toggleSort('description')}>
                  Descrição <SortIcon field="description" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => toggleSort('client')}>
                  Cliente <SortIcon field="client" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => toggleSort('competencia')}>
                  Competência <SortIcon field="competencia" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => toggleSort('date')}>
                  Data <SortIcon field="date" />
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => toggleSort('amount')}>
                  Valor <SortIcon field="amount" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <Scale className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>Nenhuma transação encontrada para os filtros selecionados.</p>
                  </td>
                </tr>
              ) : sorted.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {t.type === 'receita'
                        ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                        : <TrendingDown className="w-4 h-4 text-red-400" />}
                      <span className={`text-xs font-semibold capitalize ${TYPE_COLORS[t.type]}`}>
                        {t.type === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.source}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium max-w-[200px] truncate">{t.description}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{t.client || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.competencia || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {t.date ? format(parseISO(t.date), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold text-sm ${t.type === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'despesa' ? '- ' : ''}{fmt(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`${STATUS_BADGES[t.status] || 'bg-gray-100 text-gray-500'} border-0 text-xs`}>
                      {t.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            {sorted.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Total ({sorted.length} itens)
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-emerald-600 font-semibold">+{fmt(totalReceitas)}</span>
                      <span className="text-xs text-red-500 font-semibold">-{fmt(totalDespesas)}</span>
                      <span className={`text-sm font-bold ${resultado >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>{fmt(resultado)}</span>
                    </div>
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}