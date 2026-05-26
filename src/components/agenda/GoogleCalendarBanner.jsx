import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const CONNECTOR_ID = '69cb25ebd88e121c980a50c0';

export default function GoogleCalendarBanner({ onConnected }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'disconnected' | 'connected'
  const [connecting, setConnecting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkStatus = async () => {
    try {
      const result = await base44.connectors.getAppUserStatus(CONNECTOR_ID);
      const connected = result?.status === 'connected' || result?.connected === true;
      setStatus(connected ? 'connected' : 'disconnected');
      if (connected && onConnected) onConnected();
    } catch {
      setStatus('disconnected');
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, '_blank', 'width=600,height=700');

      const timer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          // Aguarda callback do OAuth ser processado antes de checar
          await new Promise(r => setTimeout(r, 1500));
          const result = await base44.connectors.getAppUserStatus(CONNECTOR_ID).catch(() => null);
          const connected = result?.status === 'connected' || result?.connected === true;

          if (connected) {
            setStatus('connected');
            toast.success('Google Calendar conectado com sucesso!');
            if (onConnected) onConnected();
          } else {
            toast.error('Conexão não confirmada. Tente novamente ou verifique as permissões.');
          }
          setConnecting(false);
        }
      }, 500);
    } catch (error) {
      setConnecting(false);
      toast.error('Erro ao iniciar conexão: ' + error.message);
    }
  };

  if (status === 'loading' || status === 'connected' || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-blue-900">Sincronize com o Google Calendar</p>
          <p className="text-xs text-blue-600">Seus eventos pessoais aparecerão diretamente na agenda.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs"
          onClick={handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
          )}
          {connecting ? 'Aguardando...' : 'Conectar'}
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-blue-400 hover:text-blue-600 transition"
          title="Dispensar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
