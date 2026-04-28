import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import PullToRefresh from './components/mobile/PullToRefresh';
import BottomTabBar from './components/BottomTabBar';
import ThemeProvider from './components/ThemeProvider';
import RouteTransition from './components/mobile/RouteTransition';
import RealtimeNotificationCenter from './components/notifications/RealtimeNotificationCenter';
import { useRealtimeNotifications } from '@/components/notifications/useRealtimeNotifications';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
              LayoutDashboard,
              CalendarDays,
              FileCheck,
              FileText,
              MapPin,
              MessageCircle,
              Headphones,
              CreditCard,
              Users,
              Scale,
              Newspaper,
              Menu,
              X,
              LogOut,
              ChevronRight,
              ChevronDown,
              AlertTriangle,
              Settings,
              BarChart3,
              Bell,
              Building2,
              Leaf,
              Droplets,
              Shield,
              TrendingUp,
              TrendingDown,
              Cloud,
              Sparkles,
              Map,
              ClipboardList,
              ScrollText,
              TreePine,
              Briefcase,
              Building,
              Wallet,
              Sprout,
              Wheat,
              ReceiptText,
              Smartphone,
              ChevronLeft,
              AlertCircle,
              Trash2
                    } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffectiveUserPermissions } from '@/hooks/useEffectiveUserPermissions';

// ── Menus por perfil ────────────────────────────────────────────────────────

// Consultor: topo do menu
const consultorNavItems = [
  {
    name: 'Meu Escritório',
    icon: Briefcase,
    children: [
      { name: 'Dashboard', page: 'Home', icon: LayoutDashboard },
      { name: 'Agenda', page: 'Agenda', icon: CalendarDays },
      { name: 'CRM Prumo', page: 'CRMBoard', icon: ClipboardList },
      { name: 'Meus Clientes', page: 'ConsultorClients', icon: Users },
      { name: 'Propriedades e Empreendimentos', page: 'Properties', icon: Building2 },
      { name: 'Meus Contratos', page: 'Contracts', icon: ScrollText },
      { name: 'Gerador de Contratos', page: 'ContractGenerator', icon: FileText },
      { name: 'Gerador de Orçamentos', page: 'BudgetGenerator', icon: ReceiptText },
      { name: 'Minha Equipe', page: 'MyTeam', icon: Users },
    ]
  },
  {
    name: 'Controle Financeiro',
    icon: Wallet,
    children: [
      { name: 'Painel Financeiro', page: 'FinancialDashboard', icon: BarChart3 },
      { name: 'Transações Consolidadas', page: 'FinancialTransactions', icon: ReceiptText },
      { name: 'Config. de Pagamento', page: 'PaymentSettings', icon: CreditCard, badge: 'Em breve' },
      { name: 'Notas Fiscais (NF-e)', page: 'NFeManagement', icon: ReceiptText, badge: 'Em breve' },
    ]
  },
];

