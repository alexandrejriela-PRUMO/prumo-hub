import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, Pencil, RefreshCw } from 'lucide-react';

const PLAN_LABELS = {
  start: { label: 'Consultor Start', color: 'bg-gray-100 text-gray-700' },
  pro: { label: 'Consultor Pro', color: 'bg-blue-100 text-blue-700' },
  enterprise: { label: 'Consultor Enterprise', color: 'bg-orange-100 text-orange-700' },
  unico: { label: 'Produtor Único', color: 'bg-emerald-100 text-emerald-700' },
};

const TYPE_LABELS = {
  consultor: 'bg-amber-100 text-amber-800',
  produtor: 'bg-teal-100 text-teal-800',
  equipe: 'bg-purple-100 text-purple-800',
  client_consultor: 'bg-blue-100 text-blue-800',
};

const TYPE_NAMES = {
  consultor: 'Consultor',
  produtor: 'Produtor',
  equipe: 'Equipe',
  client_consultor: 'Cliente',
};

export default function AdminUserTable({ onEdit }) {
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const res = await base44.functions.invoke('adminGetUsers', { type: 'users' });
      return res.data.users || [];
    },
  });

  const filtered = users.filter(u =>
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
        <span className="text-sm text-gray-400">{filtered.length} usuários</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Usuário</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Plano</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Consultor Principal</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
             {filtered.map((u) => {
               // Verifica se é um convite pendente
               const isPending = u.is_pending_invite === true;

               // Plano: equipe e client_consultor herdam do consultor principal
               const isSecondary = u.user_type === 'equipe' || u.user_type === 'client_consultor';
               const planKey = isSecondary ? (u.plano_display || u.plano) : u.plano;
               const planInfo = PLAN_LABELS[planKey];
               const typeColor = TYPE_LABELS[u.user_type] || 'bg-gray-100 text-gray-700';
               return (
                 <tr key={u.id} className={`${isPending ? 'bg-yellow-50/50' : 'hover:bg-gray-50'} transition-colors`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.full_name || '—'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {u.user_type ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeColor}`}>
                          {TYPE_NAMES[u.user_type] || u.user_type}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {planInfo ? (
                        <div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${planInfo.color}`}>
                            {planInfo.label}
                          </span>
                          {isSecondary && <p className="text-[10px] text-gray-400 mt-0.5">herdado</p>}
                        </div>
                      ) : <span className="text-gray-400 text-xs">{planKey || '—'}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {isSecondary && u.primary_consultor_email ? (
                        <div>
                          <p className="text-xs font-medium text-gray-700">{u.primary_consultor_name || u.primary_consultor_email}</p>
                          <p className="text-[10px] text-gray-400">{u.primary_consultor_email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                          Convite Pendente
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {u.subscription_status || 'ativo'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onEdit(u)}
                        className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">Nenhum usuário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}