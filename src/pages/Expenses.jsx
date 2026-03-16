import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, TrendingDown, Filter, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORIES = [
  'Aluguel / Escritório', 'Salários / Pró-labore', 'Marketing / Publicidade',
  'Tecnologia / Software', 'Deslocamento / Combustível', 'Equipamentos',
  'Impostos / Taxas', 'Serviços de Terceiros', 'Materiais de Escritório',
  'Treinamento / Cursos', 'Outros'
];

const PAYMENT_METHODS = ['Boleto', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Dinheiro', 'Outro'];

const STATUS_COLORS = {
  'Pago': 'bg-emerald-100 text-emerald-700',
  'Pendente': 'bg-amber-100 text-amber-700',
  'Cancelado': 'bg-gray-100 text-gray-500',
};

const EMPTY_FORM = {
  description: '', amount: '', date: '', competencia: '', category: 'Outros',
  status: 'Pago', payment_method: 'PIX', notes: '', receipt_url: '',
};

export default function Expenses() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', user?.email],
    queryFn: () => base44.entities.Expense.filter({ consultor_email: user.email }, '-date', 200),
    enabled: !!user?.email,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['expenses']); handleClose(); toast.success('Despesa cadastrada!'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['expenses']); handleClose(); toast.success('Despesa atualizada!'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['expenses']); toast.success('Despesa removida!'); },
  });

  const handleOpen = (expense = null) => {
    if (expense) {
      setEditing(expense);
      setForm({ ...expense, amount: String(expense.amount) });
    } else {
      setEditing(null);
      const today = format(new Date(), 'yyyy-MM-dd');
      setForm({ ...EMPTY_FORM, date: today, competencia: today.substring(0, 7) });
    }
    setShowForm(true);
  };

  const handleClose = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleSubmit = () => {
    if (!form.description || !form.amount || !form.date) {
      toast.error('Preencha descrição, valor e data.');
      return;
    }
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      consultor_email: user.email,
      competencia: form.date.substring(0, 7),
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const matchMonth = !filterMonth || e.competencia === filterMonth || e.date?.startsWith(filterMonth);
      const matchCat = !filterCategory || e.category === filterCategory;
      return matchMonth && matchCat;
    });
  }, [expenses, filterMonth, filterCategory]);

  const totalPago = filtered.filter(e => e.status === 'Pago').reduce((s, e) => s + (e.amount || 0), 0);
  const totalPendente = filtered.filter(e => e.status === 'Pendente').reduce((s, e) => s + (e.amount || 0), 0);

  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="w-7 h-7 text-red-500" />
            Despesas
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Controle de custos e despesas operacionais</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleOpen()}>
          <Plus className="w-4 h-4 mr-2" /> Nova Despesa
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-red-100">
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Pago</p>
            <p className="text-xl font-bold text-red-600">{fmt(totalPago)}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100">
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Pendente</p>
            <p className="text-xl font-bold text-amber-600">{fmt(totalPendente)}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-100">
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Registros</p>
            <p className="text-xl font-bold text-gray-700">{filtered.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs">Competência</Label>
          <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">Categoria</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todas</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(filterMonth || filterCategory) && (
          <Button variant="outline" size="sm" onClick={() => { setFilterMonth(''); setFilterCategory(''); }}>
            Limpar filtros
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma despesa encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(expense => (
            <div key={expense.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{expense.description}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{expense.date ? format(parseISO(expense.date), 'dd/MM/yyyy') : '—'}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{expense.category}</span>
                    {expense.payment_method && <span className="text-xs text-gray-400">· {expense.payment_method}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <Badge className={`${STATUS_COLORS[expense.status]} border-0 text-xs`}>{expense.status}</Badge>
                <span className="font-bold text-red-600 text-sm">{fmt(expense.amount || 0)}</span>
                <button onClick={() => handleOpen(expense)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <Pencil className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button onClick={() => { if (confirm('Remover esta despesa?')) deleteMutation.mutate(expense.id); }} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-800">{editing ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Ex: Aluguel escritório" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} placeholder="0,00" />
              </div>
              <div>
                <Label>Data *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value, competencia: e.target.value.substring(0,7)}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({...p, category: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({...p, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(p => ({...p, payment_method: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Notas adicionais" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit}
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