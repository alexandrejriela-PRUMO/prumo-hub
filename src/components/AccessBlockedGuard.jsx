import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

// Apenas statuses que representam falha/cancelamento real de pagamento bloqueiam o acesso.
// 'pending_payment' sozinho NÃO bloqueia — usuário pode ter acabado de ser criado via webhook
// e ainda não teve o UserMetadata confirmado. O bloqueio só ocorre se não houver nenhum
// indício de pagamento (lead Nexano ativo, TeamMember ou metadata confirmado).
const BLOCKED_STATUSES = ['suspended', 'cancelled', 'payment_failed', 'chargeback', 'inactive'];
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

        // Equipe e visualizadores (client_consultor) nunca são bloqueados por pagamento
        if (user.user_type === 'equipe' || user.user_type === 'client_consultor') {
          setChecked(true);
          return;
        }

        // Buscar UserMetadata para verificar subscription_status
        const metaList = await base44.entities.UserMetadata.filter({ user_email: user.email }, '-created_date', 1);

        // Se não existe UserMetadata, investigar antes de bloquear
        if (!metaList || metaList.length === 0) {
          // 1. Usuário criado pelo webhook da Nexano tem created_via_webhook = true → liberar
          if (user.created_via_webhook || user.subscription_status === 'active') {
            setChecked(true);
            return;
          }

          // 2. Verificar lead Nexano com pagamento confirmado
          const leads = await base44.entities.LeadFormSubmission.filter({ email: user.email }, '-created_date', 1);
          const nexanoLead = leads && leads.find(l =>
            l.parceiro && l.parceiro.startsWith('nexano_') && l.plano && l.plano !== 'desconhecido'
          );

          if (nexanoLead && nexanoLead.subscription_status === 'active') {
            // Usuário já pagou via Nexano e não cancelou → criar metadata e liberar
            const resolvedType = nexanoLead.user_type || (nexanoLead.perfil === 'consultor' ? 'consultor' : 'produtor');
            try {
              await base44.entities.UserMetadata.create({
                user_email: user.email,
                user_id: user.id,
                plano: nexanoLead.plano,
                user_type: resolvedType,
                max_properties: nexanoLead.max_properties || 5,
                max_users: nexanoLead.max_users || 1,
                subscription_status: 'active',
              });
            } catch (e) { /* ignora duplicata */ }
            // Sincronizar user_type no User para o layout funcionar corretamente
            try {
              await base44.auth.updateMe({
                user_type: resolvedType,
                plano: nexanoLead.plano,
                subscription_status: 'active',
              });
            } catch (e) { /* ignora */ }
            setChecked(true);
            return;
          }

          // 3. Verificar se é membro de equipe ou visualizador (TeamMember)
          const teamMembers = await base44.entities.TeamMember.filter({ member_email: user.email }, '-created_date', 1);
          if (teamMembers && teamMembers.length > 0) {
            setChecked(true);
            return;
          }

          // 4. Nenhum pagamento ou vínculo encontrado → bloquear
          try {
            await base44.entities.UserMetadata.create({
              user_email: user.email,
              user_id: user.id,
              subscription_status: 'pending_payment',
            });
          } catch (e) { /* ignora duplicata */ }
          navigate('/AccessBlocked', { replace: true });
          return;
        }

        const meta = metaList[0];

        // Equipe e visualizadores nunca são bloqueados por pagamento (verificar também no metadata)
        if (meta.user_type === 'equipe' || meta.user_type === 'client_consultor') {
          setChecked(true);
          return;
        }

        const subscriptionStatus = meta.subscription_status;

        // pending_payment OU statuses bloqueados → verificar antes de bloquear
        if (BLOCKED_STATUSES.includes(subscriptionStatus) || subscriptionStatus === 'pending_payment') {
          // Se o user foi criado via webhook da Nexano, nunca bloquear
          if (user.created_via_webhook || user.subscription_status === 'active') {
            try {
              await base44.entities.UserMetadata.update(meta.id, { subscription_status: 'active' });
            } catch (e) { /* ignora */ }
            setChecked(true);
            return;
          }

          // Se o UserMetadata foi criado há menos de 30 minutos, liberar
          // (webhook pode estar processando em background)
          const metaAge = meta.created_date ? Date.now() - new Date(meta.created_date).getTime() : Infinity;
          if (metaAge < 30 * 60 * 1000) {
            setChecked(true);
            return;
          }

          // Verificar lead Nexano com pagamento confirmado
          const leads = await base44.entities.LeadFormSubmission.filter({ email: user.email }, '-created_date', 1);
          const nexanoLead = leads && leads.find(l =>
            l.parceiro && l.parceiro.startsWith('nexano_') &&
            l.plano && l.plano !== 'desconhecido'
          );

          if (nexanoLead && nexanoLead.subscription_status === 'active') {
            // Usuário pagou via Nexano e não cancelou → corrigir metadata e liberar acesso
            const resolvedType = nexanoLead.user_type || meta.user_type;
            const resolvedPlano = nexanoLead.plano || meta.plano;
            try {
              await base44.entities.UserMetadata.update(meta.id, {
                subscription_status: 'active',
                plano: resolvedPlano,
                user_type: resolvedType,
                max_properties: nexanoLead.max_properties || meta.max_properties,
                max_users: nexanoLead.max_users || meta.max_users,
              });
            } catch (e) { /* ignora */ }
            // Sincronizar user_type no User para o layout funcionar corretamente
            try {
              await base44.auth.updateMe({
                user_type: resolvedType,
                plano: resolvedPlano,
                subscription_status: 'active',
              });
            } catch (e) { /* ignora */ }
            setChecked(true);
            return;
          }

          // Statuses de falha real → bloquear
          if (BLOCKED_STATUSES.includes(subscriptionStatus)) {
            navigate('/AccessBlocked', { replace: true });
            return;
          }
          // pending_payment sem lead e UserMetadata antigo → bloquear
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