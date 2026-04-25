import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign, Users, CheckCircle, AlertTriangle, Clock, Search, RefreshCw,
  MessageCircle, Bell, Smartphone, ChevronDown, ChevronUp, Calendar,
  TrendingUp, XCircle, MoreVertical, Send, Zap, CreditCard, Filter
} from 'lucide-react';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PLAN_LABELS = { start: 'Start', pro: 'Pro', enterprise: 'Enterprise', unico: 'Único', sem_plano: 'Sem Plano' };
const PLAN_COLORS = {
  start: 'bg-gray-100 text-gray-700 border-gray-200',
  pro: 'bg-purple-100 text-purple-700 border-purple-200',
  enterprise: 'bg-orange-100 text-orange-700 border-orange-200',
  unico: 'bg-teal-100 text-teal-700 border-teal-200',
  sem_plano: 'bg-red-100 text-red-700 border-red-200',
};
const STATUS_COLORS = {
  ativo: 'bg-emerald-100 text-emerald-700',
  trial: 'bg-blue-100 text-blue-700',
  inadimplente: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-600',
  pendente: 'bg-amber-100 text-amber-700',
};

// ── Zapi Config (preparação futura) ────────────────────────────────────────
const ZAPI_CONFIG = {
  enabled: false, // Ativar quando integrar o zapi-app
  instanceId: '', // ZAPI Instance ID
  token: '',      // ZAPI Token
  baseUrl: 'https://api.z-api.io/instances',
};

