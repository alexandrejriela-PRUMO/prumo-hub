import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import BottomTabBar from './components/BottomTabBar';
import ThemeProvider from './components/ThemeProvider';
import RouteTransition from './components/mobile/RouteTransition';
import NotificationCenter from './components/notifications/NotificationCenter';
import RealtimeNotificationCenter from './components/notifications/RealtimeNotificationCenter';
import { Badge } from '@/components/ui/badge';
import {
              LayoutDashboard,
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
              Cloud,
              Sparkles,
              Map,
              ClipboardList,
              ScrollText,
              TreePine
                    } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Menus por perfil ────────────────────────────────────────────────────────

// Consultor: topo do menu
const consultorNavItems = [
  { name: 'Dashboard', page: 'Home', icon: LayoutDashboard },
  { name: 'Meus Clientes', page: 'ConsultorClients', icon: Users },
  { name: 'Gestão de Propriedades e Empreendimentos', page: 'Properties', icon: Building2 },
];

// Produtor Rural: menu completo
const produtorNavItems = [
  { name: 'Dashboard', page: 'Home', icon: LayoutDashboard },
  { name: 'Minhas Propriedades e Empreendimentos', page: 'Properties', icon: Building2 },
  { name: 'Meus Contratos', page: 'Contracts', icon: ScrollText },
  { name: 'Documentos', page: 'DocumentsHub', icon: FileText },
  { name: 'Licenças Ambientais', page: 'Licenses', icon: FileCheck },
  { name: 'Gestão do CAR', page: 'CARModule', icon: TreePine },
  { name: 'Processos', page: 'Processes', icon: Scale },
  { name: 'Alertas de Infrações', page: 'EnvironmentalAlerts', icon: AlertTriangle },
  { name: 'Termômetro de Regularidade', page: 'RegularityReport', icon: FileCheck },
  { name: 'PRAD - Recuperação de Área', page: 'PRAD', icon: Leaf },
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
      { name: 'Servidão Ambiental', page: 'EnvironmentalEasements', icon: Shield },
      { name: 'ESG para o Agro', page: 'ESGAgro', icon: TrendingUp },
    ]
  },
  { name: 'Georreferenciamento', page: 'Georeferencing', icon: MapPin },
  { name: 'Relatórios', page: 'Reports', icon: FileText },
  { name: 'Configurar Notificações', page: 'NotificationSettings', icon: Bell },
  { name: 'Chat IA Rute', page: 'ChatRute', icon: MessageCircle },
  { name: 'Minha Equipe', page: 'MyTeam', icon: Users },
];

// Equipe do consultor: igual ao consultor, sem "Minha Equipe"
const equipeNavItems = [
  { name: 'Dashboard', page: 'Home', icon: LayoutDashboard },
  { name: 'Meus Clientes', page: 'ConsultorClients', icon: Users },
  { name: 'Gestão de Propriedades e Empreendimentos', page: 'Properties', icon: Building2 },
  { name: 'Meus Contratos', page: 'Contracts', icon: ScrollText },
  { name: 'Documentos', page: 'DocumentsHub', icon: FileText },
  { name: 'Licenças Ambientais', page: 'Licenses', icon: FileCheck },
  { name: 'Gestão do CAR', page: 'CARModule', icon: TreePine },
  { name: 'Processos', page: 'Processes', icon: Scale },
  { name: 'Alertas de Infrações', page: 'EnvironmentalAlerts', icon: AlertTriangle },
  { name: 'Termômetro de Regularidade', page: 'RegularityReport', icon: FileCheck },
  { name: 'PRAD - Recuperação de Área', page: 'PRAD', icon: Leaf },
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
      { name: 'Servidão Ambiental', page: 'EnvironmentalEasements', icon: Shield },
      { name: 'ESG para o Agro', page: 'ESGAgro', icon: TrendingUp },
    ]
  },
  { name: 'Georreferenciamento', page: 'Georeferencing', icon: MapPin },
  { name: 'Relatórios', page: 'Reports', icon: FileText },
  { name: 'Configurar Notificações', page: 'NotificationSettings', icon: Bell },
  { name: 'Chat IA Rute', page: 'ChatRute', icon: MessageCircle },
];

// Cliente do consultor (Enterprise): somente leitura/download, sem IA, notificações ou equipe
const clientConsultorNavItems = [
  { name: 'Minha Propriedade', page: 'ClientConsultorPortal', icon: Building2 },
  { name: 'Documentos', page: 'DocumentsHub', icon: FileText },
  { name: 'Licenças Ambientais', page: 'Licenses', icon: FileCheck },
  { name: 'Processos', page: 'Processes', icon: Scale },
  { name: 'Alertas de Infrações', page: 'EnvironmentalAlerts', icon: AlertTriangle },
  { name: 'Termômetro de Regularidade', page: 'RegularityReport', icon: FileCheck },
  { name: 'PRAD - Recuperação de Área', page: 'PRAD', icon: Leaf },
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
      { name: 'Servidão Ambiental', page: 'EnvironmentalEasements', icon: Shield },
    ]
  },
  { name: 'Georreferenciamento', page: 'Georeferencing', icon: MapPin },
];

