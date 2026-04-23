import { useEffect, useState } from 'react';
import { Lock, AlertTriangle, CreditCard, MessageCircle, LogOut, Clock, XCircle, AlertOctagon } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STATUS_INFO = {
  pending_payment: {
    label: 'Pagamento pendente',
    icon: CreditCard,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    message: 'Seu cadastro foi recebido! Para liberar o acesso completo à plataforma, finalize a contratação do seu plano.',
  },
  suspended: {
    label: 'Pagamento pendente',
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    message: 'Identificamos uma pendência no seu pagamento. Regularize para continuar acessando a plataforma.',
  },
  cancelled: {
    label: 'Assinatura cancelada',
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    message: 'Sua assinatura foi cancelada. Renove seu plano para voltar a usar o PRUMO Hub.',
  },
  payment_failed: {
    label: 'Falha no pagamento',
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    message: 'Houve uma falha ao processar seu pagamento. Verifique seus dados e tente novamente.',
  },
  chargeback: {
    label: 'Contestação de pagamento',
    icon: AlertOctagon,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    message: 'Identificamos uma contestação na sua transação. Entre em contato com o suporte para regularizar.',
  },
  inactive: {
    label: 'Conta inativa',
    icon: Lock,
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    message: 'Sua conta está inativa. Entre em contato com o suporte para reativar seu acesso.',
  },
};

const DEFAULT_STATUS = {
  label: 'Acesso suspenso',
  icon: Lock,
  color: 'text-red-500',
  bg: 'bg-red-50',
  border: 'border-red-200',
  message: 'Seu acesso está suspenso. Regularize sua assinatura para continuar utilizando a plataforma.',
};

const WHATSAPP_URL = 'https://wa.me/5555999480489?text=Ol%C3%A1%2C+preciso+de+ajuda+para+regularizar+minha+conta+PRUMO+Hub';
const SUPPORT_EMAIL = 'suporte@prumo.com.br';

export default function AccessBlocked() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const statusKey = user?.status || user?.subscription_status || 'suspended';
  const info = STATUS_INFO[statusKey] || DEFAULT_STATUS;
  const StatusIcon = info.icon;

  const handleLogout = () => {
    base44.auth.logout('/landing');
  };

  // Link de renovação: vai para a landing na seção de planos
  const renewalUrl = user?.user_type === 'produtor'
    ? 'https://checkout.nexano.com.br/checkout/cmo2vyei507261yldn9ynobbt?offer=GNJXUCE'
    : 'https://checkout.nexano.com.br/checkout/cmo2vmthl06bp1yms3aaa35wv';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
            alt="PRUMO Hub"
            className="h-14 w-auto object-contain"
          />
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Top red bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-orange-400 to-red-500" />

          <div className="p-8 text-center">
            {/* Status icon */}
            <div className={`w-20 h-20 ${info.bg} ${info.border} border-2 rounded-full flex items-center justify-center mx-auto mb-6`}>
              <StatusIcon className={`w-10 h-10 ${info.color}`} />
            </div>

            {/* Status badge */}
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${info.bg} ${info.color} border ${info.border} mb-4`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {info.label}
            </span>

            {/* Title */}
            <h1 className="text-2xl font-black text-gray-900 mb-3">
              Acesso temporariamente bloqueado
            </h1>

            {/* Message */}
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              {info.message}
            </p>

            {/* Reasons list */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-left">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Possíveis motivos:</p>
              <ul className="space-y-2">
                {[
                  'Pagamento pendente ou em atraso',
                  'Assinatura cancelada ou expirada',
                  'Estorno ou contestação da transação',
                  'Problema ao processar o pagamento',
                ].map((reason) => (
                  <li key={reason} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {/* Primary: Regularize or Contract */}
              <a
                href={renewalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 px-6 rounded-2xl transition-all hover:scale-[1.02] shadow-lg shadow-emerald-900/20"
              >
                <CreditCard className="w-5 h-5" />
                {statusKey === 'pending_payment' ? 'Contratar plano e liberar acesso' : 'Regularizar pagamento'}
              </a>

              {/* Secondary: WhatsApp Support */}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-2xl transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Falar com suporte
              </a>

              {/* Tertiary: Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-gray-600 font-medium py-2.5 px-6 rounded-2xl transition-colors border border-gray-200 hover:bg-gray-50 text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sair da conta
              </button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-emerald-400/60 text-xs mt-6">
          © {new Date().getFullYear()} PRUMO Hub · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}