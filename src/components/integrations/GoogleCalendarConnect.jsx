import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const CONNECTOR_ID = '69cb25ebd88e121c980a50c0';

export default function GoogleCalendarConnect({ onConnected }) {
  const [status, setStatus] = useState('checking'); // checking | connected | disconnected
  const [loading, setLoading] = useState(false);

  const checkConnection = async () => {
    setStatus('checking');
    try {
      await base44.functions.invoke('userGoogleCalendarEvents', { action: 'list' });
      setStatus('connected');
      if (onConnected) onConnected(true);
    } catch {
      setStatus('disconnected');
      if (onConnected) onConnected(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, '_blank', 'width=600,height=700');
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          setLoading(false);
          checkConnection();
        }
      }, 500);
    } catch (err) {
      toast.error('Erro ao iniciar conexão com Google Calendar');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await base44.connectors.disconnectAppUser(CONNECTOR_ID);
      setStatus('disconnected');
      if (onConnected) onConnected(false);
      toast.success('Google Calendar desconectado');
    } catch {
      toast.error('Erro ao desconectar');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Verificando Google Calendar...
      </div>
    );
  }

  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Google Calendar conectado
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-gray-400 hover:text-red-500 px-2"
          onClick={handleDisconnect}
          disabled={loading}
        >
          <XCircle className="w-3.5 h-3.5 mr-1" />
          Desconectar
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
      onClick={handleConnect}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Calendar className="w-3.5 h-3.5" />
      )}
      Conectar Google Calendar
    </Button>
  );
}