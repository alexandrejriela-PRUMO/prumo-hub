import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Leaf, MapPin, FileCheck, BarChart3, Users, Shield,
  ChevronRight, CheckCircle2, Star, Menu, X, Smartphone,
  Building2, TrendingUp, ScrollText, Briefcase, MessageCircle,
  Map, Cloud, Droplets, Sprout, Wheat, ArrowRight, Globe,
  Lock, Zap, Award
} from 'lucide-react';

const features = [
  {
    icon: Building2,
    title: 'Central da Propriedade',
    desc: 'Gerencie documentos, licenças, processos ambientais e alertas de infrações de todas as suas propriedades em um só lugar.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Leaf,
    title: 'Ativos Ambientais',
    desc: 'Créditos de carbono, PSA, CRA, servidão ambiental e ESG para o agro — monetize e valorize suas áreas verdes.',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: MapPin,
    title: 'Mapa Interativo',
    desc: 'Visualize sua propriedade com camadas KML, análise NDVI, georreferenciamento e alertas do MapBiomas em tempo real.',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: FileCheck,
    title: 'Licenças e Projetos',
    desc: 'Controle todos os licenciamentos ambientais, ARTs, laudos técnicos e checklists de projeto com prazos e alertas automáticos.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: BarChart3,
    title: 'Controle Financeiro',
    desc: 'Painel financeiro completo, gestão de cobranças, emissão de NF-e e integração com Stripe para consultores.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: MessageCircle,
    title: 'IA Rute',
    desc: 'Assistente inteligente especializada em meio ambiente, agronegócio e legislação rural. Disponível 24h via WhatsApp.',
    color: 'from-pink-500 to-rose-600',
  },
  {
    icon: Briefcase,
    title: 'Escritório do Consultor',
    desc: 'CRM, agenda, contratos, orçamentos, NF-e e gestão de equipe — tudo que o consultor ambiental precisa para operar.',
    color: 'from-slate-500 to-gray-600',
  },
  {
    icon: Sprout,
    title: 'Crédito e Safra',
    desc: 'Gestão de crédito rural e frustração de safra integrados ao perfil da propriedade e histórico do produtor.',
    color: 'from-lime-500 to-green-600',
  },
];

const profiles = [
  {
    title: 'Consultor Ambiental',
    icon: Briefcase,
    color: 'border-amber-400 bg-amber-50',
    iconColor: 'text-amber-600 bg-amber-100',
    items: [
      'Escritório digital completo',
      'CRM e pipeline de clientes',
      'Gerador de contratos e orçamentos',
      'Emissão de NF-e automatizada',
      'Gestão de equipe',
      'IA Rute para suporte técnico',
    ],
  },
  {
    title: 'Produtor Rural',
    icon: Wheat,
    color: 'border-emerald-400 bg-emerald-50',
    iconColor: 'text-emerald-600 bg-emerald-100',
    items: [
      'Central da propriedade',
      'Gestão do CAR e licenças',
      'Monitoramento por satélite',
      'Ativos e créditos ambientais',
      'Análise climática e NDVI',
      'Termômetro de regularidade',
    ],
  },
  {
    title: 'Cliente Enterprise',
    icon: Building2,
    color: 'border-blue-400 bg-blue-50',
    iconColor: 'text-blue-600 bg-blue-100',
    items: [
      'Portal exclusivo da propriedade',
      'Acesso a documentos e laudos',
      'Acompanhamento de processos',
      'Comunicação direta com consultor',
      'Relatórios consolidados',
      'Acesso mobile',
    ],
  },
];

const stats = [
  { value: '5.000+', label: 'Propriedades monitoradas' },
  { value: '300+', label: 'Consultores ativos' },
  { value: '99,9%', label: 'Uptime garantido' },
  { value: '24h', label: 'IA Rute disponível' },
];

