import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Protege contra saída EFETIVA da página (troca de rota via React Router
 * ou fechamento/refresh da aba). NÃO intercepta cliques dentro da própria página.
 */
export function useNavigationGuard(isDirty) {
  const navigate = useNavigate();
  const location = useLocation();

  // Interceptar links <a> e Links do React Router que levam para OUTRA rota
  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (e) => {
      // Ignorar se não está sujo
      if (!isDirty) return;

      // Subir até o elemento clicável mais próximo
      const anchor = e.target.closest('a');
      if (!anchor) return; // Só intercepta <a>, não botões internos da página

      // Checar se é um link que leva para outra rota (href diferente da atual)
      const href = anchor.getAttribute('href');
      if (!href) return;

      // Ignorar links externos, âncoras, javascript: etc.
      if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#') || href.startsWith('javascript:')) return;

      // Verificar se o destino é diferente da página atual
      const currentPath = location.pathname;
      // Normalizar: remover trailing slash
      const normalize = (p) => p.replace(/\/+$/, '') || '/';
      if (normalize(href) === normalize(currentPath)) return;

      // É uma navegação real para outra página → perguntar
      e.preventDefault();
      e.stopPropagation();
      const confirmed = window.confirm('Você possui alterações não salvas. Deseja realmente sair?');
      if (confirmed) {
        navigate(href);
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty, location.pathname, navigate]);

  // Proteger contra botão voltar do browser
  useEffect(() => {
    if (!isDirty) return;

    const handlePopstate = () => {
      const confirmed = window.confirm('Você possui alterações não salvas. Deseja realmente sair?');
      if (!confirmed) {
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, [isDirty]);

  // Proteger contra fechamento da aba / refresh
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}