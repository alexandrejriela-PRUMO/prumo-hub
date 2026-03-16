import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ExternalLink, Copy, FileText, Loader2, CheckCircle2, AlertCircle, Clock, Receipt } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLOR = {
  Pendente: 'bg-amber-100 text-amber-700',
  Pago: 'bg-green-100 text-green-700',
  Vencido: 'bg-red-100 text-red-700',
  Cancelado: 'bg-gray-100 text-gray-600',
};

const NFE_COLOR = {
  'Não emitida': 'bg-gray-100 text-gray-500',
  Emitindo: 'bg-blue-100 text-blue-600',
  Emitida: 'bg-green-100 text-green-700',
  Erro: 'bg-red-100 text-red-600',
};

const DEFAULT_FORM = { description: '', amount: '', due_date: '', payment_method: 'boleto', notes: '' };

const DEFAULT_TOMADOR = {
  razao_social: '', cpf: '', cnpj: '', email: '', telefone: '',
  logradouro: '', numero: '', bairro: '', cep: '', uf: 'SP', codigo_municipio: '',
};

export default function ClientChargesPanel({ client }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showNFeForm, setShowNFeForm] = useState(null); // charge object
  const [form, setForm] = useState(DEFAULT_FORM);
  const [tomador, setTomador] = useState(DEFAULT_TOMADOR);
  const [emittingNFe, setEmittingNFe] = useState(false);

  const clientEmail = client?.client_email;
  const propertyId = client?.properties?.[0]?.id || client?.id;

  const { data: charges = [], isLoading } = useQuery({
    queryKey: ['client-charges', clientEmail],
    queryFn: () => base44.entities.ConsultorCharge.filter({ client_email: clientEmail }, '-created_date', 50),
    enabled: !!clientEmail,
  });

  const createChargeMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createConsultorCharge', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-charges', clientEmail] });
      setShowForm(false);
      setForm(DEFAULT_FORM);
      toast.success('Cobrança criada! O link de pagamento já está disponível.');
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message || 'Erro ao criar cobrança'),
  });

  const handleSubmitCharge = (e) => {
    e.preventDefault();
    createChargeMutation.mutate({
      client_email: clientEmail,
      property_id: propertyId,
      description: form.description,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      payment_method: form.payment_method,
      notes: form.notes,
    });
  };

  const handleEmitNFe = async (e) => {
    e.preventDefault();
    setEmittingNFe(true);
    try {
      const res = await base44.functions.invoke('emitirNFe', {
        charge_id: showNFeForm.id,
        tomador,
      });
      if (res.data?.success) {
        toast.success('NF-e emitida com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['client-charges', clientEmail] });
        setShowNFeForm(null);
        setTomador(DEFAULT_TOMADOR);
      } else {
        toast.error(res.data?.error || 'Erro ao emitir NF-e');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEmittingNFe(false);
    }
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const totalReceived = charges.filter(c => c.status === 'Pago').reduce((s, c) => s + (c.amount || 0), 0);
  const totalPending = charges.filter(c => c.status === 'Pendente').reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary + New Button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-green-700 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebido
          </span>
          <span className="flex items-center gap-1.5 text-amber-700 font-medium">
            <Clock className="w-4 h-4" />
            R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendente
          </span>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-3 h-3 mr-2" /> Nova Cobrança
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        </div>
      ) : charges.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma cobrança emitida para este cliente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {charges.map(charge => (
            <Card key={charge.id} className="border border-gray-100 hover:border-emerald-200 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{charge.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Venc: {charge.due_date ? new Date(charge.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'} • {charge.payment_method}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Badge className={`${STATUS_COLOR[charge.status] || ''} text-xs border-0`}>{charge.status}</Badge>
                      <Badge className={`${NFE_COLOR[charge.nfe_status || 'Não emitida'] || ''} text-xs border-0`}>
                        NF-e: {charge.nfe_status || 'Não emitida'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      R$ {(charge.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {charge.stripe_payment_url && charge.status === 'Pendente' && (
                        <>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => copyLink(charge.stripe_payment_url)}>
                            <Copy className="w-3 h-3 mr-1" /> Copiar Link
                          </Button>
                          <a href={charge.stripe_payment_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-6 text-xs px-2">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </a>
                        </>
                      )}
                      {charge.status === 'Pago' && (!charge.nfe_status || charge.nfe_status === 'Não emitida' || charge.nfe_status === 'Erro') && (
                        <Button size="sm" variant="outline" className="h-6 text-xs px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => { setShowNFeForm(charge); setTomador(f => ({ ...f, email: charge.client_email })); }}>
                          <FileText className="w-3 h-3 mr-1" /> Emitir NF-e
                        </Button>
                      )}
                      {charge.nfe_status === 'Emitida' && charge.nfe_url && (
                        <a href={charge.nfe_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2 text-green-700 border-green-300">
                            <FileText className="w-3 h-3 mr-1" /> Ver NF-e
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Charge Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Cobrança</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitCharge} className="space-y-4">
            <div>
              <Label>Descrição do Serviço</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Consultoria Ambiental – CAR" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" required />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
              </div>
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações (opcional)</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações adicionais..." />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={createChargeMutation.isPending}>
                {createChargeMutation.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                Gerar Cobrança
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* NF-e Dialog */}
      <Dialog open={!!showNFeForm} onOpenChange={() => setShowNFeForm(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emitir NF-e — {showNFeForm?.description}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEmitNFe} className="space-y-4">
            <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Preencha os dados do tomador de serviço. Certifique-se de que seus dados fiscais (CNPJ, Inscrição Municipal) estão configurados em Configurações de Pagamento.
            </p>
            <div>
              <Label>Razão Social / Nome do Tomador *</Label>
              <Input value={tomador.razao_social} onChange={e => setTomador(f => ({ ...f, razao_social: e.target.value }))} placeholder="Nome ou razão social" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CPF (pessoa física)</Label>
                <Input value={tomador.cpf} onChange={e => setTomador(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
              </div>
              <div>
                <Label>CNPJ (pessoa jurídica)</Label>
                <Input value={tomador.cnpj} onChange={e => setTomador(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={tomador.email} onChange={e => setTomador(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={tomador.telefone} onChange={e => setTomador(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Logradouro</Label>
                <Input value={tomador.logradouro} onChange={e => setTomador(f => ({ ...f, logradouro: e.target.value }))} placeholder="Rua, Av..." />
              </div>
              <div>
                <Label>Número</Label>
                <Input value={tomador.numero} onChange={e => setTomador(f => ({ ...f, numero: e.target.value }))} placeholder="123" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bairro</Label>
                <Input value={tomador.bairro} onChange={e => setTomador(f => ({ ...f, bairro: e.target.value }))} />
              </div>
              <div>
                <Label>CEP</Label>
                <Input value={tomador.cep} onChange={e => setTomador(f => ({ ...f, cep: e.target.value }))} placeholder="00000-000" />
              </div>
              <div>
                <Label>UF</Label>
                <Input value={tomador.uf} onChange={e => setTomador(f => ({ ...f, uf: e.target.value }))} placeholder="SP" maxLength={2} />
              </div>
              <div>
                <Label>Cód. IBGE Município</Label>
                <Input value={tomador.codigo_municipio} onChange={e => setTomador(f => ({ ...f, codigo_municipio: e.target.value }))} placeholder="3550308" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowNFeForm(null)}>Cancelar</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={emittingNFe}>
                {emittingNFe && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                Emitir NF-e
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}