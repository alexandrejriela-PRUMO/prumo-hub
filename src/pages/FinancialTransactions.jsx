import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  TrendingUp, TrendingDown, ArrowLeftRight, Download, Search,
  ChevronUp, ChevronDown, Plus, Pencil, Trash2, Zap, Banknote, Paperclip
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import TransactionForm from '../components/financial/TransactionForm';

const STATUS_BADGES = {
  'Pago':     'bg-emerald-100 text-emerald-700',
  'Pendente': 'bg-amber-100 text-amber-700',
  'Vencido':  'bg-red-100 text-red-700',
  'Cancelado':'bg-gray-100 text-gray-500',
};

function normalizeStatus(s) {
  if (!s) return 'Pendente';
  if (s === 'Pago' || s === 'Paga') return 'Pago';
  if (s === 'Cancelada') return 'Cancelado';
  return s;
}

export default function FinancialTransactions() {
  const [user, setUser] = useState(null);
  const [filterMonth,  setFilterMonth]  = useState(format(new Date(),'yyyy-MM'));
  const [filterType,   setFilterType]   = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAccount,setFilterAccount]= useState('');
  const [filterProperty,setFilterProperty]= useState('');
  const [search,       setSearch]       = useState('');
  const [sortField,    setSortField]    = useState('date');
  const [sortDir,      setSortDir]      = useState('desc');
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState(null);
  const qc = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: charges = [] } = useQuery({
    queryKey: ['fin-charges', user?.email],
    queryFn: () => base44.entities.ConsultorCharge.filter({ consultor_email: user.email }, '-due_date', 500),
    enabled: !!user?.email,
  });
  const { data: manualEntries = [] } = useQuery({
    queryKey: ['fin-manual', user?.email],
    queryFn: () => base44.entities.Expense.filter({ consultor_email: user.email }, '-date', 500),
    enabled: !!user?.email,
  });
  const { data: properties = [] } = useQuery({
    queryKey: ['fin-properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ consultor_email: user.email }),
    enabled: !!user?.email,
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ['fin-accounts', user?.email],
    queryFn: () => base44.entities.FinancialAccount.filter({ consultor_email: user.email }, 'name', 100),
    enabled: !!user?.email,
  });

  const propertyMap = useMemo(() => { const m={}; properties.forEach(p=>{m[p.id]=p;}); return m; }, [properties]);
  const accountMap  = useMemo(() => { const m={}; accounts.forEach(a=>{m[a.id]=a;}); return m; }, [accounts]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => { qc.invalidateQueries(['fin-manual']); toast.success('Transação removida!'); },
  });

  const handleOpen = (entry = null) => {
    setEditing(entry || null);
    setShowForm(true);
  };

  const allTransactions = useMemo(() => {
    const txns = [];

    // Transações de Stripe
    charges.forEach(c => {
      const prop = propertyMap[c.property_id];
      txns.push({
        id: `charge-${c.id}`, type:'receita', source:'Stripe', sourceIcon:'stripe',
        description: c.description || 'Cobrança via Stripe',
        client: prop?.client_name || c.client_email?.split('@')[0] || '—',
        amount: c.amount||0,
        date: c.due_date || c.created_date?.substring(0,10),
        competencia: (c.due_date||c.created_date?.substring(0,10))?.substring(0,7),
        status: normalizeStatus(c.status),
        payment_method: c.payment_method,
        accountLabel: 'Conta Stripe',
        editable: false,
      });
    });

    // Todas as entradas manuais (Expense) — incluindo parcelamentos registrados
    manualEntries.forEach(e => {
      const acc = e.account_id ? accountMap[e.account_id] : null;
      const accountLabel = acc?.name || e.account_name || '—';
      const isInstallment = e.installment_total > 1;
      const sourceLabel = isInstallment
        ? `Parcela ${e.installment_number}/${e.installment_total}`
        : (e.transaction_type === 'receita' ? (e.category || 'Receita Manual') : (e.category || 'Despesa'));

      txns.push({
        id: `manual-${e.id}`, type: e.transaction_type || 'despesa',
        source: sourceLabel,
        sourceIcon: 'manual',
        description: e.description,
        client: e.client_name || null,
        amount: e.amount || 0,
        date: e.date,
        competencia: e.competencia || e.date?.substring(0, 7),
        status: normalizeStatus(e.status),
        payment_method: e.payment_method,
        accountLabel,
        accountId: e.account_id || null,
        propertyId: e.property_id || null,
        propertyName: e.property_name || null,
        editable: true,
        raw: e,
        isInstallment,
      });
    });

    return txns;
  }, [charges, manualEntries, propertyMap, accountMap]);

  const clients  = useMemo(()=>{ const s=new Set(); allTransactions.forEach(t=>{if(t.client)s.add(t.client);}); return Array.from(s).sort(); },[allTransactions]);
  const propertyOptions = useMemo(() => { const s=new Set(); allTransactions.forEach(t=>{if(t.propertyId && t.propertyName) s.add(JSON.stringify({id:t.propertyId,name:t.propertyName}));}); return Array.from(s).map(j=>JSON.parse(j)); },[allTransactions]);
  const accountOptions = useMemo(() => {
    // Usar contas cadastradas + aquelas que aparecem nas transações
    const s = new Set();
    accounts.forEach(a => s.add(a.id)); // Adicionar IDs de todas as contas cadastradas
    allTransactions.forEach(t => { if(t.accountId) s.add(t.accountId); }); // + IDs das transações
    return Array.from(s).sort();
  }, [accounts, allTransactions]);

  const filtered = useMemo(() => allTransactions.filter(t => {
    const matchMonth   = !filterMonth   || t.competencia===filterMonth  || (t.date&&t.date.startsWith(filterMonth));
    const matchType    = !filterType    || t.type===filterType;
    const matchClient  = !filterClient  || t.client===filterClient;
    const matchStatus  = !filterStatus  || t.status===filterStatus;
    const matchAccount = !filterAccount || t.accountId===filterAccount;
    const matchProperty = !filterProperty || t.propertyId===filterProperty;
    const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase()) || t.client?.toLowerCase().includes(search.toLowerCase());
    return matchMonth&&matchType&&matchClient&&matchStatus&&matchAccount&&matchProperty&&matchSearch;
  }), [allTransactions,filterMonth,filterType,filterClient,filterStatus,filterAccount,filterProperty,search]);

  const sorted = useMemo(()=>[...filtered].sort((a,b)=>{
    let va=a[sortField],vb=b[sortField];
    if(typeof va==='string')va=va?.toLowerCase();
    if(typeof vb==='string')vb=vb?.toLowerCase();
    if(va<vb)return sortDir==='asc'?-1:1;
    if(va>vb)return sortDir==='asc'?1:-1;
    return 0;
  }),[filtered,sortField,sortDir]);

  const toggleSort = (f) => { if(sortField===f)setSortDir(d=>d==='asc'?'desc':'asc'); else{setSortField(f);setSortDir('desc');} };
  const totalReceitas = filtered.filter(t=>t.type==='receita').reduce((s,t)=>s+t.amount,0);
  const totalDespesas = filtered.filter(t=>t.type==='despesa').reduce((s,t)=>s+t.amount,0);
  const resultado = totalReceitas-totalDespesas;
  const fmt = (v)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const SortIcon = ({field})=>{ if(sortField!==field)return null; return sortDir==='asc'?<ChevronUp className="w-3 h-3 inline ml-0.5"/>:<ChevronDown className="w-3 h-3 inline ml-0.5"/>; };

  const exportCSV = ()=>{
    const header='Tipo,Origem,Descrição,Cliente,Conta,Competência,Data,Valor,Status,Forma Pagamento';
    const rows=sorted.map(t=>[t.type,t.source,`"${t.description}"`,t.client||'',t.accountLabel||'',t.competencia||'',t.date||'',t.amount,t.status,t.payment_method||''].join(','));
    const blob=new Blob(['\uFEFF'+[header,...rows].join('\n')],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`transacoes_${filterMonth||'todas'}.csv`;a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowLeftRight className="w-7 h-7 text-emerald-600"/>Transações Financeiras
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Visão consolidada de receitas, despesas e resultado</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="w-4 h-4"/>Exportar CSV</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={()=>handleOpen()}><Plus className="w-4 h-4"/>Nova Transação</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-100 bg-emerald-50/50"><CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600"/></div>
            <div><p className="text-xs text-emerald-700 font-medium">Receitas</p><p className="text-xl font-bold text-emerald-700">{fmt(totalReceitas)}</p></div>
          </div>
        </CardContent></Card>
        <Card className="border-red-100 bg-red-50/50"><CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><TrendingDown className="w-5 h-5 text-red-500"/></div>
            <div><p className="text-xs text-red-700 font-medium">Despesas</p><p className="text-xl font-bold text-red-600">{fmt(totalDespesas)}</p></div>
          </div>
        </CardContent></Card>
        <Card className={resultado>=0?'border-blue-100 bg-blue-50/50':'border-orange-100 bg-orange-50/50'}><CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${resultado>=0?'bg-blue-100':'bg-orange-100'}`}><ArrowLeftRight className={`w-5 h-5 ${resultado>=0?'text-blue-600':'text-orange-500'}`}/></div>
            <div><p className={`text-xs font-medium ${resultado>=0?'text-blue-700':'text-orange-700'}`}>Resultado</p><p className={`text-xl font-bold ${resultado>=0?'text-blue-700':'text-orange-600'}`}>{fmt(resultado)}</p></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1"><Label className="text-xs">Competência</Label><Input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} className="w-40 h-9"/></div>
          <div><Label className="text-xs">Tipo</Label>
            <Select value={filterType || '__all__'} onValueChange={v => setFilterType(v === '__all__' ? '' : v)}><SelectTrigger className="w-36"><SelectValue placeholder="Todos"/></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Todos</SelectItem><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem></SelectContent>
            </Select></div>
          <div><Label className="text-xs">Conta</Label>
             <Select value={filterAccount || '__all__'} onValueChange={v => setFilterAccount(v === '__all__' ? '' : v)}><SelectTrigger className="w-44"><SelectValue placeholder="Todas"/></SelectTrigger>
               <SelectContent><SelectItem value="__all__">Todas</SelectItem>{accountOptions.map(accId=>{const acc=accountMap[accId]; return <SelectItem key={accId} value={accId}>{acc?.name||'—'}</SelectItem>;})}</SelectContent>
             </Select></div>
          <div><Label className="text-xs">Cliente</Label>
            <Select value={filterClient || '__all__'} onValueChange={v => setFilterClient(v === '__all__' ? '' : v)}><SelectTrigger className="w-40"><SelectValue placeholder="Todos"/></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Todos</SelectItem>{clients.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Status</Label>
            <Select value={filterStatus || '__all__'} onValueChange={v => setFilterStatus(v === '__all__' ? '' : v)}><SelectTrigger className="w-36"><SelectValue placeholder="Todos"/></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Todos</SelectItem><SelectItem value="Pago">Pago</SelectItem><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Vencido">Vencido</SelectItem><SelectItem value="Cancelado">Cancelado</SelectItem></SelectContent>
            </Select></div>
          <div><Label className="text-xs">Propriedade / Empreendimento</Label>
            <Select value={filterProperty || '__all__'} onValueChange={v => setFilterProperty(v === '__all__' ? '' : v)}><SelectTrigger className="w-52"><SelectValue placeholder="Todas"/></SelectTrigger>
              <SelectContent><SelectItem value="__all__">Todas</SelectItem>{propertyOptions.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="flex-1 min-w-40"><Label className="text-xs">Buscar</Label>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Descrição ou cliente..." className="pl-9"/>
            </div></div>
          {(filterType||filterClient||filterStatus||filterAccount||filterProperty||search) && (
            <Button variant="outline" size="sm" onClick={()=>{setFilterType('');setFilterClient('');setFilterStatus('');setFilterAccount('');setFilterProperty('');setSearch('');}}>Limpar</Button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">{sorted.length} transaç{sorted.length!==1?'ões':'ão'} encontrada{sorted.length!==1?'s':''}</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={()=>toggleSort('type')}>Tipo <SortIcon field="type"/></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Origem</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={()=>toggleSort('description')}>Descrição <SortIcon field="description"/></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Conta</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={()=>toggleSort('client')}>Cliente <SortIcon field="client"/></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={()=>toggleSort('date')}>Data <SortIcon field="date"/></th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer" onClick={()=>toggleSort('amount')}>Valor <SortIcon field="amount"/></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.length===0?(
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                  <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                  <p>Nenhuma transação encontrada.</p>
                  <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={()=>handleOpen()}><Plus className="w-3.5 h-3.5 mr-1"/>Adicionar</Button>
                </td></tr>
              ):sorted.map(t=>(
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {t.type==='receita'?<TrendingUp className="w-4 h-4 text-emerald-500"/>:<TrendingDown className="w-4 h-4 text-red-400"/>}
                      <span className={`text-xs font-semibold ${t.type==='receita'?'text-emerald-600':'text-red-600'}`}>{t.type==='receita'?'Receita':'Despesa'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {t.sourceIcon==='stripe'
                      ?<span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-semibold"><Zap className="w-3 h-3"/>Stripe</span>
                      :t.source}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium max-w-[160px] truncate">{t.description}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-xs">
                      {t.sourceIcon==='stripe'?<Zap className="w-3 h-3 text-violet-500"/>:<Banknote className="w-3 h-3"/>}
                      {t.accountLabel || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{t.client||<span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.date?format(parseISO(t.date),'dd/MM/yyyy'):'—'}</td>
                  <td className={`px-4 py-3 text-right font-bold text-sm ${t.type==='receita'?'text-emerald-600':'text-red-600'}`}>{t.type==='despesa'?'- ':''}{fmt(t.amount)}</td>
                  <td className="px-4 py-3"><Badge className={`${STATUS_BADGES[t.status]||'bg-gray-100 text-gray-500'} border-0 text-xs`}>{t.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 items-center">
                      {t.raw?.attachments?.length > 0 && (
                        <span title={`${t.raw.attachments.length} anexo(s)`} className="flex items-center gap-0.5 text-xs text-blue-500">
                          <Paperclip className="w-3 h-3"/>{t.raw.attachments.length}
                        </span>
                      )}
                      {t.editable && <>
                        <button onClick={()=>handleOpen(t.raw)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-3.5 h-3.5 text-gray-400"/></button>
                        <button onClick={()=>{if(confirm('Remover?'))deleteMutation.mutate(t.raw.id);}} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400"/></button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {sorted.length>0&&(
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-gray-700">Total ({sorted.length} itens)</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs text-emerald-600 font-semibold">+{fmt(totalReceitas)}</span>
                      <span className="text-xs text-red-500 font-semibold">-{fmt(totalDespesas)}</span>
                      <span className={`text-sm font-bold ${resultado>=0?'text-blue-700':'text-orange-600'}`}>{fmt(resultado)}</span>
                    </div>
                  </td>
                  <td/><td/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <TransactionForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        editing={editing}
        consultorEmail={user?.email}
        accounts={accounts}
      />
    </div>
  );
}