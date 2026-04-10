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
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 px-4 pt-16">
          {/* Blur decorativo */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
          </div>

          <div className="relative text-center max-w-3xl mx-auto mb-12">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
              alt="PRUMO Hub"
              className="h-16 w-auto object-contain mx-auto mb-8"
            />
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
              Sua propriedade organizada.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
                Sem riscos, sem surpresas.
              </span>
            </h1>
            <p className="text-emerald-200 text-lg max-w-2xl mx-auto">
              O PRUMO Hub é uma plataforma SaaS desenvolvida para produtores rurais, empresas e consultorias que precisam organizar, monitorar e reduzir riscos ambientais de forma simples, segura e contínua.
            </p>
          </div>

          <div className="relative w-full max-w-2xl mx-auto">
            <p className="text-center text-emerald-300 text-sm font-medium uppercase tracking-widest mb-6">
              Selecione seu perfil para continuar
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              {/* Produtor */}
              <button
                onClick={() => setPerfil('produtor')}
                className="group relative bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-emerald-400 rounded-2xl p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-900/50"
              >
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-emerald-500/30 transition-colors">
                  <Wheat className="w-8 h-8 text-emerald-300" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Sou Produtor Rural</h2>
                <p className="text-emerald-300 text-sm leading-relaxed mb-4">
                  Proprietário rural, fazendeiro, agricultor ou pecuarista que quer organizar, monitorar e proteger sua propriedade.
                </p>
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  Ver soluções para produtores <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Consultor */}
              <button
                onClick={() => setPerfil('consultor')}
                className="group relative bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-amber-400 rounded-2xl p-8 text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-900/30"
              >
                <div className="w-16 h-16 bg-amber-500/20 border border-amber-400/30 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-amber-500/30 transition-colors">
                  <Briefcase className="w-8 h-8 text-amber-300" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Sou Consultor Ambiental</h2>
                <p className="text-amber-200/70 text-sm leading-relaxed mb-4">
                  Engenheiro ambiental, agrônomo, advogado ou técnico que presta consultoria para produtores e empresas.
                </p>
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                  Ver soluções para consultores <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>

            <p className="text-center text-emerald-500 text-xs mt-8">
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