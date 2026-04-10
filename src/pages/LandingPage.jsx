import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Wheat, Briefcase, ArrowRight, Menu, X, ChevronRight } from 'lucide-react';
import LandingProdutor from '../components/landing/LandingProdutor';
import LandingConsultor from '../components/landing/LandingConsultor';

export default function LandingPage() {
  const [perfil, setPerfil] = useState(null); // null | 'produtor' | 'consultor'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogin = () => base44.auth.redirectToLogin('/');

  const navLinks = perfil ? (
    <>
      <a href="#diferenciais" className="hover:text-emerald-700 transition-colors">Diferenciais</a>
      <a href="#planos" className="hover:text-emerald-700 transition-colors">Planos</a>
      <a href="#contato" className="hover:text-emerald-700 transition-colors">Contato</a>
    </>
  ) : null;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <button onClick={() => setPerfil(null)} className="flex-shrink-0">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
              alt="PRUMO Hub"
              className="h-10 w-auto object-contain"
            />
          </button>

          {/* Perfil switcher na nav */}
          {perfil && (
            <div className="hidden md:flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setPerfil('produtor')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${perfil === 'produtor' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}
              >
                🌾 Produtor Rural
              </button>
              <button
                onClick={() => setPerfil('consultor')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${perfil === 'consultor' ? 'bg-amber-500 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}
              >
                🧑‍💼 Consultor
              </button>
            </div>
          )}

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            {navLinks}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={handleLogin} className="text-sm font-semibold bg-emerald-700 text-white px-5 py-2 rounded-xl hover:bg-emerald-800 transition-colors shadow-md">
              Área do Cliente
            </button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6 text-emerald-900" /> : <Menu className="w-6 h-6 text-emerald-900" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-emerald-100 px-4 py-4 space-y-3">
            {perfil && (
              <div className="flex gap-2 mb-3">
                <button onClick={() => { setPerfil('produtor'); setMobileMenuOpen(false); }} className={`flex-1 py-2 rounded-xl text-sm font-semibold ${perfil === 'produtor' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>🌾 Produtor</button>
                <button onClick={() => { setPerfil('consultor'); setMobileMenuOpen(false); }} className={`flex-1 py-2 rounded-xl text-sm font-semibold ${perfil === 'consultor' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>🧑‍💼 Consultor</button>
              </div>
            )}
            {perfil && <>
              <a href="#diferenciais" className="block text-sm text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Diferenciais</a>
              <a href="#planos" className="block text-sm text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Planos</a>
              <a href="#contato" className="block text-sm text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Contato</a>
            </>}
            <button onClick={handleLogin} className="w-full text-sm font-semibold bg-emerald-700 text-white px-5 py-3 rounded-xl">
              Área do Cliente
            </button>
          </div>
        )}
      </nav>

      {/* ESCOLHA DE PERFIL */}
      {!perfil && (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 pt-16" style={{background: 'linear-gradient(135deg, #0a1628 0%, #0d2b1f 40%, #1a3a2a 70%, #0f1f2e 100%)'}}>
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{backgroundImage: 'radial-gradient(circle at 20% 20%, #10b981 0%, transparent 50%), radial-gradient(circle at 80% 80%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 50% 50%, #0ea5e9 0%, transparent 60%)'}} />
            {/* Grid lines */}
            <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'linear-gradient(rgba(16,185,129,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
            {/* Floating orbs */}
            <div className="absolute top-1/4 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-5xl mx-auto">
            {/* Logo + tagline */}
            <div className="text-center mb-14">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
                alt="PRUMO Hub"
                className="h-16 w-auto object-contain mx-auto mb-6 drop-shadow-2xl"
              />
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest px-5 py-2 rounded-full mb-5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Plataforma Agroambiental Inteligente
              </div>
              <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight mb-4">
                Gestão ambiental que
                <br />
                <span className="text-transparent bg-clip-text" style={{backgroundImage: 'linear-gradient(90deg, #34d399, #fbbf24, #34d399)', backgroundSize: '200%'}}>
                  protege quem produz.
                </span>
              </h1>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                Escolha seu perfil e descubra como o PRUMO Hub transforma a gestão da sua propriedade ou consultoria.
              </p>
            </div>

            {/* Profile cards */}
            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Produtor */}
              <button
                onClick={() => setPerfil('produtor')}
                className="group relative text-left rounded-3xl overflow-hidden border border-white/10 hover:border-emerald-400/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-900/60"
                style={{background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.03) 100%)'}}
              >
                {/* Top accent bar */}
                <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500 group-hover:h-1.5 transition-all duration-300" />
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="text-5xl">🌾</div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30">
                      Entrar →
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-3">Produtor Rural</h2>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    Proprietário, fazendeiro, agricultor ou pecuarista que quer organizar, monitorar e proteger sua propriedade.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['CAR & PRAD', 'Alertas MapBiomas', 'Licenças', 'IA Rute'].map(tag => (
                      <span key={tag} className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              </button>

              {/* Consultor */}
              <button
                onClick={() => setPerfil('consultor')}
                className="group relative text-left rounded-3xl overflow-hidden border border-white/10 hover:border-amber-400/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-900/40"
                style={{background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 100%)'}}
              >
                {/* Top accent bar */}
                <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-500 group-hover:h-1.5 transition-all duration-300" />
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="text-5xl">🧑‍💼</div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-400/30">
                      Entrar →
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-3">Consultor Ambiental</h2>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    Engenheiro, agrônomo, advogado ou técnico que presta consultoria ambiental para produtores e empresas.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['CRM Prumo', 'Contratos', 'Financeiro', 'Equipe'].map(tag => (
                      <span key={tag} className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              </button>
            </div>

            {/* Bottom hint */}
            <p className="text-center text-slate-600 text-xs mt-8">
              Você pode trocar de perfil a qualquer momento pelo menu superior.
            </p>
          </div>
        </div>
      )}

      {/* CONTEÚDO POR PERFIL */}
      {perfil === 'produtor' && <LandingProdutor onLogin={handleLogin} />}
      {perfil === 'consultor' && <LandingConsultor onLogin={handleLogin} />}
    </div>
  );
}