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
  TrendingUp, TrendingDown, X, FileText,
  Image as ImageIcon, Plus, Search, UserPlus, Loader2, Layers, Calendar, ArrowLeftRight, Repeat
} from 'lucide-react';
import SupabaseFileUpload from '@/components/storage/SupabaseFileUpload';
import { format, addMonths, addDays, parseISO } from 'date-fns';
import { toast } from 'sonner';

const EXPENSE_CATEGORIES = ['Aluguel / Escritório','Salários / Pró-labore','Marketing / Publicidade','Tecnologia / Software','Deslocamento / Combustível','Equipamentos','Impostos / Taxas','Serviços de Terceiros','Materiais de Escritório','Treinamento / Cursos','Outros'];
const INCOME_CATEGORIES  = ['Cobrança de Cliente (Manual)','Outros Serviços Prestados','Outros'];
const PAYMENT_METHODS    = ['Boleto','PIX','Cartão de Crédito','Cartão de Débito','Transferência','Dinheiro','Outro'];
const RESSARCIMENTO_STATUS = ['A Solicitar','Solicitado ao Cliente','Recebido','Não será ressarcido'];

const FREQUENCIAS = [
  { value: 'semanal',    label: 'Semanal' },
  { value: 'quinzenal',  label: 'Quinzenal' },
  { value: 'mensal',     label: 'Mensal' },
  { value: 'bimestral',  label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral',  label: 'Semestral' },
  { value: 'anual',      label: 'Anual' },
];
const FREQ_MESES = { mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };
// Nº de ocorrências que cobrem no mínimo 12 meses, usado quando não há data de encerramento
const FREQ_OCORRENCIAS_MIN_12_MESES = { semanal: 52, quinzenal: 26, mensal: 12, bimestral: 6, trimestral: 4, semestral: 2, anual: 1 };
const MAX_OCORRENCIAS_RECORRENTES = 260;

function addFrequencia(date, frequencia, n) {
  if (frequencia === 'semanal') return addDays(date, 7 * n);
  if (frequencia === 'quinzenal') return addDays(date, 15 * n);
  return addMonths(date, (FREQ_MESES[frequencia] || 1) * n);
}

function buildRecorrenciaDates(startDateStr, frequencia, endDateStr) {
  const start = parseISO(startDateStr);
  const dates = [];
  if (endDateStr) {
    const end = parseISO(endDateStr);
    for (let i = 0; i < MAX_OCORRENCIAS_RECORRENTES; i++) {
      const d = addFrequencia(start, frequencia, i);
      if (d > end) break;
      dates.push(d);
    }
  } else {
    const count = FREQ_OCORRENCIAS_MIN_12_MESES[frequencia] || 12;
    for (let i = 0; i < count; i++) dates.push(addFrequencia(start, frequencia, i));
  }
  return dates;
}

const EMPTY_BASE = {
  transaction_type: 'receita', description: '', date: '',
  category: 'Cobrança de Cliente (Manual)', account_id: '', account_name: '',
  client_name: '', client_property_id: '',
  property_id: '', property_name: '',
  payment_type: 'avista', // 'avista' | 'parcelado'
  // à vista
  amount: '', status: 'Pendente', payment_method: 'PIX', notes: '', attachments: [],
  // parcelado
  num_installments: 2,
  installments: [], // array of { number, amount, due_date, received, received_date, payment_method, account_id, account_name, status, notes }
  // transferência
  transfer_from_account_id: '',
  transfer_to_account_id: '',
  // ressarcimento (despesa)
  is_ressarcivel: false,
  ressarcimento_status: 'A Solicitar',
  // recorrência (despesa)
  recorrencia_tipo: 'unica', // 'unica' | 'parcelada' | 'recorrente'
  recorrencia_frequencia: 'mensal',
  recorrencia_total_parcelas: 2,
  recorrencia_data_fim: '',
};

function buildInstallments(total, count, firstDate, defaultAccountId, defaultAccountName, defaultMethod) {
  const amt = parseFloat(total) || 0;
  const perParcela = count > 0 ? parseFloat((amt / count).toFixed(2)) : 0;
  const base = firstDate ? parseISO(firstDate) : new Date();
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    amount: perParcela,
    due_date: format(addMonths(base, i), 'yyyy-MM-dd'),
    received: false,
    received_date: '',
    payment_method: defaultMethod || 'PIX',
    account_id: defaultAccountId || '',
    account_name: defaultAccountName || '',
    status: 'Pendente',
    notes: '',
  }));
}

