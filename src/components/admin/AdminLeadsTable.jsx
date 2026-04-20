import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, RefreshCw, Search, CheckCircle2, Clock, Pencil, Trash2, X, Save } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_COLORS = {
  start: 'bg-gray-100 text-gray-700',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-orange-100 text-orange-700',
  unico: 'bg-emerald-100 text-emerald-700',
  desconhecido: 'bg-red-100 text-red-600',
};

const PERFIS = ['consultor', 'produtor'];
const PLANOS = ['start', 'pro', 'enterprise', 'unico'];
const STATUSES = ['pending_invite', 'invited', 'active', 'inactive'];

function EditLeadModal({ lead, onClose, onSaved }) {
  const [form, setForm] = useState({ ...lead });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.LeadFormSubmission.update(lead.id, {
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        perfil: form.perfil,
        plano: form.plano,
        subscription_status: form.subscription_status,
        estado: form.estado,
        especialidade: form.especialidade,
      });
      toast.success('Lead atualizado!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Editar Lead</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nome</label>
              <input
                value={form.nome || ''}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">E-mail</label>
              <input
                value={form.email || ''}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Telefone</label>
              <input
                value={form.telefone || ''}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Estado (UF)</label>
              <input
                value={form.estado || ''}
                onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Perfil</label>
              <select
                value={form.perfil || ''}
                onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Plano</label>
              <select
                value={form.plano || ''}
                onChange={e => setForm(f => ({ ...f, plano: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">—</option>
                {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
            <select
              value={form.subscription_status || ''}
              onChange={e => setForm(f => ({ ...f, subscription_status: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Especialidade / Atividade</label>
            <input
              value={form.especialidade || ''}
              onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLeadsTable() {
  const [search, setSearch] = useState('');
  const [inviting, setInviting] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-leads'],
    queryFn: async () => {
      const res = await base44.functions.invoke('adminGetUsers', { type: 'leads' });
      return res.data.leads || [];
    },
  });

  const filtered = leads.filter(l =>
    (l.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.nome || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = async (lead) => {
    setInviting(lead.id);
    try {
      await base44.functions.invoke('adminUpdateLead', {
        leadId: lead.id,
        inviteEmail: lead.email,
        inviteRole: 'user',
      });
      queryClient.invalidateQueries(['admin-leads']);
      toast.success(`Convite enviado para ${lead.email}`);
    } catch (err) {
      toast.error(`Erro ao convidar: ${err.message}`);
    } finally {
      setInviting(null);
    }
  };

  const handleDelete = async (lead) => {
    if (!confirm(`Excluir o lead "${lead.nome || lead.email}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(lead.id);
    try {
      await base44.entities.LeadFormSubmission.delete(lead.id);
      toast.success('Lead excluído.');
      refetch();
    } catch (err) {
      toast.error('Erro ao excluir: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {editingLead && (
        <EditLeadModal
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSaved={() => refetch()}
        />
      )}

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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{lead.nome || '—'}</p>
                    <p className="text-xs text-gray-500">{lead.email}</p>
                    {lead.telefone && <p className="text-xs text-gray-400">{lead.telefone}</p>}
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
                    <div className="flex items-center gap-2">
                      {lead.subscription_status !== 'invited' && (
                        <button
                          onClick={() => handleInvite(lead)}
                          disabled={inviting === lead.id}
                          className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium disabled:opacity-50"
                          title="Convidar"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          {inviting === lead.id ? '...' : 'Convidar'}
                        </button>
                      )}
                      <button
                        onClick={() => setEditingLead(lead)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(lead)}
                        disabled={deletingId === lead.id}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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