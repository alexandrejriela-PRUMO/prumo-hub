import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link, ExternalLink, CreditCard, Plus, Copy, Check, Wallet, Building, Link2, UserPlus, Users, Clock, History, ArrowLeftRight, TrendingUp, Info, ArrowDown, PiggyBank } from 'lucide-react';
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

  // ── Carteira / Saldo ──
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [pixForm, setPixForm] = useState({ value: '', pixKey: '', description: '' });
  const [transferring, setTransferring] = useState(false);
  const [statement, setStatement] = useState([]);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementPage, setStatementPage] = useState(0);
  const [statementHasMore, setStatementHasMore] = useState(false);

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

  // ── Wallet / Carteira ──────────────────────────────
  const loadBalance = async () => {
    setWalletLoading(true);
    try {
      const res = await base44.functions.invoke('consultantWallet', { action: 'balance' });
      if (res.data?.error) { toast.error(res.data.error); return; }
      setWalletBalance(res.data?.balance ?? 0);
    } catch (e) {
      toast.error('Erro ao consultar saldo');
    } finally { setWalletLoading(false); }
  };

  const loadStatement = async (page = 0) => {
    setStatementLoading(true);
    try {
      const res = await base44.functions.invoke('consultantWallet', { action: 'statement', offset: page * 20, limit: 20 });
      if (res.data?.error) { toast.error(res.data.error); return; }
      setStatement(res.data?.data || []);
      setStatementHasMore(res.data?.hasMore || false);
      setStatementPage(page);
    } catch (e) {
      toast.error('Erro ao carregar extrato');
    } finally { setStatementLoading(false); }
  };

  const handlePixTransfer = async () => {
    if (!pixForm.value || parseFloat(pixForm.value) <= 0) { toast.error('Informe o valor'); return; }
    if (!pixForm.pixKey.trim()) { toast.error('Informe a chave PIX de destino'); return; }
    setTransferring(true);
    try {
      const res = await base44.functions.invoke('consultantWallet', {
        action: 'transfer',
        value: parseFloat(pixForm.value),
        pixAddressKey: pixForm.pixKey.trim(),
        description: pixForm.description || undefined,
      });
      if (res.data?.error) { toast.error(res.data.error); return; }
      toast.success(`Transferência de ${parseFloat(pixForm.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} solicitada!`);
      setPixForm({ value: '', pixKey: '', description: '' });
      loadBalance();
    } catch (e) {
      toast.error('Erro ao solicitar transferência');
    } finally { setTransferring(false); }
  };

  // Carrega saldo e extrato quando subconta ativa
  useEffect(() => {
    if (meta?.asaas_subaccount_id) { loadBalance(); loadStatement(); }
  }, [meta?.asaas_subaccount_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hasSubaccount = meta?.asaas_subaccount_id;

  // ── Calculadora de taxas ──────────────────────────────────────────
  const valorDigitado = parseFloat(form.value) || 0;
  const billingType = form.billingType;

  // Taxas promocionais (válidas até 19/09/2026) — depois viram padrão
  const taxasAsaas = {
    pix:           { nome: 'PIX',                      percentual: 0,       fixa: 0.99,  desc: 'R$ 0,99 (promo)',                              padraoFixa: 2.00,  padraoPct: 0,      padraoDesc: 'R$ 2,00' },
    boleto:        { nome: 'Boleto',                   percentual: 0,       fixa: 0.99,  desc: 'R$ 0,99 (promo)',                              padraoFixa: 1.99,  padraoPct: 0,      padraoDesc: 'R$ 1,99' },
    debito:        { nome: 'Cartão de Débito',         percentual: 0.0189,  fixa: 0.35,  desc: 'R$ 0,35 + 1,89% (promo)',                     padraoFixa: 0.35,  padraoPct: 0.0189, padraoDesc: 'R$ 0,35 + 1,89%' },
    cartao_vista:  { nome: 'Crédito à vista',          percentual: 0.0199,  fixa: 0.49,  desc: 'R$ 0,49 + 1,99% (promo)',                    padraoFixa: 0.49,  padraoPct: 0.0299, padraoDesc: 'R$ 0,49 + 2,99%' },
    cartao_2a6:    { nome: 'Crédito 2x a 6x',          percentual: 0.0249,  fixa: 0.49,  desc: 'R$ 0,49 + 2,49% (promo)',                    padraoFixa: 0.49,  padraoPct: 0.0349, padraoDesc: 'R$ 0,49 + 3,49%' },
    cartao_7a12:   { nome: 'Crédito 7x a 12x',         percentual: 0.0299,  fixa: 0.49,  desc: 'R$ 0,49 + 2,99% (promo)',                    padraoFixa: 0.49,  padraoPct: 0.0399, padraoDesc: 'R$ 0,49 + 3,99%' },
    cartao_13a21:  { nome: 'Crédito 13x a 21x',        percentual: 0.0329,  fixa: 0.49,  desc: 'R$ 0,49 + 3,29% (promo)',                    padraoFixa: 0.49,  padraoPct: 0.0429, padraoDesc: 'R$ 0,49 + 4,29%' },
  };

  const metodoSelecionado = taxasAsaas[billingType] || { percentual: 0, fixa: 0, nome: '—', desc: 'Selecione' };
  const taxaAsaasEstimada = valorDigitado * metodoSelecionado.percentual + metodoSelecionado.fixa;
  const taxaPadraoEstimada = metodoSelecionado.padraoFixa !== undefined
    ? valorDigitado * metodoSelecionado.padraoPct + metodoSelecionado.padraoFixa
    : null;
  const valorAposAsaas = Math.max(0, valorDigitado - taxaAsaasEstimada);
  const valorAposAsaasPadrao = taxaPadraoEstimada !== null ? Math.max(0, valorDigitado - taxaPadraoEstimada) : null;
  const comissaoPrumo = valorAposAsaas * 0.10;
  const comissaoPrumoPadrao = valorAposAsaasPadrao !== null ? valorAposAsaasPadrao * 0.10 : null;
  const valorLiquidoConsultor = valorAposAsaas - comissaoPrumo;
  const valorLiquidoConsultorPadrao = comissaoPrumoPadrao !== null ? valorAposAsaasPadrao - comissaoPrumoPadrao : null;

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
              <div>
                <Label>Forma de Pagamento</Label>
                <select
                  value={billingType}
                  onChange={e => setForm({ ...form, billingType: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Cliente escolhe no link</option>
                  <optgroup label="── À vista ──">
                    <option value="pix">PIX — R$ 0,99</option>
                    <option value="boleto">Boleto — R$ 0,99</option>
                    <option value="debito">Cartão de Débito — R$ 0,35 + 1,89%</option>
                    <option value="cartao_vista">Crédito à vista — R$ 0,49 + 1,99%</option>
                  </optgroup>
                  <optgroup label="── Crédito parcelado ──">
                    <option value="cartao_2a6">Crédito 2x a 6x — R$ 0,49 + 2,49%</option>
                    <option value="cartao_7a12">Crédito 7x a 12x — R$ 0,49 + 2,99%</option>
                    <option value="cartao_13a21">Crédito 13x a 21x — R$ 0,49 + 3,29%</option>
                  </optgroup>
                </select>
                <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Taxas promocionais válidas até 19/09/2026 — após isso, as taxas padrão se aplicam.
                </p>
              </div>

              {/* Prévia de valores */}
              {valorDigitado > 0 && (
                <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-sm">
                  <CardContent className="pt-4 pb-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Info className="w-4 h-4 text-slate-500" />
                      Prévia do recebimento
                      {billingType && <Badge className="ml-auto bg-slate-100 text-slate-600 border-slate-200 text-[10px]">{metodoSelecionado.nome}</Badge>}
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* Valor cobrado */}
                      <div className="flex justify-between items-center py-1.5 px-3 bg-white rounded-lg border border-slate-100">
                        <span className="text-slate-600">Valor cobrado do cliente</span>
                        <span className="font-bold text-slate-800">{valorDigitado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>

                      <div className="flex justify-center">
                        <ArrowDown className="w-3 h-3 text-slate-300" />
                      </div>

                      {/* Taxa Asaas — Promocional */}
                      <div className="flex justify-between items-center py-1.5 px-3 bg-amber-50/80 rounded-lg border border-amber-100">
                        <div className="flex flex-col">
                          <span className="text-amber-700 text-[11px]">Taxa Asaas {metodoSelecionado.desc}</span>
                          {taxaPadraoEstimada !== null && (
                            <span className="text-[9px] text-amber-400">Após 19/09: {metodoSelecionado.padraoDesc}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-amber-700">-{taxaAsaasEstimada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          {taxaPadraoEstimada !== null && (
                            <div className="text-[9px] text-amber-400 line-through">-{taxaPadraoEstimada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                          )}
                        </div>
                      </div>

                      {/* Comissão PRUMO */}
                      <div className="flex justify-between items-center py-1.5 px-3 bg-amber-50/50 rounded-lg border border-amber-100">
                        <span className="text-amber-700 flex items-center gap-1">
                          <PiggyBank className="w-3 h-3" />
                          Comissão PRUMO (10%)
                        </span>
                        <span className="font-semibold text-amber-700">-{comissaoPrumo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>

                      <div className="flex justify-center">
                        <ArrowDown className="w-3 h-3 text-emerald-300" />
                      </div>

                      {/* Valor líquido */}
                      <div className="flex justify-between items-center py-2 px-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="flex flex-col">
                          <span className="text-emerald-800 font-semibold text-sm">Você recebe</span>
                          {valorLiquidoConsultorPadrao !== null && (
                            <span className="text-[9px] text-emerald-500">Após 19/09: {valorLiquidoConsultorPadrao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          )}
                        </div>
                        <span className="font-bold text-emerald-700 text-base">{valorLiquidoConsultor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>

                      <p className="text-[10px] text-slate-400 text-center">
                        Simulação com taxas promocionais. Os valores reais podem variar conforme o contrato da sua subconta.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

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

      {/* ── Carteira / Saldo ── */}
      {hasSubaccount && (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Sua Carteira
            </CardTitle>
            <CardDescription>Seu saldo de honorários. Transfira para sua conta bancária via PIX quando quiser.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Saldo */}
            <div className="bg-white rounded-xl border border-emerald-100 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Saldo disponível</p>
                {walletLoading ? (
                  <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-emerald-700">
                    {(walletBalance ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={loadBalance} disabled={walletLoading} className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" /> Atualizar
              </Button>
            </div>

            {/* Transferência PIX */}
            <div className="bg-white rounded-xl border border-amber-100 p-4">
              <p className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-1.5">
                <ArrowDown className="w-4 h-4" /> Sacar via PIX
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number" step="0.01"
                    value={pixForm.value}
                    onChange={e => setPixForm({ ...pixForm, value: e.target.value })}
                    placeholder="500.00"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Chave PIX de destino</Label>
                  <Input
                    value={pixForm.pixKey}
                    onChange={e => setPixForm({ ...pixForm, pixKey: e.target.value })}
                    placeholder="CPF, email, telefone ou chave aleatória"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="mt-2">
                <Label className="text-xs">Descrição (opcional)</Label>
                <Input
                  value={pixForm.description}
                  onChange={e => setPixForm({ ...pixForm, description: e.target.value })}
                  placeholder="Saque de honorários"
                  className="h-9 text-sm"
                />
              </div>
              <Button
                onClick={handlePixTransfer}
                disabled={transferring}
                className="w-full mt-3 bg-amber-600 hover:bg-amber-700"
                size="sm"
              >
                {transferring ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <ArrowDown className="w-4 h-4 mr-2" />
                )}
                {transferring ? 'Solicitando...' : 'Transferir via PIX'}
              </Button>
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                <p className="font-medium text-slate-700 text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Quando o dinheiro fica disponível?
                </p>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center py-1 px-2 bg-white rounded border border-emerald-100">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> PIX</span>
                    <span className="font-medium text-emerald-700">Instantâneo</span>
                  </div>
                  <div className="flex justify-between items-center py-1 px-2 bg-white rounded border border-slate-100">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Boleto</span>
                    <span className="font-medium text-slate-700">No mesmo dia</span>
                  </div>
                  <div className="flex justify-between items-center py-1 px-2 bg-white rounded border border-slate-100">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Cartão de Débito</span>
                    <span className="font-medium text-amber-700">3 dias úteis</span>
                  </div>
                  <div className="flex justify-between items-center py-1 px-2 bg-white rounded border border-red-100">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Cartão de Crédito</span>
                    <span className="font-medium text-red-700">32 dias</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Esses são os prazos do Asaas para o dinheiro entrar no <strong>seu saldo</strong>. Depois que estiver disponível, você saca via PIX para sua conta bancária em minutos.
                </p>
              </div>
            </div>

            {/* Extrato */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4" /> Extrato
                </p>
                <Button variant="ghost" size="sm" onClick={() => loadStatement(0)} disabled={statementLoading} className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" /> Atualizar
                </Button>
              </div>

              {statementLoading ? (
                <div className="text-center py-6">
                  <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
                </div>
              ) : statement.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Nenhuma movimentação encontrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500">Data</th>
                        <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500">Descrição</th>
                        <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500">Valor</th>
                        <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500 hidden sm:table-cell">Taxa</th>
                        <th className="text-right px-3 py-2 text-[10px] font-semibold text-gray-500">Líquido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {statement.map(tx => {
                        const isCredit = tx.value >= 0;
                        return (
                          <tr key={tx.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                              {tx.date ? format(parseISO(tx.date), 'dd/MM/yy') : '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate">{tx.description || tx.type}</td>
                            <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                              {isCredit ? '+' : ''}{tx.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="px-3 py-2 text-right text-red-400 hidden sm:table-cell whitespace-nowrap">
                              {tx.feeValue ? `-${tx.feeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-700 whitespace-nowrap">
                              {tx.netValue != null ? tx.netValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {statementHasMore && (
                    <div className="flex justify-center mt-3 gap-2">
                      {statementPage > 0 && (
                        <Button variant="outline" size="sm" onClick={() => loadStatement(statementPage - 1)} className="text-xs">
                          ← Anterior
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => loadStatement(statementPage + 1)} className="text-xs">
                        Próxima →
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info sobre split */}
      {hasSubaccount && (
        <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <CardContent className="pt-6">
            <p className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-500" />
              Como funciona o repasse
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {/* Asaas */}
              <div className="bg-white rounded-xl p-3 border border-red-100">
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-full bg-red-100 flex items-center justify-center">
                  <Building className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-[10px] font-semibold text-red-700">Asaas</p>
                <p className="text-[9px] text-red-500 mt-0.5">Taxa por transação</p>
                <p className="text-[10px] font-bold text-red-600 mt-1">Boleto R$ 0,99</p>
                <p className="text-[10px] font-bold text-red-600">PIX R$ 0,99</p>
                <p className="text-[10px] font-bold text-red-600">Débito 0,35+1,89%</p>
                <p className="text-[9px] text-red-400 mt-1 leading-tight">Crédito:</p>
                <p className="text-[9px] font-bold text-red-500">À vista 0,49+1,99%</p>
                <p className="text-[9px] font-bold text-red-500">2-6x 0,49+2,49%</p>
                <p className="text-[9px] font-bold text-red-500">7-12x 0,49+2,99%</p>
                <p className="text-[9px] font-bold text-red-500">13-21x 0,49+3,29%</p>
                <p className="text-[8px] text-red-300 mt-0.5">Promo até 19/09/2026</p>
              </div>

              {/* PRUMO */}
              <div className="bg-white rounded-xl p-3 border border-amber-100">
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-full bg-amber-100 flex items-center justify-center">
                  <PiggyBank className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-[10px] font-semibold text-amber-700">PRUMO</p>
                <p className="text-[9px] text-amber-500 mt-0.5">Comissão da plataforma</p>
                <p className="text-[10px] font-bold text-amber-600 mt-1">10%</p>
                <p className="text-[9px] text-amber-500">do valor após Asaas</p>
              </div>

              {/* Consultor */}
              <div className="bg-white rounded-xl p-3 border border-emerald-100">
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[10px] font-semibold text-emerald-700">Você</p>
                <p className="text-[9px] text-emerald-500 mt-0.5">Recebimento líquido</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-1">~88% a 89%</p>
                <p className="text-[9px] text-emerald-500">do valor cobrado</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-3 text-center">
              O split é automático — o Asaas envia cada parte para a conta correta assim que o cliente paga.
            </p>
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