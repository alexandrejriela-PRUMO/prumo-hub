import React from 'react';
import { useNavigate } from 'react-router-dom';
import { canAccessPage } from '@/lib/accessControl';
import { AlertCircle } from 'lucide-react';

export default function RouteProtector({ user, pageName, children }) {
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">Você precisa estar autenticado.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // Equipe herda do consultor principal
  let effectiveUserType = user.user_type;
  if (user.user_type === 'equipe' && user.primary_consultor_type) {
    effectiveUserType = user.primary_consultor_type;
  }

  const hasAccess = canAccessPage(effectiveUserType, pageName);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            Seu tipo de usuário não tem permissão para acessar esta página.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return children;
}