import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Briefcase, ArrowRight, Menu, X, MessageCircle, CheckCircle2 } from 'lucide-react';
import ParticleBackground from '../components/landing/ParticleBackground';

function useScrollFade(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroRef, heroVisible] = useScrollFade(0.01);
  const [cardRef, cardVisible] = useScrollFade(0.1);

  const handleLogin = () => base44.auth.redirectToLogin('/');
  const handleEnterConsultor = () => navigate('/consultor');

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <button onClick={handleEnterConsultor} className="flex-shrink-0 text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors px-2 py-1">
            Início
          </button>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#sobre" className="hover:text-amber-700 transition-colors">Sobre</a>
            <a href="#diferenciais" className="hover:text-amber-700 transition-colors">Diferenciais</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="/Parceiros" className="text-sm font-semibold text-amber-700 border border-amber-700 px-4 py-2 rounded-xl hover:bg-amber-50 transition-colors">
              Seja Parceiro
            </a>
            <button onClick={handleLogin} className="text-sm font-semibold bg-amber-600 text-white px-5 py-2 rounded-xl hover:bg-amber-700 transition-colors shadow-md">
              Área do Cliente
            </button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6 text-amber-900" /> : <Menu className="w-6 h-6 text-amber-900" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-amber-100 px-4 py-4 space-y-3">
            <a href="#sobre" className="block text-sm text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Sobre</a>
            <a href="#diferenciais" className="block text-sm text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Diferenciais</a>
            <a href="/Parceiros" className="block w-full text-center text-sm font-semibold text-amber-700 border border-amber-700 px-5 py-3 rounded-xl hover:bg-amber-50 transition-colors">
              Seja Parceiro
            </a>
            <button onClick={handleLogin} className="w-full text-sm font-semibold bg-amber-600 text-white px-5 py-3 rounded-xl">
              Área do Cliente
            </button>
          </div>
        )}
      </nav>

      {/* HERO — INTRODUÇÃO DO CONSULTOR */}
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 pt-20 lg:pt-16" style={{background: 'linear-gradient(135deg, #0a1628 0%, #0d2b1f 40%, #1a3a2a 70%, #0f1f2e 100%)'}}>
        <ParticleBackground />
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{backgroundImage: 'radial-gradient(circle at 20% 20%, #10b981 0%, transparent 50%), radial-gradient(circle at 80% 80%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 50% 50%, #0ea5e9 0%, transparent 60%)'}} />
          <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'linear-gradient(rgba(16,185,129,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
          <div className="absolute top-1/4 left-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto">
          {/* Logo + tagline */}
          <div
            ref={heroRef}
            className="text-center mb-8 sm:mb-12 transition-all duration-1000 w-full px-2"
            style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(40px)' }}
          >
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
              alt="PRUMO Hub"
              className="h-28 sm:h-48 w-auto object-contain mx-auto mb-4 drop-shadow-2xl"
            />
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-400/20 text-amber-400 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
              <span className="hidden sm:inline">Para Consultores Ambientais</span>
              <span className="sm:hidden">Consultores</span>
            </div>
            <h1 className="text-2xl sm:text-6xl font-black text-white leading-snug mb-2 sm:mb-3 px-2">
              O escritório de consultoria ambiental<br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
                do futuro, hoje.
              </span>
            </h1>
            <p className="text-xs sm:text-lg text-slate-300 max-w-2xl mx-auto px-3 mb-3 sm:mb-5">
              Centralize <strong className="text-white">CRM, contratos, financeiro, licenças, processos jurídicos e gestão de equipe</strong> em uma única plataforma inteligente. Mais clientes, menos burocracia, zero planilhas.
            </p>
          </div>

          {/* CTA Card — Consultor */}
          <div
            ref={cardRef}
            className="w-full max-w-xl mx-auto transition-all duration-1000 delay-300"
            style={{ opacity: cardVisible ? 1 : 0, transform: cardVisible ? 'translateY(0)' : 'translateY(50px)' }}
          >
            <div className="group relative text-left rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-amber-500/30 hover:border-amber-400 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/30"
              style={{background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)'}}
            >
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-orange-500" />
              <div className="p-5 sm:p-8 relative z-10">
                <div className="flex items-start justify-between mb-4 sm:mb-6">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                    <Briefcase className="w-7 sm:w-8 h-7 sm:h-8 text-amber-300" />
                  </div>
                  <div className="bg-amber-400/20 group-hover:bg-amber-400 text-amber-300 group-hover:text-emerald-900 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-400/50 transition-all duration-300 flex items-center gap-1">
                    <span>Conhecer</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
                <h2 className="text-lg sm:text-2xl font-bold text-white mb-1.5 sm:mb-3">Consultor Ambiental</h2>
                <p className="text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6 text-slate-300">
                  Gerencie sua consultoria com CRM completo, contratos, financeiro, licenças ambientais, processos jurídicos e gestão de equipe — tudo em um só lugar.
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-5">
                  {['CRM', 'Contratos', 'Financeiro', 'Equipe', 'Licenças', 'IA Rute'].map(tag => (
                    <span key={tag} className="text-[10px] sm:text-xs bg-amber-500/15 border border-amber-400/30 text-amber-200 px-2 py-0.5 sm:py-1 rounded-full">{tag}</span>
                  ))}
                </div>
                <button
                  onClick={handleEnterConsultor}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-3 sm:py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  Entrar na página do Consultor
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 sm:mt-8">
              {['Sem fidelidade', 'Suporte dedicado', 'IA Rute 24h'].map(item => (
                <div key={item} className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400">
                  <CheckCircle2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/5555999480467"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-full shadow-xl transition-all hover:scale-105"
      >
        <MessageCircle className="w-5 sm:w-6 h-5 sm:h-6" />
        <span className="hidden sm:inline text-sm font-semibold">WhatsApp</span>
      </a>
    </div>
  );
}