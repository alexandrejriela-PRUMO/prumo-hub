import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PWAUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Listener para atualização disponível
    const handleAppUpdate = (event) => {
      console.log('[PWA] App update notification triggered');
      setShowUpdate(true);
    };

    window.addEventListener('app-updated', handleAppUpdate);

    return () => {
      window.removeEventListener('app-updated', handleAppUpdate);
    };
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);
    // Força atualização completa do app
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      
      // Recarrega quando novo SW ativar
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    } else {
      // Fallback: reload direto
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-xl shadow-lg border border-emerald-200 overflow-hidden">
        <div className="p-4 sm:p-5 flex gap-4">
          <div className="flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-emerald-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">Atualização disponível</h3>
            <p className="text-gray-600 text-xs mt-1">
              Uma nova versão do PRUMO está disponível. Atualize agora para obter as últimas melhorias.
            </p>
          </div>

          <button
            onClick={() => setShowUpdate(false)}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex gap-3">
          <Button
            onClick={() => setShowUpdate(false)}
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs sm:text-sm"
            disabled={isUpdating}
          >
            Depois
          </Button>
          
          <Button
            onClick={handleUpdate}
            size="sm"
            className="flex-1 h-9 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                Atualizar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}