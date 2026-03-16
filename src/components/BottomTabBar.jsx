import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Building2, FileText, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { name: 'Dashboard', page: 'Home', icon: LayoutDashboard, label: 'Início' },
  { name: 'Properties', page: 'Properties', icon: Building2, label: 'Propriedades' },
  { name: 'DocumentsHub', page: 'DocumentsHub', icon: FileText, label: 'Documentos' },
  { name: 'EnvironmentalAlerts', page: 'EnvironmentalAlerts', icon: AlertTriangle, label: 'Alertas' },
];

export default function BottomTabBar({ currentPageName, userType }) {
  const navigate = useNavigate();
  const lastTabRef = useRef(null);
  const tabTapTimeRef = useRef({});

  const tabList = userType === 'client_consultor'
    ? tabs.filter(t => t.page !== 'Properties')
    : userType === 'consultor' || userType === 'equipe'
    ? [
        { name: 'Dashboard', page: 'Home', icon: LayoutDashboard, label: 'Início' },
        { name: 'ConsultorClients', page: 'ConsultorClients', icon: Users, label: 'Clientes' },
        { name: 'Properties', page: 'Properties', icon: Building2, label: 'Propriedades' },
        { name: 'EnvironmentalAlerts', page: 'EnvironmentalAlerts', icon: AlertTriangle, label: 'Alertas' },
      ]
    : tabs;

  const handleTabClick = (tabPage) => {
    const now = Date.now();
    const lastTapTime = tabTapTimeRef.current[tabPage] || 0;
    
    // If double-tapped within 300ms, reset to root (clear stack)
    if (now - lastTapTime < 300 && lastTabRef.current === tabPage) {
      window.history.go(-(window.history.length - 1));
      tabTapTimeRef.current[tabPage] = 0;
    } else {
      tabTapTimeRef.current[tabPage] = now;
      lastTabRef.current = tabPage;
    }
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-emerald-100 z-50 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {tabList.map((tab) => {
        const isActive = currentPageName === tab.page;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.page}
            to={createPageUrl(tab.page)}
            onClick={(e) => {
              if (isActive) {
                e.preventDefault();
                handleTabClick(tab.page);
              }
            }}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
              isActive ? 'text-emerald-700' : 'text-gray-400'
            )}
          >
            <Icon className={cn('w-5 h-5', isActive && 'text-emerald-700')} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className={cn('text-[10px] font-medium', isActive ? 'text-emerald-700' : 'text-gray-400')}>
              {tab.label}
            </span>
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-600 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}