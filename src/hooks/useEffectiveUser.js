/**
 * useEffectiveUser — Hook React para obter o usuário efetivo.
 *
 * Para usuários do tipo 'equipe': retorna o email do consultor para queries.
 * Para outros tipos: retorna o próprio usuário.
 *
 * Uso:
 *   const { effectiveEmail, consultorEmail, isEquipe, actualEmail, loading } = useEffectiveUser();
 *
 * Em queries:
 *   base44.entities.Property.filter({ consultor_email: effectiveEmail })
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

let _cache = null; // Cache em memória da sessão

export function useEffectiveUser() {
  const [state, setState] = useState({
    effectiveEmail: null,   // Email para usar em queries (consultor se for equipe)
    actualEmail: null,      // Email real do usuário logado
    consultorEmail: null,   // Email do consultor vinculado (null se não for equipe)
    isEquipe: false,
    isPending: false,
    noBinding: false,
    fullName: null,
    userType: null,
    memberRole: null,
    consultorName: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Usa cache se disponível (evita chamadas repetidas por render)
    if (_cache) {
      setState({ ..._cache, loading: false });
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const res = await base44.functions.invoke('getEffectiveUser', {});
        const data = res.data;

        if (!cancelled) {
          const newState = {
            effectiveEmail: data.email,
            actualEmail: data.actual_email,
            consultorEmail: data.consultor_email,
            isEquipe: data.is_equipe || false,
            isPending: data.is_pending || false,
            noBinding: data.no_binding || false,
            fullName: data.full_name,
            userType: data.user_type,
            memberRole: data.member_role || null,
            consultorName: data.consultor_name || null,
            loading: false,
            error: data.error || null,
          };
          _cache = newState;
          setState(newState);
        }
      } catch (err) {
        if (!cancelled) {
          setState(prev => ({ ...prev, loading: false, error: err.message }));
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}

/**
 * Limpa o cache do useEffectiveUser.
 * Chamar após logout ou mudança de vínculo de equipe.
 */
export function clearEffectiveUserCache() {
  _cache = null;
}