function QuickAddClient({ consultorEmail, onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name) { toast.error('Informe o nome do cliente.'); return; }
    setLoading(true);
    const res = await base44.functions.invoke('createProperty', {
      owner_email: consultorEmail,
      property_name: `Cliente: ${name}`,
      is_client_only: true,
      consultor_email: consultorEmail,
      client_name: name,
      client_contact: contact,
    });
    const prop = res.data;
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
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'Criar Cliente'}
        </Button>
      </div>
    </div>
  );
}

export default function TransactionForm({ open, onClose, editing, consultorEmail, accounts = [] }) {
  const [form, setForm] = useState(EMPTY_BASE);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const isReceita = form.transaction_type === 'receita';
  const isTransferencia = form.transaction_type === 'transferencia';
  const isParcelado = form.payment_type === 'parcelado' && isReceita;
  // Recorrência (parcelamento/recorrência de despesa) só se aplica a lançamentos novos
  const isDespesaParcelada = !isReceita && !isTransferencia && !editing && form.recorrencia_tipo === 'parcelada';
  const isDespesaRecorrente = !isReceita && !isTransferencia && !editing && form.recorrencia_tipo === 'recorrente';

  useEffect(() => {
    if (open) {
      if (editing) {
        const accId = editing.account_id || '';
        const accFromList = accId ? accounts.find(a => a.id === accId) : null;
        const accName = accFromList?.name || editing.account_name || '';
        setForm({ ...EMPTY_BASE, ...editing, amount: String(editing.amount), account_id: accId, account_name: accName, attachments: editing.attachments || [], payment_type: 'avista', installments: [] });
      } else {
        setForm({ ...EMPTY_BASE, date: format(new Date(), 'yyyy-MM-dd') });
      }
      setClientSearch('');
      setShowQuickAdd(false);
    }
  }, [open, editing, accounts]);

  const { data: properties = [], refetch: refetchProperties } = useQuery({
    queryKey: ['fin-properties', consultorEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('listConsultorClients', {});
      return res.data?.properties || [];
    },
    enabled: !!consultorEmail,
  });

  // Properties belonging to the selected client
  const clientProperties = useMemo(() => {
    if (!form.client_property_id) return [];
    const selectedProp = properties.find(p => p.id === form.client_property_id);
    if (!selectedProp) return [];
    const clientName = selectedProp.client_name || '';
    return properties.filter(p => p.client_name === clientName && !p.is_client_only);
  }, [properties, form.client_property_id]);

  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase();
    return properties.filter(p => p.client_name?.toLowerCase().includes(q) || p.property_name?.toLowerCase().includes(q)).slice(0, 20);
  }, [properties, clientSearch]);

  // Rebuild installments when count/total/date change (parcelado mode)
  const rebuildInstallments = (overrides = {}) => {
    const f = { ...form, ...overrides };
    const count = parseInt(f.num_installments) || 2;
    const insts = buildInstallments(f.amount, count, f.date, f.account_id, f.account_name, f.payment_method);
    setForm(p => ({ ...p, ...overrides, installments: insts }));
  };

  const setInstallment = (idx, key, val) => {
    setForm(p => {
      const insts = [...(p.installments || [])];
      insts[idx] = { ...insts[idx], [key]: val };
      // If received toggled on and no received_date, set today
      if (key === 'received' && val && !insts[idx].received_date) {
        insts[idx].received_date = format(new Date(), 'yyyy-MM-dd');
        insts[idx].status = 'Pago';
      }
      if (key === 'received' && !val) {
        insts[idx].status = 'Pendente';
      }
      return { ...p, installments: insts };
    });
  };

  const setInstallmentAccount = (idx, accId) => {
    const acc = accounts.find(a => a.id === accId);
    setForm(p => {
      const insts = [...(p.installments || [])];
      insts[idx] = { ...insts[idx], account_id: accId || '', account_name: acc?.name || '' };
      return { ...p, installments: insts };
    });
  };

  const removeAttachment = (idx) => setForm(p => ({ ...p, attachments: p.attachments.filter((_, i) => i !== idx) }));

  const handleSubmit = async () => {
    if (!form.description) { toast.error('Informe a descrição do serviço/transação.'); return; }
    if (!form.date) { toast.error('Informe a data.'); return; }
    if (isReceita && !form.client_property_id) { toast.error('Selecione um cliente.'); return; }
    if (isTransferencia) {
      if (!form.transfer_from_account_id) { toast.error('Selecione a conta de origem.'); return; }
      if (!form.transfer_to_account_id) { toast.error('Selecione a conta de destino.'); return; }
      if (form.transfer_from_account_id === form.transfer_to_account_id) { toast.error('Conta de origem e destino não podem ser iguais.'); return; }
      if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Informe o valor.'); return; }
    }

    const clientProp = properties.find(p => p.id === form.client_property_id);
    const clientName = clientProp?.client_name || form.client_name || '';

    setSaving(true);
    try {
      if (isTransferencia) {
        const fromAcc = accounts.find(a => a.id === form.transfer_from_account_id);
        const toAcc = accounts.find(a => a.id === form.transfer_to_account_id);
        const valor = parseFloat(form.amount);
        const base = {
          consultor_email: consultorEmail,
          description: form.description,
          amount: valor,
          date: form.date,
          competencia: form.date.substring(0, 7),
          category: 'Transferência entre Contas',
          is_stripe: false,
          status: 'Pago',
          payment_method: form.payment_method || 'Transferência',
          notes: form.notes || '',
          attachments: form.attachments || [],
        };
        // Saída da conta origem
        await base44.functions.invoke('manageExpense', { action: 'create', data: { ...base, transaction_type: 'despesa', account_id: fromAcc?.id || '', account_name: fromAcc?.name || '' } });
        // Entrada na conta destino
        await base44.functions.invoke('manageExpense', { action: 'create', data: { ...base, transaction_type: 'receita', account_id: toAcc?.id || '', account_name: toAcc?.name || '' } });
        toast.success('Transferência registrada nas duas contas!');
        qc.invalidateQueries(['fin-data']);
        onClose();
        return;
      }

      if (isParcelado) {
        if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Informe o valor total.'); setSaving(false); return; }
        const count = parseInt(form.num_installments) || 2;
        const insts = form.installments.length === count ? form.installments : buildInstallments(form.amount, count, form.date, form.account_id, form.account_name, form.payment_method);
        // Create one Expense per installment
        const records = insts.map(inst => ({
          consultor_email: consultorEmail,
          transaction_type: 'receita',
          description: `${form.description} (${inst.number}/${count})`,
          amount: parseFloat(inst.amount) || 0,
          date: inst.received && inst.received_date ? inst.received_date : inst.due_date,
          competencia: inst.due_date?.substring(0, 7),
          category: form.category || 'Cobrança de Cliente (Manual)',
          account_id: inst.account_id || '',
          account_name: inst.account_name || '',
          client_name: clientName,
          client_property_id: form.client_property_id || '',
          property_id: form.property_id || '',
          property_name: form.property_name || '',
          is_stripe: false,
          status: inst.received ? 'Pago' : 'Pendente',
          payment_method: inst.payment_method || 'PIX',
          notes: inst.notes || form.notes || '',
          attachments: [],
          installment_number: inst.number,
          installment_total: count,
          installment_due_date: inst.due_date,
          installment_received_date: inst.received_date || null,
        }));
        await base44.functions.invoke('manageExpense', { action: 'bulkCreate', records });
        toast.success(`${count} parcelas registradas!`);
      } else if (isDespesaParcelada) {
        if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Informe o valor total.'); setSaving(false); return; }
        const count = parseInt(form.recorrencia_total_parcelas) || 2;
        const totalAmount = parseFloat(form.amount) || 0;
        const perParcela = count > 0 ? parseFloat((totalAmount / count).toFixed(2)) : 0;
        const groupId = crypto.randomUUID();
        const baseDate = parseISO(form.date);
        const records = Array.from({ length: count }, (_, i) => {
          const dateStr = format(addMonths(baseDate, i), 'yyyy-MM-dd');
          return {
            consultor_email: consultorEmail,
            transaction_type: 'despesa',
            description: `${form.description} (${i + 1}/${count})`,
            amount: perParcela,
            date: dateStr,
            competencia: dateStr.substring(0, 7),
            category: form.category,
            account_id: form.account_id || '',
            account_name: form.account_name || '',
            client_name: clientName,
            client_property_id: form.client_property_id || '',
            property_id: form.property_id || '',
            property_name: form.property_name || '',
            is_stripe: false,
            status: i === 0 ? form.status : 'Pendente',
            payment_method: form.payment_method,
            notes: form.notes || '',
            attachments: i === 0 ? (form.attachments || []) : [],
            is_ressarcivel: form.is_ressarcivel,
            ressarcimento_status: form.ressarcimento_status,
            recorrencia_tipo: 'parcelada',
            recorrencia_total_parcelas: count,
            recorrencia_parcela_atual: i + 1,
            recorrencia_grupo_id: groupId,
          };
        });
        await base44.functions.invoke('manageExpense', { action: 'bulkCreate', records });
        toast.success(`${count} parcelas registradas!`);
      } else if (isDespesaRecorrente) {
        if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Informe o valor.'); setSaving(false); return; }
        const frequencia = form.recorrencia_frequencia || 'mensal';
        const dates = buildRecorrenciaDates(form.date, frequencia, form.recorrencia_data_fim || null);
        const groupId = crypto.randomUUID();
        const valor = parseFloat(form.amount) || 0;
        const records = dates.map((d, i) => {
          const dateStr = format(d, 'yyyy-MM-dd');
          return {
            consultor_email: consultorEmail,
            transaction_type: 'despesa',
            description: form.description,
            amount: valor,
            date: dateStr,
            competencia: dateStr.substring(0, 7),
            category: form.category,
            account_id: form.account_id || '',
            account_name: form.account_name || '',
            client_name: clientName,
            client_property_id: form.client_property_id || '',
            property_id: form.property_id || '',
            property_name: form.property_name || '',
            is_stripe: false,
            status: i === 0 ? form.status : 'Pendente',
            payment_method: form.payment_method,
            notes: form.notes || '',
            attachments: i === 0 ? (form.attachments || []) : [],
            is_ressarcivel: form.is_ressarcivel,
            ressarcimento_status: form.ressarcimento_status,
            recorrencia_tipo: 'recorrente',
            recorrencia_frequencia: frequencia,
            recorrencia_data_fim: form.recorrencia_data_fim || null,
            recorrencia_grupo_id: groupId,
          };
        });
        await base44.functions.invoke('manageExpense', { action: 'bulkCreate', records });
        toast.success(`${dates.length} lançamentos recorrentes registrados!`);
      } else {
        if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Informe o valor.'); setSaving(false); return; }
        const payload = {
          ...form,
          amount: parseFloat(form.amount),
          consultor_email: consultorEmail,
          competencia: form.date.substring(0, 7),
          is_stripe: false,
          account_name: form.account_name || '',
          account_id: form.account_id || '',
          client_name: clientName,
          property_id: form.property_id || '',
          property_name: form.property_name || '',
          installment_number: null,
          installment_total: null,
          installment_due_date: null,
          installment_received_date: null,
        };
        if (editing) {
          await base44.functions.invoke('manageExpense', { action: 'update', id: editing.id, data: payload });
          toast.success('Transação atualizada!');
        } else {
          await base44.functions.invoke('manageExpense', { action: 'create', data: payload });
          toast.success('Transação registrada!');
        }
      }
      qc.invalidateQueries(['fin-data']);
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedClient = properties.find(p => p.id === form.client_property_id);
  const categories = isReceita ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleClose = () => {
    const isEmpty = !form.description && !form.amount && !form.date;
    if (!isEmpty && !editing) {
      const confirmed = window.confirm('Você tem alterações não salvas. Deseja fechar sem salvar?');
      if (!confirmed) return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${form.transaction_type === 'despesa' ? 'bg-red-50 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            <TrendingDown className="w-4 h-4" />Despesa
          </button>
          <button onClick={() => setF('transaction_type', 'transferencia')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${isTransferencia ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            <ArrowLeftRight className="w-4 h-4" />Transferência
          </button>
        </div>

        <div className="space-y-4">

          {/* Transferência entre contas */}
          {isTransferencia && (
            <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-4 space-y-4">
              <p className="text-xs text-blue-700 flex items-start gap-1.5 leading-relaxed">
                <ArrowLeftRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Esta transferência <strong>não afeta o balanço</strong> de receitas/despesas. Fica registrada apenas como movimentação entre contas para auditoria.</span>
              </p>

              <div>
                <Label>Descrição *</Label>
                <Input value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Ex: Transferência caixa → conta corrente Bradesco" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Conta Origem *</Label>
                  <Select value={form.transfer_from_account_id || ''} onValueChange={v => setF('transfer_from_account_id', v)}>
                    <SelectTrigger><SelectValue placeholder="De qual conta sai" /></SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => !a.is_stripe).map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name} · {a.account_type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Conta Destino *</Label>
                  <Select value={form.transfer_to_account_id || ''} onValueChange={v => setF('transfer_to_account_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Para qual conta vai" /></SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => !a.is_stripe).map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name} · {a.account_type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setF('amount', e.target.value)} placeholder="0,00" />
                </div>
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select value={form.payment_method} onValueChange={v => setF('payment_method', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Input value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Opcional" />
                </div>
              </div>

              {/* Attachments */}
              <div>
                <Label className="flex items-center gap-2 mb-2"><FileText className="w-3.5 h-3.5"/>Comprovantes</Label>
                {form.attachments.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {form.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0"/>
                        <span className="text-xs text-gray-700 flex-1 truncate">{att.name}</span>
                        <button onClick={() => removeAttachment(i)}><X className="w-3 h-3 text-gray-400"/></button>
                      </div>
                    ))}
                  </div>
                )}
                <SupabaseFileUpload
                  folder="financeiro"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onUploadDone={(filePath, fileName) => setForm(p => ({ ...p, attachments: [...p.attachments, { name: fileName, url: filePath, type: '' }] }))}
                  label="Anexar comprovante"
                />
              </div>
            </div>
          )}

          {/* Campos de Receita/Despesa — ocultos em modo transferência */}
          {/* Client selector */}
          {!isTransferencia && (
            <div>
              <Label className="flex items-center gap-1">
                Cliente {isReceita ? <span className="text-red-500">*</span> : <span className="text-xs text-gray-400 font-normal">(opcional)</span>}
              </Label>
              {selectedClient ? (
                <div className="flex items-center gap-2 mt-1 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {selectedClient.client_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <p className="text-sm font-semibold text-emerald-800 flex-1 truncate">{selectedClient.client_name}</p>
                  <button onClick={() => { setF('client_property_id', ''); setF('property_id', ''); setF('property_name', ''); }} className="p-1 hover:bg-emerald-100 rounded-lg">
                    <X className="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                </div>
              ) : (
                <div className="mt-1 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Buscar cliente..." className="pl-9" />
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
                          <p className="text-sm font-medium text-gray-800 truncate">{p.client_name || p.property_name}</p>
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

          {/* Propriedade / Empreendimento — aparece após selecionar cliente */}
          {!isTransferencia && form.client_property_id && clientProperties.length > 0 && (
            <div>
              <Label>Propriedade / Empreendimento <span className="text-xs text-gray-400 font-normal">(opcional)</span></Label>
              <Select value={form.property_id || ''} onValueChange={v => {
                const prop = properties.find(p => p.id === v);
                setF('property_id', v || '');
                setF('property_name', prop?.property_name || '');
              }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar propriedade / empreendimento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>— Nenhuma específica —</SelectItem>
                  {clientProperties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isTransferencia && <div>
            <Label>Descrição / Serviço *</Label>
            <Input value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Ex: Consultoria ambiental — Fazenda Boa Vista" />
          </div>}

          {!isTransferencia && <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setF('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isParcelado || isDespesaParcelada ? 'Data da 1ª Parcela' : isDespesaRecorrente ? 'Data da 1ª Ocorrência' : 'Data *'}</Label>
              <Input type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
            </div>
          </div>}

          {/* Ressarcível — apenas para despesa */}
          {!isReceita && !isTransferencia && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.is_ressarcivel}
                  onChange={e => setF('is_ressarcivel', e.target.checked)}
                  className="rounded" />
                <span className="text-sm font-semibold text-gray-700">Despesa Ressarcível</span>
              </label>
              {form.is_ressarcivel && (
                <div>
                  <Label>Status do Ressarcimento</Label>
                  <Select value={form.ressarcimento_status} onValueChange={v => setF('ressarcimento_status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RESSARCIMENTO_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Tipo de Lançamento — apenas para despesa nova */}
          {!isReceita && !isTransferencia && !editing && (
            <div>
              <Label className="mb-2 block">Tipo de Lançamento</Label>
              <div className="flex gap-2">
                <button onClick={() => setF('recorrencia_tipo', 'unica')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border-2 transition-all ${form.recorrencia_tipo === 'unica' ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                  Único
                </button>
                <button onClick={() => setF('recorrencia_tipo', 'parcelada')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border-2 transition-all ${isDespesaParcelada ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                  <Layers className="w-4 h-4" />Parcelado
                </button>
                <button onClick={() => setF('recorrencia_tipo', 'recorrente')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border-2 transition-all ${isDespesaRecorrente ? 'bg-purple-50 border-purple-400 text-purple-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                  <Repeat className="w-4 h-4" />Recorrente
                </button>
              </div>
            </div>
          )}

          {/* Parcelado (despesa) config */}
          {isDespesaParcelada && (
            <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-2">
              <Label className="text-xs">Número de Parcelas</Label>
              <Input type="number" min={2} max={60} value={form.recorrencia_total_parcelas}
                onChange={e => setF('recorrencia_total_parcelas', parseInt(e.target.value) || 2)} />
              <p className="text-xs text-amber-800">
                Serão criados {parseInt(form.recorrencia_total_parcelas) || 2} lançamentos mensais, a partir da data informada, dividindo o valor total igualmente entre eles.
              </p>
            </div>
          )}

          {/* Recorrente (despesa) config */}
          {isDespesaRecorrente && (
            <div className="border border-purple-200 bg-purple-50/40 rounded-xl p-4 space-y-3">
              <div>
                <Label className="text-xs">Frequência</Label>
                <Select value={form.recorrencia_frequencia} onValueChange={v => setF('recorrencia_frequencia', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQUENCIAS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Data de Encerramento <span className="text-gray-400 font-normal">(opcional — sem data, gera no mínimo 12 meses)</span></Label>
                <Input type="date" value={form.recorrencia_data_fim} onChange={e => setF('recorrencia_data_fim', e.target.value)} />
              </div>
              <p className="text-xs text-purple-800">
                Serão criados lançamentos com o mesmo valor e descrição, repetidos conforme a frequência escolhida, a partir da data informada.
              </p>
            </div>
          )}

          {/* Payment type toggle — only for receita and new records */}
          {isReceita && !editing && !isTransferencia && (
            <div>
              <Label className="mb-2 block">Tipo de Pagamento</Label>
              <div className="flex gap-2">
                <button onClick={() => setF('payment_type', 'avista')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border-2 transition-all ${!isParcelado ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                  À Vista
                </button>
                <button onClick={() => { rebuildInstallments({ payment_type: 'parcelado' }); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border-2 transition-all ${isParcelado ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                  <Layers className="w-4 h-4" />Parcelado
                </button>
              </div>
            </div>
          )}

          {/* Parcelado config */}
          {isParcelado && !isTransferencia && (
            <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Valor Total (R$) *</Label>
                  <Input type="number" step="0.01" value={form.amount}
                    onChange={e => rebuildInstallments({ amount: e.target.value })}
                    placeholder="0,00" />
                </div>
                <div>
                  <Label className="text-xs">Nº de Parcelas</Label>
                  <Input type="number" min={2} max={60} value={form.num_installments}
                    onChange={e => rebuildInstallments({ num_installments: parseInt(e.target.value) || 2 })} />
                </div>
                <div>
                  <Label className="text-xs">Forma Padrão</Label>
                  <Select value={form.payment_method} onValueChange={v => rebuildInstallments({ payment_method: v })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Default account */}
              <div>
                <Label className="text-xs">Conta Padrão</Label>
                <Select value={form.account_id || ''} onValueChange={v => {
                  const acc = accounts.find(a => a.id === v);
                  rebuildInstallments({ account_id: v || '', account_name: acc?.name || '' });
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar conta" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sem conta específica</SelectItem>
                    {accounts.filter(a => !a.is_stripe).map(a => <SelectItem key={a.id} value={a.id}>{a.name} · {a.account_type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Installments table */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-amber-800 flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/>Parcelas</p>
                {(form.installments || []).map((inst, idx) => (
                  <div key={idx} className={`rounded-lg border p-3 space-y-2 ${inst.received ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Parcela {inst.number}/{form.num_installments}</span>
                      <Badge className={`text-xs border-0 ${inst.received ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {inst.received ? 'Recebido' : 'Pendente'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500">Valor (R$)</Label>
                        <Input type="number" step="0.01" className="h-8 text-sm"
                          value={inst.amount}
                          onChange={e => setInstallment(idx, 'amount', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Vencimento</Label>
                        <Input type="date" className="h-8 text-sm"
                          value={inst.due_date}
                          onChange={e => setInstallment(idx, 'due_date', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Forma de Pagamento</Label>
                        <Select value={inst.payment_method} onValueChange={v => setInstallment(idx, 'payment_method', v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Conta (Banco)</Label>
                        <Select value={inst.account_id || ''} onValueChange={v => setInstallmentAccount(idx, v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>—</SelectItem>
                            {accounts.filter(a => !a.is_stripe).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!inst.received}
                          onChange={e => setInstallment(idx, 'received', e.target.checked)}
                          className="rounded" />
                        <span className="text-xs text-gray-600 font-medium">Recebido</span>
                      </label>
                      {inst.received && (
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs text-gray-500">em</Label>
                          <Input type="date" className="h-7 text-xs w-36"
                            value={inst.received_date || ''}
                            onChange={e => setInstallment(idx, 'received_date', e.target.value)} />
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Observação da parcela</Label>
                      <Input className="h-8 text-sm" value={inst.notes || ''}
                        onChange={e => setInstallment(idx, 'notes', e.target.value)}
                        placeholder="Opcional" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* À vista fields */}
          {!isParcelado && !isTransferencia && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{isDespesaParcelada ? 'Valor Total (R$) *' : 'Valor (R$) *'}</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setF('amount', e.target.value)} placeholder="0,00" /></div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Conta Financeira</Label>
                  <Select value={form.account_id || ''} onValueChange={v => {
                    const acc = accounts.find(a => a.id === v);
                    setF('account_id', v || '');
                    setF('account_name', acc?.name || '');
                  }}>
                    <SelectTrigger><SelectValue placeholder="Sem Conta Específica" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sem Conta Específica</SelectItem>
                      {accounts.filter(a => !a.is_stripe).map(a => <SelectItem key={a.id} value={a.id}>{a.name} · {a.account_type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select value={form.payment_method} onValueChange={v => setF('payment_method', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <Label className="flex items-center gap-2 mb-2"><FileText className="w-3.5 h-3.5"/>Comprovantes</Label>
                {form.attachments.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {form.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        {att.type?.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0"/> : <FileText className="w-4 h-4 text-gray-500 flex-shrink-0"/>}
                        <span className="text-xs text-gray-700 flex-1 truncate">{att.name}</span>
                        <button onClick={() => removeAttachment(i)}><X className="w-3 h-3 text-gray-400"/></button>
                      </div>
                    ))}
                  </div>
                )}
                <SupabaseFileUpload
                  folder="financeiro"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onUploadDone={(filePath, fileName) => setForm(p => ({ ...p, attachments: [...p.attachments, { name: fileName, url: filePath, type: '' }] }))}
                  label="Anexar comprovante"
                />
              </div>

              <div><Label>Observações</Label><Input value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Notas adicionais"/></div>
            </>
          )}

          {/* Notes for parcelado */}
          {isParcelado && !isTransferencia && (
            <div><Label>Observações gerais</Label><Input value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Notas do serviço"/></div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button className={`${isTransferencia ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`} onClick={handleSubmit} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1"/>Salvando...</> : isTransferencia ? 'Registrar Transferência' : isParcelado ? `Registrar ${form.num_installments} Parcelas` : isDespesaParcelada ? `Registrar ${parseInt(form.recorrencia_total_parcelas) || 2} Parcelas` : isDespesaRecorrente ? 'Registrar Recorrência' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}