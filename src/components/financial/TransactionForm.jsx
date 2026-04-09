import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, Zap, Upload, X, FileText,
  Image as ImageIcon, Plus, Search, UserPlus, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const EXPENSE_CATEGORIES = ['Aluguel / Escritório','Salários / Pró-labore','Marketing / Publicidade','Tecnologia / Software','Deslocamento / Combustível','Equipamentos','Impostos / Taxas','Serviços de Terceiros','Materiais de Escritório','Treinamento / Cursos','Outros'];
const INCOME_CATEGORIES  = ['Cobrança de Cliente (Manual)','Outros Serviços Prestados','Outros'];
const PAYMENT_METHODS    = ['Boleto','PIX','Cartão de Crédito','Cartão de Débito','Transferência','Dinheiro','Outro'];

const EMPTY = {
  transaction_type: 'despesa', description: '', amount: '', date: '',
  category: 'Outros', account_id: '', account_name: '', client_name: '', client_property_id: '',
  status: 'Pago', payment_method: 'PIX', notes: '', attachments: [],
};

// Quick add client form (minimal)
function QuickAddClient({ consultorEmail, onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name) { toast.error('Informe o nome do cliente.'); return; }
    setLoading(true);
    const prop = await base44.entities.Property.create({
      owner_email: consultorEmail,
      property_name: `Cliente: ${name}`,
      is_client_only: true,
      consultor_email: consultorEmail,
      client_name: name,
      client_contact: contact,
    });
    await base44.entities.ClientCRM.create({
      property_id: prop.id,
      consultor_email: consultorEmail,
      client_email: '',
      status: 'Ativo',
    });
    setLoading(false);
    toast.success('Cliente cadastrado!');
    onCreated({ id: prop.id, client_name: name });
  };

  return (
    <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2"><UserPlus className="w-4 h-4"/>Cadastro Rápido de Cliente</p>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Nome *</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome do cliente"/></div>
        <div><Label className="text-xs">Telefone/Email</Label><Input value={contact} onChange={e=>setContact(e.target.value)} placeholder="Contato"/></div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={loading}>
          {loading?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:'Criar Cliente'}
        </Button>
      </div>
    </div>
  );
}

