import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, RefreshCw, Search, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_COLORS = {
  start: 'bg-gray-100 text-gray-700',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-orange-100 text-orange-700',
  unico: 'bg-emerald-100 text-emerald-700',
  desconhecido: 'bg-red-100 text-red-600',
};

const USER_TYPE_FROM_PLAN = {
  start: 'consultor',
  pro: 'consultor',
  enterprise: 'consultor',
  unico: 'produtor',
};

export default function AdminLeadsTable() {
  const [search, setSearch] = useState('');
  const [inviting, setInviting] = useState(null);
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-leads'],
    queryFn: () => base44.entities.LeadFormSubmission.list('-submitted_at', 200),
  });

  const filtered = leads.filter(l =>
    (l.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.nome || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = async (lead) => {
    setInviting(lead.id);
    try {
      const role = lead.plano === 'admin' ? 'admin' : 'user';
      await base44.users.inviteUser(lead.email, role);

      // Marcar lead como convidado
      await base44.entities.LeadFormSubmission.update(lead.id, {
        subscription_status: 'invited',
        invited_at: new Date().toISOString(),
      });

      queryClient.invalidateQueries(['admin-leads']);
      toast.success(`Convite enviado para ${lead.email}`);
    } catch (err) {
      toast.error(`Erro ao convidar: ${err.message}`);
    } finally {
      setInviting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar lead..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
        <span className="text-sm text-gray-400">{filtered.length} leads</span>
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome / E-mail</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Perfil</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Plano</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Data</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{lead.nome || '—'}</p>
                    <p className="text-xs text-gray-500">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${lead.perfil === 'consultor' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'}`}>
                      {lead.perfil || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PLAN_COLORS[lead.plano] || 'bg-gray-100 text-gray-600'}`}>
                      {lead.plano || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {lead.subscription_status === 'invited' ? (
                      <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Convidado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-yellow-700 font-medium">
                        <Clock className="w-3.5 h-3.5" /> {lead.subscription_status || 'pendente'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {lead.submitted_at ? new Date(lead.submitted_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {lead.subscription_status !== 'invited' ? (
                      <button
                        onClick={() => handleInvite(lead)}
                        disabled={inviting === lead.id}
                        className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        {inviting === lead.id ? 'Enviando...' : 'Convidar'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">Nenhum lead encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}