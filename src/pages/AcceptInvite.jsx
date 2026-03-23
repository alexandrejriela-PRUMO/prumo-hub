import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, AlertCircle, Clock, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AcceptInvite() {
  const [status, setStatus] = useState('loading'); // loading | valid | invalid | expired | accepted | error
  const [memberData, setMemberData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);

  const token = new URLSearchParams(window.location.search).get('token');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setErrorMsg('Link de convite inválido ou incompleto.');
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    setStatus('loading');
    try {
      const res = await base44.functions.invoke('generateInviteLink', {
        action: 'validate_token',
        token,
      });
      if (res.data?.success) {
        setMemberData(res.data.member);
        setStatus('valid');
      } else if (res.data?.expired) {
        setStatus('expired');
        setErrorMsg(res.data.error);
      } else {
        setStatus('invalid');
        setErrorMsg(res.data?.error || 'Convite inválido.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err?.message || 'Erro ao validar convite.');
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const res = await base44.functions.invoke('manageTeamMembers', {
        action: 'apply_user_type',
      });
      if (res.data?.success) {
        setStatus('accepted');
      } else if (res.data?.expired) {
        setStatus('expired');
        setErrorMsg(res.data.error);
      } else {
        setErrorMsg(res.data?.error || 'Erro ao aceitar convite.');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Erro ao aceitar convite.');
    } finally {
      setIsAccepting(false);
    }
  };

  const goToApp = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 p-8 text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png"
            alt="PRUMO Hub"
            className="h-16 w-auto object-contain mx-auto mb-4"
          />
          <p className="text-emerald-100 text-sm">Convite para Equipe</p>
        </div>

        {/* Content */}
        <div className="p-8 text-center space-y-4">

          {/* Loading */}
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-emerald-500 mx-auto animate-spin" />
              <p className="text-gray-600">Validando convite...</p>
            </>
          )}

          {/* Convite válido */}
          {status === 'valid' && memberData && (
            <>
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Você foi convidado!</h2>
                <p className="text-gray-500 text-sm">
                  <strong>{memberData.consultor_email}</strong> convidou você para fazer parte da equipe.
                </p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-left space-y-2 border border-emerald-100">
                {memberData.member_name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Nome:</span>
                    <span className="font-medium text-gray-800">{memberData.member_name}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">E-mail:</span>
                  <span className="font-medium text-gray-800">{memberData.member_email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Função:</span>
                  <span className="font-medium text-emerald-700">{memberData.member_role}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Para aceitar o convite, faça login (ou cadastre-se) com o e-mail <strong>{memberData.member_email}</strong> e depois clique em Aceitar.
              </p>
              {errorMsg && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>}
              <div className="space-y-2 pt-2">
                <Button
                  className="w-full bg-emerald-700 hover:bg-emerald-800"
                  onClick={handleAccept}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aceitando...</>
                  ) : (
                    '✅ Aceitar Convite'
                  )}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => base44.auth.redirectToLogin(window.location.href)}>
                  Fazer Login / Cadastrar-se
                </Button>
              </div>
            </>
          )}

          {/* Aceito com sucesso */}
          {status === 'accepted' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Bem-vindo à equipe!</h2>
              <p className="text-gray-500 text-sm">Seu perfil foi configurado como membro da equipe. Você já pode acessar o PRUMO Hub.</p>
              <Button className="w-full bg-emerald-700 hover:bg-emerald-800" onClick={goToApp}>
                Acessar o PRUMO Hub →
              </Button>
            </>
          )}

          {/* Expirado */}
          {status === 'expired' && (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Convite Expirado</h2>
              <p className="text-gray-500 text-sm">{errorMsg || 'Este convite expirou. Solicite um novo convite ao consultor responsável.'}</p>
            </>
          )}

          {/* Inválido / Erro */}
          {(status === 'invalid' || status === 'error') && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Link Inválido</h2>
              <p className="text-gray-500 text-sm">{errorMsg || 'Este link de convite é inválido ou não existe.'}</p>
              <Button variant="outline" className="w-full" onClick={goToApp}>
                Ir para o PRUMO Hub
              </Button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}