import React, { useEffect, Suspense } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/components/NavigationTracker'
import PWAUpdateNotification from '@/components/PWAUpdateNotification'
import OnlineStatusIndicator from '@/components/OnlineStatusIndicator'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';

// Lazy load pages
const CARModule = React.lazy(() => import('./pages/CARModule'));
const PaymentSettings = React.lazy(() => import('./pages/PaymentSettings'));
const PropertyMapView = React.lazy(() => import('./pages/PropertyMapView'));
const Agenda = React.lazy(() => import('./pages/Agenda'));
const CRMBoard = React.lazy(() => import('./pages/CRMBoard'));
const FinancialTransactions = React.lazy(() => import('./pages/FinancialTransactions'));
const FinancialDashboard = React.lazy(() => import('./pages/FinancialDashboard'));
const RuralCredit = React.lazy(() => import('./pages/RuralCredit'));
const HarvestLoss = React.lazy(() => import('./pages/HarvestLoss'));
const CRA = React.lazy(() => import('./pages/CRA'));
const AcceptInvite = React.lazy(() => import('./pages/AcceptInvite'));
const NotificationAudit = React.lazy(() => import('./pages/NotificationAudit'));
const NFeManagement = React.lazy(() => import('./pages/NFeManagement'));
const ImportUsersStripe = React.lazy(() => import('./pages/ImportUsersStripe'));
const TermsOfUsePage = React.lazy(() => import('./pages/TermsOfUsePage'));
const TermsAdmin = React.lazy(() => import('./pages/TermsAdmin'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const CampMode = React.lazy(() => import('./pages/CampMode'));
const PropertyCentral = React.lazy(() => import('./pages/PropertyCentral'));
const EnvironmentalAssets = React.lazy(() => import('./pages/EnvironmentalAssets'));
const ChecklistTemplates = React.lazy(() => import('./pages/ChecklistTemplates'));
const LicenseChecklist = React.lazy(() => import('./pages/LicenseChecklist'));
const Licenses = React.lazy(() => import('./pages/Licenses'));
const BudgetGenerator = React.lazy(() => import('./pages/BudgetGenerator'));
const ContractGenerator = React.lazy(() => import('./pages/ContractGenerator'));

import OfflineIndicator from '@/components/offline/OfflineIndicator';
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
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const { isOnline, syncInProgress, syncStats } = useOfflineSync();
  const [termsChecked, setTermsChecked] = React.useState(false);
  const [needsTerms, setNeedsTerms] = React.useState(false);

  // Inicializar offline DB
  useEffect(() => {
    initializeOfflineDB().catch(err => console.error('[App] Erro ao inicializar offline DB:', err));
  }, []);

  // Verificar aceitação dos termos
  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings || authError) return;
    const checkTerms = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) return;
        const activeTerms = await base44.entities.TermsOfUse.filter({ is_active: true }, '-version', 1);
        if (!activeTerms || activeTerms.length === 0) {
          setTermsChecked(true);
          return;
        }
        const latestVersion = activeTerms[0].version;
        if (!user.accepted_terms_version || user.accepted_terms_version < latestVersion) {
          setNeedsTerms(true);
        }
      } catch (e) {
        console.error('[Terms] Erro ao verificar termos:', e);
      }
      setTermsChecked(true);
    };
    checkTerms();
  }, [isLoadingAuth, isLoadingPublicSettings, authError]);

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

  // Redirecionar para aceite de termos se necessário
  if (needsTerms) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <TermsOfUsePage onAccepted={() => setNeedsTerms(false)} />
      </Suspense>
    );
  }

  // Render the main app
  return (
    <>
      <OfflineIndicator isOnline={isOnline} syncInProgress={syncInProgress} syncStats={syncStats} />
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).filter(([path]) => path !== 'LandingPage').map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="/CARModule" element={<LayoutWrapper currentPageName="CARModule"><Suspense fallback={<LoadingSpinner />}><CARModule /></Suspense></LayoutWrapper>} />
        <Route path="/PropertyMapView" element={<LayoutWrapper currentPageName="PropertyMapView"><Suspense fallback={<LoadingSpinner />}><PropertyMapView /></Suspense></LayoutWrapper>} />
        <Route path="/Agenda" element={<LayoutWrapper currentPageName="Agenda"><Suspense fallback={<LoadingSpinner />}><Agenda /></Suspense></LayoutWrapper>} />
        <Route path="/CRMBoard" element={<LayoutWrapper currentPageName="CRMBoard"><Suspense fallback={<LoadingSpinner />}><CRMBoard /></Suspense></LayoutWrapper>} />
        <Route path="/PaymentSettings" element={<LayoutWrapper currentPageName="PaymentSettings"><Suspense fallback={<LoadingSpinner />}><PaymentSettings /></Suspense></LayoutWrapper>} />
        <Route path="/FinancialTransactions" element={<LayoutWrapper currentPageName="FinancialTransactions"><Suspense fallback={<LoadingSpinner />}><FinancialTransactions /></Suspense></LayoutWrapper>} />
        <Route path="/FinancialDashboard" element={<LayoutWrapper currentPageName="FinancialDashboard"><Suspense fallback={<LoadingSpinner />}><FinancialDashboard /></Suspense></LayoutWrapper>} />
        <Route path="/RuralCredit" element={<LayoutWrapper currentPageName="RuralCredit"><Suspense fallback={<LoadingSpinner />}><RuralCredit /></Suspense></LayoutWrapper>} />
        <Route path="/HarvestLoss" element={<LayoutWrapper currentPageName="HarvestLoss"><Suspense fallback={<LoadingSpinner />}><HarvestLoss /></Suspense></LayoutWrapper>} />
        <Route path="/CampMode" element={<LayoutWrapper currentPageName="CampMode"><Suspense fallback={<LoadingSpinner />}><CampMode /></Suspense></LayoutWrapper>} />
        <Route path="/PropertyCentral" element={<LayoutWrapper currentPageName="PropertyCentral"><Suspense fallback={<LoadingSpinner />}><PropertyCentral /></Suspense></LayoutWrapper>} />
        <Route path="/EnvironmentalAssets" element={<LayoutWrapper currentPageName="EnvironmentalAssets"><Suspense fallback={<LoadingSpinner />}><EnvironmentalAssets /></Suspense></LayoutWrapper>} />
        <Route path="/ChecklistTemplates" element={<LayoutWrapper currentPageName="ChecklistTemplates"><Suspense fallback={<LoadingSpinner />}><ChecklistTemplates /></Suspense></LayoutWrapper>} />
        <Route path="/LicenseChecklist" element={<LayoutWrapper currentPageName="LicenseChecklist"><Suspense fallback={<LoadingSpinner />}><LicenseChecklist /></Suspense></LayoutWrapper>} />
        <Route path="/Licenses" element={<LayoutWrapper currentPageName="Licenses"><Suspense fallback={<LoadingSpinner />}><Licenses /></Suspense></LayoutWrapper>} />
        <Route path="/AcceptInvite" element={<Suspense fallback={<LoadingSpinner />}><AcceptInvite /></Suspense>} />
        <Route path="/NotificationAudit" element={<LayoutWrapper currentPageName="NotificationAudit"><Suspense fallback={<LoadingSpinner />}><NotificationAudit /></Suspense></LayoutWrapper>} />
        <Route path="/NFeManagement" element={<LayoutWrapper currentPageName="NFeManagement"><Suspense fallback={<LoadingSpinner />}><NFeManagement /></Suspense></LayoutWrapper>} />
        <Route path="/ImportUsersStripe" element={<LayoutWrapper currentPageName="ImportUsersStripe"><Suspense fallback={<LoadingSpinner />}><ImportUsersStripe /></Suspense></LayoutWrapper>} />
        <Route path="/BudgetGenerator" element={<LayoutWrapper currentPageName="BudgetGenerator"><Suspense fallback={<LoadingSpinner />}><BudgetGenerator /></Suspense></LayoutWrapper>} />
        <Route path="/ContractGenerator" element={<LayoutWrapper currentPageName="ContractGenerator"><Suspense fallback={<LoadingSpinner />}><ContractGenerator /></Suspense></LayoutWrapper>} />
        <Route path="/TermsAdmin" element={<LayoutWrapper currentPageName="TermsAdmin"><Suspense fallback={<LoadingSpinner />}><TermsAdmin /></Suspense></LayoutWrapper>} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <PWAUpdateNotification />
          <OnlineStatusIndicator />
          <Routes>
            <Route path="/landing" element={<Suspense fallback={<LoadingSpinner />}><LandingPage /></Suspense>} />
            <Route path="*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App