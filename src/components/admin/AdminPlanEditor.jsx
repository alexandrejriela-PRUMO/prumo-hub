import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';

const PLANOS = [
  { value: 'start', label: 'Consultor Start', user_type: 'consultor', max_properties: 5, max_users: 1 },
  { value: 'pro', label: 'Consultor Pro', user_type: 'consultor', max_properties: 10, max_users: 2 },
  { value: 'enterprise', label: 'Consultor Enterprise', user_type: 'consultor', max_properties: 200, max_users: 3 },
  { value: 'unico', label: 'Produtor Único', user_type: 'produtor', max_properties: 1, max_users: 1 },
];

const USER_TYPES = ['consultor', 'produtor', 'equipe', 'client_consultor'];
const ROLES = ['user', 'admin'];
const STATUSES = ['active', 'inactive', 'pending_invite'];

export default function AdminPlanEditor({ user, onClose }) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    plano: user.plano || '',
    user_type: user.user_type || '',
    role: user.role || 'user',
    max_properties: user.max_properties || 1,
    max_users: user.max_users || 1,
    subscription_status: user.subscription_status || 'active',
  });

  const mutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('adminUpdateUser', { userId: user.id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-all-users']);
      queryClient.invalidateQueries(['admin-users-stats']);
      toast.success('Usuário atualizado com sucesso!');
      onClose();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const handlePlanChange = (planValue) => {
    const plan = PLANOS.find(p => p.value === planValue);
    if (plan) {
      setForm(f => ({
        ...f,
        plano: plan.value,
        user_type: plan.user_type,
        max_properties: plan.max_properties,
        max_users: plan.max_users,
      }));
    } else {
      setForm(f => ({ ...f, plano: planValue }));
    }
  };

  const handleSave = () => {
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Editar Permissões</h3>
            <p className="text-sm text-gray-500">{user.full_name || user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Plano */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
            <select
              value={form.plano}
              onChange={e => handlePlanChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              <option value="">Selecione um plano...</option>
              {PLANOS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Tipo de usuário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Usuário</label>
            <select
              value={form.user_type}
              onChange={e => setForm(f => ({ ...f, user_type: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              <option value="">Selecione...</option>
              {USER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role do Sistema</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Limites */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Propriedades</label>
              <input
                type="number"
                value={form.max_properties}
                onChange={e => setForm(f => ({ ...f, max_properties: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Usuários</label>
              <input
                type="number"
                value={form.max_users}
                onChange={e => setForm(f => ({ ...f, max_users: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* Status da assinatura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status da Assinatura</label>
            <select
              value={form.subscription_status}
              onChange={e => setForm(f => ({ ...f, subscription_status: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}