const testimonials = [
  {
    name: 'Carlos Mendonça',
    role: 'Engenheiro Ambiental, MS',
    text: 'O PRUMO Hub transformou meu escritório. Reduzi 60% do tempo em burocracia e hoje consigo atender o dobro de clientes com muito mais qualidade.',
    stars: 5,
  },
  {
    name: 'Ana Paula Ferreira',
    role: 'Produtora Rural, MT',
    text: 'Finalmente consigo acompanhar tudo da minha fazenda num só lugar. O mapa com alertas do MapBiomas é sensacional.',
    stars: 5,
  },
  {
    name: 'Ricardo Sousa',
    role: 'Consultor Agronômico, GO',
    text: 'A IA Rute me ajuda a tirar dúvidas de legislação na hora, direto pelo WhatsApp. Isso vale ouro no campo.',
    stars: 5,
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#funcionalidades" className="hover:text-emerald-700 transition-colors">Funcionalidades</a>
            <a href="#perfis" className="hover:text-emerald-700 transition-colors">Para quem é</a>
            <a href="#depoimentos" className="hover:text-emerald-700 transition-colors">Depoimentos</a>
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
            <a href="#perfis" className="block text-sm font-medium text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Para quem é</a>
            <a href="#depoimentos" className="block text-sm font-medium text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Depoimentos</a>
            <button onClick={handleLogin} className="w-full text-sm font-semibold bg-emerald-700 text-white px-5 py-3 rounded-xl hover:bg-emerald-800 transition-colors">
              Entrar / Começar grátis
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-96 h-96 bg-amber-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            Plataforma completa para o agronegócio sustentável
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            O hub de gestão ambiental<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
              para consultores e produtores
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-emerald-200 max-w-3xl mx-auto mb-10 leading-relaxed">
            Do CAR ao crédito de carbono, da licença ambiental ao financeiro do escritório — tudo integrado numa plataforma moderna, inteligente e feita para o campo.
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
              href="#funcionalidades"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-base px-8 py-4 rounded-2xl border border-white/20 transition-all"
            >
              Ver funcionalidades
            </a>
          </div>
          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {stats.map((s) => (
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
              Funcionalidades completas para quem<br />trabalha com o campo
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Mais de 30 módulos integrados para cobrir todo o ciclo de gestão ambiental, financeira e técnica da propriedade rural.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => {
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

      {/* PERFIS */}
      <section id="perfis" className="py-20 bg-gradient-to-b from-stone-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full mb-4">
              <Users className="w-3.5 h-3.5" />
              Para cada perfil
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Uma plataforma, múltiplos perfis
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              O PRUMO Hub se adapta ao seu perfil — consultor, produtor ou cliente empresarial — entregando as ferramentas certas para cada necessidade.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {profiles.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className={`rounded-2xl border-2 ${p.color} p-8 flex flex-col`}>
                  <div className={`w-14 h-14 rounded-2xl ${p.iconColor} flex items-center justify-center mb-5`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-5">{p.title}</h3>
                  <ul className="space-y-3 flex-1">
                    {p.items.map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleLogin}
                    className="mt-8 w-full py-3 rounded-xl font-semibold text-sm bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                  >
                    Começar agora →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* IA RUTE DESTAQUE */}
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
            Conheça a Rute, sua IA especialista<br />em meio ambiente e agronegócio
          </h2>
          <p className="text-emerald-200 text-lg max-w-2xl mx-auto mb-8">
            A Rute é uma assistente de IA treinada para responder dúvidas de legislação ambiental, CAR, PRAD, crédito de carbono e muito mais — integrada ao seu whatsApp.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
            {['Legislação ambiental', 'CAR e PRAD', 'Crédito de carbono', 'Licenciamento', 'Georreferenciamento', 'Agronegócio e ESG'].map((tag) => (
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
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Quem usa, recomenda
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
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

      {/* DIFERENCIAIS */}
      <section className="py-20 bg-stone-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Por que o PRUMO Hub?</h2>
            <p className="text-gray-500">Construído por quem entende o campo e a consultoria ambiental.</p>
          </div>
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
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
            Pronto para transformar<br />sua gestão ambiental?
          </h2>
          <p className="text-emerald-200 text-lg mb-8">
            Junte-se a centenas de consultores e produtores que já usam o PRUMO Hub para trabalhar com mais eficiência, segurança e inteligência.
          </p>
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