// Produtor Rural: menu completo
const produtorNavItems = [
  { name: 'Dashboard', page: 'Home', icon: LayoutDashboard },
  {
    name: 'Central da Propriedade',
    icon: Building2,
    children: [
      { name: 'Visão Geral', page: 'PropertyCentral', icon: Building2 },
      { name: 'Documentos', page: 'DocumentsHub', icon: FileText },
      { name: 'Licenças e Projetos', page: 'Licenses', icon: FileCheck },
      { name: 'Gestão do CAR', page: 'CARModule', icon: TreePine },
      { name: 'Mapa Interativo', page: 'PropertyMapView', icon: Map },
      { name: 'Processos', page: 'Processes', icon: Scale },
      { name: 'Alertas de Infrações', page: 'EnvironmentalAlerts', icon: AlertTriangle },
      { name: 'Termômetro de Regularidade', page: 'RegularityReport', icon: BarChart3 },
      { name: 'PRAD - Recuperação de Área', page: 'PRAD', icon: Leaf },
      { name: 'Georreferenciamento', page: 'Georeferencing', icon: MapPin },
    ]
  },
  { 
    name: 'Agricultura de Precisão', 
    icon: Sparkles,
    children: [
      { name: 'Mapeamentos', page: 'Mappings', icon: Map },
      { name: 'Monitoramento Climático', page: 'ClimateMonitoring', icon: Cloud },
      { name: 'Análise de Commodities', page: 'CommodityAnalysis', icon: BarChart3 },
    ]
  },
  { 
    name: 'Ativos Ambientais', 
    icon: TrendingUp,
    children: [
      { name: 'Créditos de Carbono', page: 'CarbonCredits', icon: Leaf },
      { name: 'PSA - Serviços Ambientais', page: 'PSAContracts', icon: Droplets },
      { name: 'Cotas de Reserva Ambiental', page: 'EnvironmentalAssets', icon: Leaf },
      { name: 'Servidão Ambiental', page: 'EnvironmentalEasements', icon: Shield },
      { name: 'ESG para o Agro', page: 'ESGAgro', icon: TrendingUp },
    ]
  },
  {
    name: 'Crédito e Safra',
    icon: Sprout,
    children: [
      { name: 'Gestão de Crédito Rural', page: 'RuralCredit', icon: Building2 },
      { name: 'Frustração de Safra', page: 'HarvestLoss', icon: Wheat },
    ]
  },
  { name: 'Requerimentos', page: 'Requests', icon: ClipboardList },
  { name: 'Relatórios', page: 'Reports', icon: FileText },
  { name: 'Configurar Notificações', page: 'NotificationSettings', icon: Bell },
  { name: 'Minha Equipe', page: 'MyTeam', icon: Users, separator: true },
  { name: 'Modo Campo', page: 'CampMode', icon: Smartphone },
  { name: 'Chat IA Rute', page: 'ChatRute', icon: MessageCircle },
  { name: 'Termos de Uso (Admin)', page: 'TermsAdmin', icon: ScrollText, adminOnly: true },
  { name: 'Painel de Admin', page: 'AdminPanel', icon: Shield, adminOnly: true },
  ];

// Equipe do consultor: igual ao consultor, sem "Minha Equipe"
const equipeNavItems = [
  {
    name: 'Meu Escritório',
    icon: Briefcase,
    children: [
      { name: 'Dashboard', page: 'Home', icon: LayoutDashboard },
      { name: 'Agenda', page: 'Agenda', icon: CalendarDays },
      { name: 'CRM Prumo', page: 'CRMBoard', icon: ClipboardList },
      { name: 'Meus Clientes', page: 'ConsultorClients', icon: Users },
      { name: 'Propriedades e Empreendimentos', page: 'Properties', icon: Building2 },
      { name: 'Meus Contratos', page: 'Contracts', icon: ScrollText },
      { name: 'Gerar Novo Contrato', page: 'ContractGenerator', icon: FileText },
      { name: 'Gerador de Orçamentos', page: 'BudgetGenerator', icon: ReceiptText },
    ]
  },
  {
    name: 'Central da Propriedade',
    icon: Building,
    children: [
      { name: 'Visão Geral', page: 'PropertyCentral', icon: Building2 },
      { name: 'Documentos', page: 'DocumentsHub', icon: FileText },
      { name: 'Licenças e Projetos', page: 'Licenses', icon: FileCheck },
      { name: 'Gestão do CAR', page: 'CARModule', icon: TreePine },
      { name: 'Mapa Interativo', page: 'PropertyMapView', icon: Map },
      { name: 'Processos', page: 'Processes', icon: Scale },
      { name: 'Alertas de Infrações', page: 'EnvironmentalAlerts', icon: AlertTriangle },
      { name: 'Termômetro de Regularidade', page: 'RegularityReport', icon: FileCheck },
      { name: 'PRAD - Recuperação de Área', page: 'PRAD', icon: Leaf },
      { name: 'Georreferenciamento', page: 'Georeferencing', icon: MapPin },
    ]
  },
  { 
    name: 'Agricultura de Precisão', 
    icon: Sparkles,
    children: [
      { name: 'Mapeamentos', page: 'Mappings', icon: Map },
      { name: 'Monitoramento Climático', page: 'ClimateMonitoring', icon: Cloud },
    ]
  },
  { 
    name: 'Ativos Ambientais', 
    icon: TrendingUp,
    children: [
      { name: 'Créditos de Carbono', page: 'CarbonCredits', icon: Leaf },
      { name: 'PSA - Serviços Ambientais', page: 'PSAContracts', icon: Droplets },
      { name: 'Cotas de Reserva Ambiental', page: 'EnvironmentalAssets', icon: Leaf },
      { name: 'Servidão Ambiental', page: 'EnvironmentalEasements', icon: Shield },
      { name: 'ESG para o Agro', page: 'ESGAgro', icon: TrendingUp },
    ]
  },
  {
    name: 'Controle Financeiro',
    icon: Wallet,
    children: [
      { name: 'Painel Financeiro', page: 'FinancialDashboard', icon: BarChart3 },
      { name: 'Transações Consolidadas', page: 'FinancialTransactions', icon: ReceiptText },
    ]
  },
  {
    name: 'Crédito e Safra',
    icon: Sprout,
    children: [
      { name: 'Gestão de Crédito Rural', page: 'RuralCredit', icon: Building2 },
      { name: 'Frustração de Safra', page: 'HarvestLoss', icon: Wheat },
    ]
  },
  { name: 'Relatórios', page: 'Reports', icon: FileText },
  { name: 'Configurar Notificações', page: 'NotificationSettings', icon: Bell },
  { name: 'Chat IA Rute', page: 'ChatRute', icon: MessageCircle },
  { name: 'Modo Campo', page: 'CampMode', icon: Smartphone, separator: true },
];

