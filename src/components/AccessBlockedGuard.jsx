import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const BLOCKED_STATUSES = ['suspended', 'cancelled', 'payment_failed', 'chargeback', 'inactive', 'pending_payment'];
const EXEMPT_PATHS = ['/AccessBlocked', '/AcceptInvite', '/landing', '/TermsOfUsePage'];

export default function AccessBlockedGuard({ children }) {
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Não verificar em rotas isentas
    if (EXEMPT_PATHS.some(p => location.pathname.startsWith(p))) {
      setChecked(true);
      return;
    }

    const checkAccess = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          setChecked(true);
          return;
        }

        // Admin sempre tem acesso
        if (user.role === 'admin') {
          setChecked(true);
          return;
        }

        // Buscar UserMetadata para verificar subscription_status
        const metaList = await base44.entities.UserMetadata.filter({ user_email: user.email }, '-created_date', 1);

        // Se não existe UserMetadata, verificar se veio do Nexano (já pagou)
        if (!metaList || metaList.length === 0) {
          // Verificar se há lead do Nexano com pagamento confirmado
          const leads = await base44.entities.LeadFormSubmission.filter({ email: user.email }, '-created_date', 1);
          const nexanoLead = leads && leads.find(l =>
            l.parceiro && l.parceiro.startsWith('nexano_') && l.plano && l.plano !== 'desconhecido'
          );

          if (nexanoLead) {
            // Usuário já pagou via Nexano → liberar direto com o plano correto
            try {
              await base44.entities.UserMetadata.create({
                user_email: user.email,
                user_id: user.id,
                plano: nexanoLead.plano,
                user_type: nexanoLead.user_type || (nexanoLead.perfil === 'consultor' ? 'consultor' : 'produtor'),
                max_properties: nexanoLead.max_properties || 5,
                max_users: nexanoLead.max_users || 1,
                subscription_status: 'active',
              });
            } catch (e) {
              // Ignora erro de criação duplicada
            }
            setChecked(true);
            return;
          }

          // Nenhum pagamento encontrado → bloquear com pending_payment
          try {
            await base44.entities.UserMetadata.create({
              user_email: user.email,
              user_id: user.id,
              subscription_status: 'pending_payment',
            });
          } catch (e) {
            // Ignora erro de criação duplicada
          }
          navigate('/AccessBlocked', { replace: true });
          return;
        }

        const meta = metaList[0];
        const subscriptionStatus = meta.subscription_status;

        if (BLOCKED_STATUSES.includes(subscriptionStatus)) {
          navigate('/AccessBlocked', { replace: true });
        } else {
          setChecked(true);
        }
      } catch (e) {
        // Em caso de erro, liberar acesso para não bloquear inadvertidamente
        setChecked(true);
      }
    };

    checkAccess();
  }, [location.pathname]);

  if (!checked) return null;
  return children;
}