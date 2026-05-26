import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ID do conector "Agenda Google - Usuário" registrado no workspace
const CONNECTOR_ID = '69cb25ebd88e121c980a50c0';

export default function GoogleCalendarConnect({ user, onConnected }) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, '_blank', 'width=600,height=700');

      const timer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          // Aguarda o callback OAuth ser processado pelo backend antes de verificar
          await new Promise(r => setTimeout(r, 1500));
          try {
            const result = await base44.connectors.getAppUserStatus(CONNECTOR_ID);
            const connected = result?.status === 'connected' || result?.connected === true;
            if (connected) {
              toast.success('Google Calendar conectado com sucesso!');
              if (onConnected) onConnected();
            } else {
              toast.error('Conexão não confirmada. Tente novamente.');
            }
          } catch {
            toast.error('Não foi possível verificar a conexão. Tente novamente.');
          }
          setLoading(false);
        }
      }, 500);
    } catch (error) {
      setLoading(false);
      toast.error('Erro ao conectar Google Calendar: ' + error.message);
    }
  };

  return (
    <Card className="border-blue-100 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-600">
          Conecte sua agenda pessoal do Google Calendar para sincronizar eventos na plataforma.
        </p>
        <Button
          size="sm"
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
          ) : (
            <Calendar className="w-3.5 h-3.5 mr-2" />
          )}
          {loading ? 'Aguardando autorização...' : 'Conectar Google Calendar'}
        </Button>
      </CardContent>
    </Card>
  );
}