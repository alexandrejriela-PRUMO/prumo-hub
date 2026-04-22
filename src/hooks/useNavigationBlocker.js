import { useEffect } from 'react';

/**
 * Hook para bloquear navegação quando há alterações não salvas
 * Cobre: cliques em links, botão voltar, fechar aba
 */
export function useNavigationBlocker(isDirty = false, message = 'Você tem alterações não salvas. Deseja realmente sair sem salvar?') {
  
  // Bloqueia beforeunload (fechar aba, F5, etc)
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

  // Bloqueia qualquer navegação via história (botão voltar)
  useEffect(() => {
    if (!isDirty) return;

    let shouldBlock = true;

    const handlePopState = () => {
      if (!shouldBlock) return;
      shouldBlock = false;

      const confirmed = window.confirm(message);
      if (!confirmed) {
        window.history.forward();
      }
      shouldBlock = true;
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, message]);
}