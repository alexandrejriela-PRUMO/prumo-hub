import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GoogleCalendarCallback() {
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('Conectando ao Google Calendar...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Erro: ${error}`);
          setTimeout(() => navigate('/NotificationSettings'), 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('Código de autorização não encontrado');
          setTimeout(() => navigate('/NotificationSettings'), 3000);
          return;
        }

        // Chama função backend para trocar o código por token
        const response = await base44.functions.invoke('googleCalendarCallback', {
          code,
        });

        if (response.data.success) {
          setStatus('success');
          setMessage('Google Calendar conectado com sucesso!');
          setTimeout(() => navigate('/NotificationSettings'), 2000);
        } else {
          setStatus('error');
          setMessage(response.data.error || 'Erro ao conectar');
          setTimeout(() => navigate('/NotificationSettings'), 3000);
        }
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Erro ao processar autorização');
        setTimeout(() => navigate('/NotificationSettings'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-stone-50 to-emerald-50/30">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-700 font-medium">{message}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
              <p className="text-gray-700 font-medium">{message}</p>
              <p className="text-sm text-gray-500">Redirecionando...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
              <p className="text-gray-700 font-medium">{message}</p>
              <p className="text-sm text-gray-500">Redirecionando em 3 segundos...</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}