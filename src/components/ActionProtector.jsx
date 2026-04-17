import React from 'react';
import { hasPermission, canInviteUserType } from '@/lib/accessControl';
import { useEffectiveUserPermissions } from '@/hooks/useEffectiveUserPermissions';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ProtectedButton({ user, moduleKey, field = 'view', action, targetUserType, children, onClick, disabled, ...props }) {
  const { hasPermission: checkModulePermission } = useEffectiveUserPermissions(user);
  
  // Verificar permissão de módulo específico se for equipe
  let canPerformAction = true;
  if (user?.user_type === 'equipe' && moduleKey) {
    canPerformAction = checkModulePermission(moduleKey, field);
  } else {
    // Fallback para lógica antiga de ação genérica
    canPerformAction = hasPermission(user?.user_type, action);
  }

  // Verificar se pode convidar esse tipo de usuário
  let canInvite = true;
  if (action === 'invite' && targetUserType) {
    canInvite = canInviteUserType(user?.user_type, targetUserType);
  }

  const isDisabled = disabled || !canPerformAction || !canInvite;

  const handleClick = (e) => {
    if (!canPerformAction) {
      const msg = moduleKey ? `Você não tem permissão para ${field} neste módulo` : `Você não tem permissão para ${action}`;
      toast.error(msg);
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
      title={!canPerformAction ? `Acesso negado` : ''}
    >
      {children}
    </button>
  );
}

export function ProtectedSection({ user, moduleKey, field = 'view', action, children, fallback }) {
  const { hasPermission: checkModulePermission } = useEffectiveUserPermissions(user);
  
  let canPerformAction = true;
  if (user?.user_type === 'equipe' && moduleKey) {
    canPerformAction = checkModulePermission(moduleKey, field);
  } else {
    canPerformAction = hasPermission(user?.user_type, action);
  }

  if (!canPerformAction) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

export function ActionGuard({ user, moduleKey, field = 'view', action, targetUserType, children }) {
  const { hasPermission: checkModulePermission } = useEffectiveUserPermissions(user);
  
  let canPerformAction = true;
  if (user?.user_type === 'equipe' && moduleKey) {
    canPerformAction = checkModulePermission(moduleKey, field);
  } else {
    canPerformAction = hasPermission(user?.user_type, action);
  }

  let canInvite = true;
  if (action === 'invite' && targetUserType) {
    canInvite = canInviteUserType(user?.user_type, targetUserType);
  }

  if (!canPerformAction || !canInvite) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div className="text-sm text-red-700">
          {!canPerformAction
            ? (moduleKey ? `Você não tem permissão para ${field} neste módulo` : `Você não tem permissão para ${action}`)
            : `Você não pode convidar usuários do tipo ${targetUserType}`}
        </div>
      </div>
    );
  }

  return children;
}