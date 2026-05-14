import { CheckCircle, Copy, ExternalLink, UserPlus, Bookmark } from 'lucide-react';
import { useState } from 'react';

const LOGIN_URL = 'https://app--696695a3a998559f4c16429b.base44.app';

export default function CompraConfirmada() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(LOGIN_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
            alt="PRUMO Hub"
            className="h-20 w-auto object-contain"
          />
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Ícone de sucesso */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-emerald-900 mb-2">
            Compra Confirmada! 🎉
          </h1>
          <p className="text-gray-600 mb-6">
            Seu pagamento foi processado com sucesso. Bem-vindo ao <strong>PRUMO Hub</strong>!
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-amber-800 font-semibold text-sm mb-2 flex items-center gap-2">
              <Bookmark className="w-4 h-4" /> Salve o link de acesso à plataforma:
            </p>
            <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-700 flex-1 truncate">{LOGIN_URL}</span>
              <button
                onClick={handleCopy}
                className="text-amber-600 hover:text-amber-800 transition-colors flex-shrink-0"
                title="Copiar link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {copied && <p className="text-emerald-600 text-xs mt-1">✓ Link copiado!</p>}
          </div>

          {/* Passos */}
          <div className="text-left space-y-4 mb-8">
            <p className="font-semibold text-gray-800">Como acessar a plataforma:</p>

            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
              <div>
                <p className="font-medium text-gray-800">Acesse o link acima</p>
                <p className="text-sm text-gray-500">Salve nos favoritos do seu navegador para facilitar o acesso.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
              <div>
                <p className="font-medium text-gray-800">Clique em <span className="text-emerald-700">"Cadastre-se"</span></p>
                <p className="text-sm text-gray-500">Use <strong>exatamente o mesmo e-mail</strong> que você usou na compra e crie uma senha.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
              <div>
                <p className="font-medium text-gray-800">Pronto! Acesso liberado</p>
                <p className="text-sm text-gray-500">Seu plano será ativado automaticamente assim que você se cadastrar.</p>
              </div>
            </div>
          </div>

          <a
            href={LOGIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Acessar e Cadastrar Agora
          </a>

          <p className="text-xs text-gray-400 mt-4">
            Dúvidas? Entre em contato via WhatsApp ou e-mail de suporte.
          </p>
        </div>
      </div>
    </div>
  );
}