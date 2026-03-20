/**
 * useEffectiveUser — Hook React para obter o usuário efetivo + permissões + plano.
 *
 * Para usuários do tipo 'equipe': retorna o email do consultor para queries,
 * as permissões do membro e o plano do consultor.
 * Para outros tipos: retorna o próprio usuário com acesso total.
 *
 * Uso:
 *   const { effectiveEmail, isEquipe, permissions, canAccess, planAllows } = useEffectiveUser();
 *
 * Verificar permissão de módulo:
 *   canAccess('office', 'edit')     // true/false
 *   planAllows('advanced_modules')  // true/false
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const FULL_ACCESS_PERMISSIONS = {
  office:           { view: true, edit: true },
  property_center:  { view: true, edit: true },
  advanced_modules: { access: true },
  reports:          { view: true },
  ai_chat:          { access: true },
  team_management:  { manage: true },
  financial:        { view: true },
};

const PLAN_CONFIG = {
  start:      { max_team_members: 0, advanced_modules: false, reports: false, client_consultor: false },
  pro:        { max_team_members: 1, advanced_modules: true,  reports: true,  client_consultor: false },
  enterprise: { max_team_members: 3, advanced_modules: true,  reports: true,  client_consultor: true  },
};

let _cache = null;

export function useEffectiveUser() {
  const [state, setState] = useState({
    effectiveEmail: null,
    actualEmail: null,
    consultorEmail: null,
    isEquipe: false,
    isPending: false,
    noBinding: false,
    fullName: null,
    userType: null,
    memberRole: null,
    consultorName: null,
    consultorPlan: 'start',
    permissions: FULL_ACCESS_PERMISSIONS,
    loading: true,
    error: null,
  });

  useEffect(() => {
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
          const isEquipe = data.is_equipe || false;
          const newState = {
            effectiveEmail: data.email,
            actualEmail: data.actual_email,
            consultorEmail: data.consultor_email,
            isEquipe,
            isPending: data.is_pending || false,
            noBinding: data.no_binding || false,
            fullName: data.full_name,
            userType: data.user_type,
            memberRole: data.member_role || null,
            consultorName: data.consultor_name || null,
            consultorPlan: isEquipe ? (data.consultor_plan || 'start') : (data.consultor_plan || 'start'),
            permissions: isEquipe ? (data.permissions || FULL_ACCESS_PERMISSIONS) : FULL_ACCESS_PERMISSIONS,
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

  /**
   * Verifica permissão de módulo.
   * canAccess('office', 'edit') → true/false
   * Não-equipe: sempre true.
   */
  function canAccess(module, action) {
    if (!state.isEquipe) return true;
    const mod = state.permissions?.[module];
    if (!mod) return false;
    return mod[action] === true;
  }

  /**
   * Verifica feature de plano.
   * planAllows('advanced_modules') → true/false
   */
  function planAllows(feature) {
    const plan = state.consultorPlan || 'start';
    const config = PLAN_CONFIG[plan] || PLAN_CONFIG.start;
    const val = config[feature];
    return val === true || (typeof val === 'number' && val > 0);
  }

  return { ...state, canAccess, planAllows };
}

/**
 * Limpa o cache do useEffectiveUser.
 * Chamar após logout ou mudança de vínculo de equipe.
 */
export function clearEffectiveUserCache() {
  _cache = null;
}