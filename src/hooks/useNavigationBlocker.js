import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook para bloquear navegação no React Router v6 quando há alterações não salvas
 * Funciona para cliques em Links, useNavigate() e mudanças no histórico
 * 
 * @param {boolean} isDirty - Se o formulário tem mudanças não salvas
 * @param {string} message - Mensagem customizada
 */
export function useNavigationBlocker(isDirty = false, message = 'Você tem alterações não salvas. Deseja realmente sair sem salvar?') {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationPrevented = useRef(false);

  // Bloqueio global ao tentar sair do navegador
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

  // Intercepta cliques em links de navegação
  useEffect(() => {
    if (!isDirty) return;

    const handleLinkClick = (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      
      // Verifica se é um link interno (começa com /)
      if (href && href.startsWith('/') && href !== location.pathname) {
        e.preventDefault();
        e.stopPropagation();
        
        navigationPrevented.current = true;
        const confirmed = window.confirm(message);
        navigationPrevented.current = false;
        
        if (confirmed) {
          navigate(href);
        }
      }
    };

    // Usa capture phase para interceptar antes que React Router processe
    document.addEventListener('click', handleLinkClick, true);
    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [isDirty, message, navigate, location.pathname]);

  // Bloqueia navegação via botão voltar do navegador
  useEffect(() => {
    if (!isDirty) return;

    let isBlocked = false;

    const handlePopState = (e) => {
      if (isBlocked) return;
      
      isBlocked = true;
      const confirmed = window.confirm(message);
      isBlocked = false;

      if (!confirmed) {
        // Recoloca a página atual no histórico se usuário disser não
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, message]);
}