import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function GoogleCalendarCallback() {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setMessage('Acesso negado: ' + error);
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('Código de autorização não encontrado.');
      return;
    }

    base44.functions.invoke('googleOAuthCallback', { code })
      .then(res => {
        if (res.data?.success) {
          setStatus('success');
          setMessage(`Conectado com sucesso! Conta Google: ${res.data.google_email}`);
          setTimeout(() => { window.location.href = '/Agenda'; }, 2500);
        } else {
          setStatus('error');
          setMessage(res.data?.error || 'Erro ao salvar token.');
        }
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.message || 'Erro inesperado.');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-5 max-w-sm w-full">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
          alt="PRUMO Hub"
          className="h-14 object-contain mb-2"
        />
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            <p className="text-emerald-800 font-medium">Conectando ao Google Calendar...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="text-emerald-800 font-semibold text-center">{message}</p>
            <p className="text-sm text-gray-500">Redirecionando para a Agenda...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500" />
            <p className="text-red-700 font-medium text-center">{message}</p>
            <a href="/Agenda" className="text-sm text-emerald-600 underline">Voltar para a Agenda</a>
          </>
        )}
      </div>
    </div>
  );
}