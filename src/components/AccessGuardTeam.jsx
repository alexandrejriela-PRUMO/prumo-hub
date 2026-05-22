import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { AlertCircle, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Componente de proteção de acesso para módulos consultores
 * Valida: linkedConsultant, requiredModules, requiredRole
 * 
 * Uso:
 * <AccessGuardTeam requiredModules={['advanced_modules']}>
 *   <YourContent />
 * </AccessGuardTeam>
 */
export default function AccessGuardTeam({ 
  children, 
  requiredModules = [], 
  requiredRole = null,
  fallbackMessage = null 
}) {
  const { user, memberRole, permissions, linkedConsultant, isEquipeProdutor, isLoading, error } = useEffectiveUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // equipe_produtor tem acesso total — não precisa de permissões granulares
  if (isEquipeProdutor) return <>{children}</>;

  // Erro de carregamento ou não autenticado
  if (error || !linkedConsultant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md w-full border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h2 className="text-lg font-bold text-red-700">Acesso Negado</h2>
              <p className="text-sm text-red-600">
                {error || fallbackMessage || 'Você não tem permissão para acessar este módulo. Entre em contato com seu consultor.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Validar role se necessário
  if (requiredRole && memberRole !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md w-full border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <Lock className="w-12 h-12 text-yellow-600 mx-auto" />
              <h2 className="text-lg font-bold text-yellow-700">Permissão Insuficiente</h2>
              <p className="text-sm text-yellow-600">
                Apenas <strong>{requiredRole}</strong> podem acessar este módulo. Seu papel: <strong>{memberRole}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Validar módulos se necessário
  for (const module of requiredModules) {
    const hasAccess = 
      permissions?.[module]?.access === true || 
      permissions?.[module]?.view === true;
    
    if (!hasAccess) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
          <Card className="max-w-md w-full border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <Lock className="w-12 h-12 text-red-500 mx-auto" />
                <h2 className="text-lg font-bold text-red-700">Módulo Não Permitido</h2>
                <p className="text-sm text-red-600">
                  Você não tem permissão para acessar <strong>{module}</strong>. Solicite acesso ao seu consultor.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Acesso permitido
  return <>{children}</>;
}