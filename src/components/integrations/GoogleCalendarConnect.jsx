import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function GoogleCalendarConnect({ onConnected }) {
  const [status, setStatus] = useState('checking'); // checking | connected | disconnected
  const [googleEmail, setGoogleEmail] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkConnection = async () => {
    setStatus('checking');
    try {
      const user = await base44.auth.me();
      if (!user) { setStatus('disconnected'); return; }
      const tokens = await base44.entities.UserGoogleToken.filter({ user_email: user.email });
      if (tokens && tokens.length > 0 && tokens[0].connected) {
        setStatus('connected');
        setGoogleEmail(tokens[0].google_email);
        if (onConnected) onConnected(true);
      } else {
        setStatus('disconnected');
        if (onConnected) onConnected(false);
      }
    } catch {
      setStatus('disconnected');
      if (onConnected) onConnected(false);
    }
  };

  useEffect(() => {
    checkConnection();

    // Listen for OAuth callback result
    const handleMessage = (event) => {
      if (event.data?.type === 'GOOGLE_CALENDAR_AUTH') {
        if (event.data.success) {
          toast.success('Google Calendar conectado!');
          checkConnection();
        } else {
          toast.error('Falha ao conectar Google Calendar.');
          setStatus('disconnected');
        }
        setLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('googleOAuthStart', {});
      const url = res.data?.url;
      if (!url) throw new Error('URL de autorização não retornada.');
      const popup = window.open(url, 'google_calendar_auth', 'width=600,height=700,left=200,top=100');
      // Poll for popup close in case message fails
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          setLoading(false);
          checkConnection();
        }
      }, 500);
    } catch (err) {
      toast.error('Erro ao iniciar conexão: ' + err.message);
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const tokens = await base44.entities.UserGoogleToken.filter({ user_email: user.email });
      if (tokens && tokens.length > 0) {
        await base44.entities.UserGoogleToken.update(tokens[0].id, { connected: false });
      }
      setStatus('disconnected');
      setGoogleEmail(null);
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
          {googleEmail || 'Google Calendar conectado'}
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