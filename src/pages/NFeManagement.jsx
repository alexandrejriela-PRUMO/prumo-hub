import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  Filter,
  ExternalLink,
  Receipt,
  Calendar,
  Search
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const nfeStatusConfig = {
  'Não emitida': { color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock, label: 'Não emitida' },
  'Emitindo':    { color: 'bg-blue-100 text-blue-700 border-blue-200',  icon: RefreshCw, label: 'Emitindo' },
  'Emitida':     { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Emitida' },
  'Erro':        { color: 'bg-red-100 text-red-700 border-red-200',     icon: AlertTriangle, label: 'Erro' },
};

const FILTER_OPTIONS = ['Todos', 'Não emitida', 'Emitindo', 'Emitida', 'Erro'];

export default function NFeManagement() {
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('Todos');
  const [reemitindo, setReemitindo] = useState({});
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  // Admin vê todas as faturas; usuário comum vê só as suas
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['nfe-invoices', user?.email, isAdmin],
    queryFn: () => isAdmin
      ? base44.entities.Invoice.list('-created_date', 200)
      : base44.entities.Invoice.filter({ client_email: user.email }, '-created_date', 100),
    enabled: !!user,
  });

  const filtered = invoices.filter(inv => {
    const matchesFilter = filter === 'Todos' || (inv.nfe_status || 'Não emitida') === filter;
    const matchesSearch = !search ||
      inv.description?.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_email?.toLowerCase().includes(search.toLowerCase()) ||
      inv.nfe_number?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = FILTER_OPTIONS.reduce((acc, s) => {
    acc[s] = s === 'Todos'
      ? invoices.length
      : invoices.filter(i => (i.nfe_status || 'Não emitida') === s).length;
    return acc;
  }, {});

  const handleReemitir = async (invoice) => {
    setReemitindo(prev => ({ ...prev, [invoice.id]: true }));
    try {
      await base44.functions.invoke('emitirNFePlataforma', { invoice_id: invoice.id });
      queryClient.invalidateQueries(['nfe-invoices']);
    } catch (err) {
      console.error('Erro ao reemitir NF-e:', err);
    } finally {
      setReemitindo(prev => ({ ...prev, [invoice.id]: false }));
    }
  };

  const NFeCard = ({ invoice }) => {
    const nfeStatus = invoice.nfe_status || 'Não emitida';
    const cfg = nfeStatusConfig[nfeStatus] || nfeStatusConfig['Não emitida'];
    const StatusIcon = cfg.icon;
    const isEmitindo = reemitindo[invoice.id];
    const canReemit = nfeStatus === 'Erro' || nfeStatus === 'Não emitida';

    return (
      <Card className="hover:shadow-md transition-shadow border-gray-100">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: info */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{invoice.description || 'Mensalidade PRUMO Hub'}</p>
                <p className="text-xs text-gray-500 truncate">{invoice.client_email}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {invoice.due_date ? format(parseISO(invoice.due_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                  </span>
                  {invoice.nfe_number && (
                    <span className="font-mono text-gray-500">NF #{invoice.nfe_number}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Center: value */}
            <div className="text-right shrink-0">
              <p className="text-xl font-bold text-gray-900">
                R$ {(invoice.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Right: status + actions */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge className={`${cfg.color} border flex items-center gap-1`}>
                <StatusIcon className={`w-3 h-3 ${nfeStatus === 'Emitindo' ? 'animate-spin' : ''}`} />
                {cfg.label}
              </Badge>

              <div className="flex items-center gap-2">
                {/* Download PDF/DANFE */}
                {invoice.nfe_url && (
                  <a
                    href={invoice.nfe_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="flex items-center gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </Button>
                  </a>
                )}

                {/* Reemitir */}
                {(isAdmin || canReemit) && canReemit && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isEmitindo}
                    onClick={() => handleReemitir(invoice)}
                    className="flex items-center gap-1 text-amber-700 border-amber-200 hover:bg-amber-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isEmitindo ? 'animate-spin' : ''}`} />
                    {isEmitindo ? 'Emitindo...' : 'Reemitir'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-8 h-8 text-emerald-600" />
          Notas Fiscais (NF-e)
        </h1>
        <p className="text-gray-500 mt-1">Visualize, baixe e reemita notas fiscais das faturas da plataforma</p>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', key: 'Todos', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
          { label: 'Emitidas', key: 'Emitida', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Com Erro', key: 'Erro', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
          { label: 'Não Emitidas', key: 'Não emitida', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
        ].map(({ label, key, color, bg }) => (
          <Card key={key} className={`border ${bg} cursor-pointer transition-all ${filter === key ? 'ring-2 ring-emerald-400' : ''}`} onClick={() => setFilter(key)}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{counts[key] ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, email ou nº NF-e..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <Button
              key={opt}
              size="sm"
              variant={filter === opt ? 'default' : 'outline'}
              onClick={() => setFilter(opt)}
              className={filter === opt ? 'bg-emerald-700 hover:bg-emerald-800' : ''}
            >
              {opt} {counts[opt] !== undefined ? `(${counts[opt]})` : ''}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-16 text-center">
            <FileText className="w-14 h-14 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-700">Nenhuma nota encontrada</h3>
            <p className="text-gray-400 mt-1 text-sm">Tente mudar os filtros de busca</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => <NFeCard key={inv.id} invoice={inv} />)}
        </div>
      )}
    </div>
  );
}