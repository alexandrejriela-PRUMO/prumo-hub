import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook crítico para determinar o contexto de usuário (consultor ou equipe)
 * Chama a backend function getEffectiveUser que usa asServiceRole para buscar TeamMember.
 * 
 * Retorna:
 *   - user: dados do usuário autenticado
 *   - effectiveEmail: email do consultor (para queries) — para equipe é o consultor, para consultor/produtor é o próprio
 *   - linkedConsultant: email do consultor vinculado (null se não for equipe)
 *   - memberRole: papel na equipe
 *   - permissions: permissões por módulo
 *   - isEquipe, isConsultor, isProdutor: flags de tipo
 *   - isLoading, error
 */
export function useEffectiveUser() {
  const [state, setState] = useState({
    user: null,
    effectiveData: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const user = await base44.auth.me();

        if (!user) {
          setState(s => ({ ...s, error: 'Não autenticado', isLoading: false }));
          return;
        }

        // Sempre chama a backend function — ela resolve o contexto via asServiceRole
        const res = await base44.functions.invoke('getEffectiveUser', {});
        const data = res.data;

        if (data.error) {
          throw new Error(data.error);
        }

        setState({
          user,
          effectiveData: data,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('[useEffectiveUser] Erro:', error.message);
        // Fallback: usa o próprio usuário sem contexto de equipe
        try {
          const user = await base44.auth.me();
          setState({
            user,
            effectiveData: {
              email: user?.email,
              actual_email: user?.email,
              full_name: user?.full_name,
              user_type: user?.user_type,
              consultor_email: null,
              is_equipe: false,
            },
            isLoading: false,
            error: null,
          });
        } catch {
          setState(s => ({ ...s, error: error.message, isLoading: false }));
        }
      }
    };
    load();
  }, []);

  const { user, effectiveData, isLoading, error } = state;

  const isEquipe = effectiveData?.is_equipe === true;
  const isConsultor = effectiveData?.user_type === 'consultor' || user?.user_type === 'consultor';
  // Equipe de produtor: membro de equipe cujo dono é produtor
  const isEquipeProdutor = isEquipe && effectiveData?.primary_user_type === 'produtor';
  const isProdutor = (!isEquipe && !isConsultor && !!user) || isEquipeProdutor;

  // effectiveEmail: para equipe é o email do consultor; para consultor/produtor é o próprio email
  const effectiveEmail = effectiveData?.email || user?.email;
  const linkedConsultant = effectiveData?.consultor_email || null;
  const consultorName = effectiveData?.consultor_name || null;
  const memberRole = effectiveData?.member_role || null;
  const permissions = effectiveData?.permissions || {};
  const userType = effectiveData?.user_type || user?.user_type;

  const primaryUserType = effectiveData?.primary_user_type || null;

  return {
    user,
    effectiveEmail,
    linkedConsultant,
    consultorName,
    memberRole,
    permissions,
    userType,
    primaryUserType,
    isEquipe,
    isEquipeProdutor,
    isConsultor,
    isProdutor,
    isLoading,
    loading: isLoading, // alias para compatibilidade
    error,
    // alias de compatibilidade
    effectiveData,
  };
}