function zapiSendMessage(phone, message) {
  // PREPARAÇÃO: função pronta para quando o zapi-app for integrado
  if (!ZAPI_CONFIG.enabled) {
    console.log('[ZAPI MOCK] Would send to', phone, ':', message);
    return Promise.resolve({ mock: true });
  }
  return fetch(`${ZAPI_CONFIG.baseUrl}/${ZAPI_CONFIG.instanceId}/token/${ZAPI_CONFIG.token}/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone.replace(/\D/g, ''), message }),
  }).then(r => r.json());
}

// ── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-xs font-medium opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-extrabold">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

// ── User Financial Row ──────────────────────────────────────────────────────
function UserFinancialRow({ u, invoices, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [zapiMsg, setZapiMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const userInvoices = invoices.filter(inv => inv.client_email === u.email);
  const lastInvoice = userInvoices.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
  const pendingInvoices = userInvoices.filter(i => i.status === 'Pendente' || i.status === 'Vencido');

  const checkoutDate = u.checkout_completed_at || u.subscription_since || u.created_date;
  const planAge = checkoutDate ? differenceInDays(new Date(), parseISO(checkoutDate)) : null;

  const subscriptionStatus = u.subscription_status || (u.plano ? 'ativo' : 'pendente');

  const handleZapiSend = async () => {
    if (!zapiMsg.trim()) return;
    setSendingMsg(true);
    const phone = u.phone || u.contact_phone || '';
    await zapiSendMessage(phone, zapiMsg);
    setSendingMsg(false);
    setZapiMsg('');
    alert(ZAPI_CONFIG.enabled ? 'Mensagem enviada!' : 'Integração zapi-app ainda não ativada. Mensagem registrada no console.');
  };

  const handleNotify = async (type) => {
    const templates = {
      cobranca: `Olá ${u.full_name || 'cliente'}! 👋 Sua fatura do PRUMO Hub está disponível. Acesse: https://prumohub.com/Invoices`,
      lembrete: `Olá ${u.full_name || 'cliente'}! ⏰ Lembrete: sua fatura vence em breve. Regularize para manter o acesso ao PRUMO Hub.`,
      boas_vindas: `Bem-vindo(a) ao PRUMO Hub, ${u.full_name || ''}! 🌿 Seu plano ${PLAN_LABELS[u.plano] || ''} está ativo. Qualquer dúvida, estamos aqui!`,
    };
    setZapiMsg(templates[type] || '');
  };

  return (
    <div className="border border-gray-200 rounded-xl mb-2 overflow-hidden">
      {/* Row Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
          {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 truncate">{u.full_name || '—'}</p>
          <p className="text-xs text-gray-500 truncate">{u.email}</p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Badge className={`text-xs border ${PLAN_COLORS[u.plano || 'sem_plano']}`}>
            {PLAN_LABELS[u.plano || 'sem_plano']}
          </Badge>
          <Badge className={`text-xs ${STATUS_COLORS[subscriptionStatus] || 'bg-gray-100 text-gray-600'}`}>
            {subscriptionStatus}
          </Badge>
        </div>

        {pendingInvoices.length > 0 && (
          <Badge className="bg-red-100 text-red-700 text-xs">{pendingInvoices.length} fat. pend.</Badge>
        )}

        {planAge !== null && (
          <span className="text-xs text-gray-400 hidden md:block">{planAge}d ativo</span>
        )}

        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-4">
          {/* User Financial Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500">Checkout Nexano</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">
                {checkoutDate && isValid(parseISO(checkoutDate))
                  ? format(parseISO(checkoutDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : '—'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500">Plano / Cobrança</p>
              <p className="text-sm font-semibold text-gray-800 mt-1 capitalize">
                {PLAN_LABELS[u.plano || u.subscription_plan] || '—'}
                {u.subscription_billing && <span className="text-xs text-gray-400 ml-1">({u.subscription_billing})</span>}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500">Último Pagamento</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">
                {u.last_payment_amount ? `R$ ${Number(u.last_payment_amount).toFixed(2)}` : '—'}
                {u.last_payment_date && <span className="block text-xs text-gray-400">{format(parseISO(u.last_payment_date), 'dd/MM/yy')}</span>}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500">ID Nexano</p>
              <p className="text-xs font-mono text-gray-600 mt-1 truncate">{u.nexano_order_id || u.webhook_source || 'purchase_approved'}</p>
              {u.nexano_product_id && (
                <p className="text-[10px] font-mono text-gray-400 truncate mt-0.5">{u.nexano_product_id}</p>
              )}
            </div>
          </div>

          {/* Invoices */}
          {userInvoices.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Faturas ({userInvoices.length})</p>
              <div className="space-y-1.5">
                {userInvoices.slice(0, 5).map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-gray-100 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      inv.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' :
                      inv.status === 'Vencido' ? 'bg-red-100 text-red-700' :
                      inv.status === 'Pendente' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{inv.status}</span>
                    <span className="font-semibold text-gray-800">R$ {Number(inv.amount || 0).toFixed(2)}</span>
                    <span className="text-gray-500">{inv.description || '—'}</span>
                    <span className="ml-auto text-gray-400">Venc: {inv.due_date ? format(parseISO(inv.due_date), 'dd/MM/yy') : '—'}</span>
                    {inv.boleto_url && (
                      <a href={inv.boleto_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Boleto</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              Mensagem WhatsApp via zapi-app
              <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0 ml-1">Em breve</Badge>
            </p>

            {/* Quick Templates */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleNotify('cobranca')} className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Cobrança
              </button>
              <button onClick={() => handleNotify('lembrete')} className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1">
                <Bell className="w-3 h-3" /> Lembrete
              </button>
              <button onClick={() => handleNotify('boas_vindas')} className="text-xs px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1">
                <Zap className="w-3 h-3" /> Boas-vindas
              </button>
            </div>

            <div className="flex gap-2">
              <Input
                value={zapiMsg}
                onChange={e => setZapiMsg(e.target.value)}
                placeholder="Digite a mensagem para enviar via WhatsApp..."
                className="text-sm h-9"
              />
              <Button
                size="sm"
                disabled={!zapiMsg.trim() || sendingMsg}
                onClick={handleZapiSend}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3 gap-1 flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                {ZAPI_CONFIG.enabled ? 'Enviar' : 'Simular'}
              </Button>
            </div>
            {!ZAPI_CONFIG.enabled && (
              <p className="text-[11px] text-gray-400 italic">
                🔗 Integração zapi-app preparada. Configure ZAPI_INSTANCE_ID e ZAPI_TOKEN para ativar o envio real.
              </p>
            )}
          </div>

          {/* Admin Actions */}
          <div className="flex gap-2 pt-1 flex-wrap">
            <button
              onClick={() => onAction('edit_plan', u)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Editar Plano
            </button>
            <button
              onClick={() => onAction('toggle_status', u)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {u.subscription_status === 'cancelado' ? 'Reativar' : 'Suspender'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function AdminFinancialPanel({ onEditUser }) {
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: loadingUsers, refetch } = useQuery({
    queryKey: ['admin-financial-users'],
    queryFn: async () => {
      const res = await base44.functions.invoke('adminGetUsers', { type: 'users' });
      return res.data.users || [];
    },
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['admin-all-invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 200),
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalAtivos = users.filter(u => u.subscription_status === 'ativo' || (!u.subscription_status && u.plano)).length;
  const totalInadimplentes = users.filter(u => u.subscription_status === 'inadimplente').length;
  const receitaMensal = invoices
    .filter(i => i.status === 'Pago' && i.payment_date)
    .filter(i => {
      const d = parseISO(i.payment_date);
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    })
    .reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const faturasPendentes = invoices.filter(i => i.status === 'Pendente' || i.status === 'Vencido').length;

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const matchSearch = !search ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === 'todos' || u.plano === filterPlan;
    const matchStatus = filterStatus === 'todos' || (u.subscription_status || 'ativo') === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  });

  const handleAction = async (action, user) => {
    if (action === 'edit_plan' && onEditUser) {
      onEditUser(user);
    } else if (action === 'toggle_status') {
      const newStatus = user.subscription_status === 'cancelado' ? 'ativo' : 'cancelado';
      alert(`[Simulação] Status de ${user.email} seria alterado para "${newStatus}". Implemente via adminGetUsers ou diretamente.`);
    }
  };

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-7 h-7 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Usuários Ativos" value={totalAtivos} sub={`de ${users.length} total`} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
        <StatCard icon={AlertTriangle} label="Inadimplentes" value={totalInadimplentes} color="bg-red-50 text-red-700 border-red-200" />
        <StatCard icon={DollarSign} label="Receita do Mês" value={`R$ ${receitaMensal.toFixed(0)}`} color="bg-blue-50 text-blue-700 border-blue-200" />
        <StatCard icon={Clock} label="Faturas Pendentes" value={faturasPendentes} color="bg-amber-50 text-amber-700 border-amber-200" />
      </div>

      {/* Zapi-app Integration Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-emerald-200">
        <MessageCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-800">Integração zapi-app — Preparada e aguardando ativação</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Quando o zapi-app for configurado, adicione as variáveis <code className="bg-emerald-100 px-1 rounded">ZAPI_INSTANCE_ID</code> e <code className="bg-emerald-100 px-1 rounded">ZAPI_TOKEN</code> nos secrets e ative o flag <code className="bg-emerald-100 px-1 rounded">enabled</code> no componente. Templates de cobrança, lembrete e boas-vindas já estão prontos por usuário.
          </p>
        </div>
        <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs flex-shrink-0">Em breve</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="w-full sm:w-40">
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os planos</SelectItem>
              <SelectItem value="start">Start</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
              <SelectItem value="unico">Único</SelectItem>
              <SelectItem value="sem_plano">Sem Plano</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="inadimplente">Inadimplente</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 gap-1.5 flex-shrink-0">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{filtered.length} usuário(s) encontrado(s)</p>
        {loadingInvoices && <span className="text-xs text-gray-400 animate-pulse">Carregando faturas...</span>}
      </div>

      {/* User List */}
      <div>
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum usuário encontrado com os filtros aplicados.</p>
          </div>
        ) : (
          filtered.map(u => (
            <UserFinancialRow
              key={u.id || u.email}
              u={u}
              invoices={invoices}
              onAction={handleAction}
            />
          ))
        )}
      </div>
    </div>
  );
}