import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function useNavigationGuard(isDirty) {
  const location = useLocation();
  const lastLocationRef = useRef(location);

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

  // Proteger contra navegação programática via React Router
  useEffect(() => {
    if (!isDirty) {
      lastLocationRef.current = location;
      return;
    }

    const currentPath = location.pathname;
    const lastPath = lastLocationRef.current?.pathname;

    if (currentPath !== lastPath) {
      const confirmLeave = window.confirm(
        'Você possui alterações não salvas. Deseja realmente sair?'
      );

      if (!confirmLeave) {
        // Retorna para a rota anterior
        window.history.back();
      } else {
        lastLocationRef.current = location;
      }
    }
  }, [location, isDirty]);

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