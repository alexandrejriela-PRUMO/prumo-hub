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
    : userType === 'consultor' || userType === 'equipe_consultor' || userType === 'equipe'
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

  return null;
}