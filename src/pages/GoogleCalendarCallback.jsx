import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function GoogleCalendarCallback() {
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      setStatus('error');
      setMessage('Autorização negada pelo usuário.');
      if (window.opener) {
        window.opener.postMessage({ type: 'GOOGLE_CALENDAR_AUTH', success: false, error }, '*');
        setTimeout(() => window.close(), 1500);
      }
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('Código de autorização não encontrado.');
      return;
    }

    const exchangeCode = async () => {
      try {
        const res = await base44.functions.invoke('googleOAuthCallback', { code });
        if (res.data?.success) {
          setStatus('success');
          setMessage(`Google Calendar conectado! (${res.data.google_email})`);
          if (window.opener) {
            window.opener.postMessage({ type: 'GOOGLE_CALENDAR_AUTH', success: true }, '*');
            setTimeout(() => window.close(), 1500);
          }
        } else {
          setStatus('error');
          setMessage(res.data?.error || 'Erro ao conectar Google Calendar.');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'Erro ao processar autorização.');
      }
    };

    exchangeCode();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
            <p className="text-gray-700 font-medium">Conectando Google Calendar...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <p className="text-gray-700 font-medium">{message}</p>
            <p className="text-xs text-gray-400">Esta janela será fechada automaticamente.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-gray-700 font-medium">Erro na conexão</p>
            <p className="text-sm text-gray-500">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}