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

const CampMode = React.lazy(() => import('./pages/CampMode'));
const PropertyCentral = React.lazy(() => import('./pages/PropertyCentral'));
const EnvironmentalAssets = React.lazy(() => import('./pages/EnvironmentalAssets'));
import OfflineIndicator from '@/components/offline/OfflineIndicator';
import { useOfflineSync } from '@/components/offline/OfflineSyncHook';
import { initializeOfflineDB } from '@/components/offline/OfflineStorageManager';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
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

  // Inicializar offline DB
  useEffect(() => {
    initializeOfflineDB().catch(err => console.error('[App] Erro ao inicializar offline DB:', err));
  }, []);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
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
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
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
      {Object.entries(Pages).map(([path, Page]) => (
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
      <Route path="/AcceptInvite" element={<Suspense fallback={<LoadingSpinner />}><AcceptInvite /></Suspense>} />
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
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App