import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ChevronLeft, Plus, Trash2, Search, Mail, MessageCircle, Save, FileCheck } from 'lucide-react';
import { createPageUrl } from '../utils';
import { useEffectiveUser } from '../hooks/useEffectiveUser';
import { useNavigationGuard } from '../hooks/useNavigationGuard';
import SendWhatsAppDialog from '@/components/shared/SendWhatsAppDialog';
import WhatsAppSendHistory from '@/components/shared/WhatsAppSendHistory';

const PAYMENT_METHODS = ['PIX', 'Transferência', 'Dinheiro', 'Cartão', 'Boleto', 'Outro'];

const EMPTY_FORM = {
  title: 'Recibo de Honorários',
  client_name: '',
  client_email: '',
  client_cpf_cnpj: '',
  property_id: '',
  property_name: '',
  expense_id: '',
  services: [],
  payment_method: 'PIX',
  payment_date: format(new Date(), 'yyyy-MM-dd'),
  notes: '',
  espelhar_documentos: false,
};

export default function ReceiptGenerator() {
  const { user, effectiveEmail } = useEffectiveUser();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [receiptId, setReceiptId] = useState(null);
  const [receiptNumber, setReceiptNumber] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [status, setStatus] = useState('Rascunho');
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);

  const [clientSearch, setClientSearch] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [clientPhone, setClientPhone] = useState('');

  const [currentService, setCurrentService] = useState({ name: '', description: '', amount: 0 });
  const [linkExpense, setLinkExpense] = useState(false);

  useNavigationGuard(isDirty);

  // Carrega um recibo existente (aberto via badge) ou pré-preenche a partir de uma receita
  useEffect(() => {
    const state = location.state;
    if (!state) return;
    if (state.receiptId) {
      base44.entities.Receipt.get(state.receiptId).then(r => {
        if (!r) return;
        setReceiptId(r.id);
        setReceiptNumber(r.receipt_number);
        setPdfUrl(r.pdf_url || '');
        setStatus(r.status || 'Rascunho');
        setFormData({
          title: r.title || 'Recibo de Honorários',
          client_name: r.client_name || '',
          client_email: r.client_email || '',
          client_cpf_cnpj: r.client_cpf_cnpj || '',
          property_id: r.property_id || '',
          property_name: r.property_name || '',
          expense_id: r.expense_id || '',
          services: r.services || [],
          payment_method: r.payment_method || 'PIX',
          payment_date: r.payment_date || format(new Date(), 'yyyy-MM-dd'),
          notes: r.notes || '',
          espelhar_documentos: !!r.espelhar_documentos,
        });
        setLinkExpense(!!r.expense_id);
      }).catch(() => toast.error('Erro ao carregar recibo'));
    } else if (state.fromTransaction) {
      const t = state.fromTransaction;
      setFormData(p => ({
        ...p,
        client_name: t.client_name || '',
        property_id: t.property_id || '',
        property_name: t.property_name || '',
        expense_id: t.expense_id || '',
        payment_method: t.payment_method || 'PIX',
        payment_date: t.payment_date || format(new Date(), 'yyyy-MM-dd'),
        services: t.amount
          ? [{ id: Date.now(), name: t.description || 'Serviço prestado', description: '', amount: parseFloat(t.amount) || 0 }]
          : p.services,
      }));
      setLinkExpense(!!t.expense_id);
      setIsDirty(true);
    }
  }, [location.state]);

  const { data: crmClients = [] } = useQuery({
    queryKey: ['crm-clients-receipt', effectiveEmail],
    queryFn: () => base44.entities.ClientCRM.filter({ consultor_email: effectiveEmail }),
    enabled: !!effectiveEmail,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['fin-properties-receipt', effectiveEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('listConsultorClients', {});
      return res.data?.properties || [];
    },
    enabled: !!effectiveEmail,
  });

  const { data: finData } = useQuery({
    queryKey: ['fin-data-receipt', effectiveEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('listConsultorFinancials', {});
      return res.data || {};
    },
    enabled: !!effectiveEmail,
  });

  const receitaExpenses = useMemo(
    () => (finData?.expenses || []).filter(e => e.transaction_type === 'receita'),
    [finData]
  );

  const filteredClients = clientSearch.length >= 1
    ? crmClients.filter(c =>
        c.client_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.client_email?.toLowerCase().includes(clientSearch.toLowerCase())
      )
    : crmClients.slice(0, 6);

  const clientProperties = useMemo(() => {
    if (!formData.client_name) return [];
    return properties.filter(p => p.client_name === formData.client_name && !p.is_client_only);
  }, [properties, formData.client_name]);

  const setF = (key, val) => { setFormData(p => ({ ...p, [key]: val })); setIsDirty(true); };

  const selectClient = (c) => {
    setFormData(p => ({
      ...p,
      client_name: c.client_name || '',
      client_email: c.client_email || '',
      client_cpf_cnpj: c.client_type === 'pj' ? (c.cnpj || '') : (c.cpf || ''),
    }));
    setClientPhone(c.client_phone || '');
    setClientSearch(c.client_name || '');
    setShowClientSuggestions(false);
    setIsDirty(true);
  };

  const addService = () => {
    if (!currentService.name || !currentService.amount) { toast.error('Informe nome e valor do serviço.'); return; }
    setF('services', [...formData.services, { id: Date.now(), ...currentService, amount: parseFloat(currentService.amount) || 0 }]);
    setCurrentService({ name: '', description: '', amount: 0 });
  };

  const removeService = (id) => setF('services', formData.services.filter(s => s.id !== id));

  const selectExpense = (expenseId) => {
    const exp = receitaExpenses.find(e => e.id === expenseId);
    if (!exp) return;
    setFormData(p => ({
      ...p,
      expense_id: exp.id,
      client_name: exp.client_name || p.client_name,
      property_id: exp.property_id || p.property_id,
      property_name: exp.property_name || p.property_name,
      payment_method: exp.payment_method || p.payment_method,
      payment_date: exp.date || p.payment_date,
      services: exp.amount
        ? [{ id: Date.now(), name: exp.description || 'Serviço prestado', description: '', amount: parseFloat(exp.amount) || 0 }]
        : p.services,
    }));
    setIsDirty(true);
  };

  const totalAmount = useMemo(
    () => (formData.services || []).reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0),
    [formData.services]
  );

  const validate = () => {
    if (!formData.client_name) { toast.error('Selecione ou informe o cliente.'); return false; }
    if (!formData.client_email) { toast.error('Informe o email do cliente.'); return false; }
    if (formData.services.length === 0) { toast.error('Adicione ao menos um serviço.'); return false; }
    return true;
  };

  const handleSave = async (targetStatus) => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (!receiptId) {
        const res = await base44.functions.invoke('generateReceipt', {
          expense_id: formData.expense_id || undefined,
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_cpf_cnpj: formData.client_cpf_cnpj,
          property_id: formData.property_id,
          property_name: formData.property_name,
          title: formData.title,
          services: formData.services,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
          notes: formData.notes,
          espelhar_documentos: formData.espelhar_documentos,
          status: targetStatus,
        });
        const { receipt_id, receipt_number } = res.data;
        setReceiptId(receipt_id);
        setReceiptNumber(receipt_number);
        setStatus(targetStatus);
      } else {
        await base44.entities.Receipt.update(receiptId, {
          title: formData.title,
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_cpf_cnpj: formData.client_cpf_cnpj,
          property_id: formData.property_id,
          property_name: formData.property_name,
          expense_id: formData.expense_id,
          services: formData.services,
          total_amount: totalAmount,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
          notes: formData.notes,
          espelhar_documentos: formData.espelhar_documentos,
          status: targetStatus,
        });
        setStatus(targetStatus);
      }
      qc.invalidateQueries({ queryKey: ['fin-data'] });
      qc.invalidateQueries({ queryKey: ['fin-data-receipt'] });
      setIsDirty(false);
      toast.success(targetStatus === 'Emitido' ? 'Recibo emitido com sucesso!' : 'Rascunho salvo!');
    } catch (err) {
      toast.error('Erro ao salvar recibo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!receiptId) { toast.error('Salve o recibo antes de enviar por email.'); return; }
    if (!formData.client_email) { toast.error('Informe o email do cliente.'); return; }
    setSendingEmail(true);
    try {
      await base44.functions.invoke('sendReceiptEmail', { receipt_id: receiptId });
      setStatus('Enviado');
      qc.invalidateQueries({ queryKey: ['fin-data'] });
      toast.success('Recibo enviado por e-mail!');
    } catch (err) {
      toast.error('Erro ao enviar e-mail: ' + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!formData.client_name) { toast.error('Selecione o cliente primeiro.'); return; }
    if (!receiptId) { toast.error('Salve o recibo antes de enviar.'); return; }
    setShowWhatsAppDialog(true);
  };

  const handleConfirmWhatsApp = async (phone, message) => {
    const digits = phone.replace(/\D/g, '');
    const phoneWithCountry = digits.startsWith('55') ? digits : `55${digits}`;
    setSendingWhatsApp(true);
    try {
      await base44.functions.invoke('sendReceiptWhatsApp', { receipt_id: receiptId, phone: phoneWithCountry, message });
      qc.invalidateQueries({ queryKey: ['fin-data'] });
      toast.success('Recibo enviado por WhatsApp!');
      setShowWhatsAppDialog(false);
    } catch (err) {
      toast.error('Erro ao enviar WhatsApp: ' + err.message);
    } finally {
      setSendingWhatsApp(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const statusColor = status === 'Emitido'
    ? 'bg-blue-100 text-blue-800'
    : status === 'Enviado'
    ? 'bg-emerald-100 text-emerald-800'
    : 'bg-gray-100 text-gray-600';

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50/30 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6 flex items-center gap-3">
          <Button onClick={() => navigate(createPageUrl('FinancialTransactions'))} variant="outline" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-emerald-900 mb-1 flex items-center gap-2 flex-wrap">
              Gerador de Recibos
              {receiptNumber && <Badge className={`text-xs border-0 ${statusColor}`}>{receiptNumber} · {status}</Badge>}
            </h1>
            <p className="text-gray-600">Emita recibos de honorários vinculados ao módulo financeiro</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* FORMULÁRIO */}
          <div className="space-y-6">
            {/* Vincular a receita existente */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkExpense}
                    onChange={e => { setLinkExpense(e.target.checked); if (!e.target.checked) setF('expense_id', ''); }}
                    className="rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">Vincular a receita existente</span>
                </label>
                {linkExpense && (
                  <Select value={formData.expense_id || ''} onValueChange={selectExpense}>
                    <SelectTrigger><SelectValue placeholder="Selecionar receita..." /></SelectTrigger>
                    <SelectContent>
                      {receitaExpenses.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.description} — R$ {Number(e.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({e.client_name || 'sem cliente'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {/* Cliente */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Informações do Cliente</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Label className="block text-sm font-medium mb-1">Nome do Cliente *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      className="pl-9"
                      placeholder="Buscar cliente cadastrado..."
                      value={clientSearch || formData.client_name}
                      onChange={e => { setClientSearch(e.target.value); setF('client_name', e.target.value); setShowClientSuggestions(true); }}
                      onFocus={() => setShowClientSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                    />
                  </div>
                  {showClientSuggestions && filteredClients.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-emerald-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredClients.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => selectClient(c)}
                          className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-0"
                        >
                          <p className="text-sm font-medium text-gray-900">{c.client_name}</p>
                          {c.client_email && <p className="text-xs text-gray-400">{c.client_email}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-medium mb-1">Email do Cliente *</Label>
                    <Input type="email" value={formData.client_email} onChange={e => setF('client_email', e.target.value)} placeholder="email@cliente.com" />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium mb-1">CPF/CNPJ</Label>
                    <Input value={formData.client_cpf_cnpj} onChange={e => setF('client_cpf_cnpj', e.target.value)} placeholder="000.000.000-00" />
                  </div>
                </div>
                {clientProperties.length > 0 && (
                  <div>
                    <Label className="block text-sm font-medium mb-1">Propriedade / Empreendimento</Label>
                    <Select
                      value={formData.property_id || ''}
                      onValueChange={v => {
                        const prop = properties.find(p => p.id === v);
                        setF('property_id', v || '');
                        setF('property_name', prop?.property_name || '');
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecionar propriedade" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>— Nenhuma específica —</SelectItem>
                        {clientProperties.map(p => <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="block text-sm font-medium mb-1">Título do Recibo</Label>
                  <Input value={formData.title} onChange={e => setF('title', e.target.value)} placeholder="Ex: Recibo de Honorários" />
                </div>
              </CardContent>
            </Card>

            {/* Serviços */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Serviços</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 border rounded-lg p-4 bg-slate-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="block text-xs font-medium text-gray-600 mb-1">Nome do Serviço</Label>
                      <Input
                        placeholder="Ex: Consultoria ambiental"
                        value={currentService.name}
                        onChange={e => setCurrentService({ ...currentService, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="block text-xs font-medium text-gray-600 mb-1">Descrição (opcional)</Label>
                      <Input
                        placeholder="Detalhes adicionais"
                        value={currentService.description}
                        onChange={e => setCurrentService({ ...currentService, description: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$)</Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0,00"
                        value={currentService.amount || ''}
                        onChange={e => setCurrentService({ ...currentService, amount: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={addService} className="w-full" variant="outline">
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Serviço
                  </Button>
                </div>

                {formData.services.length > 0 && (
                  <div className="space-y-2">
                    {formData.services.map(s => (
                      <div key={s.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium">{s.name}</p>
                          {s.description && <p className="text-xs text-gray-500">{s.description}</p>}
                          <p className="text-sm text-gray-600">R$ {Number(s.amount || 0).toFixed(2)}</p>
                        </div>
                        <Button type="button" onClick={() => removeService(s.id)} variant="ghost" size="icon" className="text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagamento */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Pagamento</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium mb-1">Forma de Pagamento</Label>
                  <Select value={formData.payment_method} onValueChange={v => setF('payment_method', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">Data do Pagamento</Label>
                  <Input type="date" value={formData.payment_date} onChange={e => setF('payment_date', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label className="block text-sm font-medium mb-1">Observações</Label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setF('notes', e.target.value)}
                    placeholder="Observações adicionais..."
                    className="w-full border rounded-lg p-3 text-sm"
                    rows="3"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Espelhar Documentos */}
            <Card>
              <CardContent className="pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.espelhar_documentos}
                    onChange={e => setF('espelhar_documentos', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">Espelhar no módulo de Documentos</span>
                </label>
              </CardContent>
            </Card>

            {/* Total */}
            <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Valor Total</p>
                  <p className="text-3xl font-bold text-emerald-900">R$ {totalAmount.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => handleSave('Rascunho')} variant="outline" className="gap-2" disabled={saving}>
                <Save className="w-4 h-4" /> Salvar Rascunho
              </Button>
              <Button onClick={() => handleSave('Emitido')} className="bg-emerald-600 hover:bg-emerald-700 gap-2" disabled={saving}>
                <FileCheck className="w-4 h-4" /> Emitir Recibo
              </Button>
              <Button onClick={handleSendEmail} variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50" disabled={sendingEmail}>
                <Mail className="w-4 h-4" /> Enviar por Email
              </Button>
              <Button onClick={handleSendWhatsApp} variant="outline" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50" disabled={sendingWhatsApp}>
                <MessageCircle className="w-4 h-4" /> {sendingWhatsApp ? 'Enviando...' : 'Enviar por WhatsApp'}
              </Button>
            </div>
          </div>

          {/* PREVIEW */}
          <div className="lg:sticky lg:top-8">
            <Card>
              <CardHeader><CardTitle className="text-lg">Pré-visualização</CardTitle></CardHeader>
              <CardContent>
                <div className="border rounded-xl p-6 bg-white text-sm">
                  <div className="border-b pb-4 mb-4">
                    <p className="text-[10px] tracking-widest uppercase text-emerald-600 font-bold">PRUMO HUB</p>
                    <h2 className="text-lg font-bold text-emerald-900">{formData.title || 'Recibo de Honorários'}</h2>
                    <p className="text-xs text-gray-500">{receiptNumber || 'Nº será gerado ao salvar'}</p>
                  </div>
                  <div className="space-y-1 mb-4">
                    <p><strong>Cliente:</strong> {formData.client_name || '—'}</p>
                    {formData.client_cpf_cnpj && <p><strong>CPF/CNPJ:</strong> {formData.client_cpf_cnpj}</p>}
                    {formData.property_name && <p><strong>Propriedade:</strong> {formData.property_name}</p>}
                    <p><strong>Forma de Pagamento:</strong> {formData.payment_method}</p>
                    <p><strong>Data:</strong> {formData.payment_date ? format(new Date(formData.payment_date + 'T00:00:00'), 'dd/MM/yyyy') : '—'}</p>
                  </div>
                  <table className="w-full text-xs border-collapse mb-4">
                    <thead>
                      <tr className="bg-emerald-50">
                        <th className="text-left p-2">Serviço</th>
                        <th className="text-right p-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.services.length === 0 ? (
                        <tr><td colSpan={2} className="p-2 text-center text-gray-400">Nenhum serviço adicionado</td></tr>
                      ) : formData.services.map(s => (
                        <tr key={s.id} className="border-b">
                          <td className="p-2">
                            {s.name}
                            {s.description && <span className="block text-gray-400">{s.description}</span>}
                          </td>
                          <td className="p-2 text-right">R$ {Number(s.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-right font-bold text-emerald-900 text-base">
                    Total: R$ {totalAmount.toFixed(2)}
                  </div>
                  {formData.notes && <p className="mt-4 text-xs text-gray-500 border-t pt-3">{formData.notes}</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {receiptId && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" /> Histórico de WhatsApp
            </h2>
            <WhatsAppSendHistory consultorEmail={effectiveEmail} docType="receipt" docId={receiptId} />
          </div>
        )}
      </div>

      <SendWhatsAppDialog
        open={showWhatsAppDialog}
        onOpenChange={setShowWhatsAppDialog}
        defaultPhone={clientPhone}
        defaultMessage={`Olá ${formData.client_name || ''}, segue o recibo${receiptNumber ? ` Nº ${receiptNumber}` : ''} referente a "${formData.title || 'Honorários'}", no valor de R$ ${totalAmount.toFixed(2)}.`}
        isSending={sendingWhatsApp}
        onConfirm={handleConfirmWhatsApp}
      />
    </div>
  );
}
