import React from 'react';
import { base44 } from '@/api/base44Client';
import { KeyRound, LogIn, HelpCircle, ArrowLeft } from 'lucide-react';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
            alt="PRUMO Hub"
            className="h-16 w-auto object-contain mx-auto mb-4"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Acesso não encontrado</h1>
                <p className="text-amber-100 text-xs">Verifique seus dados de acesso</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-5">
            <p className="text-gray-700 text-sm leading-relaxed">
              Sua conta ainda não foi ativada ou o e-mail utilizado não está cadastrado na plataforma PRUMO Hub.
            </p>

            {/* Dica de senha temporária */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                <KeyRound className="w-4 h-4 flex-shrink-0" />
                Senha temporária
              </div>
              <p className="text-sm text-amber-700 leading-relaxed">
                Se você acabou de assinar um plano, sua <strong>senha inicial é o seu CPF ou CNPJ</strong>, apenas os números, sem pontos ou traços.
              </p>
              <div className="bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-600 font-mono">
                Ex: CPF <span className="text-gray-400">123.456.789-00</span> → senha: <strong className="text-amber-800">12345678900</strong>
              </div>
              <p className="text-xs text-amber-600">
                Ao acessar pela primeira vez, você será solicitado a criar uma nova senha segura.
              </p>
            </div>

            {/* Possíveis causas */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                Possíveis motivos
              </p>
              <ul className="text-xs text-gray-500 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">•</span>
                  Você está tentando acessar com um e-mail diferente do cadastrado na compra
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">•</span>
                  Seu convite ainda está sendo processado (aguarde alguns minutos e tente novamente)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">•</span>
                  Sua assinatura pode estar pendente de confirmação
                </li>
              </ul>
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Tentar com outro e-mail
              </button>
              <a
                href="/landing"
                className="flex items-center justify-center gap-2 w-full py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para a página inicial
              </a>
            </div>

            {/* Suporte */}
            <div className="text-center pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Precisa de ajuda?{' '}
                <a
                  href="https://wa.me/5555999480489"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 font-semibold hover:underline"
                >
                  Fale conosco no WhatsApp
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;