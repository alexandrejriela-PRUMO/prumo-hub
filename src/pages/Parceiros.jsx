import ParceiroPrumoSection from '../components/landing/ParceiroPrumoSection';
import { base44 } from '@/api/base44Client';
import { MessageCircle } from 'lucide-react';

export default function Parceiros() {
  return (
    <div className="min-h-screen bg-emerald-950">
      {/* NAV simples */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-emerald-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <a href="/landing">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
              alt="PRUMO Hub"
              className="h-10 w-auto object-contain"
            />
          </a>
          <div className="flex items-center gap-3">
            <a href="/landing" className="text-sm font-medium text-gray-600 hover:text-emerald-700 transition-colors">
              ← Voltar
            </a>
            <button
              onClick={() => base44.auth.redirectToLogin('/')}
              className="text-sm font-semibold bg-emerald-700 text-white px-5 py-2 rounded-xl hover:bg-emerald-800 transition-colors shadow-md"
            >
              Área do Cliente
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        <ParceiroPrumoSection />
      </div>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/5555999480489"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-full shadow-xl transition-all hover:scale-105"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="text-sm font-semibold">WhatsApp</span>
      </a>
    </div>
  );
}