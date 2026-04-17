import React from 'react';
import { hasPermission, canInviteUserType } from '@/lib/accessControl';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ProtectedButton({ user, action, targetUserType, children, onClick, disabled, ...props }) {
  // Verificar se o usuário pode executar essa ação
  const canPerform = hasPermission(user?.user_type, action);

  // Verificar se pode convidar esse tipo de usuário
  let canInvite = true;
  if (action === 'invite' && targetUserType) {
    canInvite = canInviteUserType(user?.user_type, targetUserType);
  }

  const isDisabled = disabled || !canPerform || !canInvite;

  const handleClick = (e) => {
    if (!canPerform) {
      toast.error(`Você não tem permissão para ${action}`);
      return;
    }
    if (!canInvite) {
      toast.error(`Você não pode convidar usuários do tipo ${targetUserType}`);
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      onClick={handleClick}
      title={!canPerform ? `Acesso negado: ${action}` : ''}
    >
      {children}
    </button>
  );
}

export function ProtectedSection({ user, action, children, fallback }) {
  const canPerform = hasPermission(user?.user_type, action);

  if (!canPerform) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

export function ActionGuard({ user, action, targetUserType, children }) {
  const canPerform = hasPermission(user?.user_type, action);
  let canInvite = true;

  if (action === 'invite' && targetUserType) {
    canInvite = canInviteUserType(user?.user_type, targetUserType);
  }

  if (!canPerform || !canInvite) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div className="text-sm text-red-700">
          {!canPerform
            ? `Você não tem permissão para ${action}`
            : `Você não pode convidar usuários do tipo ${targetUserType}`}
        </div>
      </div>
    );
  }

  return children;
}