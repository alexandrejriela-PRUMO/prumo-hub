import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const BLOCKED_STATUSES = ['suspended', 'cancelled', 'payment_failed', 'chargeback', 'inactive'];
const EXEMPT_PATHS = ['/AccessBlocked', '/AcceptInvite', '/landing', '/TermsOfUsePage'];

export default function AccessBlockedGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Não verificar em rotas isentas
    if (EXEMPT_PATHS.some(p => location.pathname.startsWith(p))) {
      setChecked(true);
      return;
    }

    base44.auth.me().then((user) => {
      if (!user) {
        setChecked(true);
        return;
      }
      const isBlocked =
        BLOCKED_STATUSES.includes(user.status) ||
        BLOCKED_STATUSES.includes(user.subscription_status);

      if (isBlocked) {
        navigate('/AccessBlocked', { replace: true });
      } else {
        setChecked(true);
      }
    }).catch(() => {
      setChecked(true);
    });
  }, [location.pathname]);

  if (!checked) return null;
  return children;
}