// Cliente do consultor (Enterprise): somente leitura/download, sem IA, notificações ou equipe
const clientConsultorNavItems = [
  { name: 'Minha Propriedade', page: 'ClientConsultorPortal', icon: Building2 },
  {
    name: 'Central da Propriedade',
    icon: Building,
    children: [
      { name: 'Visão Geral', page: 'PropertyCentral', icon: Building2 },
      { name: 'Documentos', page: 'DocumentsHub', icon: FileText },
      { name: 'Licenças e Projetos', page: 'Licenses', icon: FileCheck },
      { name: 'Processos', page: 'Processes', icon: Scale },
      { name: 'Alertas de Infrações', page: 'EnvironmentalAlerts', icon: AlertTriangle },
      { name: 'Termômetro de Regularidade', page: 'RegularityReport', icon: FileCheck },
      { name: 'PRAD - Recuperação de Área', page: 'PRAD', icon: Leaf },
      { name: 'Georreferenciamento', page: 'Georeferencing', icon: MapPin },
    ]
  },
  { 
    name: 'Agricultura de Precisão', 
    icon: Sparkles,
    children: [
      { name: 'Mapeamentos', page: 'Mappings', icon: Map },
      { name: 'Monitoramento Climático', page: 'ClimateMonitoring', icon: Cloud },
    ]
  },
  { 
    name: 'Ativos Ambientais', 
    icon: TrendingUp,
    children: [
      { name: 'Créditos de Carbono', page: 'CarbonCredits', icon: Leaf },
      { name: 'PSA - Serviços Ambientais', page: 'PSAContracts', icon: Droplets },
      { name: 'Cotas de Reserva Ambiental', page: 'EnvironmentalAssets', icon: Leaf },
      { name: 'Servidão Ambiental', page: 'EnvironmentalEasements', icon: Shield },
    ]
  },
];

