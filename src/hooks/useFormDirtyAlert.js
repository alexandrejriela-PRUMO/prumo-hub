import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook para proteger formulários contra saída sem salvamento
 * Detecta mudanças e alerta o usuário antes de sair/fechar
 * 
 * @param {boolean} isDirty - Se o formulário tem mudanças não salvas
 * @param {string} message - Mensagem customizada (opcional)
 */
export function useFormDirtyAlert(isDirty = false, message = 'Você tem alterações não salvas. Deseja realmente sair sem salvar?') {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationBlocked = useRef(false);

  // Alerta ao tentar sair do navegador (fechar aba, F5, etc)
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  // Alerta ao tentar navegar para outra página (usando react-router)
  useEffect(() => {
    if (!isDirty) return;

    const unblock = window.history.pushState;
    const handlePopState = (e) => {
      if (isDirty && !navigationBlocked.current) {
        navigationBlocked.current = true;
        const confirmed = window.confirm(message);
        if (!confirmed) {
          e.preventDefault();
          navigationBlocked.current = false;
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, message]);
}

/**
 * Hook para alertar ao fechar dialogs/modals
 * @param {boolean} isDirty - Se o formulário tem mudanças
 * @param {function} onClose - Função para fechar o dialog
 * @param {string} message - Mensagem customizada
 */
export function useDialogDirtyAlert(isDirty = false, onClose, message = 'Você tem alterações não salvas. Deseja fechar sem salvar?') {
  const handleClose = useCallback(() => {
    if (!isDirty) {
      onClose();
      return;
    }

    const confirmed = window.confirm(message);
    if (confirmed) {
      onClose();
    }
  }, [isDirty, onClose, message]);

  return handleClose;
}

/**
 * Hook combinado para proteger tanto navegação quanto dialogs
 */
export function useFormProtection(isDirty = false, onDialogClose, customMessage) {
  const message = customMessage || 'Você tem alterações não salvas. Deseja realmente sair sem salvar?';
  
  useFormDirtyAlert(isDirty, message);
  const handleDialogClose = useDialogDirtyAlert(isDirty, onDialogClose, message);

  return { handleDialogClose };
}