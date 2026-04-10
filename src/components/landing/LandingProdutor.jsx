import { useState } from 'react';
import {
  CheckCircle2, Star, ArrowRight, Zap, MapPin, FileCheck,
  BarChart3, MessageCircle, Leaf, Wheat, Building2, Sprout,
  Map, Cloud, TrendingUp, Shield, Droplets, Smartphone,
  Globe, Lock, Award, Crown, Send, Mail, Phone, User,
  AlertTriangle, TreePine, Sparkles, Scale, Users
} from 'lucide-react';

const diferenciais = [
  {
    icon: Building2,
    title: 'Dashboard único de auditoria completa',
    desc: 'Gestão de CAR, licenças, projetos de engenharia, laudos técnicos, processos jurídicos, contratos e demais documentos em um só lugar.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: AlertTriangle,
    title: 'Alertas de Infrações + Termômetro de Regularidade',
    desc: 'Acompanhamento contínuo de alertas ambientais com termômetro de regularidade da sua propriedade em tempo real.',
    color: 'from-red-500 to-orange-500',
  },
  {
    icon: MapPin,
    title: 'Integração MapBiomas + DOE-FEPAM/RS',
    desc: 'API integrada com alertas de satélite do MapBiomas e monitoramento de notificações iniciais dos processos administrativos no DOE-FEPAM/RS.',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: TreePine,
    title: 'PRAD Interativo',
    desc: 'Fluxograma interativo de Projeto de Recuperação de Áreas Degradadas com acompanhamento de todas as etapas.',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: Map,
    title: 'Agricultura de Precisão & Agro 4.0',
    desc: 'Mapeamentos da propriedade, monitoramento climático, análise de commodities e gestão completa de tecnologia rural.',
    color: 'from-amber-500 to-yellow-600',
  },
  {
    icon: Leaf,
    title: 'Ativos Ambientais',
    desc: 'Créditos de Carbono, Servidão Ambiental, PSA (Pagamentos por Serviços Ambientais) e CRA (Cotas de Reserva Ambiental).',
    color: 'from-lime-500 to-green-600',
  },
  {
    icon: TrendingUp,
    title: 'ESG para Empresas',
    desc: 'Implementação e gestão completa do ESG para empresas do agronegócio e setor industrial.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: Scale,
    title: 'Georreferenciamento, Crédito Rural e Safra',
    desc: 'Gestão técnica para regularização de georreferenciamento, controle de créditos rurais e frustração de safra.',
    color: 'from-slate-500 to-gray-600',
  },
  {
    icon: MessageCircle,
    title: 'IA RUTE 24h',
    desc: 'Chat com Inteligência Artificial programada para demandas agroambientais — disponível 24 horas via WhatsApp.',
    color: 'from-pink-500 to-rose-600',
  },
];

