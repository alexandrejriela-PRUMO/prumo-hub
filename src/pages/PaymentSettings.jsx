import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard, CheckCircle2, AlertCircle, Loader2, ExternalLink,
  Clock, FileText, Settings, TrendingUp, Building2
} from 'lucide-react';
import { toast } from 'sonner';


const STATUS_COLOR = {
  Pendente: 'bg-amber-100 text-amber-700',
  Pago: 'bg-green-100 text-green-700',
  Vencido: 'bg-red-100 text-red-700',
  Cancelado: 'bg-gray-100 text-gray-600',
};

export default function PaymentSettings() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [fiscalForm, setFiscalForm] = useState({
    nfe_cnpj: '', nfe_inscricao_municipal: '', nfe_codigo_municipio: '',
    nfe_item_lista_servico: '1401', nfe_aliquota: 5
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setFiscalForm({
        nfe_cnpj: u.nfe_cnpj || '',
        nfe_inscricao_municipal: u.nfe_inscricao_municipal || '',
        nfe_codigo_municipio: u.nfe_codigo_municipio || '',
        nfe_item_lista_servico: u.nfe_item_lista_servico || '1401',
        nfe_aliquota: u.nfe_aliquota || 5,
      });
    }).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') toast.success('Conta Stripe conectada com sucesso!');
    if (params.get('refresh') === 'true') toast.info('Sessão expirada. Gere um novo link de onboarding.');
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoadingStripe(true);
    base44.functions.invoke('stripeConnectOnboarding', { action: 'get_status' })
      .then(res => setStripeStatus(res.data))
      .catch(() => setStripeStatus({ connected: false }))
      .finally(() => setLoadingStripe(false));
  }, [user]);

  const { data: charges = [], isLoading: loadingCharges } = useQuery({
    queryKey: ['all-charges', user?.email],
    queryFn: () => base44.entities.ConsultorCharge.filter({ consultor_email: user.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const res = await base44.functions.invoke('stripeConnectOnboarding', { action: 'create_onboarding_link' });
      if (res.data?.url) window.location.href = res.data.url;
      else toast.error('Não foi possível gerar o link de onboarding.');
    } catch (e) {
      toast.error('Erro: ' + e.message);
    } finally {
      setConnectingStripe(false);
    }
  };

  const saveFiscalData = async (e) => {
    e.preventDefault();
    await base44.auth.updateMe(fiscalForm);
    setUser(u => ({ ...u, ...fiscalForm }));
    toast.success('Dados fiscais salvos!');
  };

  const totalReceived = charges.filter(c => c.status === 'Pago').reduce((s, c) => s + (c.amount || 0), 0);
  const totalPending = charges.filter(c => c.status === 'Pendente').reduce((s, c) => s + (c.amount || 0), 0);
  const totalOverdue = charges.filter(c => c.status === 'Vencido').reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-emerald-600" />
          Configurações de Pagamento
        </h1>
        <p className="text-gray-500 mt-1">Gerencie sua conta de recebimentos, dados fiscais e cobranças.</p>
      </div>

      <Tabs defaultValue="recebimentos">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recebimentos">Recebimentos</TabsTrigger>
          <TabsTrigger value="fiscal">Dados Fiscais (NF-e)</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* ── Recebimentos ──────────────────────────────────────────── */}
        <TabsContent value="recebimentos" className="mt-5 space-y-5">
          {/* Stripe Connect */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-600" />
                Conta Stripe Connect (Recebimentos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStripe ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Verificando status...
                </div>
              ) : stripeStatus?.connected && stripeStatus?.charges_enabled ? (
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Conta conectada e ativa ✓</p>
                      <p className="text-xs text-gray-500">ID: {stripeStatus.account_id}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleConnectStripe} disabled={connectingStripe}>
                    <ExternalLink className="w-3 h-3 mr-2" /> Gerenciar conta
                  </Button>
                </div>
              ) : stripeStatus?.connected ? (
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Cadastro incompleto</p>
                      <p className="text-xs text-gray-500">Complete seu cadastro para começar a receber pagamentos.</p>
                    </div>
                  </div>
                  <Button className="bg-amber-500 hover:bg-amber-600" size="sm" onClick={handleConnectStripe} disabled={connectingStripe}>
                    {connectingStripe && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                    Completar cadastro
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Conta não conectada</p>
                      <p className="text-xs text-gray-500">Conecte sua conta Stripe para cobrar seus clientes via boleto, PIX ou cartão.</p>
                    </div>
                  </div>
                  <Button className="bg-purple-600 hover:bg-purple-700" size="sm" onClick={handleConnectStripe} disabled={connectingStripe}>
                    {connectingStripe && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                    Conectar Stripe
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <p className="text-xs font-semibold text-green-800">Recebido</p>
                </div>
                <p className="text-xl font-bold text-green-900">R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-green-600 mt-0.5">{charges.filter(c => c.status === 'Pago').length} cobranças</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <p className="text-xs font-semibold text-amber-800">A Receber</p>
                </div>
                <p className="text-xl font-bold text-amber-900">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-amber-600 mt-0.5">{charges.filter(c => c.status === 'Pendente').length} cobranças</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-xs font-semibold text-red-800">Vencido</p>
                </div>
                <p className="text-xl font-bold text-red-900">R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-red-600 mt-0.5">{charges.filter(c => c.status === 'Vencido').length} cobranças</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Dados Fiscais ──────────────────────────────────────────── */}
        <TabsContent value="fiscal" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Dados para Emissão de NF-e (Focus NFe)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveFiscalData} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>CNPJ do Prestador</Label>
                    <Input
                      value={fiscalForm.nfe_cnpj}
                      onChange={e => setFiscalForm(f => ({ ...f, nfe_cnpj: e.target.value }))}
                      placeholder="00.000.000/0001-00"
                    />
                  </div>
                  <div>
                    <Label>Inscrição Municipal</Label>
                    <Input
                      value={fiscalForm.nfe_inscricao_municipal}
                      onChange={e => setFiscalForm(f => ({ ...f, nfe_inscricao_municipal: e.target.value }))}
                      placeholder="Ex: 12345678"
                    />
                  </div>
                  <div>
                    <Label>Código IBGE do Município</Label>
                    <Input
                      value={fiscalForm.nfe_codigo_municipio}
                      onChange={e => setFiscalForm(f => ({ ...f, nfe_codigo_municipio: e.target.value }))}
                      placeholder="Ex: 3550308 (São Paulo)"
                    />
                  </div>
                  <div>
                    <Label>Item da Lista de Serviços (LC 116)</Label>
                    <Input
                      value={fiscalForm.nfe_item_lista_servico}
                      onChange={e => setFiscalForm(f => ({ ...f, nfe_item_lista_servico: e.target.value }))}
                      placeholder="Ex: 1401"
                    />
                  </div>
                  <div>
                    <Label>Alíquota ISS (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={fiscalForm.nfe_aliquota}
                      onChange={e => setFiscalForm(f => ({ ...f, nfe_aliquota: parseFloat(e.target.value) }))}
                      placeholder="5"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Estes dados serão usados como prestador de serviços em todas as NF-e emitidas via Focus NFe.
                </p>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Salvar Dados Fiscais
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Histórico ──────────────────────────────────────────────── */}
        <TabsContent value="historico" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Todas as Cobranças ({charges.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingCharges ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                </div>
              ) : charges.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Nenhuma cobrança emitida ainda.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {charges.map(charge => (
                    <div key={charge.id} className="px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{charge.description}</p>
                        <p className="text-xs text-gray-500">
                          {charge.client_email} •{' '}
                          Venc: {charge.due_date ? new Date(charge.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">
                          R$ {(charge.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge className={`${STATUS_COLOR[charge.status] || ''} border-0 text-xs`}>{charge.status}</Badge>
                        {charge.nfe_status === 'Emitida' && (
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs">NF-e ✓</Badge>
                        )}
                        {charge.stripe_payment_url && charge.status === 'Pendente' && (
                          <a href={charge.stripe_payment_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              <ExternalLink className="w-3 h-3 mr-1" /> Link
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}