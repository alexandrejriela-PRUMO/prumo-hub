import { useEffect } from 'react';

export function useNavigationGuard(isDirty) {
  // Proteger contra cliques em elementos de navegação
  useEffect(() => {
    const handleClick = (e) => {
      const navElement = e.target.closest('a,button,[role="button"]');
      if (!navElement) return;

      if (!isDirty) return;

      const confirmLeave = window.confirm(
        'Você possui alterações não salvas. Deseja realmente sair?'
      );

      if (!confirmLeave) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [isDirty]);

  // Proteger contra navegação via botão voltar ou popstate
  useEffect(() => {
    const handlePopstate = (e) => {
      if (!isDirty) return;

      const confirmLeave = window.confirm(
        'Você possui alterações não salvas. Deseja realmente sair?'
      );

      if (!confirmLeave) {
        e.preventDefault();
        // Push o estado novamente para manter na mesma página
        window.history.pushState(null, null, window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopstate);

    return () => {
      window.removeEventListener('popstate', handlePopstate);
    };
  }, [isDirty]);

  // Proteger contra fechamento da aba ou refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isDirty) return;

      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);
}