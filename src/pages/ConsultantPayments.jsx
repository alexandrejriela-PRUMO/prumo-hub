import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link, ExternalLink, CreditCard, Plus, Copy, Check, Wallet, Building, Link2 } from 'lucide-react';
import { toast } from 'sonner';

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
    billingType: 'UNDEFINED',
  });
  const [manualSubaccountId, setManualSubaccountId] = useState('');
  const [linkingSubaccount, setLinkingSubaccount] = useState(false);

  useEffect(() => {
    loadMeta();
    loadUser();
  }, []);

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
    console.log('[ConsultantPayments] handleCreateSubaccount chamado', { name: subaccountForm.name, cpfCnpj: subaccountForm.cpfCnpj });
    if (!subaccountForm.name || !subaccountForm.cpfCnpj) {
      toast.error('Preencha nome e CPF/CNPJ para ativar sua subconta');
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

  const handleCreateCheckout = async () => {
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
        billingType: form.billingType,
      });
      if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        setCheckoutUrl(res.data.checkoutUrl);
        toast.success('Link de pagamento criado!');
      }
    } catch (e) {
      toast.error('Erro ao criar checkout');
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
                <Label>Celular</Label>
                <Input
                  value={subaccountForm.mobilePhone}
                  onChange={e => setSubaccountForm({ ...subaccountForm, mobilePhone: e.target.value })}
                  placeholder="11 988451155"
                />
              </div>
              <div>
                <Label>Faturamento Mensal (R$)</Label>
                <Input
                  type="number"
                  value={subaccountForm.income}
                  onChange={e => setSubaccountForm({ ...subaccountForm, income: e.target.value })}
                  placeholder="5000.00"
                />
              </div>
              <div>
                <Label>CEP</Label>
                <Input
                  value={subaccountForm.postalCode}
                  onChange={e => setSubaccountForm({ ...subaccountForm, postalCode: e.target.value })}
                  placeholder="01001000"
                />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input
                  value={subaccountForm.address}
                  onChange={e => setSubaccountForm({ ...subaccountForm, address: e.target.value })}
                  placeholder="Av Paulista"
                />
              </div>
              <div>
                <Label>Número</Label>
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
                <Label>Bairro</Label>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Cliente *</Label>
                  <Input
                    value={form.clientName}
                    onChange={e => setForm({ ...form, clientName: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label>Email do Cliente</Label>
                  <Input
                    type="email"
                    value={form.clientEmail}
                    onChange={e => setForm({ ...form, clientEmail: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={form.clientCpfCnpj}
                    onChange={e => setForm({ ...form, clientCpfCnpj: e.target.value })}
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
                  <Button variant="ghost" size="sm" onClick={() => { setCheckoutUrl(null); setForm({ clientName: '', clientEmail: '', clientCpfCnpj: '', description: '', value: '', billingType: 'UNDEFINED' }); }}>
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
    </div>
  );
}