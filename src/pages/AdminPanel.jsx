import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminUserTable from '@/components/admin/AdminUserTable';
import AdminLeadsTable from '@/components/admin/AdminLeadsTable';
import AdminClientPropertyLink from '@/components/admin/AdminClientPropertyLink';
import AdminPlanEditor from '@/components/admin/AdminPlanEditor';
import { Shield, Users, Inbox, Settings, BarChart3, RefreshCw, Link as LinkIcon } from 'lucide-react';

const TABS = [
  { key: 'users', label: 'Usuários', icon: Users },
  { key: 'leads', label: 'Leads / Pendentes', icon: Inbox },
  { key: 'clients', label: 'Clientes-Propriedades', icon: LinkIcon },
  { key: 'stats', label: 'Resumo', icon: BarChart3 },
];

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Shield className="w-16 h-16 text-red-300" />
        <h2 className="text-xl font-bold text-gray-700">Acesso Restrito</h2>
        <p className="text-gray-500">Esta área é exclusiva para administradores do sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel de Administração</h1>
          <p className="text-sm text-gray-500">Gerenciamento de usuários, planos e acessos do sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'users' && (
        <AdminUserTable onEdit={setEditingUser} />
      )}
      {activeTab === 'leads' && (
        <AdminLeadsTable />
      )}
      {activeTab === 'clients' && (
        <AdminClientPropertyLink />
      )}
      {activeTab === 'stats' && (
        <AdminStatsPanel />
      )}

      {/* Plan Editor Modal */}
      {editingUser && (
        <AdminPlanEditor
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}

function AdminStatsPanel() {
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-stats'],
    queryFn: async () => {
      const res = await base44.functions.invoke('adminGetUsers', { type: 'users' });
      return res.data.users || [];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['admin-leads-stats'],
    queryFn: async () => {
      const res = await base44.functions.invoke('adminGetUsers', { type: 'leads' });
      return res.data.leads || [];
    },
  });

  const byType = users.reduce((acc, u) => {
    const t = u.user_type || 'sem_tipo';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const byPlan = users.reduce((acc, u) => {
    const p = u.plano || 'sem_plano';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  const pendingLeads = leads.filter(l => l.subscription_status === 'pending_invite');

  const stats = [
    { label: 'Total de Usuários', value: users.length, color: 'bg-blue-50 text-blue-700' },
    { label: 'Produtores', value: byType['produtor'] || 0, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Consultores', value: byType['consultor'] || 0, color: 'bg-amber-50 text-amber-700' },
    { label: 'Leads Pendentes', value: pendingLeads.length, color: 'bg-red-50 text-red-700' },
    { label: 'Plano Start', value: byPlan['start'] || 0, color: 'bg-gray-50 text-gray-700' },
    { label: 'Plano Pro', value: byPlan['pro'] || 0, color: 'bg-purple-50 text-purple-700' },
    { label: 'Plano Enterprise', value: byPlan['enterprise'] || 0, color: 'bg-orange-50 text-orange-700' },
    { label: 'Plano Único (Produtor)', value: byPlan['unico'] || 0, color: 'bg-teal-50 text-teal-700' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-xl p-5 ${s.color} border border-current/10`}>
          <p className="text-3xl font-extrabold">{s.value}</p>
          <p className="text-sm font-medium mt-1 opacity-80">{s.label}</p>
        </div>
      ))}
    </div>
  );
}