// Consultor: itens adicionais abaixo dos fixos (consultorNavItems)
const navItems = [
  { name: 'Meus Contratos', page: 'Contracts', icon: ScrollText },
  { name: 'Documentos', page: 'DocumentsHub', icon: FileText },
  { name: 'Licenças Ambientais', page: 'Licenses', icon: FileCheck },
  { name: 'Gestão do CAR', page: 'CARModule', icon: TreePine },
  { name: 'Processos', page: 'Processes', icon: Scale },
  { name: 'Alertas de Infrações', page: 'EnvironmentalAlerts', icon: AlertTriangle },
  { name: 'Termômetro de Regularidade', page: 'RegularityReport', icon: FileCheck },
  { name: 'PRAD - Recuperação de Área', page: 'PRAD', icon: Leaf },
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
      { name: 'Servidão Ambiental', page: 'EnvironmentalEasements', icon: Shield },
      { name: 'ESG para o Agro', page: 'ESGAgro', icon: TrendingUp },
    ]
  },
  { name: 'Georreferenciamento', page: 'Georeferencing', icon: MapPin },
  { name: 'Relatórios', page: 'Reports', icon: FileText },
  { name: 'Configurar Notificações', page: 'NotificationSettings', icon: Bell },
  { name: 'Chat IA Rute', page: 'ChatRute', icon: MessageCircle },
  { name: 'Minha Equipe', page: 'MyTeam', icon: Users },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({});

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['inAppNotifications', user?.email],
    queryFn: () => base44.entities.InAppNotification.filter(
      { user_email: user.email },
      '-created_date',
      50
    ),
    enabled: !!user?.email,
    refetchInterval: 30000
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    base44.auth.logout();
  };

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
          <Menu className="w-6 h-6 text-emerald-900" />
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
                  Assinatura e Boletos
                </Link>
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
                Assinatura e Boletos
              </Link>
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
              // Seleciona o menu correto com base no tipo de usuário
              let menuItems = [];
              const ut = user?.user_type;
              if (ut === 'client_consultor') {
                menuItems = clientConsultorNavItems;
              } else if (ut === 'equipe') {
                menuItems = equipeNavItems;
              } else if (ut === 'consultor') {
                menuItems = [...consultorNavItems, ...navItems];
              } else {
                // produtor ou padrão
                menuItems = produtorNavItems;
              }

              return menuItems.map((item, index) => {
                const itemKey = item.page || `${item.name}-${index}`;
                if (item.children) {
                  const isExpanded = expandedMenus[item.name];
                  const hasActiveChild = item.children.some(child => child.page === currentPageName);
                  const Icon = item.icon;
                  return (
                    <div key={itemKey}>
                      <button
                        onClick={() => setExpandedMenus(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                          hasActiveChild ? "bg-emerald-800/50 text-white" : "text-emerald-200 hover:bg-emerald-800/50 hover:text-white"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", hasActiveChild ? "text-amber-400" : "text-emerald-400 group-hover:text-amber-400")} />
                        <span className="font-medium text-sm">{item.name}</span>
                        <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", isExpanded && "rotate-180")} />
                      </button>
                      {isExpanded && (
                        <div className="mt-1 space-y-1">
                          {item.children.map((child) => {
                            const isActive = currentPageName === child.page;
                            const ChildIcon = child.icon;
                            return (
                              <Link
                                key={child.page}
                                to={createPageUrl(child.page)}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 group",
                                  isActive
                                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30"
                                    : "text-emerald-200 hover:bg-emerald-800/30 hover:text-white"
                                )}
                              >
                                <ChildIcon className={cn("w-4 h-4", isActive ? "text-white" : "text-emerald-400 group-hover:text-amber-400")} />
                                <span className="font-medium text-xs">{child.name}</span>
                                {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
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
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                      isActive
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30"
                        : "text-emerald-200 hover:bg-emerald-800/50 hover:text-white"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-emerald-400 group-hover:text-amber-400")} />
                    <span className="font-medium text-sm">{item.name}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
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
      <main className="lg:ml-72 pt-20 lg:pt-16 min-h-screen">
        <div className="p-3 sm:p-4 lg:p-8 pb-safe lg:pb-8">
          <ErrorBoundary>
            <RouteTransition>
              {children}
            </RouteTransition>
          </ErrorBoundary>
        </div>
      </main>
    </div>
    </ThemeProvider>
  );
}