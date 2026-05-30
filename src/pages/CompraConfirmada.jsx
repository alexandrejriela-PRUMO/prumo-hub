import { CheckCircle, Copy, Bookmark, UserPlus, Smartphone, ChevronDown, ChevronUp, Leaf } from 'lucide-react';
import { useState } from 'react';

const APP_URL = 'https://hub.prumo.site/';

// Mapeamento de offer codes para perfil/plano
const OFFER_MAP = {
  'PXP3P68': { perfil: 'produtor',  label: 'Produtor Rural',                    emoji: '🌾',    badge: 'Oferta Especial' },
  'GNJXUCE': { perfil: 'produtor',  label: 'Produtor Rural',                    emoji: '🌾',    badge: null },
  'EQL1OTT': { perfil: 'consultor', label: 'Consultor Enterprise',              emoji: '🧑‍💼', badge: null },
  '8QA4VR2': { perfil: 'consultor', label: 'Consultor Pro',                     emoji: '🧑‍💼', badge: null },
  'GYXWU5X': { perfil: 'consultor', label: 'Consultor Start',                   emoji: '🧑‍💼', badge: null },
  '9V4FUD5': { perfil: 'consultor', label: 'Consultor Enterprise (Desconto)',   emoji: '🧑‍💼', badge: 'Oferta Especial' },
};

const buildLoginUrl = (offerCode, perfil) => {
  const base = 'https://hub.prumo.site/login';
  const fromUrl = 'https://hub.prumo.site/';
  const params = new URLSearchParams({
    from_url: fromUrl,
    ...(offerCode && { offer: offerCode }),
    ...(perfil && { user_type: perfil }),
  });
  return `${base}?${params.toString()}`;
};

export default function CompraConfirmada() {
  const [copied, setCopied] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  // Detectar offer code na URL
  const urlParams = new URLSearchParams(window.location.search);
  const offerCode = urlParams.get('offer')?.toUpperCase() || '';
  const offerInfo = OFFER_MAP[offerCode] || null;

  const loginUrl = buildLoginUrl(offerCode, offerInfo?.perfil);

  const handleCopy = () => {
    navigator.clipboard.writeText(loginUrl);
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
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Ícone de sucesso */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
          </div>

          {offerInfo?.badge && (
            <div className="flex justify-center mb-3">
              <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 border border-amber-300 text-xs font-bold px-3 py-1 rounded-full">
                <Leaf className="w-3.5 h-3.5" />
                {offerInfo.badge} — {offerInfo.emoji} {offerInfo.label}
              </span>
            </div>
          )}

          <h1 className="text-2xl font-bold text-emerald-900 mb-2 text-center">
            Compra Confirmada! 🎉
          </h1>
          <p className="text-gray-600 mb-6 text-center">
            Seu pagamento foi processado com sucesso. Bem-vindo ao <strong>PRUMO Hub</strong>
            {offerInfo ? ` como ${offerInfo.emoji} ${offerInfo.label}` : ''}!
          </p>

          {/* Link para salvar */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-amber-800 font-semibold text-sm mb-2 flex items-center gap-2">
              <Bookmark className="w-4 h-4" /> Salve o link de acesso à plataforma:
            </p>
            <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-600 flex-1 break-all">{loginUrl}</span>
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
          <div className="space-y-4 mb-6">
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

          {/* Botão principal */}
          <a
            href={buildLoginUrl(offerCode, offerInfo?.perfil)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors mb-4"
          >
            <UserPlus className="w-5 h-5" />
            Acessar e Cadastrar Agora
          </a>

          {/* Seção de instalação do app */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowInstall(!showInstall)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                📱 Como instalar o app no celular
              </span>
              {showInstall ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showInstall && (
              <div className="p-4 space-y-4 text-sm text-gray-700">
                {/* Android */}
                <div>
                  <p className="font-bold text-gray-800 mb-2">🔹 ANDROID (Google Chrome)</p>
                  <ol className="space-y-1 list-decimal list-inside text-gray-600">
                    <li>Acesse o link pelo <strong>Google Chrome</strong>.</li>
                    <li>Toque no menu <strong>(⋮)</strong> no canto superior direito.</li>
                    <li>Selecione <strong>"Adicionar à tela inicial"</strong>.</li>
                    <li>Confirme o nome do app (se quiser editar).</li>
                    <li>Toque em <strong>"Adicionar"</strong>.</li>
                  </ol>
                  <p className="mt-2 text-emerald-700 font-medium">✅ O app aparecerá na sua tela como um aplicativo normal.</p>
                </div>

                <div className="border-t border-gray-100" />

                {/* iPhone */}
                <div>
                  <p className="font-bold text-gray-800 mb-2">🍎 iPHONE (Safari)</p>
                  <ol className="space-y-1 list-decimal list-inside text-gray-600">
                    <li>Acesse o link pelo navegador <strong>Safari</strong>.</li>
                    <li>Toque no botão de <strong>compartilhar</strong> (ícone de quadrado com seta ↑).</li>
                    <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
                    <li>Confirme o nome do app.</li>
                    <li>Toque em <strong>"Adicionar"</strong>.</li>
                  </ol>
                  <p className="mt-2 text-emerald-700 font-medium">✅ O app será instalado na tela inicial do seu iPhone.</p>
                </div>

                <div className="border-t border-gray-100 pt-2">
                  <a
                    href={APP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-600 underline break-all"
                  >
                    {APP_URL}
                  </a>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Dúvidas? Entre em contato via WhatsApp ou e-mail de suporte.
          </p>
        </div>
      </div>
    </div>
  );
}