import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Landmark, Wallet, Banknote } from 'lucide-react';
import { toast } from 'sonner';

const ACCOUNT_TYPES = ['Caixa', 'Conta Corrente', 'Conta Poupança', 'PIX', 'Outro'];
const ACCOUNT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16'];

const TYPE_ICONS = {
  'Caixa': Banknote,
  'Conta Corrente': Landmark,
  'Conta Poupança': Landmark,
  'PIX': Wallet,
  'Outro': Wallet,
};

const EMPTY = { name: '', account_type: 'Conta Corrente', bank_name: '', initial_balance: '', color: '#3b82f6', notes: '' };

export default function AccountsManager({ consultorEmail }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const qc = useQueryClient();

  const { data: finData } = useQuery({
    queryKey: ['fin-data', consultorEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('listConsultorFinancials', {});
      return res.data || {};
    },
    enabled: !!consultorEmail,
  });
  const accounts = finData?.accounts || [];

  const createMutation = useMutation({
    mutationFn: (d) => base44.functions.invoke('manageFinancialAccount', { action: 'create', data: d }),
    onSuccess: () => { qc.invalidateQueries(['fin-data']); close(); toast.success('Conta criada!'); },
    onError: (e) => toast.error('Erro ao criar conta: ' + (e?.message || '')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.functions.invoke('manageFinancialAccount', { action: 'update', id, data }),
    onSuccess: () => { qc.invalidateQueries(['fin-data']); close(); toast.success('Conta atualizada!'); },
    onError: (e) => toast.error('Erro ao atualizar conta: ' + (e?.message || '')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('manageFinancialAccount', { action: 'delete', id }),
    onSuccess: () => { qc.invalidateQueries(['fin-data']); toast.success('Conta removida!'); },
    onError: (e) => toast.error('Erro ao remover conta: ' + (e?.message || '')),
  });

  const open = (acc = null) => {
    if (acc) { setEditing(acc); setForm({ ...EMPTY, ...acc, initial_balance: String(acc.initial_balance ?? '') }); }
    else { setEditing(null); setForm(EMPTY); }
    setShowForm(true);
  };
  const close = () => {
    if (JSON.stringify(form) !== JSON.stringify(EMPTY) && !editing) {
      const confirmed = window.confirm('Você tem alterações não salvas. Deseja fechar sem salvar?');
      if (!confirmed) return;
    }
    setShowForm(false); setEditing(null); setForm(EMPTY);
  };

  const save = () => {
    if (!form.name) { toast.error('Informe o nome da conta.'); return; }
    const payload = { ...form, initial_balance: parseFloat(form.initial_balance) || 0, consultor_email: consultorEmail };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const userAccounts = accounts.filter(a => !a.is_stripe);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Gerencie as contas para categorizar suas transações.</p>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => open()}>
          <Plus className="w-4 h-4" /> Nova Conta
        </Button>
      </div>

      {/* User accounts */}
      {userAccounts.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
          Nenhuma conta cadastrada. Adicione uma conta corrente ou outra forma de recebimento.
        </div>
      ) : (
        <div className="space-y-2">
          {userAccounts.map(acc => {
            const Icon = TYPE_ICONS[acc.account_type] || Wallet;
            return (
              <div key={acc.id} className="rounded-xl border border-gray-200 bg-white p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (acc.color || '#10b981') + '22' }}>
                  <Icon className="w-4 h-4" style={{ color: acc.color || '#10b981' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{acc.name}</p>
                  <p className="text-xs text-gray-400">{acc.account_type}{acc.bank_name ? ` · ${acc.bank_name}` : ''}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => open(acc)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button onClick={() => { if (confirm('Remover esta conta?')) deleteMutation.mutate(acc.id); }}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={close}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Conta' : 'Nova Conta Financeira'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Conta *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Conta Bradesco, Caixa Escritório" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.account_type} onValueChange={v => setForm(p => ({ ...p, account_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Saldo Inicial (R$)</Label>
                <Input type="number" step="0.01" value={form.initial_balance} onChange={e => setForm(p => ({ ...p, initial_balance: e.target.value }))} placeholder="0,00" />
              </div>
            </div>
            {(form.account_type === 'Conta Corrente' || form.account_type === 'Conta Poupança') && (
              <div>
                <Label>Banco</Label>
                <Input value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} placeholder="Ex: Bradesco, Itaú, Nubank..." />
              </div>
            )}
            <div>
              <Label>Cor de identificação</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {ACCOUNT_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                    className={`w-7 h-7 rounded-lg border-2 transition-all ${form.color === c ? 'border-gray-700 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notas adicionais" />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={close}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={save}
                disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}