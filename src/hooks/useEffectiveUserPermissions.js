import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Cache em nível de módulo — persiste entre remontagens do Layout (navegação)
// para evitar que o menu suma brevemente enquanto as permissões recarregam
let _cachedPermissions = null;
let _cachedPermissionsEmail = null;

/**
 * Hook para obter permissões efetivas do usuário da equipe
 * Valida permissões armazenadas na entity TeamMember
 */
export function useEffectiveUserPermissions(user) {
  const [permissions, setPermissions] = useState(
    user?.email === _cachedPermissionsEmail ? _cachedPermissions : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isEquipeVariant = ['equipe', 'equipe_consultor', 'equipe_produtor'].includes(user.user_type);
    if (!user?.email || !isEquipeVariant) {
      setPermissions(null);
      return;
    }

    const loadPermissions = async () => {
      try {
        setLoading(true);
        // Busca registros ativos do membro filtrando por status e pending_user_type para evitar
        // pegar um TeamMember de outro contexto (ex: equipe_consultor antigo para um equipe_produtor)
        const filterByType = { member_email: user.email, status: 'Ativo', pending_user_type: user.user_type };
        let teamMembers = await base44.entities.TeamMember.filter(filterByType, '-created_date', 1);

        // Fallback: se não encontrar com o tipo exato, buscar qualquer Ativo
        if (!teamMembers || teamMembers.length === 0) {
          teamMembers = await base44.entities.TeamMember.filter(
            { member_email: user.email, status: 'Ativo' },
            '-created_date',
            1
          );
        }

        if (teamMembers && teamMembers.length > 0) {
          const perms = teamMembers[0].permissions || {};
          setPermissions(perms);
          _cachedPermissions = perms;
          _cachedPermissionsEmail = user?.email;
        } else {
          setPermissions({});
          _cachedPermissions = {};
          _cachedPermissionsEmail = user?.email;
        }
      } catch (error) {
        console.error('[Permissions] Erro ao carregar permissões:', error);
        setPermissions({});
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user?.email, user?.user_type]);

  /**
   * Verifica se o usuário tem permissão para um módulo/ação específica
   * @param {string} moduleKey - ex: 'office', 'property_center'
   * @param {string} field - ex: 'view', 'edit', 'access'
   * @returns {boolean}
   */
  const hasPermission = (moduleKey, field = 'view') => {
    if (!permissions) return false;
    return permissions[moduleKey]?.[field] === true;
  };

  /**
   * Verifica se o usuário pode acessar um módulo inteiro
   */
  const canAccessModule = (moduleKey) => {
    if (!permissions) return false;
    const module = permissions[moduleKey];
    if (!module) return false;
    // Pode acessar se tem qualquer permissão no módulo
    return Object.values(module).some(v => v === true);
  };

  return {
    permissions,
    loading,
    hasPermission,
    canAccessModule,
  };
}