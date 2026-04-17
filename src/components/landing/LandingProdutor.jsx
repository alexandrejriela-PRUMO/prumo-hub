import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

function FadeIn({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
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
    name: 'Plano Único Completo',
    monthlyPrice: 697,
    annualPrice: 6970,
    annualMonthly: 580.83,
    desc: 'Produtor Rural — Serviço Integrado. Tudo que sua propriedade precisa em uma única assinatura.',
    color: 'border-emerald-400',
    badge: '⭐ Plano Único',
    badgeColor: 'bg-emerald-600',
    highlight: true,
    items: [
      'Gestão completa de propriedades e empreendimentos',
      'Licenças ambientais, documentos e processos',
      'Alertas de infrações e PRAD interativo',
      'Agricultura de precisão (mapeamentos, clima, commodities)',
      'Ativos ambientais (carbono, PSA, servidão, ESG)',
      'Georreferenciamento e relatórios detalhados',
      'Chat IA Rute para assistência inteligente',
      'Notificações ilimitadas e personalizadas',
      'Acesso a materiais de autoatendimento',
    ],
    enterprise: [
      'Implantação Assistida Gratuita (tempo limitado)*',
      'Diagnóstico Inicial incluso',
      'Integração da plataforma',
      'Treinamento personalizado',
      'Consultoria Jurídica e Ambiental mensal — Santa Rute',
      'Orientações, consultas e acompanhamento estratégico',
      'Orçamentos individuais diferenciados',
      'Suporte prioritário + gerente dedicado',
    ],
  },
];

const testimonials = [
  { name: 'Ana Paula Ferreira', role: 'Produtora Rural, MT', text: 'Finalmente consigo acompanhar tudo da minha fazenda num só lugar. O mapa com alertas do MapBiomas é sensacional.', stars: 5 },
  { name: 'João Batista Nunes', role: 'Pecuarista, MS', text: 'O termômetro de regularidade me deu clareza sobre a situação ambiental da fazenda. Antes era tudo disperso.', stars: 5 },
  { name: 'Fernanda Lopes', role: 'Agricultora, GO', text: 'A IA Rute tirou dúvidas que eu levaria semanas para resolver com um consultor. Simplesmente incrível.', stars: 5 },
];

function LeadForm() {
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', tamanho: '', culturas: '', estado: '', parceiro: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    await base44.entities.LeadFormSubmission.create({
      perfil: 'produtor',
      nome: form.nome,
      email: form.email,
      telefone: form.telefone,
      tamanho: form.tamanho,
      especialidade: form.culturas,
      culturas: form.culturas,
      estado: form.estado,
      parceiro: form.parceiro,
      submitted_at: new Date().toISOString(),
    });
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Parceiro Fundador / Indicador <span className="text-gray-400 font-normal text-xs">(opcional)</span>
        </label>
        <input
          type="text"
          placeholder="Nome de quem indicou, se houver"
          value={form.parceiro}
          onChange={e => setForm(p => ({ ...p, parceiro: e.target.value }))}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      <button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60">
        {sending ? 'Enviando...' : <> Quero conhecer o PRUMO Hub <Send className="w-4 h-4" /></>}
      </button>
      <p className="text-xs text-gray-400 text-center">Seus dados estão seguros. Sem spam.</p>
    </form>
  );
}

export default function LandingProdutor({ onLogin }) {
  const [billing, setBilling] = useState('monthly');
  return (
    <div className="pt-16">
      {/* HERO */}
      <section className="py-20 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-96 h-96 bg-emerald-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-amber-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-6">
              <Wheat className="w-3.5 h-3.5" />
              Para Produtores Rurais
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Sua propriedade organizada.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
                Sem riscos, sem surpresas.
              </span>
            </h1>
            <p className="text-lg text-emerald-100/80 mb-8 leading-relaxed">
              O PRUMO Hub reúne <strong className="text-white">gestão ambiental, documentos, licenças, CAR, mapas e alertas</strong> em uma única plataforma — para o produtor rural que quer segurança jurídica e controle total da propriedade.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#contato" className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-105">
                Falar com especialista <ArrowRight className="w-5 h-5" />
              </a>
              <button onClick={onLogin} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-2xl border border-white/20 transition-all">
                Área do Cliente
              </button>
            </div>
          </div>
        </div>
      </section>

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
            {diferenciais.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeIn key={f.title} delay={i * 60}>
                <div className="group p-6 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all bg-white">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
                </FadeIn>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
              <Crown className="w-3.5 h-3.5" />
              Plano para Produtores Rurais
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Plano Único Completo</h2>
            <p className="text-gray-500 max-w-xl mx-auto mb-6">Tudo que sua propriedade precisa em uma única assinatura — sem surpresas.</p>
            {/* Billing toggle */}
            <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
              <button onClick={() => setBilling('monthly')} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-emerald-600 text-white shadow' : 'text-gray-600'}`}>Mensal</button>
              <button onClick={() => setBilling('annual')} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${billing === 'annual' ? 'bg-emerald-600 text-white shadow' : 'text-gray-600'}`}>Anual 🎉 <span className="text-xs">(2 meses grátis)</span></button>
            </div>
          </div>

          {planos.map((plan) => {
            const price = billing === 'annual' ? plan.annualMonthly : plan.monthlyPrice;
            return (
              <div key={plan.name} className="relative rounded-2xl border-2 border-emerald-400 bg-white shadow-xl ring-2 ring-emerald-300 ring-offset-2 overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-xs px-4 py-1.5 rounded-bl-xl font-bold">
                  {billing === 'annual' ? '🎉 2 meses grátis' : 'Plano Único'}
                </div>
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                      <Wheat className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-sm text-gray-500">Produtor Rural — Serviço Integrado</p>
                    </div>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-gray-900">R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-gray-400 text-sm mb-1">/mês por propriedade</span>
                    </div>
                    {billing === 'annual' && (
                      <p className="text-sm text-emerald-600 font-medium mt-1">R$ {plan.annualPrice.toLocaleString('pt-BR')}/ano por propriedade — 2 meses grátis</p>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Incluso no plano</p>
                      <ul className="space-y-2">
                        {plan.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">⭐ Cliente Fundador — Enterprise</p>
                      <ul className="space-y-2">
                        {plan.enterprise.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-amber-800">
                            <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <a href="https://checkout.nexano.com.br/checkout/cmo2vyei507261yldn9ynobbt?offer=GNJXUCE" target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl font-bold text-sm bg-emerald-700 text-white hover:bg-emerald-800 transition-colors text-center">
                      Contratar agora →
                    </a>
                    <a href="https://checkout.nexano.com.br/checkout/cmo2vyei507261yldn9ynobbt?offer=GNJXUCE" target="_blank" rel="noopener noreferrer" className="flex-1 py-3 rounded-xl font-semibold text-sm bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors text-center">
                      Quero ser Cliente Fundador
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-center text-xs text-gray-400 mt-4">
            * Implantação Assistida Gratuita por tempo limitado para Clientes Fundadores no Plano Enterprise. Aceitamos cartão, PIX e boleto.
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
          <p className="text-emerald-200 mb-8">Fale com nosso time e descubra como o PRUMO Hub pode ajudar sua propriedade.</p>
          <a href="#contato" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-xl transition-all hover:scale-105">
            Falar com especialista <ArrowRight className="w-5 h-5" />
          </a>
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