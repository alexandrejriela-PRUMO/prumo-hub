import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook para obter permissões efetivas do usuário da equipe
 * Valida permissões armazenadas na entity TeamMember
 */
export function useEffectiveUserPermissions(user) {
  const [permissions, setPermissions] = useState(null);
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
        // Busca registro do membro da equipe
        const teamMembers = await base44.entities.TeamMember.filter(
          { member_email: user.email },
          '-created_date',
          1
        );

        if (teamMembers && teamMembers.length > 0) {
          const teamMember = teamMembers[0];
          setPermissions(teamMember.permissions || {});
        } else {
          setPermissions({});
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