const planos = [
  {
    name: 'Básico',
    price: 'R$ 99',
    period: '/mês',
    desc: 'Para pequenos produtores que querem organizar sua propriedade.',
    color: 'border-gray-200',
    badge: null,
    items: [
      '1 propriedade',
      'Dashboard central da propriedade',
      'Gestão de documentos',
      'CAR e licenças básicas',
      'Mapa interativo',
      'IA Rute (30 consultas/mês)',
    ],
  },
  {
    name: 'Produtor Plus',
    price: 'R$ 229',
    period: '/mês',
    desc: 'Monitoramento completo e ativos ambientais para produtores ativos.',
    color: 'border-emerald-400',
    badge: 'Recomendado',
    badgeColor: 'bg-emerald-600',
    items: [
      'Até 3 propriedades',
      'Monitoramento NDVI por satélite',
      'Alertas MapBiomas em tempo real',
      'Ativos ambientais (carbono, CRA)',
      'Crédito rural e frustração de safra',
      'Análise climática e commodities',
      'IA Rute ilimitada + WhatsApp',
      'Termômetro de regularidade',
      'PRAD interativo',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    desc: 'Para grandes produtores, cooperativas e grupos rurais.',
    color: 'border-amber-400',
    badge: '⭐ Cliente Fundador',
    badgeColor: 'bg-amber-500',
    highlight: true,
    items: [
      'Propriedades ilimitadas',
      'Implantação Assistida Gratuita*',
      'Diagnóstico Inicial incluso',
      'Integração da plataforma',
      'Treinamento personalizado',
      'Consultoria Jurídica e Ambiental mensal',
      'Orientações, consultas e acompanhamento estratégico',
      'Orçamentos individuais diferenciados',
      'Suporte prioritário + gerente dedicado',
      'SLA garantido',
    ],
  },
];

const testimonials = [
  { name: 'Ana Paula Ferreira', role: 'Produtora Rural, MT', text: 'Finalmente consigo acompanhar tudo da minha fazenda num só lugar. O mapa com alertas do MapBiomas é sensacional.', stars: 5 },
  { name: 'João Batista Nunes', role: 'Pecuarista, MS', text: 'O termômetro de regularidade me deu clareza sobre a situação ambiental da fazenda. Antes era tudo disperso.', stars: 5 },
  { name: 'Fernanda Lopes', role: 'Agricultora, GO', text: 'A IA Rute tirou dúvidas que eu levaria semanas para resolver com um consultor. Simplesmente incrível.', stars: 5 },
];

function LeadForm() {
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', tamanho: '', culturas: '', estado: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 900));
    setSent(true);
    setSending(false);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Solicitação enviada!</h3>
        <p className="text-gray-500 text-sm">Nossa equipe entrará em contato em até 24 horas.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {[
        { id: 'nome', label: 'Nome completo', type: 'text', placeholder: 'Seu nome', icon: User },
        { id: 'email', label: 'E-mail', type: 'email', placeholder: 'produtor@email.com', icon: Mail },
        { id: 'telefone', label: 'WhatsApp', type: 'tel', placeholder: '(00) 9 0000-0000', icon: Phone },
      ].map((f) => {
        const Icon = f.icon;
        return (
          <div key={f.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
            <div className="relative">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={f.type}
                required
                placeholder={f.placeholder}
                value={form[f.id]}
                onChange={e => setForm(p => ({ ...p, [f.id]: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        );
      })}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tamanho da propriedade</label>
        <select required value={form.tamanho} onChange={e => setForm(p => ({ ...p, tamanho: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
          <option value="">Selecione...</option>
          <option>Até 100 hectares</option>
          <option>100 a 500 hectares</option>
          <option>500 a 2.000 hectares</option>
          <option>2.000 a 10.000 hectares</option>
          <option>Mais de 10.000 hectares</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Principal atividade / cultura</label>
        <select value={form.culturas} onChange={e => setForm(p => ({ ...p, culturas: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
          <option value="">Selecione...</option>
          <option>Soja</option><option>Milho</option><option>Pecuária</option><option>Cana-de-açúcar</option>
          <option>Café</option><option>Algodão</option><option>Horticultura / Fruticultura</option><option>Misto</option><option>Outro</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
        <input type="text" maxLength={2} placeholder="Ex: RS, MT, GO..." value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value.toUpperCase() }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>

      <button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60">
        {sending ? 'Enviando...' : <> Quero conhecer o PRUMO Hub <Send className="w-4 h-4" /></>}
      </button>
      <p className="text-xs text-gray-400 text-center">Seus dados estão seguros. Sem spam.</p>
    </form>
  );
}

export default function LandingProdutor({ onLogin }) {
  return (
    <div className="pt-16">
      {/* HERO */}
      <section className="py-20 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-96 h-96 bg-amber-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-6">
              <Wheat className="w-3.5 h-3.5" />
              Para Produtores Rurais
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Sua propriedade organizada.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
                Sem riscos, sem surpresas.
              </span>
            </h1>
            <p className="text-lg text-emerald-200 mb-6 leading-relaxed">
              O PRUMO Hub é uma plataforma SaaS desenvolvida para produtores rurais que precisam <strong className="text-white">organizar, monitorar e reduzir riscos ambientais</strong> de forma simples, segura e contínua — tudo em um único ambiente digital acessível de qualquer lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button onClick={onLogin} className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-105">
                Começar gratuitamente <ArrowRight className="w-5 h-5" />
              </button>
              <a href="#contato" className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-2xl border border-white/20 transition-all">
                Falar com especialista
              </a>
            </div>

            {/* Destaque Cliente Fundador */}
            <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl px-6 py-4 flex items-start gap-3">
              <span className="text-2xl">⭐</span>
              <div>
                <p className="text-amber-300 font-bold text-sm">Clientes Fundadores — Plano Enterprise</p>
                <p className="text-amber-200/80 text-xs mt-1">
                  Implantação Assistida Gratuita por tempo limitado: Diagnóstico Inicial, Integração da Plataforma e Treinamento personalizado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section id="diferenciais" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
              <Zap className="w-3.5 h-3.5" />
              O que está incluso
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Tudo que sua propriedade precisa<br />em um único dashboard
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Mais de 30 módulos integrados para cobrir todo o ciclo de gestão ambiental, técnica e financeira da propriedade rural.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {diferenciais.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="group p-6 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all bg-white">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONSULTORIA SANTA RUTE */}
      <section className="py-20 bg-gradient-to-br from-emerald-950 to-teal-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-6">
            <Award className="w-3.5 h-3.5" />
            Exclusivo para Produtores Rurais
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
            Consultoria Jurídica e Ambiental Mensal<br />
            <span className="text-amber-300">pela Santa Rute</span>
          </h2>
          <p className="text-emerald-200 text-lg max-w-2xl mx-auto mb-10">
            Para clientes produtores, o PRUMO Hub oferece <strong className="text-white">consultoria especializada mensal</strong> com orientações, consultas e acompanhamento estratégico — com orçamentos individuais diferenciados para cada realidade.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
            {[
              { icon: Scale, title: 'Consultoria Jurídica', desc: 'Orientações legais sobre legislação ambiental, processos e conformidade.' },
              { icon: Leaf, title: 'Consultoria Ambiental', desc: 'Diagnóstico técnico, licenças, CAR, PRAD e regularização.' },
              { icon: TrendingUp, title: 'Acompanhamento Estratégico', desc: 'Plano de ação personalizado e monitoramento contínuo da propriedade.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white/10 border border-white/20 rounded-2xl px-5 py-6 text-left">
                  <Icon className="w-7 h-7 text-amber-300 mb-3" />
                  <h4 className="font-bold text-white text-sm mb-1">{item.title}</h4>
                  <p className="text-emerald-300 text-xs leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
          <p className="text-emerald-400 text-sm">
            * Orçamentos individuais diferenciados — converse com nossa equipe para saber mais.
          </p>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-20 bg-gradient-to-b from-stone-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
              <Crown className="w-3.5 h-3.5" />
              Planos para Produtores Rurais
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Escolha o plano ideal</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {planos.map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl border-2 ${plan.color} bg-white p-8 flex flex-col shadow-sm hover:shadow-lg transition-shadow ${plan.highlight ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${plan.badgeColor} text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap`}>
                    {plan.badge}
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{plan.desc}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                    {plan.period && <span className="text-gray-400 text-sm mb-1">{plan.period}</span>}
                  </div>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button onClick={onLogin} className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${plan.highlight ? 'bg-amber-500 text-white hover:bg-amber-600' : plan.badge === 'Recomendado' ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                  {plan.price === 'Sob consulta' ? 'Falar com equipe →' : 'Começar agora →'}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            * Implantação Assistida Gratuita por tempo limitado para Clientes Fundadores no Plano Enterprise.
          </p>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section id="depoimentos" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900">Quem usa, recomenda</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="p-6 rounded-2xl bg-stone-50 border border-stone-100">
                <div className="flex gap-1 mb-4">
                  {Array(t.stars).fill(0).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4 italic">"{t.text}"</p>
                <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                <p className="text-xs text-gray-500">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section id="contato" className="py-20 bg-gradient-to-br from-stone-50 to-emerald-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Fale com nossa equipe
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Quero conhecer o PRUMO Hub</h2>
            <p className="text-gray-500">Preencha e um especialista entrará em contato para apresentar a plataforma.</p>
          </div>
          <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-emerald-100">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <Wheat className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Cadastro — Produtor Rural</h3>
                <p className="text-sm text-gray-500">Nosso time entrará em contato em até 24h</p>
              </div>
            </div>
            <LeadForm />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-emerald-900 to-teal-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Pronto para transformar sua gestão ambiental?</h2>
          <p className="text-emerald-200 mb-8">Junte-se a centenas de produtores que já usam o PRUMO Hub.</p>
          <button onClick={onLogin} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-xl transition-all hover:scale-105">
            Começar agora — é grátis <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-emerald-950 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png" alt="PRUMO Hub" className="h-10 w-auto" />
          <p className="text-emerald-500 text-sm">© {new Date().getFullYear()} PRUMO Hub. Todos os direitos reservados.</p>
          <div className="flex gap-4 text-xs text-emerald-600">
            <a href="#" className="hover:text-emerald-400">Privacidade</a>
            <a href="#" className="hover:text-emerald-400">Termos</a>
            <a href="#" className="hover:text-emerald-400">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}