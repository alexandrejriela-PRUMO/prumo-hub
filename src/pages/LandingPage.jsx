import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Leaf, MapPin, FileCheck, BarChart3, Users, Shield,
  CheckCircle2, Star, Menu, X, Smartphone,
  Building2, Briefcase, MessageCircle,
  Sprout, Wheat, ArrowRight, Globe,
  Lock, Zap, Award, Factory,
  Recycle, BarChart2, FileText, AlertTriangle, ClipboardList,
  Crown, Sparkles, ChevronDown, ChevronRight, Mail, Phone, User, Send
} from 'lucide-react';

// ─── DADOS POR SETOR ────────────────────────────────────────────────────────

const sectors = [
  {
    id: 'agro',
    label: '🌾 Agronegócio',
    hero: {
      badge: 'Plataforma para o campo sustentável',
      title: 'Gestão ambiental e rural',
      highlight: 'do produtor ao consultor',
      desc: 'Do CAR ao crédito de carbono, da licença ambiental ao financeiro do escritório — tudo integrado numa plataforma moderna feita para o agronegócio.',
    },
    features: [
      { icon: Building2, title: 'Central da Propriedade', desc: 'Gerencie documentos, licenças, processos ambientais e alertas de infrações de todas as suas propriedades.', color: 'from-emerald-500 to-teal-600' },
      { icon: Leaf, title: 'Ativos Ambientais', desc: 'Créditos de carbono, PSA, CRA, servidão ambiental e ESG para o agro — monetize e valorize suas áreas verdes.', color: 'from-green-500 to-emerald-600' },
      { icon: MapPin, title: 'Mapa Interativo', desc: 'Visualize sua propriedade com camadas KML, análise NDVI, georreferenciamento e alertas do MapBiomas em tempo real.', color: 'from-blue-500 to-cyan-600' },
      { icon: FileCheck, title: 'Licenças e Projetos', desc: 'Controle licenciamentos ambientais, ARTs, laudos técnicos e checklists com prazos e alertas automáticos.', color: 'from-violet-500 to-purple-600' },
      { icon: BarChart3, title: 'Controle Financeiro', desc: 'Painel financeiro completo, gestão de cobranças, emissão de NF-e e integração com Stripe para consultores.', color: 'from-amber-500 to-orange-600' },
      { icon: MessageCircle, title: 'IA Rute', desc: 'Assistente inteligente especializada em meio ambiente, agronegócio e legislação rural. Disponível 24h via WhatsApp.', color: 'from-pink-500 to-rose-600' },
      { icon: Sprout, title: 'Crédito e Safra', desc: 'Gestão de crédito rural e frustração de safra integrados ao perfil da propriedade e histórico do produtor.', color: 'from-lime-500 to-green-600' },
      { icon: Briefcase, title: 'Escritório do Consultor', desc: 'CRM, agenda, contratos, orçamentos e NF-e — tudo que o consultor ambiental precisa para operar.', color: 'from-slate-500 to-gray-600' },
    ],
    stats: [
      { value: '5.000+', label: 'Propriedades monitoradas' },
      { value: '300+', label: 'Consultores ativos' },
      { value: '99,9%', label: 'Uptime garantido' },
      { value: '24h', label: 'IA Rute disponível' },
    ],
    testimonials: [
      { name: 'Carlos Mendonça', role: 'Engenheiro Ambiental, MS', text: 'O PRUMO Hub transformou meu escritório. Reduzi 60% do tempo em burocracia e hoje consigo atender o dobro de clientes.', stars: 5 },
      { name: 'Ana Paula Ferreira', role: 'Produtora Rural, MT', text: 'Finalmente consigo acompanhar tudo da minha fazenda num só lugar. O mapa com alertas do MapBiomas é sensacional.', stars: 5 },
      { name: 'Ricardo Sousa', role: 'Consultor Agronômico, GO', text: 'A IA Rute me ajuda a tirar dúvidas de legislação na hora, direto pelo WhatsApp. Isso vale ouro no campo.', stars: 5 },
    ],
    cta: 'Pronto para transformar sua gestão ambiental?',
    ctaDesc: 'Junte-se a centenas de consultores e produtores que já usam o PRUMO Hub.',
  },
  {
    id: 'industrial',
    label: '🏭 Setor Industrial',
    hero: {
      badge: 'Conformidade ambiental para indústrias',
      title: 'Compliance industrial',
      highlight: 'com inteligência e agilidade',
      desc: 'Gerencie licenças operacionais, passivos ambientais, auditorias e relatórios de conformidade para operações industriais de qualquer porte.',
    },
    features: [
      { icon: FileCheck, title: 'Licenças Operacionais', desc: 'Controle LP, LI, LO, LAO e todas as licenças ambientais com alertas de vencimento e checklists de condicionantes.', color: 'from-blue-500 to-cyan-600' },
      { icon: AlertTriangle, title: 'Gestão de Passivos', desc: 'Mapeie e monitore passivos ambientais, áreas contaminadas, processos administrativos e multas da operação.', color: 'from-red-500 to-orange-600' },
      { icon: ClipboardList, title: 'Auditorias e Checklists', desc: 'Crie checklists de auditoria ambiental, cronogramas de monitoramento e acompanhe o status de cada requisito legal.', color: 'from-violet-500 to-purple-600' },
      { icon: BarChart2, title: 'Indicadores ESG', desc: 'Dashboard de desempenho ambiental, relatórios ESG, pegada de carbono e metas de sustentabilidade da empresa.', color: 'from-emerald-500 to-teal-600' },
      { icon: Recycle, title: 'Compensações Ambientais', desc: 'Gestão de créditos de carbono, cotas de reserva ambiental e compensações exigidas pelo órgão licenciador.', color: 'from-green-500 to-lime-600' },
      { icon: FileText, title: 'Relatórios Técnicos', desc: 'Gere laudos, relatórios de conformidade, RAA e documentos técnicos com assinatura digital integrada.', color: 'from-amber-500 to-yellow-600' },
      { icon: Users, title: 'Gestão de Consultores', desc: 'Conecte sua empresa aos consultores ambientais responsáveis e acompanhe projetos em tempo real.', color: 'from-slate-500 to-gray-600' },
      { icon: MessageCircle, title: 'IA Rute Industrial', desc: 'Assistente especializada em legislação ambiental industrial, CONAMA, normas ABNT e licenciamento.', color: 'from-pink-500 to-rose-600' },
    ],
    stats: [
      { value: '100+', label: 'Empresas industriais' },
      { value: '500+', label: 'Licenças controladas' },
      { value: '40%', label: 'Redução em não-conformidades' },
      { value: '24h', label: 'IA disponível' },
    ],
    testimonials: [
      { name: 'Marcos Barbosa', role: 'Gerente Ambiental, SP', text: 'Centralizamos todas as licenças de nossas 4 plantas industriais no PRUMO Hub. O controle de vencimentos sozinho já justificou o investimento.', stars: 5 },
      { name: 'Juliana Torres', role: 'Consultora Ambiental Industrial, PR', text: 'Minha equipe usa o PRUMO para gerenciar o compliance de 15 empresas simultaneamente. A produtividade triplicou.', stars: 5 },
      { name: 'Fernando Alves', role: 'Diretor de Sustentabilidade, MG', text: 'O dashboard ESG nos ajudou a estruturar o relatório de sustentabilidade para investidores com muito mais facilidade.', stars: 5 },
    ],
    cta: 'Garanta a conformidade ambiental da sua operação',
    ctaDesc: 'Junte-se a empresas e consultores que gerenciam compliance industrial com inteligência.',
  },
];

