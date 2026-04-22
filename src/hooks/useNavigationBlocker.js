import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook para bloquear navegação no React Router v6 quando há alterações não salvas
 * Funciona para cliques em Links, useNavigate() e mudanças no histórico
 * 
 * @param {boolean} isDirty - Se o formulário tem mudanças não salvas
 * @param {string} message - Mensagem customizada
 */
export function useNavigationBlocker(isDirty = false, message = 'Você tem alterações não salvas. Deseja realmente sair sem salvar?') {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDirty) return;

    // Intercepta cliques em Links da navegação
    const handleNavigationClick = (e) => {
      // Verifica se o clique foi em um link de navegação
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      // Verifica se é um link interno (começa com / e não é um link de âncora)
      if (href && href.startsWith('/') && !href.startsWith('/')) {
        e.preventDefault();
        e.stopPropagation();
        
        const confirmed = window.confirm(message);
        if (confirmed) {
          // Permite navegação mesmo com dados não salvos
          navigate(href);
        }
      }
    };

    // Captura cliques na fase de captura (antes de chegar ao elemento)
    document.addEventListener('click', handleNavigationClick, true);

    return () => {
      document.removeEventListener('click', handleNavigationClick, true);
    };
  }, [isDirty, message, navigate]);

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

  // Alerta ao usar botão voltar/avançar do navegador
  useEffect(() => {
    if (!isDirty) return;

    const handlePopState = (e) => {
      const confirmed = window.confirm(message);
      if (!confirmed) {
        // Volta para a página anterior se o usuário disser não
        e.preventDefault();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, message]);
}