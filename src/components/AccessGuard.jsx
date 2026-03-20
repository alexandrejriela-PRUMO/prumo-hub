/**
 * AccessGuard — Componente de controle de acesso no frontend.
 *
 * Uso básico (permissão de módulo):
 *   <AccessGuard permission="financial" action="view">
 *     <FinancialPanel />
 *   </AccessGuard>
 *
 * Uso com plano:
 *   <AccessGuard planFeature="advanced_modules">
 *     <AgriculturaPage />
 *   </AccessGuard>
 *
 * Props:
 *   permission    — chave do módulo (ex: 'office', 'financial')
 *   action        — ação requerida (ex: 'view', 'edit', 'access', 'manage')
 *   planFeature   — feature do plano (ex: 'advanced_modules', 'reports')
 *   fallback      — ReactNode alternativo quando bloqueado (padrão: banner)
 *   silent        — se true, não renderiza nada quando bloqueado
 */
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { Lock } from 'lucide-react';

const MODULE_LABELS = {
  office:           'Escritório',
  property_center:  'Central da Propriedade',
  advanced_modules: 'Módulos Avançados',
  reports:          'Relatórios',
  ai_chat:          'Chat IA Rute',
  team_management:  'Gestão de Equipe',
  financial:        'Financeiro',
};

const PLAN_LABELS = {
  advanced_modules: 'Módulos Avançados',
  reports:          'Relatórios',
  client_consultor: 'Portal do Cliente',
};

function BlockedBanner({ label, isPlan }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Lock className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">
        {isPlan ? 'Recurso não disponível no seu plano' : 'Sem permissão de acesso'}
      </h3>
      <p className="text-sm text-gray-500 max-w-xs">
        {isPlan
          ? `O módulo "${label}" requer um plano superior. Entre em contato com seu consultor ou faça upgrade.`
          : `Você não tem permissão para acessar "${label}". Solicite acesso ao consultor responsável.`
        }
      </p>
    </div>
  );
}

export default function AccessGuard({ children, permission, action, planFeature, fallback, silent = false }) {
  const { canAccess, planAllows, loading } = useEffectiveUser();

  if (loading) return null;

  // Check plan feature
  if (planFeature) {
    const allowed = planAllows(planFeature);
    if (!allowed) {
      if (silent) return null;
      return fallback ?? <BlockedBanner label={PLAN_LABELS[planFeature] || planFeature} isPlan />;
    }
  }

  // Check module permission
  if (permission && action) {
    const allowed = canAccess(permission, action);
    if (!allowed) {
      if (silent) return null;
      return fallback ?? <BlockedBanner label={MODULE_LABELS[permission] || permission} />;
    }
  }

  return children;
}