// ─── PLANOS ──────────────────────────────────────────────────────────────────

const consultorPlanos = [
  {
    name: 'Starter',
    price: 'R$ 149',
    period: '/mês',
    desc: 'Ideal para consultores autônomos que estão começando.',
    color: 'border-gray-200',
    badge: null,
    items: [
      'Até 10 propriedades de clientes',
      'CRM com pipeline básico',
      'Gerador de contratos e orçamentos',
      'Agenda integrada',
      'IA Rute (50 consultas/mês)',
      'Suporte por e-mail',
    ],
  },
  {
    name: 'Profissional',
    price: 'R$ 349',
    period: '/mês',
    desc: 'Para consultores em crescimento com carteira ativa de clientes.',
    color: 'border-amber-400',
    badge: 'Mais popular',
    badgeColor: 'bg-amber-500',
    items: [
      'Propriedades ilimitadas',
      'CRM completo com automações',
      'Emissão de NF-e automatizada',
      'Controle financeiro e Stripe',
      'IA Rute ilimitada + WhatsApp',
      'Assinatura digital (Clicksign)',
      'Gestão de equipe (até 3 membros)',
      'Suporte prioritário',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    desc: 'Para escritórios e empresas de consultoria ambiental de grande porte.',
    color: 'border-emerald-400',
    badge: 'Personalizado',
    badgeColor: 'bg-emerald-600',
    items: [
      'Tudo do Profissional',
      'Equipe ilimitada',
      'Multi-empresas / CNPJ',
      'API e integrações customizadas',
      'Relatórios personalizados',
      'Treinamento e onboarding',
      'Gerente de conta dedicado',
      'SLA garantido',
    ],
  },
];

const produtorPlanos = [
  {
    name: 'Básico',
    price: 'R$ 99',
    period: '/mês',
    desc: 'Para pequenos produtores que querem organizar sua propriedade.',
    color: 'border-gray-200',
    badge: null,
    items: [
      '1 propriedade',
      'Central da propriedade',
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
    desc: 'Para produtores que buscam monitoramento completo e ativos ambientais.',
    color: 'border-emerald-400',
    badge: 'Recomendado',
    badgeColor: 'bg-emerald-600',
    items: [
      'Até 3 propriedades',
      'Monitoramento NDVI por satélite',
      'Alertas MapBiomas em tempo real',
      'Ativos ambientais (carbono, CRA)',
      'Crédito rural e safra',
      'Análise climática',
      'IA Rute ilimitada + WhatsApp',
      'Relatórios de regularidade',
    ],
  },
  {
    name: 'Agro Enterprise',
    price: 'Sob consulta',
    period: '',
    desc: 'Para grandes produtores, cooperativas e grupos rurais.',
    color: 'border-amber-400',
    badge: 'Personalizado',
    badgeColor: 'bg-amber-500',
    items: [
      'Propriedades ilimitadas',
      'Multi-propriedades consolidadas',
      'Usuários e equipe ilimitados',
      'Integrações customizadas',
      'Georreferenciamento avançado',
      'Suporte técnico especializado',
      'Onboarding assistido',
      'SLA garantido',
    ],
  },
];

// ─── FORMULÁRIO ──────────────────────────────────────────────────────────────

const consultorFormFields = [
  { id: 'nome', label: 'Nome completo', type: 'text', placeholder: 'Seu nome', icon: User },
  { id: 'email', label: 'E-mail profissional', type: 'email', placeholder: 'consultor@email.com', icon: Mail },
  { id: 'telefone', label: 'WhatsApp / Telefone', type: 'tel', placeholder: '(00) 9 0000-0000', icon: Phone },
];

const produtorFormFields = [
  { id: 'nome', label: 'Nome completo', type: 'text', placeholder: 'Seu nome', icon: User },
  { id: 'email', label: 'E-mail', type: 'email', placeholder: 'produtor@email.com', icon: Mail },
  { id: 'telefone', label: 'WhatsApp / Telefone', type: 'tel', placeholder: '(00) 9 0000-0000', icon: Phone },
];

function LeadForm({ type }) {
  const isConsultor = type === 'consultor';
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', especialidade: '', estado: '', tamanho: '', culturas: '' });
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
      {/* Campos comuns */}
      {(isConsultor ? consultorFormFields : produtorFormFields).map((f) => {
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
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              />
            </div>
          </div>
        );
      })}

      {/* Campo específico: Consultor */}
      {isConsultor && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Área de atuação</label>
            <select
              required
              value={form.especialidade}
              onChange={e => setForm(p => ({ ...p, especialidade: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              <option value="">Selecione...</option>
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
            <select
              value={form.tamanho}
              onChange={e => setForm(p => ({ ...p, tamanho: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
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
            <input
              type="text"
              maxLength={2}
              placeholder="Ex: MT, SP, GO..."
              value={form.estado}
              onChange={e => setForm(p => ({ ...p, estado: e.target.value.toUpperCase() }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </>
      )}

      {/* Campo específico: Produtor */}
      {!isConsultor && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tamanho da propriedade</label>
            <select
              required
              value={form.tamanho}
              onChange={e => setForm(p => ({ ...p, tamanho: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
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
            <select
              value={form.culturas}
              onChange={e => setForm(p => ({ ...p, culturas: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              <option value="">Selecione...</option>
              <option>Soja</option>
              <option>Milho</option>
              <option>Pecuária</option>
              <option>Cana-de-açúcar</option>
              <option>Café</option>
              <option>Algodão</option>
              <option>Horticultura / Fruticultura</option>
              <option>Misto</option>
              <option>Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
            <input
              type="text"
              maxLength={2}
              placeholder="Ex: MT, GO, MS..."
              value={form.estado}
              onChange={e => setForm(p => ({ ...p, estado: e.target.value.toUpperCase() }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 mt-2"
      >
        {sending ? 'Enviando...' : <>Quero conhecer o PRUMO Hub <Send className="w-4 h-4" /></>}
      </button>
      <p className="text-xs text-gray-400 text-center">Seus dados estão seguros. Sem spam.</p>
    </form>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSector, setActiveSector] = useState('agro');
  const [formType, setFormType] = useState('consultor');

  const sector = sectors.find((s) => s.id === activeSector);

  const handleLogin = () => {
    base44.auth.redirectToLogin('/');
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
            alt="PRUMO Hub"
            className="h-10 w-auto object-contain"
          />
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#funcionalidades" className="hover:text-emerald-700 transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-emerald-700 transition-colors">Planos</a>
            <a href="#depoimentos" className="hover:text-emerald-700 transition-colors">Depoimentos</a>
            <a href="#contato" className="hover:text-emerald-700 transition-colors">Contato</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={handleLogin} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors px-4 py-2">
              Entrar
            </button>
            <button onClick={handleLogin} className="text-sm font-semibold bg-emerald-700 text-white px-5 py-2 rounded-xl hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-200">
              Começar grátis
            </button>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6 text-emerald-900" /> : <Menu className="w-6 h-6 text-emerald-900" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-emerald-100 px-4 py-4 space-y-3">
            <a href="#funcionalidades" className="block text-sm font-medium text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Funcionalidades</a>
            <a href="#planos" className="block text-sm font-medium text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Planos</a>
            <a href="#depoimentos" className="block text-sm font-medium text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Depoimentos</a>
            <a href="#contato" className="block text-sm font-medium text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Contato</a>
            <button onClick={handleLogin} className="w-full text-sm font-semibold bg-emerald-700 text-white px-5 py-3 rounded-xl hover:bg-emerald-800 transition-colors">
              Entrar / Começar grátis
            </button>
          </div>
        )}
      </nav>

      {/* SECTOR SELECTOR */}
      <div className="pt-16">
        <div className="bg-gradient-to-r from-emerald-950 to-teal-900 py-4 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <span className="text-emerald-300 text-sm font-medium hidden sm:block">Selecione seu setor:</span>
            <div className="flex bg-white/10 rounded-xl p-1 gap-1">
              {sectors.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSector(s.id)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeSector === s.id
                      ? 'bg-amber-500 text-white shadow-lg'
                      : 'text-emerald-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section className="pb-20 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-96 h-96 bg-amber-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-16">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            {sector.hero.badge}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            {sector.hero.title}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
              {sector.hero.highlight}
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-emerald-200 max-w-3xl mx-auto mb-10 leading-relaxed">
            {sector.hero.desc}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleLogin}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/30 transition-all hover:scale-105"
            >
              Começar gratuitamente
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#planos"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-base px-8 py-4 rounded-2xl border border-white/20 transition-all"
            >
              Ver planos e preços
            </a>
          </div>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {sector.stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-extrabold text-amber-300">{s.value}</div>
                <div className="text-xs text-emerald-300 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
              <Zap className="w-3.5 h-3.5" />
              Tudo em um lugar
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Funcionalidades para {activeSector === 'agro' ? 'quem trabalha com o campo' : 'o setor industrial'}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sector.features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="group p-6 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all duration-300 bg-white">
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

      {/* PLANOS E ASSINATURAS */}
      <section id="planos" className="py-20 bg-gradient-to-b from-stone-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
              <Crown className="w-3.5 h-3.5" />
              Planos e Assinaturas
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Escolha o plano ideal para você
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto mb-8">
              Planos pensados para cada perfil — do consultor autônomo ao grande produtor rural.
            </p>
            {/* Toggle perfil de planos */}
            <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setFormType('consultor')}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${formType === 'consultor' ? 'bg-amber-500 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
              >
                🧑‍💼 Planos Consultor
              </button>
              <button
                onClick={() => setFormType('produtor')}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${formType === 'produtor' ? 'bg-emerald-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
              >
                🌾 Planos Produtor Rural
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-4">
            {(formType === 'consultor' ? consultorPlanos : produtorPlanos).map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border-2 ${plan.color} bg-white p-8 flex flex-col shadow-sm hover:shadow-lg transition-shadow`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${plan.badgeColor} text-white text-xs font-bold px-4 py-1 rounded-full`}>
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
                <button
                  onClick={handleLogin}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                    plan.badge === 'Mais popular' || plan.badge === 'Recomendado'
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {plan.price === 'Sob consulta' ? 'Falar com equipe →' : 'Começar agora →'}
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            * Todos os planos incluem acesso mobile, suporte e atualizações. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* IA RUTE */}
      <section className="py-20 bg-gradient-to-br from-emerald-950 to-teal-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-pink-500/20 border border-pink-400/30 text-pink-300 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-6">
            <MessageCircle className="w-3.5 h-3.5" />
            Inteligência artificial
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
            Conheça a Rute, sua IA especialista<br />
            {activeSector === 'agro' ? 'em meio ambiente e agronegócio' : 'em compliance e legislação industrial'}
          </h2>
          <p className="text-emerald-200 text-lg max-w-2xl mx-auto mb-8">
            {activeSector === 'agro'
              ? 'Dúvidas de legislação ambiental, CAR, PRAD, crédito de carbono e mais — integrada ao seu WhatsApp.'
              : 'Licenciamento industrial, normas CONAMA, ABNT, passivos ambientais e ESG corporativo — disponível 24h.'}
          </p>
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
            {(activeSector === 'agro'
              ? ['Legislação ambiental', 'CAR e PRAD', 'Crédito de carbono', 'Licenciamento', 'Georreferenciamento', 'Agronegócio e ESG']
              : ['Licenças LP, LI, LO', 'Normas CONAMA', 'Passivos ambientais', 'ESG corporativo', 'Auditorias internas', 'Compensações ambientais']
            ).map((tag) => (
              <div key={tag} className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-medium text-white">
                {tag}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-3">
            <Smartphone className="w-5 h-5 text-emerald-300" />
            <span className="text-emerald-200 text-sm">Disponível via WhatsApp 24 horas por dia</span>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section id="depoimentos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
              <Star className="w-3.5 h-3.5" />
              Depoimentos
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Quem usa, recomenda</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {sector.testimonials.map((t) => (
              <div key={t.name} className="p-6 rounded-2xl bg-stone-50 border border-stone-100">
                <div className="flex gap-1 mb-4">
                  {Array(t.stars).fill(0).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FORMULÁRIO DE INTERESSE */}
      <section id="contato" className="py-20 bg-gradient-to-br from-stone-50 to-emerald-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Quero conhecer o PRUMO Hub
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Fale com nossa equipe
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Preencha o formulário e um especialista entrará em contato para apresentar a plataforma e tirar suas dúvidas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Card Consultor */}
            <div
              className={`rounded-2xl border-2 transition-all cursor-pointer ${
                formType === 'consultor'
                  ? 'border-amber-400 shadow-xl shadow-amber-100'
                  : 'border-gray-200 hover:border-amber-200 opacity-80'
              } bg-white overflow-hidden`}
              onClick={() => setFormType('consultor')}
            >
              <div className={`px-6 py-4 flex items-center gap-3 ${formType === 'consultor' ? 'bg-amber-50 border-b border-amber-100' : 'bg-gray-50 border-b border-gray-100'}`}>
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Sou Consultor Ambiental</h3>
                  <p className="text-xs text-gray-500">Engenheiro, agrônomo, advogado ou técnico ambiental</p>
                </div>
                {formType === 'consultor' && <CheckCircle2 className="w-5 h-5 text-amber-500 ml-auto" />}
              </div>
              {formType === 'consultor' && (
                <div className="px-6 py-5">
                  <LeadForm type="consultor" />
                </div>
              )}
            </div>

            {/* Card Produtor */}
            <div
              className={`rounded-2xl border-2 transition-all cursor-pointer ${
                formType === 'produtor'
                  ? 'border-emerald-400 shadow-xl shadow-emerald-100'
                  : 'border-gray-200 hover:border-emerald-200 opacity-80'
              } bg-white overflow-hidden`}
              onClick={() => setFormType('produtor')}
            >
              <div className={`px-6 py-4 flex items-center gap-3 ${formType === 'produtor' ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-gray-50 border-b border-gray-100'}`}>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Wheat className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Sou Produtor Rural</h3>
                  <p className="text-xs text-gray-500">Proprietário rural, fazendeiro, agricultor ou pecuarista</p>
                </div>
                {formType === 'produtor' && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />}
              </div>
              {formType === 'produtor' && (
                <div className="px-6 py-5">
                  <LeadForm type="produtor" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Globe, title: 'Tudo integrado', desc: 'Da propriedade ao financeiro, sem sair da plataforma.' },
              { icon: Lock, title: 'Seguro e confiável', desc: 'Dados criptografados e backup automático.' },
              { icon: Smartphone, title: 'Mobile first', desc: 'Funciona perfeitamente no celular, mesmo no campo.' },
              { icon: Award, title: 'Especializado', desc: 'Feito exclusivamente para o agronegócio e meio ambiente.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="text-center p-6">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-emerald-700" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 bg-gradient-to-br from-emerald-900 to-teal-900">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">{sector.cta}</h2>
          <p className="text-emerald-200 text-lg mb-8">{sector.ctaDesc}</p>
          <button
            onClick={handleLogin}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-xl shadow-amber-500/30 transition-all hover:scale-105"
          >
            Começar agora — é grátis
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-emerald-950 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
            alt="PRUMO Hub"
            className="h-10 w-auto object-contain"
          />
          <p className="text-emerald-500 text-sm text-center">
            © {new Date().getFullYear()} PRUMO Hub. Todos os direitos reservados.
          </p>
          <div className="flex gap-4 text-xs text-emerald-600">
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Termos</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
}