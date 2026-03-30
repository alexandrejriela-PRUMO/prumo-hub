import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GoogleCalendarConnect({ user }) {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  // Busca se já tem conexão
  const { data: googleToken, isLoading: isLoadingToken } = useQuery({
    queryKey: ['google-token', user?.email],
    queryFn: async () => {
      const tokens = await base44.entities.UserGoogleToken.filter({
        user_email: user.email,
        connected: true,
      });
      return tokens.length > 0 ? tokens[0] : null;
    },
    enabled: !!user?.email,
  });

  // Desconectar
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (googleToken?.id) {
        await base44.entities.UserGoogleToken.update(googleToken.id, {
          connected: false,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-token', user?.email] });
      toast.success('Google Calendar desconectado');
    },
    onError: () => {
      toast.error('Erro ao desconectar');
    },
  });

  // Gera o link de autorização
  const generateAuthLink = () => {
    const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '';
    const redirectUri = `${window.location.origin}/GoogleCalendarCallback`;
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');

    return authUrl.toString();
  };

  const authLink = generateAuthLink();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(authLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copiado!');
  };

  const handleConnect = () => {
    window.open(authLink, '_blank', 'width=600,height=600');
  };

  return (
    <Card className="border-blue-100 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingToken ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          </div>
        ) : googleToken?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700 border-0">✓ Conectado</Badge>
              <p className="text-xs text-gray-600">{googleToken.google_email}</p>
            </div>
            <p className="text-xs text-gray-600">
              Sua agenda pessoal do Google Calendar está sincronizada. Os eventos serão exibidos em sua agenda na plataforma.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? 'Desconectando...' : 'Desconectar'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-600">
              Conecte sua agenda pessoal do Google Calendar para visualizar e sincronizar seus eventos.
            </p>
            <div className="space-y-2">
              <Button
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleConnect}
              >
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Conectar Google Calendar
              </Button>
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                  Copiar link de autorização
                </summary>
                <div className="mt-2 p-2 bg-white rounded border border-blue-100 space-y-2">
                  <p className="text-gray-600">
                    Cole este link em seu navegador para autorizar o acesso:
                  </p>
                  <div className="flex items-center gap-1 bg-gray-50 p-2 rounded break-all">
                    <code className="text-xs text-gray-700 flex-1 truncate">{authLink}</code>
                    <button
                      onClick={copyToClipboard}
                      className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                      title={copied ? 'Copiado!' : 'Copiar'}
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              </details>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}