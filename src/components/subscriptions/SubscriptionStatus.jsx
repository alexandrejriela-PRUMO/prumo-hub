import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, CreditCard, Settings, Users, Building2, Star, Crown, Leaf, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// ── Planos ──────────────────────────────────────────────────────────────────

const PRODUTOR_PLAN = {
  name: 'Plano Único Completo',
  monthlyPrice: 497,
  annualPrice: 4473,
  annualMonthly: 372.75,
  savings: '3 meses grátis',
  features: [
    'Gestão completa de propriedades e empreendimentos',
    'Licenças ambientais, documentos e processos',
    'Alertas de infrações e PRAD',
    'Agricultura de precisão (mapeamentos, clima, commodities)',
    'Ativos ambientais (carbono, PSA, servidão, ESG)',
    'Georreferenciamento e relatórios detalhados',
    'Chat IA Rute para assistência inteligente',
    'Notificações ilimitadas e personalizadas',
    'Acesso a materiais de autoatendimento',
  ],
};

const CONSULTOR_PLANS = [
  {
    id: 'start',
    name: 'Start',
    icon: Leaf,
    color: 'emerald',
    monthlyPrice: 129,
    annualPrice: 1290,
    annualMonthly: 107.5,
    users: '1 usuário',
    properties: 'Até 5 propriedades',
    notifications: 'Notificação pessoal (consultor)',
    clientAccess: '—',
    training: 'Autoatendimento',
    commitment: 'Fidelidade de 12 meses',
    features: [
      '1 usuário consultor',
      'Até 5 propriedades/clientes',
      'Notificação pessoal para o consultor',
      'Materiais de autoatendimento',
      'Fidelidade de 12 meses',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Star,
    color: 'blue',
    monthlyPrice: 249,
    annualPrice: 2490,
    annualMonthly: 207.5,
    users: 'Até 2 usuários',
    properties: 'Até 10 propriedades',
    notifications: 'Consultor + equipe',
    clientAccess: '—',
    training: 'Autoatendimento + Webinars',
    commitment: 'Fidelidade de 12 meses',
    features: [
      'Até 2 usuários (consultor + equipe)',
      'Até 10 propriedades/clientes',
      'Notificação para o consultor e equipe',
      'Autoatendimento + Webinars periódicos',
      'Fidelidade de 12 meses',
    ],
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Crown,
    color: 'amber',
    monthlyPrice: 497,
    annualPrice: 4970,
    annualMonthly: 414.17,
    users: 'Até 3 usuários',
    properties: 'Até 200 propriedades/clientes',
    notifications: 'Consultor, equipe e cliente',
    clientAccess: 'Visualizar e baixar documentos',
    training: 'Autoatendimento + Webinars + Treinamentos personalizados',
    commitment: 'Fidelidade de 12 meses',
    features: [
      'Até 3 usuários (consultor + equipe)',
      'Até 200 propriedades/clientes',
      'CRM Prumo — gestão de relacionamentos',
      'Agenda integrada com Google Calendar',
      'ERP Controle Financeiro completo',
      'Alerta MapBiomas (monitoramento de infrações)',
      'Monitoramento DOE-RS / FEPAM',
      'Notificação para consultor, equipe e clientes',
      'Portal do cliente (visualizar e baixar documentos)',
      'Relatórios de gestão para clientes',
      'Autoatendimento + Webinars + Treinamentos personalizados',
      'Fidelidade de 12 meses',
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function colorClasses(color) {
  const map = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-600', text: 'text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700', icon: 'text-emerald-600' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-300', badge: 'bg-blue-600', text: 'text-blue-700', btn: 'bg-blue-600 hover:bg-blue-700', icon: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-500', text: 'text-amber-700', btn: 'bg-amber-500 hover:bg-amber-600', icon: 'text-amber-600' },
  };
  return map[color] || map.emerald;
}

// ── Produtor Plan Card ────────────────────────────────────────────────────────

function ProdutorPlanCard({ billing, onSubscribe, loading }) {
  const price = billing === 'annual' ? PRODUTOR_PLAN.annualMonthly : PRODUTOR_PLAN.monthlyPrice;
  const totalLabel = billing === 'annual'
    ? `R$ ${PRODUTOR_PLAN.annualPrice.toLocaleString('pt-BR')}/ano por propriedade`
    : null;

  return (
    <Card className="border-2 border-emerald-300 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-emerald-600 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
        {billing === 'annual' ? '🎉 3 meses grátis' : 'Plano Único'}
      </div>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <Building2 className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <CardTitle className="text-lg">{PRODUTOR_PLAN.name}</CardTitle>
            <p className="text-sm text-gray-500">Produtor Rural — Serviço Integrado</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold text-gray-900">
              R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-gray-500 mb-1">/mês por propriedade</span>
          </div>
          {totalLabel && (
            <p className="text-sm text-emerald-600 font-medium mt-1">{totalLabel}</p>
          )}
        </div>

        <ul className="space-y-2">
          {PRODUTOR_PLAN.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">{f}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={onSubscribe}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {loading ? 'Processando...' : 'Assinar Agora'}
          </Button>
          <Button
            onClick={() => base44.functions.invoke('createStripePortal', {}).then(r => r.data?.url && (window.location.href = r.data.url))}
            variant="outline"
            className="w-full"
          >
            <Settings className="w-4 h-4 mr-2" />
            Gerenciar Assinatura
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Consultor Plan Card ───────────────────────────────────────────────────────

function ConsultorPlanCard({ plan, billing, onSubscribe, loading }) {
  const c = colorClasses(plan.color);
  const price = billing === 'annual' ? plan.annualMonthly : plan.monthlyPrice;
  const Icon = plan.icon;

  return (
    <Card className={`border-2 ${c.border} relative overflow-hidden ${plan.highlight ? 'shadow-xl scale-105' : 'shadow-sm'}`}>
      {plan.highlight && (
        <div className={`absolute top-0 right-0 ${c.badge} text-white text-xs px-3 py-1 rounded-bl-lg font-medium`}>
          Mais Popular
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 ${c.bg} rounded-xl`}>
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
          <div>
            <CardTitle className="text-base">{plan.name}</CardTitle>
            <Badge className={`${c.badge} text-white text-xs mt-0.5`}>Consultor</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-gray-900">
              R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-gray-500 text-sm mb-0.5">/mês</span>
          </div>
          {billing === 'annual' && (
            <p className={`text-xs ${c.text} font-medium mt-0.5`}>
              R$ {plan.annualPrice.toLocaleString('pt-BR')}/ano — 2 meses grátis + Fidelidade 12 meses
            </p>
          )}
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700">{plan.users}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700">{plan.properties}</span>
          </div>
        </div>

        <ul className="space-y-1.5">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className={`w-3.5 h-3.5 ${c.icon} flex-shrink-0 mt-0.5`} />
              <span className="text-xs text-gray-700">{f}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={() => onSubscribe(plan.id)}
          disabled={loading}
          className={`w-full text-white ${c.btn}`}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {loading ? 'Processando...' : 'Assinar'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SubscriptionStatus() {
  const [user, setUser] = useState(null);
  const [billing, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleSubscribe = async (planId) => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('createStripeCheckout', { plan: planId, billing });
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      toast.error('Erro ao iniciar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const userType = user?.user_type;

  // Equipe e cliente do consultor: sem tela de assinatura
  if (userType === 'equipe' || userType === 'client_consultor') {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">Assinatura gerenciada pelo Consultor</p>
            <p className="text-sm text-blue-700 mt-1">
              {userType === 'equipe'
                ? 'Seu acesso é gerenciado pelo consultor responsável pela equipe.'
                : 'Seu acesso à propriedade é gerenciado pelo consultor responsável.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setBilling('monthly')}
          className={`px-5 py-2 rounded-l-full border text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >
          Mensal
        </button>
        <button
           onClick={() => setBilling('annual')}
           className={`px-5 py-2 rounded-r-full border text-sm font-medium transition-all ${billing === 'annual' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
         >
           Anual 🎉 <span className="text-xs">(2 meses grátis)</span>
         </button>
      </div>

      {/* Produtor */}
      {(!userType || userType === 'produtor') && (
        <ProdutorPlanCard billing={billing} onSubscribe={() => handleSubscribe('produtor')} loading={loading} />
      )}

      {/* Consultor */}
      {userType === 'consultor' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-start">
            {CONSULTOR_PLANS.map((plan) => (
              <ConsultorPlanCard
                key={plan.id}
                plan={plan}
                billing={billing}
                onSubscribe={handleSubscribe}
                loading={loading}
              />
            ))}
          </div>

          {/* Comparison table */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Comparativo de Planos</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-700">Recurso</th>
                    <th className="text-center p-3 font-semibold text-emerald-700">Start</th>
                    <th className="text-center p-3 font-semibold text-blue-700">Pro</th>
                    <th className="text-center p-3 font-semibold text-amber-700">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    ['Usuários', '1', 'Até 2', 'Até 3'],
                    ['Propriedades/Clientes', 'Até 5', 'Até 10', 'Até 200'],
                    ['CRM Prumo', '—', '—', '✅'],
                    ['Agenda', '—', '—', '✅'],
                    ['ERP Financeiro', '—', '—', '✅'],
                    ['Alerta MapBiomas', '—', '—', '✅'],
                    ['Monitoramento DOE-RS/FEPAM', '—', '—', '✅'],
                    ['Notificação Consultor', '✅', '✅', '✅'],
                    ['Notificação Equipe', '—', '✅', '✅'],
                    ['Notificação Cliente', '—', '—', '✅'],
                    ['Portal do Cliente', '—', '—', '✅'],
                    ['Relatórios de Gestão', '—', '—', '✅'],
                    ['Webinars Periódicos', '—', '✅', '✅'],
                    ['Treinamentos Personalizados', '—', '—', '✅'],
                  ].map(([feature, start, pro, enterprise]) => (
                    <tr key={feature} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-700">{feature}</td>
                      <td className="p-3 text-center text-emerald-700 font-medium">{start}</td>
                      <td className="p-3 text-center text-blue-700 font-medium">{pro}</td>
                      <td className="p-3 text-center text-amber-700 font-medium">{enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Payment methods note */}
      <p className="text-xs text-center text-gray-400">
        Aceitamos cartão de crédito, PIX e boleto bancário. Cancelamento a qualquer momento.
      </p>
    </div>
  );
}