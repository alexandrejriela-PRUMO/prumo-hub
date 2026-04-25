import { Suspense, lazy, useState, useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/components/NavigationTracker'
import PWAUpdateNotification from '@/components/PWAUpdateNotification'
import OnlineStatusIndicator from '@/components/OnlineStatusIndicator'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import RouteProtector from '@/components/RouteProtector';

// Lazy load pages not in pagesConfig
const AcceptInvite = lazy(() => import('./pages/AcceptInvite'));
const TermsOfUsePage = lazy(() => import('./pages/TermsOfUsePage'));
const SaasContractPage = lazy(() => import('./pages/SaasContractPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AccessBlocked = lazy(() => import('./pages/AccessBlocked'));
const Parceiros = lazy(() => import('./pages/Parceiros'));
const ErrorLogsAdmin = lazy(() => import('./pages/ErrorLogsAdmin'));

import OfflineIndicator from '@/components/offline/OfflineIndicator';
import AccessBlockedGuard from '@/components/AccessBlockedGuard';
import { useOfflineSync } from '@/components/offline/OfflineSyncHook';
import { initializeOfflineDB } from '@/components/offline/OfflineStorageManager';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LoadingSpinner = () => (
  <div className="flex items-center justify-center w-full h-screen">
    <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
  </div>
);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated, refreshUser } = useAuth();
  const { isOnline, syncInProgress, syncStats } = useOfflineSync();
  const [termsChecked, setTermsChecked] = useState(false);
  const [needsTerms, setNeedsTerms] = useState(false);
  const [needsContract, setNeedsContract] = useState(false);

  // Inicializar offline DB
  useEffect(() => {
    initializeOfflineDB().catch(err => console.error('[App] Erro ao inicializar offline DB:', err));
  }, []);

  // Verificar aceitação dos termos
  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings) return;
    // Se há erro de auth ou usuário não autenticado, não precisa checar termos
    if (authError || !isAuthenticated) {
      setTermsChecked(true);
      return;
    }
    const checkTerms = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) return;

        // Verificar automaticamente se há convite de equipe pendente e aplicar user_type
        try {
          const inviteRes = await base44.functions.invoke('applyInviteConfigOnFirstLogin', {});
          if (inviteRes.data?.applied) {
            console.log('[App] user_type de equipe aplicado automaticamente:', inviteRes.data.user_type);
            // Atualiza o usuário no contexto sem recarregar a página
            await refreshUser();
            return;
          }
        } catch (inviteErr) {
          console.warn('[App] Erro ao verificar convite de equipe:', inviteErr.message);
        }
        const activeTerms = await base44.entities.TermsOfUse.filter({ is_active: true }, '-version', 1);
        if (!activeTerms || activeTerms.length === 0) {
          setTermsChecked(true);
          return;
        }
        const latestVersion = activeTerms[0].version;
        if (!user.accepted_terms_version || user.accepted_terms_version < latestVersion) {
          setNeedsTerms(true);
        } else {
          // Termos ok — verificar contrato SaaS (apenas para consultor e produtor)
          const requiresContract = user.user_type === 'consultor' || user.user_type === 'produtor';
          if (requiresContract && !user.accepted_saas_contract_version) {
            setNeedsContract(true);
          }
        }
      } catch (e) {
        console.error('[Terms] Erro ao verificar termos:', e);
      }
      setTermsChecked(true);
    };
    checkTerms();
  }, [isLoadingAuth, isLoadingPublicSettings]); // NÃO incluir authError — evita loop

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth || !termsChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Not authenticated and no error — redirect to login
  if (!isAuthenticated) {
    navigateToLogin();
    return null;
  }

  // Redirecionar para aceite de termos se necessário
  if (needsTerms) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <TermsOfUsePage onAccepted={() => { setNeedsTerms(false); setNeedsContract(true); }} />
      </Suspense>
    );
  }

  // Redirecionar para aceite do contrato SaaS se necessário
  if (needsContract) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <SaasContractPage onAccepted={() => setNeedsContract(false)} />
      </Suspense>
    );
  }

  // Render the main app
  return (
    <>
      <OfflineIndicator isOnline={isOnline} syncInProgress={syncInProgress} syncStats={syncStats} />
      <AccessBlockedGuard>
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <Suspense fallback={<LoadingSpinner />}>
              <MainPage />
            </Suspense>
          </LayoutWrapper>
        } />
        {Object.entries(Pages).filter(([path]) => path !== 'LandingPage').map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Suspense fallback={<LoadingSpinner />}>
                  <Page />
                </Suspense>
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="/AcceptInvite" element={<Suspense fallback={<LoadingSpinner />}><AcceptInvite /></Suspense>} />
        <Route path="/AccessBlocked" element={<Suspense fallback={<LoadingSpinner />}><AccessBlocked /></Suspense>} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      </AccessBlockedGuard>
    </>
  );
};


function AppContent() {
  return (
    <>
      <NavigationTracker />
      <PWAUpdateNotification />
      <OnlineStatusIndicator />
      <Routes>
        <Route path="/landing" element={<Suspense fallback={<LoadingSpinner />}><LandingPage /></Suspense>} />
        <Route path="/LandingPage" element={<Suspense fallback={<LoadingSpinner />}><LandingPage /></Suspense>} />
        <Route path="/Parceiros" element={<Suspense fallback={<LoadingSpinner />}><Parceiros /></Suspense>} />
        <Route path="/ErrorLogsAdmin" element={<Suspense fallback={<LoadingSpinner />}><ErrorLogsAdmin /></Suspense>} />
        <Route path="*" element={<AuthenticatedApp />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppContent />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App