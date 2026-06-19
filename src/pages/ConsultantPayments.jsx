import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link, ExternalLink, CreditCard, Plus, Copy, Check, Wallet, Building, Link2, UserPlus, Users, Clock, History, ArrowLeftRight, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { createPageUrl } from '../utils';

export default function ConsultantPayments() {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingSubaccount, setCreatingSubaccount] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [subaccountForm, setSubaccountForm] = useState({
    name: '',
    cpfCnpj: '',
    birthDate: '',
    companyType: '',
    phone: '',
    mobilePhone: '',
    postalCode: '',
    address: '',
    addressNumber: '',
    complement: '',
    province: '',
    income: '',
  });
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    clientCpfCnpj: '',
    description: '',
    value: '',
    billingType: '',
  });
  const [manualSubaccountId, setManualSubaccountId] = useState('');
  const [linkingSubaccount, setLinkingSubaccount] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [charges, setCharges] = useState([]);
  const [chargesLoading, setChargesLoading] = useState(false);
  const [chargeFilter, setChargeFilter] = useState('todos');

  useEffect(() => {
    loadMeta();
    loadUser();
    loadClients();
  }, []);

  useEffect(() => {
    if (meta?.asaas_subaccount_id) loadCharges();
  }, [meta]);

  const loadCharges = async () => {
    setChargesLoading(true);
    try {
      const user = await base44.auth.me();
      const result = await base44.entities.ConsultorCharge.filter(
        { consultor_email: user.email },
        '-created_date',
        100
      );
      setCharges(result || []);
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
    } finally {
      setChargesLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const user = await base44.auth.me();
      const result = await base44.entities.ClientCRM.filter({ consultor_email: user.email }, '-created_date', 100);
      setClients(result || []);
    } catch (e) {
      console.error('Erro ao carregar clientes:', e);
    }
  };

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setSubaccountForm(prev => ({ ...prev, name: user.full_name || '' }));
    } catch (e) {
      console.error('Erro ao carregar usuário:', e);
    }
  };

  const loadMeta = async () => {
    try {
      const metas = await base44.entities.UserMetadata.filter({ user_email: (await base44.auth.me()).email });
      setMeta(metas?.[0] || null);
    } catch (e) {
      console.error('Erro ao carregar metadata:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubaccount = async () => {
    console.log('[ConsultantPayments] handleCreateSubaccount chamado', subaccountForm);
    const required = ['name', 'cpfCnpj', 'mobilePhone', 'address', 'addressNumber', 'province', 'postalCode', 'income'];
    const missing = required.filter(f => !subaccountForm[f]);
    if (missing.length > 0) {
      const labels = { name: 'Nome', cpfCnpj: 'CPF/CNPJ', mobilePhone: 'Celular', address: 'Endereço', addressNumber: 'Número', province: 'Bairro', postalCode: 'CEP', income: 'Faturamento' };
      toast.error('Preencha todos os campos obrigatórios: ' + missing.map(f => labels[f]).join(', '));
      return;
    }
    setCreatingSubaccount(true);
    try {
      const user = await base44.auth.me();
      const cpfCnpj = subaccountForm.cpfCnpj.replace(/\D/g, '');
      const payload = {
        name: subaccountForm.name,
        email: user.email,
        cpfCnpj,
        birthDate: subaccountForm.birthDate || undefined,
        companyType: subaccountForm.companyType || (cpfCnpj.length > 11 ? 'LIMITED' : undefined),
        phone: subaccountForm.phone ? subaccountForm.phone.replace(/\D/g, '') : undefined,
        mobilePhone: subaccountForm.mobilePhone ? subaccountForm.mobilePhone.replace(/\D/g, '') : undefined,
        postalCode: subaccountForm.postalCode ? subaccountForm.postalCode.replace(/\D/g, '') : undefined,
        address: subaccountForm.address || undefined,
        addressNumber: subaccountForm.addressNumber || undefined,
        complement: subaccountForm.complement || undefined,
        province: subaccountForm.province || undefined,
        income: subaccountForm.income ? parseFloat(subaccountForm.income) : undefined,
      };
      const res = await base44.functions.invoke('createAsaasSubaccount', payload);
      console.log('[ConsultantPayments] Resposta:', res.data);
      if (res.data?.error) {
        toast.error(res.data.error);
      } else if (res.data?.subaccount_id || res.data?.already_exists) {
        toast.success('Subconta Asaas ativada com sucesso!');
        await loadMeta();
      } else {
        toast.error('Resposta inesperada do servidor. Tente novamente.');
      }
    } catch (e) {
      console.error('[ConsultantPayments] Erro:', e);
      toast.error(e?.response?.data?.error || e?.message || 'Erro ao ativar subconta');
    } finally {
      setCreatingSubaccount(false);
    }
  };

  const handleLinkSubaccount = async () => {
    if (!manualSubaccountId.trim()) {
      toast.error('Cole o ID da sua subconta Asaas');
      return;
    }
    setLinkingSubaccount(true);
    try {
      const user = await base44.auth.me();
      const metas = await base44.entities.UserMetadata.filter({ user_email: user.email });
      if (metas?.length > 0) {
        await base44.entities.UserMetadata.update(metas[0].id, {
          asaas_subaccount_id: manualSubaccountId.trim(),
        });
      } else {
        await base44.entities.UserMetadata.create({
          user_email: user.email,
          user_id: user.id,
          asaas_subaccount_id: manualSubaccountId.trim(),
        });
      }
      toast.success('Subconta vinculada com sucesso!');
      await loadMeta();
    } catch (e) {
      toast.error('Erro ao vincular subconta: ' + (e?.message || 'Tente novamente'));
    } finally {
      setLinkingSubaccount(false);
    }
  };

  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId);
    if (!clientId) {
      setForm({ clientName: '', clientEmail: '', clientCpfCnpj: '', description: '', value: '', billingType: '' });
      return;
    }
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const doc = client.cnpj || client.cpf || '';
      setForm(prev => ({
        ...prev,
        clientName: client.client_name || '',
        clientEmail: client.client_email || '',
        clientCpfCnpj: doc,
      }));
    }
  };

  const handleCreateCheckout = async () => {
    console.log('[ConsultantPayments] handleCreateCheckout chamado', form);
    if (!form.clientName || !form.description || !form.value) {
      toast.error('Preencha nome do cliente, descrição e valor');
      return;
    }
    setCreating(true);
    try {
      const res = await base44.functions.invoke('createConsultantCheckout', {
        clientName: form.clientName,
        clientEmail: form.clientEmail || undefined,
        clientCpfCnpj: form.clientCpfCnpj || undefined,
        description: form.description,
        value: parseFloat(form.value),
        billingType: form.billingType || undefined,
      });
      console.log('[ConsultantPayments] Resposta:', res.data);
      if (res.data?.error) {
        toast.error(res.data.error);
      } else if (res.data?.checkoutUrl) {
        setCheckoutUrl(res.data.checkoutUrl);
        toast.success('Link de pagamento criado!');
        loadCharges();
      } else {
        toast.error('Resposta inesperada do servidor');
      }
    } catch (e) {
      console.error('[ConsultantPayments] Erro ao criar checkout:', e?.response?.data || e?.message || e);
      const errMsg = e?.response?.data?.error || e?.message || 'Tente novamente';
      toast.error('Erro ao criar checkout: ' + errMsg);
    } finally {
      setCreating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hasSubaccount = meta?.asaas_subaccount_id;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Gateway de Pagamentos</h1>
          <p className="text-emerald-600 text-sm mt-1">Cobre seus clientes diretamente pelo PRUMO</p>
        </div>
        {hasSubaccount && (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            <Wallet className="w-3 h-3 mr-1" /> Subconta ativa
          </Badge>
        )}
      </div>

      {!hasSubaccount ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-600" />
              Ativar Gateway de Pagamentos
            </CardTitle>
            <CardDescription>
              Preencha seus dados para ativar sua subconta Asaas e começar a cobrar seus clientes com comissão automática de 10% para o PRUMO.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input
                  value={subaccountForm.name}
                  onChange={e => setSubaccountForm({ ...subaccountForm, name: e.target.value })}
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <Label>CPF/CNPJ *</Label>
                <Input
                  value={subaccountForm.cpfCnpj}
                  onChange={e => setSubaccountForm({ ...subaccountForm, cpfCnpj: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label>Tipo de Empresa (para CNPJ)</Label>
                <select
                  value={subaccountForm.companyType}
                  onChange={e => setSubaccountForm({ ...subaccountForm, companyType: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Selecione...</option>
                  <option value="MEI">MEI</option>
                  <option value="INDIVIDUAL">EI (Empresário Individual)</option>
                  <option value="LIMITED">LTDA</option>
                  <option value="ASSOCIATION">Associação</option>
                </select>
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={subaccountForm.birthDate}
                  onChange={e => setSubaccountForm({ ...subaccountForm, birthDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={subaccountForm.phone}
                  onChange={e => setSubaccountForm({ ...subaccountForm, phone: e.target.value })}
                  placeholder="11 32300606"
                />
              </div>
              <div>
                <Label>Celular *</Label>
                <Input
                  value={subaccountForm.mobilePhone}
                  onChange={e => setSubaccountForm({ ...subaccountForm, mobilePhone: e.target.value })}
                  placeholder="11 988451155"
                />
              </div>
              <div>
                <Label>Faturamento Mensal (R$) *</Label>
                <Input
                  type="number"
                  value={subaccountForm.income}
                  onChange={e => setSubaccountForm({ ...subaccountForm, income: e.target.value })}
                  placeholder="5000.00"
                />
              </div>
              <div>
                <Label>CEP *</Label>
                <Input
                  value={subaccountForm.postalCode}
                  onChange={e => setSubaccountForm({ ...subaccountForm, postalCode: e.target.value })}
                  placeholder="01001000"
                />
              </div>
              <div>
                <Label>Endereço *</Label>
                <Input
                  value={subaccountForm.address}
                  onChange={e => setSubaccountForm({ ...subaccountForm, address: e.target.value })}
                  placeholder="Av Paulista"
                />
              </div>
              <div>
                <Label>Número *</Label>
                <Input
                  value={subaccountForm.addressNumber}
                  onChange={e => setSubaccountForm({ ...subaccountForm, addressNumber: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input
                  value={subaccountForm.complement}
                  onChange={e => setSubaccountForm({ ...subaccountForm, complement: e.target.value })}
                  placeholder="Sala 502"
                />
              </div>
              <div>
                <Label>Bairro *</Label>
                <Input
                  value={subaccountForm.province}
                  onChange={e => setSubaccountForm({ ...subaccountForm, province: e.target.value })}
                  placeholder="Bela Vista"
                />
              </div>
            </div>
            <Button type="button" onClick={handleCreateSubaccount} disabled={creatingSubaccount} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {creatingSubaccount ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Wallet className="w-4 h-4 mr-2" />
              )}
              {creatingSubaccount ? 'Ativando...' : 'Ativar Subconta'}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">ou</span></div>
            </div>

            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Já tem subconta Asaas?
              </p>
              <div className="flex gap-2">
                <Input
                  value={manualSubaccountId}
                  onChange={e => setManualSubaccountId(e.target.value)}
                  placeholder="Cole o ID da subconta"
                  className="text-xs h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLinkSubaccount}
                  disabled={linkingSubaccount || !manualSubaccountId.trim()}
                  className="whitespace-nowrap h-9"
                >
                  {linkingSubaccount ? 'Vinculando...' : 'Vincular'}
                </Button>
              </div>
              <p className="text-[10px] text-gray-400">
                Encontre o ID no painel do Asaas em Minha Conta → Dados Cadastrais
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Nova Cobrança
              </CardTitle>
              <CardDescription>
                Gere um link de pagamento para seu cliente. O PRUMO recebe 10% de comissão automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {clients.length > 0 && (
                <div>
                  <Label className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Cliente do CRM</Label>
                  <select
                    value={selectedClientId}
                    onChange={e => handleSelectClient(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Selecione um cliente cadastrado...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.client_name || 'Sem nome'} {c.client_email ? `(${c.client_email})` : ''} {c.cnpj ? `— CNPJ: ${c.cnpj}` : c.cpf ? `— CPF: ${c.cpf}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Ou preencha os campos manualmente abaixo</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Cliente *</Label>
                  <Input
                    value={form.clientName}
                    onChange={e => { setSelectedClientId(''); setForm({ ...form, clientName: e.target.value }); }}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label>Email do Cliente</Label>
                  <Input
                    type="email"
                    value={form.clientEmail}
                    onChange={e => { setSelectedClientId(''); setForm({ ...form, clientEmail: e.target.value }); }}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={form.clientCpfCnpj}
                    onChange={e => { setSelectedClientId(''); setForm({ ...form, clientCpfCnpj: e.target.value }); }}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.value}
                    onChange={e => setForm({ ...form, value: e.target.value })}
                    placeholder="1500.00"
                  />
                </div>
              </div>
              <div>
                <Label>Descrição do Serviço *</Label>
                <Input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Elaboração de PRAD - Fazenda São João"
                />
              </div>
              <Button
                onClick={handleCreateCheckout}
                disabled={creating}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Gerar Link de Pagamento
              </Button>
            </CardContent>
          </Card>

          {checkoutUrl && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700">
                  <ExternalLink className="w-4 h-4" />
                  <span className="font-medium">Link de pagamento gerado:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input value={checkoutUrl} readOnly className="font-mono text-xs bg-white" />
                  <Button variant="outline" size="sm" onClick={copyLink}>
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 mr-1" /> Abrir link
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setCheckoutUrl(null); setSelectedClientId(''); setForm({ clientName: '', clientEmail: '', clientCpfCnpj: '', description: '', value: '', billingType: '' }); }}>
                    Nova cobrança
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Info sobre split */}
      {hasSubaccount && (
        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-700 font-bold text-sm">10%</span>
              </div>
              <div>
                <p className="font-medium text-amber-900">Comissão automática</p>
                <p className="text-sm text-amber-700 mt-1">
                  Toda cobrança feita por você tem 10% do valor líquido repassado automaticamente ao PRUMO via split do Asaas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Cobranças */}
      {hasSubaccount && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                Histórico de Cobranças
              </CardTitle>
              <Link to={createPageUrl('FinancialTransactions')} className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                <ArrowLeftRight className="w-3 h-3" /> Transações Consolidadas
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {['todos','Pendente','Pago','Vencido','Cancelado'].map(f => (
                <Button
                  key={f}
                  variant={chargeFilter === f ? 'default' : 'outline'}
                  size="sm"
                  className={chargeFilter === f ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  onClick={() => setChargeFilter(f)}
                >
                  {f === 'todos' ? 'Todos' : f}
                  {f !== 'todos' && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                      {charges.filter(c => c.status === f).length}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {chargesLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              </div>
            ) : (() => {
              const filtered = chargeFilter === 'todos' ? charges : charges.filter(c => c.status === chargeFilter);
              if (filtered.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-400">
                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Nenhuma cobrança {chargeFilter !== 'todos' ? chargeFilter.toLowerCase() : ''} encontrada.</p>
                  </div>
                );
              }
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Cliente</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Descrição</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Valor</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 hidden sm:table-cell">Vencimento</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Status</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map(c => {
                        const statusColors = {
                          'Pendente': 'bg-amber-100 text-amber-700',
                          'Pago': 'bg-emerald-100 text-emerald-700',
                          'Vencido': 'bg-red-100 text-red-700',
                          'Cancelado': 'bg-gray-100 text-gray-500',
                        };
                        return (
                          <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2.5 text-sm text-gray-800">
                              <div>{c.client_name}</div>
                              {c.client_email && <div className="text-[10px] text-gray-400">{c.client_email}</div>}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[140px] truncate">{c.description}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-sm">
                              {c.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-gray-500 hidden sm:table-cell">
                              {c.due_date ? format(parseISO(c.due_date), 'dd/MM/yyyy') : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <Badge className={`${statusColors[c.status] || 'bg-gray-100 text-gray-500'} border-0 text-[10px]`}>
                                {c.status}
                              </Badge>
                              {c.status === 'Pago' && c.paid_at && (
                                <div className="text-[9px] text-gray-400 mt-0.5">{format(parseISO(c.paid_at), 'dd/MM')}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {c.stripe_payment_url && (
                                <a href={c.stripe_payment_url} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 hover:bg-gray-100 rounded-lg inline-flex" title="Abrir link">
                                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2">
                      <tr>
                        <td colSpan={2} className="px-3 py-2 text-xs font-semibold text-gray-600">
                          {filtered.length} cobrança{filtered.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-emerald-700">
                          {filtered.reduce((s, c) => s + (c.amount || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="hidden sm:table-cell" /><td /><td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}