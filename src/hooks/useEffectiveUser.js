import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook crítico para determinar o contexto de usuário (consultor ou equipe)
 * Retorna: user, linkedConsultant, memberRole, permissions
 * 
 * - Se consultor: linkedConsultant = seu próprio email
 * - Se equipe: linkedConsultant = email do consultor responsável
 * - Se produtor: linkedConsultant = null (sem acesso a módulos consultores)
 */
export function useEffectiveUser() {
  const [state, setState] = useState({
    user: null,
    linkedConsultant: null,
    memberRole: null,
    permissions: {},
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const load = async () => {
      try {
        const user = await base44.auth.me();
        
        if (!user) {
          setState(s => ({ ...s, 
            error: 'Não autenticado',
            isLoading: false 
          }));
          return;
        }

        // Se for consultor, linkedConsultant = seu próprio email
        if (user.user_type === 'consultor') {
          setState(s => ({ ...s, 
            user, 
            linkedConsultant: user.email,
            memberRole: 'Consultor',
            permissions: {
              office: { view: true, edit: true },
              property_center: { view: true, edit: true },
              advanced_modules: { access: true },
              reports: { view: true },
              ai_chat: { access: true },
              team_management: { manage: true },
              financial: { view: true }
            },
            isLoading: false 
          }));
          return;
        }

        // Se for equipe, buscar TeamMember
        if (user.user_type === 'equipe') {
          const members = await base44.asServiceRole.entities.TeamMember.filter({
            member_email: user.email,
            status: 'Ativo'
          });
          
          if (members.length === 0) {
            throw new Error('Nenhuma filiação de equipe ativa encontrada. Você pode não ter aceitado o convite ainda.');
          }
          
          const member = members[0];
          setState(s => ({ ...s, 
            user,
            linkedConsultant: member.primary_user_email,
            memberRole: member.member_role,
            permissions: member.permissions || {},
            isLoading: false
          }));
          return;
        }

        // Se for produtor ou outro tipo, não tem acesso a módulos consultores
        setState(s => ({ ...s, 
          user, 
          linkedConsultant: null,
          isLoading: false 
        }));
      } catch (error) {
        console.error('[useEffectiveUser] Erro:', error.message);
        setState(s => ({ ...s, 
          error: error.message, 
          isLoading: false 
        }));
      }
    };
    load();
  }, []);

  const { user, linkedConsultant, memberRole, permissions, isLoading, error } = state;
  const isEquipe = user?.user_type === 'equipe';
  const isConsultor = user?.user_type === 'consultor';
  const isProdutor = user?.user_type === 'produtor' || (!isEquipe && !isConsultor && !!user);

  // effectiveEmail: para consultor/equipe é o email do consultor responsável; para produtor é o próprio email
  const effectiveEmail = isEquipe || isConsultor ? linkedConsultant : user?.email;

  return {
    ...state,
    isEquipe,
    isConsultor,
    isProdutor,
    effectiveEmail,
    loading: isLoading, // alias para compatibilidade
  };
}