export default function TransactionForm({ open, onClose, editing, consultorEmail, accounts = [] }) {
  const [form, setForm] = useState(EMPTY);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const qc = useQueryClient();

  // Sync form when editing changes
  React.useEffect(() => {
    if (open) {
      if (editing) {
        const accId = editing.account_id || '';
        const accFromList = accId ? accounts.find(a => a.id === accId) : null;
        const accName = accFromList?.name || editing.account_name || '';
        setForm({ ...EMPTY, ...editing, amount: String(editing.amount), account_id: accId, account_name: accName, attachments: editing.attachments || [] });
      } else {
        setForm({ ...EMPTY, date: format(new Date(), 'yyyy-MM-dd') });
      }
      setClientSearch('');
      setShowQuickAdd(false);
    }
  }, [open, editing, accounts]);

  const { data: properties = [], refetch: refetchProperties } = useQuery({
    queryKey: ['txform-clients', consultorEmail],
    queryFn: () => base44.entities.Property.filter({ consultor_email: consultorEmail }, 'client_name', 500),
    enabled: !!consultorEmail,
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.Expense.create(d),
    onSuccess: () => { qc.invalidateQueries(['fin-manual']); onClose(); toast.success('Transação adicionada!'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['fin-manual']); onClose(); toast.success('Transação atualizada!'); },
  });

  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const isReceita = form.transaction_type === 'receita';

  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase();
    return properties.filter(p => p.client_name?.toLowerCase().includes(q) || p.property_name?.toLowerCase().includes(q)).slice(0, 20);
  }, [properties, clientSearch]);

  // File upload
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    for (const file of files) {
      const idx = form.attachments.length;
      setUploadingIdx(idx);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const att = { name: file.name, url: file_url, type: file.type };
      setForm(p => ({ ...p, attachments: [...p.attachments, att] }));
      setUploadingIdx(null);
    }
    e.target.value = '';
  };

  const removeAttachment = (idx) => setForm(p => ({ ...p, attachments: p.attachments.filter((_, i) => i !== idx) }));

  const handleSubmit = () => {
    if (!form.description || !form.amount || !form.date) { toast.error('Preencha descrição, valor e data.'); return; }
    if (isReceita && !form.client_property_id) { toast.error('Selecione um cliente para a receita.'); return; }
    const clientProp = properties.find(p => p.id === form.client_property_id);
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      consultor_email: consultorEmail,
      competencia: form.date.substring(0, 7),
      is_stripe: false,
      account_name: form.account_name || '',
      account_id: form.account_id || '',
      client_name: clientProp?.client_name || form.client_name,
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const selectedClient = properties.find(p => p.id === form.client_property_id);
  const categories = isReceita ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-emerald-800">{editing ? 'Editar Transação' : 'Nova Transação Manual'}</DialogTitle>
        </DialogHeader>

        {/* Type toggle */}
        <div className="flex gap-2">
          <button onClick={() => setF('transaction_type', 'receita')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${isReceita ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            <TrendingUp className="w-4 h-4" />Receita
          </button>
          <button onClick={() => setF('transaction_type', 'despesa')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${!isReceita ? 'bg-red-50 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            <TrendingDown className="w-4 h-4" />Despesa
          </button>
        </div>

        {isReceita && (
          <div className="flex items-center gap-2 p-3 bg-violet-50 rounded-lg border border-violet-100 text-xs text-violet-700">
            <Zap className="w-4 h-4 flex-shrink-0" />
            <span>Receitas via <strong>Stripe</strong> aparecem automaticamente. Use aqui para receitas <strong>não vinculadas ao Stripe</strong>.</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Client selector — obrigatório para receita */}
          {isReceita && (
            <div>
              <Label className="flex items-center gap-1">
                Cliente <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 font-normal ml-1">(obrigatório para receitas)</span>
              </Label>
              {selectedClient ? (
                <div className="flex items-center gap-2 mt-1 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {selectedClient.client_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-800 truncate">{selectedClient.client_name}</p>
                    {selectedClient.property_name && !selectedClient.is_client_only && (
                      <p className="text-xs text-emerald-600 truncate">{selectedClient.property_name}</p>
                    )}
                  </div>
                  <button onClick={() => setF('client_property_id', '')} className="p-1 hover:bg-emerald-100 rounded-lg">
                    <X className="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                </div>
              ) : (
                <div className="mt-1 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                      placeholder="Buscar cliente cadastrado..." className="pl-9" />
                  </div>
                  {clientSearch && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                      {filteredClients.length === 0 ? (
                        <div className="py-4 text-center text-xs text-gray-400">Nenhum cliente encontrado</div>
                      ) : filteredClients.map(p => (
                        <button key={p.id} onClick={() => { setF('client_property_id', p.id); setClientSearch(''); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {p.client_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p.client_name || p.property_name}</p>
                            {!p.is_client_only && p.property_name && <p className="text-xs text-gray-400 truncate">{p.property_name}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setShowQuickAdd(true)} className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 font-medium">
                    <Plus className="w-3.5 h-3.5" />Cadastrar novo cliente rapidamente
                  </button>
                  {showQuickAdd && (
                    <QuickAddClient consultorEmail={consultorEmail}
                      onCreated={async (prop) => { await refetchProperties(); setF('client_property_id', prop.id); setShowQuickAdd(false); }}
                      onCancel={() => setShowQuickAdd(false)} />
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <Label>Descrição *</Label>
            <Input value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Ex: Consultoria ambiental" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setF('amount', e.target.value)} placeholder="0,00" /></div>
            <div><Label>Data *</Label><Input type="date" value={form.date} onChange={e => setF('date', e.target.value)} /></div>
          </div>

          <div>
            <Label>Conta Financeira</Label>
            <Select value={form.account_id || '__caixa__'} onValueChange={v => {
              if (v === '__caixa__') {
                setForm(p => ({ ...p, account_id: '', account_name: '' }));
              } else {
                const acc = accounts.find(a => a.id === v);
                setForm(p => ({ ...p, account_id: v, account_name: acc ? acc.name : v }));
              }
            }}>
              <SelectTrigger><SelectValue placeholder="Caixa Manual (padrão)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__caixa__">Caixa Manual</SelectItem>
                {accounts.filter(a => !a.is_stripe).map(a => <SelectItem key={a.id} value={a.id}>{a.name} · {a.account_type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setF('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setF('status', v)}>
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
            <Select value={form.payment_method} onValueChange={v => setF('payment_method', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Attachments */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Upload className="w-3.5 h-3.5" />Comprovantes / Documentos
            </Label>
            {form.attachments.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {form.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                    {att.type?.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex-1 truncate">{att.name}</a>
                    <button onClick={() => removeAttachment(i)} className="p-0.5 hover:bg-gray-200 rounded"><X className="w-3 h-3 text-gray-400" /></button>
                  </div>
                ))}
              </div>
            )}
            <label className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-sm text-gray-500 ${uploadingIdx !== null ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploadingIdx !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadingIdx !== null ? 'Enviando...' : 'Clique para anexar foto ou documento'}
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          <div><Label>Observações</Label><Input value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Notas adicionais" /></div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}