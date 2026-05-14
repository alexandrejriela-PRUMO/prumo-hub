import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, Star, ArrowRight, Zap, FileCheck,
  BarChart3, MessageCircle, Briefcase, Building2,
  Smartphone, Globe, Lock, Award, Crown, Send, Mail, Phone, User,
  ClipboardList, ScrollText, Users, ReceiptText, Map, Leaf,
  Sparkles, TrendingUp, Scale, AlertTriangle, MapPin
} from 'lucide-react';
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

const diferenciais = [
  {
    icon: Briefcase,
    title: 'Escritório Digital Completo',
    desc: 'Gerencie seu escritório de consultoria ambiental com CRM, agenda, pipeline de clientes e gestão de equipe em um só lugar.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: ClipboardList,
    title: 'CRM + Pipeline de Clientes',
    desc: 'Controle toda a jornada do cliente — desde o primeiro contato até a entrega do projeto — com automações e follow-ups.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: ScrollText,
    title: 'Gerador de Contratos e Orçamentos',
    desc: 'Crie contratos e orçamentos profissionais em minutos, com modelos personalizados e assinatura digital integrada (Clicksign).',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: FileCheck,
    title: 'Gestão de Licenças e Projetos Técnicos',
    desc: 'Centralize licenças ambientais, laudos técnicos, ARTs e projetos de engenharia de todos os seus clientes — com controle de vencimentos, checklists e histórico completo de andamentos.',
    color: 'from-purple-500 to-indigo-600',
    highlight: true,
  },
  {
    icon: Scale,
    title: 'Acompanhamento de Processos Jurídicos',
    desc: 'Gerencie processos administrativos, civis e criminais dos seus clientes: andamentos, embargos, multas e prazos — tudo registrado e monitorado em um único painel.',
    color: 'from-rose-500 to-red-600',
    highlight: true,
  },
  {
    icon: ReceiptText,
    title: 'Emissão de NF-e Automatizada',
    desc: 'Integração com Focus NFe para emissão automática de notas fiscais após recebimento de cobranças.',
    color: 'from-emerald-500 to-teal-600',
    comingSoon: true,
  },
  {
    icon: BarChart3,
    title: 'Controle Financeiro Completo',
    desc: 'Painel financeiro com receitas, despesas, cobranças via Nexano, conciliação bancária e relatórios de resultado.',
    color: 'from-green-500 to-lime-600',
    comingSoon: true,
  },
  {
    icon: Users,
    title: 'Gestão de Equipe',
    desc: 'Adicione membros à sua equipe com permissões granulares por módulo. Delegue tarefas e acompanhe o progresso.',
    color: 'from-slate-500 to-gray-600',
  },
  {
    icon: Map,
    title: 'Central da Propriedade do Cliente',
    desc: 'Acesse CAR, licenças, laudos, mapas, alertas e documentos de todos os seus clientes de um único painel.',
    color: 'from-teal-500 to-cyan-600',
  },
  {
    icon: AlertTriangle,
    title: 'Alertas de Infrações + Termômetro de Regularidade',
    desc: 'Acompanhe alertas ambientais dos seus clientes em tempo real com termômetro de regularidade da propriedade — antecipe riscos e aja antes que virem problemas jurídicos.',
    color: 'from-red-500 to-orange-500',
    highlight: true,
  },
  {
    icon: MapPin,
    title: 'Integração MapBiomas + DOE-FEPAM/RS',
    desc: 'API integrada com alertas de satélite do MapBiomas e monitoramento de notificações iniciais dos processos administrativos no DOE-FEPAM/RS para todos os seus clientes.',
    color: 'from-blue-500 to-cyan-600',
    highlight: true,
  },
  {
    icon: MessageCircle,
    title: 'IA RUTE 24h',
    desc: 'Assistente de IA especializada em legislação ambiental, CAR, PRAD, crédito de carbono e agronegócio — via WhatsApp.',
    color: 'from-pink-500 to-rose-600',
  },
];

