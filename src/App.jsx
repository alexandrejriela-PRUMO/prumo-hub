import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/components/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import CARModule from './pages/CARModule';
import PaymentSettings from './pages/PaymentSettings';
import PropertyMapView from './pages/PropertyMapView';
import Agenda from './pages/Agenda';
import CRMBoard from './pages/CRMBoard';
import FinancialTransactions from './pages/FinancialTransactions';
import FinancialDashboard from './pages/FinancialDashboard';
import RuralCredit from './pages/RuralCredit';
import HarvestLoss from './pages/HarvestLoss';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
      <Route path="/CARModule" element={<LayoutWrapper currentPageName="CARModule"><CARModule /></LayoutWrapper>} />
      <Route path="/PropertyMapView" element={<LayoutWrapper currentPageName="PropertyMapView"><PropertyMapView /></LayoutWrapper>} />
      <Route path="/Agenda" element={<LayoutWrapper currentPageName="Agenda"><Agenda /></LayoutWrapper>} />
      <Route path="/CRMBoard" element={<LayoutWrapper currentPageName="CRMBoard"><CRMBoard /></LayoutWrapper>} />
      <Route path="/PaymentSettings" element={<LayoutWrapper currentPageName="PaymentSettings"><PaymentSettings /></LayoutWrapper>} />
      <Route path="/FinancialTransactions" element={<LayoutWrapper currentPageName="FinancialTransactions"><FinancialTransactions /></LayoutWrapper>} />
      <Route path="/FinancialDashboard" element={<LayoutWrapper currentPageName="FinancialDashboard"><FinancialDashboard /></LayoutWrapper>} />
      <Route path="/RuralCredit" element={<LayoutWrapper currentPageName="RuralCredit"><RuralCredit /></LayoutWrapper>} />
      <Route path="/HarvestLoss" element={<LayoutWrapper currentPageName="HarvestLoss"><HarvestLoss /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App