// Consultor: itens adicionais abaixo dos fixos (consultorNavItems)
const navItems = [
  {
    name: 'Central da Propriedade',
    icon: Building,
    children: [
      { name: 'Visão Geral', page: 'PropertyCentral', icon: Building2 },
      { name: 'Documentos', page: 'DocumentsHub', icon: FileText },
      { name: 'Licenças e Projetos', page: 'Licenses', icon: FileCheck },
      { name: 'Gestão do CAR', page: 'CARModule', icon: TreePine },
      { name: 'Mapa Interativo', page: 'PropertyMapView', icon: Map },
      { name: 'Processos', page: 'Processes', icon: Scale },
      { name: 'Alertas de Infrações', page: 'EnvironmentalAlerts', icon: AlertTriangle },
      { name: 'Termômetro de Regularidade', page: 'RegularityReport', icon: FileCheck },
      { name: 'PRAD - Recuperação de Área', page: 'PRAD', icon: Leaf },
      { name: 'Georreferenciamento', page: 'Georeferencing', icon: MapPin },
    ]
  },
  { 
    name: 'Agricultura de Precisão', 
    icon: Sparkles,
    children: [
      { name: 'Mapeamentos', page: 'Mappings', icon: Map },
      { name: 'Monitoramento Climático', page: 'ClimateMonitoring', icon: Cloud },
      { name: 'Análise de Commodities', page: 'CommodityAnalysis', icon: BarChart3 },
    ]
  },
  { 
    name: 'Ativos Ambientais', 
    icon: TrendingUp,
    children: [
      { name: 'Créditos de Carbono', page: 'CarbonCredits', icon: Leaf },
      { name: 'PSA - Serviços Ambientais', page: 'PSAContracts', icon: Droplets },
      { name: 'Cotas de Reserva Ambiental', page: 'EnvironmentalAssets', icon: Leaf },
      { name: 'Servidão Ambiental', page: 'EnvironmentalEasements', icon: Shield },
      { name: 'ESG para o Agro', page: 'ESGAgro', icon: TrendingUp },
    ]
  },
  {
    name: 'Crédito e Safra',
    icon: Sprout,
    children: [
      { name: 'Gestão de Crédito Rural', page: 'RuralCredit', icon: Building2 },
      { name: 'Frustração de Safra', page: 'HarvestLoss', icon: Wheat },
    ]
  },
  { name: 'Relatórios', page: 'Reports', icon: FileText },
  { name: 'Configurar Notificações', page: 'NotificationSettings', icon: Bell },
  { name: 'Chat IA Rute', page: 'ChatRute', icon: MessageCircle },
  { name: 'Modo Campo', page: 'CampMode', icon: Smartphone },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const location = useLocation();
  const queryClient = useQueryClient();
  const { hasPermission, canAccessModule } = useEffectiveUserPermissions(user);

  const [userMeta, setUserMeta] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData?.email) {
          const metaList = await base44.entities.UserMetadata.filter({ user_email: userData.email }, '-created_date', 1);
          if (metaList?.length > 0) setUserMeta(metaList[0]);
        }
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);

  // Auto-expand menus that contain the current active page
  useEffect(() => {
    if (!currentPageName) return;
    const allMenus = [...consultorNavItems, ...equipeNavItems, ...navItems, ...produtorNavItems, ...clientConsultorNavItems];
    allMenus.forEach(item => {
      if (item.children && item.children.some(child => child.page === currentPageName)) {
        setExpandedMenus(prev => ({ ...prev, [item.name]: true }));
      }
    });
  }, [currentPageName]);

  const { unreadCount, notifications, markAsRead, markAllAsRead, deleteNotification } = useRealtimeNotifications(user?.email);

  const handleLogout = () => {
    base44.auth.logout('/landing');
  };

  const handleDeleteAccount = async () => {
    if (!user?.email) return;
    setDeleting(true);
    try {
      await base44.auth.updateMe({ status: 'inactive', deleted_at: new Date().toISOString() });
      toast.success('Conta desativada com sucesso.');
      await new Promise(r => setTimeout(r, 1000));
      base44.auth.logout();
    } catch (error) {
      toast.error('Erro ao desativar conta.');
      console.error(error);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleRefresh = async () => {
    queryClient.invalidateQueries();
  };

  // Check if on root page
  const isRootPage = currentPageName === 'Home' || !currentPageName;

  return (
    <ThemeProvider>
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50/30">
      <style>{`
        :root {
          --color-primary: #1B4332;
          --color-primary-light: #40916C;
          --color-accent: #C9A227;
        }
        html, body {
          overscroll-behavior: none;
          overscroll-behavior-y: none;
          -webkit-overflow-scrolling: touch;
        }
        button, a, [role="button"] {
          -webkit-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        svg { -webkit-user-select: none; user-select: none; }
        .pb-safe { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 4.5rem) !important; }
      `}</style>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-b border-emerald-100 z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl hover:bg-emerald-50 transition-colors"
        >
          {!isRootPage ? (
            <ChevronLeft className="w-6 h-6 text-emerald-900" onClick={(e) => { e.stopPropagation(); window.history.back(); }} />
          ) : (
            <Menu className="w-6 h-6 text-emerald-900" />
          )}
        </button>
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png" 
          alt="PRUMO Hub" 
          className="h-16 w-auto object-contain"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotificationOpen(true)}
            className="relative p-2 rounded-xl hover:bg-emerald-50 transition-colors"
          >
            <Bell className="w-6 h-6 text-emerald-900" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </button>
          {user && (
            <div className="relative group">
              <button className="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                </div>
              </button>
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-emerald-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="px-4 py-3 border-b border-emerald-100">
                  <p className="text-sm font-medium text-emerald-900 truncate">{user.full_name || 'Cliente'}</p>
                  <p className="text-xs text-emerald-600 truncate">{user.email}</p>
                </div>
                <Link to={createPageUrl('Support')} className="flex items-center gap-3 px-4 py-2 hover:bg-emerald-50 transition-colors text-sm text-emerald-900">
                  <Headphones className="w-4 h-4" />
                  Suporte
                </Link>
                <Link to={createPageUrl('Invoices')} className="flex items-center gap-3 px-4 py-2 hover:bg-emerald-50 transition-colors text-sm text-emerald-900">
                    <CreditCard className="w-4 h-4" />
                    Assinatura
                  </Link>
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-sm text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Deletar Conta
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-emerald-50 transition-colors text-sm text-emerald-900"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex fixed top-0 left-72 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-emerald-100 z-40 items-center justify-end px-6 gap-4">
        <button
          onClick={() => setNotificationOpen(true)}
          className="relative p-2 rounded-xl hover:bg-emerald-50 transition-colors"
        >
          <Bell className="w-5 h-5 text-emerald-900" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>
        {user && (
          <div className="relative group">
            <button className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-emerald-50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold">
                {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-emerald-900">{user.full_name || 'Cliente'}</p>
                <p className="text-xs text-emerald-600">{user.email}</p>
              </div>
            </button>
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-emerald-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <Link to={createPageUrl('Support')} className="flex items-center gap-3 px-4 py-2 hover:bg-emerald-50 transition-colors text-sm text-emerald-900">
                <Headphones className="w-4 h-4" />
                Suporte
              </Link>
              <Link to={createPageUrl('Invoices')} className="flex items-center gap-3 px-4 py-2 hover:bg-emerald-50 transition-colors text-sm text-emerald-900">
                <CreditCard className="w-4 h-4" />
                Assinatura
              </Link>
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-sm text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Deletar Conta
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-emerald-50 transition-colors text-sm text-emerald-900"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Center */}
            <RealtimeNotificationCenter 
              user={user}
              isOpen={notificationOpen}
              onClose={() => setNotificationOpen(false)}
              notifications={notifications}
              unreadCount={unreadCount}
              markAsRead={markAsRead}
              markAllAsRead={markAllAsRead}
              deleteNotification={deleteNotification}
            />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[80vw] max-w-xs bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 z-50 transition-all duration-300 ease-out shadow-2xl",
          "lg:w-72 lg:translate-x-0 lg:shadow-xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-emerald-800/50">
            <div className="flex flex-col items-center gap-3 w-full">
              {(() => {
                const typeLabel = {
                  consultor: 'Consultor',
                  equipe: 'Equipe',
                  client_consultor: 'Cliente',
                  produtor: 'Produtor',
                }[user?.user_type] || 'Produtor';
                const isConsultorFamily = user?.user_type === 'consultor' || user?.user_type === 'equipe';
                const isClient = user?.user_type === 'client_consultor';
                const gradient = isConsultorFamily
                  ? 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)'
                  : isClient
                  ? 'linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb)'
                  : 'linear-gradient(135deg, #e5e7eb, #a1a5b4, #6b7280)';
                const subtitle = isConsultorFamily
                  ? 'Ferramentas e oportunidades para quem orienta'
                  : isClient
                  ? 'Acesso à sua propriedade'
                  : 'Direção e estratégia para quem produz';
                return (
                  <>
                    <p className="text-xs font-semibold italic tracking-widest uppercase" style={{fontFamily: 'Georgia, serif', backgroundImage: gradient, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                      {typeLabel}
                    </p>
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696695a3a998559f4c16429b/9e64158f0_PRUMO1.png" 
                      alt="PRUMO Hub" 
                      className="w-48 h-auto object-contain"
                    />
                    <p className="text-xs italic font-light tracking-wide text-center" style={{fontFamily: 'Georgia, serif', backgroundImage: gradient, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                      {subtitle}
                    </p>
                  </>
                );
              })()}
              <button
               onClick={() => setSidebarOpen(false)}
               className="lg:hidden absolute right-6 top-6 p-2 rounded-xl hover:bg-emerald-800/50 transition-colors"
              >
               <X className="w-5 h-5 text-emerald-400" />
              </button>
              </div>
              </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {(() => {
              // Plano do consultor: Enterprise tem acesso completo; Start/Pro têm restrições
              const plano = userMeta?.plano || user?.plano || 'start';
              const isEnterprise = plano === 'enterprise';

              // Seleciona o menu correto com base no tipo de usuário
              let menuItems = [];
              const ut = user?.user_type;
              if (ut === 'client_consultor') {
                menuItems = clientConsultorNavItems;
              } else if (ut === 'equipe') {
                menuItems = equipeNavItems;
              } else if (ut === 'consultor') {
                // Páginas exclusivas do plano Enterprise para consultores
                const enterpriseOnlyPages = ['CRMBoard', 'Agenda', 'FinancialDashboard', 'FinancialTransactions', 'PaymentSettings', 'NFeManagement'];
                const filterByPlan = (items) => items.map(item => {
                  if (!item.children) return item;
                  return {
                    ...item,
                    children: item.children.filter(child => isEnterprise || !enterpriseOnlyPages.includes(child.page))
                  };
                }).filter(item => !item.children || item.children.length > 0);
                menuItems = [...filterByPlan(consultorNavItems), ...navItems];
              } else {
                // produtor ou padrão
                menuItems = produtorNavItems;
              }

              // Função para mapear page name para module key
              const getModuleKey = (pageName) => {
                if (!pageName) return null;
                // Mapeamento de páginas para módulos
                const pageToModule = {
                  'Home': 'office',
                  'Agenda': 'office',
                  'CRMBoard': 'office',
                  'ConsultorClients': 'office',
                  'Properties': 'office',
                  'Contracts': 'office',
                  'ContractGenerator': 'office',
                  'BudgetGenerator': 'office',
                  'MyTeam': 'team_management',
                  'PropertyCentral': 'property_center',
                  'DocumentsHub': 'property_center',
                  'Licenses': 'property_center',
                  'CARModule': 'property_center',
                  'PropertyMapView': 'property_center',
                  'Processes': 'property_center',
                  'EnvironmentalAlerts': 'property_center',
                  'RegularityReport': 'property_center',
                  'PRAD': 'property_center',
                  'Georeferencing': 'property_center',
                  'Mappings': 'advanced_modules',
                  'ClimateMonitoring': 'advanced_modules',
                  'CommodityAnalysis': 'advanced_modules',
                  'CarbonCredits': 'advanced_modules',
                  'PSAContracts': 'advanced_modules',
                  'EnvironmentalAssets': 'advanced_modules',
                  'EnvironmentalEasements': 'advanced_modules',
                  'ESGAgro': 'advanced_modules',
                  'RuralCredit': 'advanced_modules',
                  'HarvestLoss': 'advanced_modules',
                  'Reports': 'reports',
                  'ChatRute': 'ai_chat',
                  'FinancialDashboard': 'financial',
                  'FinancialTransactions': 'financial',
                  'PaymentSettings': 'financial',
                  'NFeManagement': 'financial',
                  'RuralCredit': 'advanced_modules',
                  'HarvestLoss': 'advanced_modules',
                };
                return pageToModule[pageName];
              };

              // Filtra itens baseado em permissões
               const filteredItems = menuItems.filter(item => {
                 // Filtro adminOnly: apenas usuários admin
                 if (item.adminOnly && user?.role !== 'admin') {
                   return false;
                 }
                 // Filtro de equipe: verifica permissões por módulo
                 if (user?.user_type === 'equipe') {
                   if (!item.page && !item.children) return true;
                   const moduleKey = getModuleKey(item.page);
                   if (!moduleKey) return true;
                   return canAccessModule(moduleKey);
                 }
                 return true;
               });

              return filteredItems.map((item, index) => {
                const itemKey = item.page || `${item.name}-${index}`;
                if (item.children) {
                  const isExpanded = expandedMenus[item.name];
                  const hasActiveChild = item.children.some(child => child.page === currentPageName);
                  const isGroupActive = currentPageName === item.page || hasActiveChild;
                  const Icon = item.icon;
                  return (
                    <div key={itemKey} className="mb-1">
                      <button
                        onClick={() => {
                          setExpandedMenus(prev => ({ ...prev, [item.name]: !prev[item.name] }));
                          if (item.page) {
                            window.location.href = createPageUrl(item.page);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group border",
                          isGroupActive
                            ? "bg-emerald-700/60 text-white border-emerald-600/60 shadow-sm"
                            : "text-emerald-100 hover:bg-emerald-800/60 hover:text-white border-emerald-800/40 hover:border-emerald-600/40"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                          isGroupActive ? "bg-amber-500/20" : "bg-emerald-800/60 group-hover:bg-emerald-700/60"
                        )}>
                          <Icon className={cn("w-4 h-4", isGroupActive ? "text-amber-400" : "text-emerald-400 group-hover:text-amber-400")} />
                        </div>
                        <span className="font-semibold text-xs uppercase tracking-wider">{item.name}</span>
                        <ChevronDown className={cn("w-3.5 h-3.5 ml-auto transition-transform text-emerald-400", isExpanded && "rotate-180")} />
                      </button>
                      {isExpanded && (
                        <div className="mt-1 ml-3 pl-3 border-l-2 border-emerald-700/50 space-y-0.5 py-1">
                          {item.children.filter(child => {
                            if (user?.user_type !== 'equipe') return true;
                            const moduleKey = getModuleKey(child.page);
                            if (!moduleKey) return true;
                            return canAccessModule(moduleKey);
                          }).map((child) => {
                            const isActive = currentPageName === child.page;
                            const ChildIcon = child.icon;
                            return (
                              <Link
                                key={child.page}
                                to={createPageUrl(child.page)}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                  "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 group",
                                  isActive
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "text-emerald-300 hover:bg-emerald-800/40 hover:text-white border border-transparent"
                                )}
                              >
                                <ChildIcon className={cn("w-3.5 h-3.5 flex-shrink-0", isActive ? "text-amber-400" : "text-emerald-500 group-hover:text-emerald-300")} />
                                <span className={cn("text-xs leading-tight", isActive ? "font-semibold" : "font-normal")}>{child.name}</span>
                                {child.badge && <span className="ml-auto text-[9px] font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded px-1.5 py-0.5 leading-none">{child.badge}</span>}
                                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = currentPageName === item.page;
                const Icon = item.icon;
                return (
                  <Link
                    key={itemKey}
                    to={createPageUrl(item.page)}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group border",
                      isActive
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 border-amber-400/30"
                        : "text-emerald-200 hover:bg-emerald-800/50 hover:text-white border-transparent hover:border-emerald-700/40"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                      isActive ? "bg-white/20" : "bg-emerald-800/60 group-hover:bg-emerald-700/60"
                    )}>
                      <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-emerald-400 group-hover:text-amber-400")} />
                    </div>
                    <span className="font-medium text-sm">{item.name}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />}
                  </Link>
                );
              });
            })()}
          </nav>


        </div>
      </aside>

      {/* Bottom Tab Bar (mobile only) */}
      <BottomTabBar currentPageName={currentPageName} userType={user?.user_type} />

      {/* Main Content */}
      <main className="lg:ml-72 pt-20 lg:pt-16 min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50/20">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-safe lg:pb-8">
            <ErrorBoundary>
              <RouteTransition>
                {children}
              </RouteTransition>
            </ErrorBoundary>
          </div>
        </PullToRefresh>
      </main>

      {/* Delete Account Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Deletar Conta</h3>
            </div>
            <p className="text-gray-700 text-sm">
              Tem certeza que deseja desativar sua conta? Esta ação desativará sua conta e você será desconectado.
            </p>
            <p className="text-gray-500 text-xs">
              Você poderá reativar sua conta entrando em contato com o suporte.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {deleting ? 'Deletando...' : 'Deletar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ThemeProvider>
  );
}