const planos = [
  {
    name: 'Start',
    price: 129,
    desc: '1 usuário consultor • Até 5 propriedades/clientes.',
    color: 'border-emerald-200',
    badge: null,
    checkoutUrl: 'https://checkout.nexano.com.br/checkout/cmo2vmthl06bp1yms3aaa35wv?offer=GYXWU5X',
    items: [
      '1 usuário consultor',
      'Até 5 propriedades/clientes',
      'Notificação pessoal para o consultor',
      'Materiais de autoatendimento',
      'Fidelidade de 12 meses',
    ],
  },
  {
    name: 'Pro',
    price: 249,
    desc: 'Até 2 usuários (consultor + equipe) • Até 10 propriedades.',
    color: 'border-blue-300',
    badge: null,
    checkoutUrl: 'https://checkout.nexano.com.br/checkout/cmo2vmthl06bp1yms3aaa35wv?offer=8QA4VR2',
    items: [
      'Até 2 usuários (consultor + equipe)',
      'Até 10 propriedades/clientes',
      'Notificação para o consultor e equipe',
      'Autoatendimento + Webinars periódicos',
      'Fidelidade de 12 meses',
    ],
  },
  {
    name: 'Enterprise',
    price: 497,
    desc: 'Até 3 usuários • Até 200 propriedades/clientes. Plano mais completo.',
    color: 'border-amber-400',
    badge: 'Mais Popular',
    badgeColor: 'bg-amber-500',
    highlight: true,
    checkoutUrl: 'https://checkout.nexano.com.br/checkout/cmo2vmthl06bp1yms3aaa35wv?offer=EQL1OTT',
    items: [
      'Até 3 usuários (consultor + equipe)',
      'Até 200 propriedades/clientes',
      'CRM Prumo — gestão de relacionamentos',
      'Agenda integrada',
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

const testimonials = [
  { name: 'Carlos Mendonça', role: 'Engenheiro Ambiental, MS', text: 'O PRUMO Hub transformou meu escritório. Reduzi 60% do tempo em burocracia e hoje consigo atender o dobro de clientes com muito mais qualidade.', stars: 5 },
  { name: 'Juliana Torres', role: 'Consultora Ambiental, PR', text: 'Minha equipe usa o PRUMO para gerenciar o compliance de 15 empresas simultaneamente. A produtividade triplicou.', stars: 5 },
  { name: 'Ricardo Sousa', role: 'Consultor Agronômico, GO', text: 'A IA Rute me ajuda a tirar dúvidas de legislação na hora, direto pelo WhatsApp. Isso vale ouro no dia a dia.', stars: 5 },
];

function LeadForm() {
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', especialidade: '', tamanho: '', estado: '', parceiro: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    await base44.entities.LeadFormSubmission.create({
      perfil: 'consultor',
      nome: form.nome,
      email: form.email,
      telefone: form.telefone,
      especialidade: form.especialidade,
      tamanho: form.tamanho,
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
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-amber-600" />
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
        { id: 'email', label: 'E-mail profissional', type: 'email', placeholder: 'consultor@email.com', icon: Mail },
        { id: 'telefone', label: 'WhatsApp / Telefone', type: 'tel', placeholder: '(00) 9 0000-0000', icon: Phone },
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
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
        );
      })}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Área de atuação</label>
        <select required value={form.especialidade} onChange={e => setForm(p => ({ ...p, especialidade: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
          <option value="">Selecione...</option>
          <option>Engenheiro Florestal</option>
          <option>Engenheiro Ambiental</option>
          <option>Engenheiro Agrônomo</option>
          <option>Engenheiro de Minas</option>
          <option>Geólogo</option>
          <option>Biólogo</option>
          <option>Gestor Ambiental</option>
          <option>Advogado</option>
          <option>Licenciamento Ambiental</option>
          <option>Gestão de CAR e PRAD</option>
          <option>Georreferenciamento</option>
          <option>Ativos Ambientais / Carbono</option>
          <option>Consultoria Agronômica</option>
          <option>Consultoria Jurídica Ambiental</option>
          <option>Outro</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de clientes ativos</label>
        <select value={form.tamanho} onChange={e => setForm(p => ({ ...p, tamanho: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
          <option value="">Selecione...</option>
          <option>Ainda não tenho clientes</option>
          <option>1 a 5 clientes</option>
          <option>6 a 20 clientes</option>
          <option>21 a 50 clientes</option>
          <option>Mais de 50 clientes</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
        <input type="text" maxLength={2} placeholder="Ex: RS, SP, MT..." value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value.toUpperCase() }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
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
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      <button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60">
        {sending ? 'Enviando...' : <> Quero conhecer o PRUMO Hub <Send className="w-4 h-4" /></>}
      </button>
      <p className="text-xs text-gray-400 text-center">Seus dados estão seguros. Sem spam.</p>
    </form>
  );
}

export default function LandingConsultor({ onLogin }) {
  return (
    <div className="pt-16">
      <section className="py-12 sm:py-20 bg-gradient-to-br from-amber-950 via-amber-900 to-orange-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-96 h-96 bg-amber-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-orange-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-4 sm:mb-6">
              <Briefcase className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="hidden sm:inline">Para Consultores Ambientais</span>
              <span className="sm:hidden">Consultores</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 sm:mb-6">
              Seu escritório de consultoria<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
                em outro nível.
              </span>
            </h1>
            <p className="text-sm sm:text-lg text-amber-100/80 mb-6 sm:mb-8 leading-relaxed">
              O PRUMO Hub unifica <strong className="text-white">CRM, contratos, financeiro, NF-e, gestão de equipe</strong> para você atender mais clientes com menos burocracia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#planos" className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-105">
                Contratar agora <ArrowRight className="w-5 h-5" />
              </a>
              <button onClick={onLogin} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-2xl border border-white/20 transition-all">
                Área do Cliente
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section id="diferenciais" className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
              <Zap className="w-3.5 h-3.5" />
              Tudo para o seu escritório
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              O hub completo para<br />o consultor ambiental moderno
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {diferenciais.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeIn key={f.title} delay={i * 60}>
                <div className={`group relative p-6 rounded-2xl border-2 transition-all ${
                   f.highlight
                     ? 'border-purple-300 bg-purple-50/40 hover:border-purple-400 hover:shadow-xl shadow-md ring-1 ring-purple-200'
                     : 'border-gray-100 bg-white hover:border-amber-200 hover:shadow-lg'
                 }`}>
                  {f.comingSoon && (
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                      <div className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md z-10 flex items-center gap-1">
                        🚧 Em Construção
                      </div>
                    </div>
                  )}
                  {f.highlight && (
                    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3">
                      ⭐ Destaque
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className={`font-bold mb-2 ${f.highlight ? 'text-purple-900' : 'text-gray-900'}`}>{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-12 sm:py-20 bg-gradient-to-b from-stone-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
              <Crown className="w-3.5 h-3.5" />
              Planos para Consultores
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Escolha o plano ideal</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {planos.map((plan) => {
              const borderColor = plan.name === 'Start' ? 'border-emerald-200' : plan.name === 'Pro' ? 'border-blue-300' : 'border-amber-400';
              const checkColor = plan.name === 'Start' ? 'text-emerald-600' : plan.name === 'Pro' ? 'text-blue-600' : 'text-amber-500';
              const btnColor = plan.highlight ? 'bg-amber-500 text-white hover:bg-amber-600' : plan.name === 'Pro' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-emerald-600 text-white hover:bg-emerald-700';
              return (
                <div key={plan.name} className={`relative rounded-2xl border-2 ${borderColor} bg-white p-8 flex flex-col shadow-sm hover:shadow-lg transition-shadow ${plan.highlight ? 'scale-105 shadow-xl' : ''}`}>
                  {plan.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${plan.badgeColor} text-white text-xs font-bold px-4 py-1 rounded-full`}>
                      {plan.badge}
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{plan.desc}</p>
                  <div className="flex items-end gap-1 mb-4">
                    <span className="text-3xl font-extrabold text-gray-900">R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-gray-400 text-sm mb-1">/mês</span>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className={`w-4 h-4 ${checkColor} flex-shrink-0 mt-0.5`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer" className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors text-center ${btnColor}`}>
                    Contratar agora →
                  </a>
                </div>
              );
            })}
          </div>

          {/* Tabela comparativa */}
          <div className="mt-10 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Comparativo de Planos</h3>
            </div>
            <div className="overflow-x-auto">
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
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            * Fidelidade de 12 meses. Aceitamos cartão de crédito, PIX e boleto bancário.
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
      <section id="contato" className="py-12 sm:py-20 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Fale com nossa equipe
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Quero conhecer o PRUMO Hub</h2>
            <p className="text-gray-500">Preencha e um especialista entrará em contato para apresentar a plataforma.</p>
          </div>
          <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-amber-100">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Cadastro — Consultor Ambiental</h3>
                <p className="text-sm text-gray-500">Nosso time entrará em contato em até 24h</p>
              </div>
            </div>
            <LeadForm />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-amber-900 to-orange-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Pronto para levar seu escritório ao próximo nível?</h2>
          <p className="text-amber-200 mb-8">Fale com nosso time e veja como o PRUMO Hub pode transformar sua consultoria.</p>
          <a href="#planos" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-xl transition-all hover:scale-105">
            Contratar agora <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-amber-950 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png" alt="PRUMO Hub" className="h-10 w-auto" />
          <p className="text-amber-600 text-sm">© {new Date().getFullYear()} PRUMO Hub. Todos os direitos reservados.</p>
          <div className="flex gap-4 text-xs text-amber-700">
            <a href="#" className="hover:text-amber-400">Privacidade</a>
            <a href="#" className="hover:text-amber-400">Termos</a>
            <a href="#" className="hover:text-amber-400">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}