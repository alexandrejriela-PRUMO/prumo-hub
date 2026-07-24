import { useState } from 'react';
import { Menu, X, MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function LandingShell({ children, accent = 'emerald' }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleLogin = () => base44.auth.redirectToLogin('/');

  const accentClass = accent === 'amber'
    ? { text: 'text-amber-700', hover: 'hover:text-amber-900', bg: 'bg-amber-700', hoverBg: 'hover:bg-amber-800', border: 'border-amber-700', hoverBgLight: 'hover:bg-amber-50' }
    : { text: 'text-emerald-700', hover: 'hover:text-emerald-900', bg: 'bg-emerald-700', hoverBg: 'hover:bg-emerald-800', border: 'border-emerald-700', hoverBgLight: 'hover:bg-emerald-50' };

  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between" style={{minHeight: '4rem'}}>
          <a href="/landing" className={`flex-shrink-0 text-sm font-bold ${accentClass.text} hover:text-gray-900 transition-colors px-2 py-1`}>
            Início
          </a>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#diferenciais" className="hover:text-gray-900 transition-colors">Diferenciais</a>
            <a href="#planos" className="hover:text-gray-900 transition-colors">Planos</a>
            <a href="#contato" className="hover:text-gray-900 transition-colors">Contato</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="/Parceiros" className={`text-sm font-semibold ${accentClass.text} ${accentClass.border} px-4 py-2 rounded-xl ${accentClass.hoverBgLight} transition-colors`}>
              Seja Parceiro
            </a>
            <button onClick={handleLogin} className={`text-sm font-semibold ${accentClass.bg} text-white px-5 py-2 rounded-xl ${accentClass.hoverBg} transition-colors shadow-md`}>
              Área do Cliente
            </button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6 text-gray-900" /> : <Menu className="w-6 h-6 text-gray-900" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <a href="#diferenciais" className="block text-sm text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Diferenciais</a>
            <a href="#planos" className="block text-sm text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Planos</a>
            <a href="#contato" className="block text-sm text-gray-600 py-2" onClick={() => setMobileMenuOpen(false)}>Contato</a>
            <a href="/Parceiros" className="block w-full text-center text-sm font-semibold text-gray-700 border border-gray-300 px-5 py-3 rounded-xl hover:bg-gray-50 transition-colors">
              Seja Parceiro
            </a>
            <button onClick={handleLogin} className={`w-full text-sm font-semibold ${accentClass.bg} text-white px-5 py-3 rounded-xl`}>
              Área do Cliente
            </button>
          </div>
        )}
      </nav>

      {children}

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