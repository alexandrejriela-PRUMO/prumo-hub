import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Leaf, Plus, Trash2, X, FileText, Upload, Download,
  ArrowRightLeft, Info, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

const BIOMAS = ['Amazônia', 'Cerrado', 'Mata Atlântica', 'Caatinga', 'Pantanal', 'Pampas'];
const ESTADOS_BR = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const STATUS_CONFIG = {
  'Em negociação': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  'Contrato assinado': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2 },
  'Concluída': { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
};

const EMPTY_FORM = {
  tipo: 'compra_venda',
  // CRA
  cra_number: '',
  biome: '',
  state: '',
  municipality: '',
  area_hectares: '',
  price_per_hectare: '',
  transaction_date: new Date().toISOString().split('T')[0],
  status: 'Em negociação',
  // Vendedor
  seller_name: '',
  seller_cpf_cnpj: '',
  seller_car: '',
  seller_property_name: '',
  seller_state: '',
  seller_municipality: '',
  seller_email: '',
  seller_phone: '',
  // Comprador
  buyer_name: '',
  buyer_cpf_cnpj: '',
  buyer_car: '',
  buyer_property_name: '',
  buyer_state: '',
  buyer_municipality: '',
  buyer_email: '',
  buyer_phone: '',
  // Certificação / Órgão
  issuing_body: '',
  certification_number: '',
  certification_date: '',
  registry_number: '',
  // Docs e obs
  notes: '',
  documents: [],
};

function DocList({ docs, onRemove }) {
  if (!docs || docs.length === 0) return null;
  return (
    <div className="space-y-1 mt-2">
      {docs.map((doc, idx) => (
        <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-emerald-800 hover:underline truncate">{doc.name}</a>
            {doc.type && <span className="text-xs text-gray-500">({doc.type})</span>}
          </div>
          {onRemove && (
            <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function FileUploadButton({ label, docType, onUploaded, uploading, setUploading }) {
  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      onUploaded({ name: file.name, url: res.file_url, type: docType, upload_date: new Date().toISOString() });
      toast.success('Arquivo enviado!');
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-dashed border-emerald-400 rounded-lg hover:bg-emerald-50 transition-colors text-sm text-emerald-700">
      <Upload className="w-4 h-4" />
      {uploading ? 'Enviando...' : label}
      <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden" onChange={handleChange} disabled={uploading} />
    </label>
  );
}

export default function EnvironmentalAssets() {
  const [activeTab, setActiveTab] = useState('transacoes');
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  const { effectiveEmail, userType, isLoading: loadingUser } = useEffectiveUser();
  const isConsultorFamily = userType === 'consultor' || userType === 'equipe';
  const queryClient = useQueryClient();

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', effectiveEmail, userType],
    queryFn: () => isConsultorFamily
      ? base44.entities.Property.filter({ consultor_email: effectiveEmail })
      : base44.entities.Property.filter({ owner_email: effectiveEmail }),
    enabled: !!effectiveEmail
  });

  const { data: transactions = [], isLoading: loadingTx, refetch } = useQuery({
    queryKey: ['cra-transactions-v2', effectiveEmail],
    queryFn: async () => {
      const [sells, buys] = await Promise.all([
        base44.entities.CRATransaction.filter({ seller_email: effectiveEmail }),
        base44.entities.CRATransaction.filter({ buyer_email: effectiveEmail }),
      ]);
      const all = [...sells, ...buys];
      // dedup
      const seen = new Set();
      return all.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
    },
    enabled: !!effectiveEmail
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.area_hectares) throw new Error('Informe a área da CRA (ha)');
      if (!data.biome) throw new Error('Selecione o bioma');
      if (!data.seller_name) throw new Error('Informe o nome do vendedor');
      if (!data.buyer_name) throw new Error('Informe o nome do comprador');

      const area = parseFloat(data.area_hectares);
      const price = parseFloat(data.price_per_hectare) || 0;

      const payload = {
        // campos obrigatórios da entidade
        origin_id: data.cra_number || 'cra-manual',
        seller_email: data.seller_email || effectiveEmail,
        seller_property_id: data.seller_property_id || '',
        buyer_email: data.buyer_email || effectiveEmail,
        buyer_property_id: data.buyer_property_id || '',
        buyer_car: data.buyer_car || '',
        cra_title_id: data.certification_number || '',
        cra_number: data.cra_number || '',
        area_hectares: area,
        available_area_hectares: area,
        price_per_hectare: price,
        total_value: area * price,
        transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
        status: data.status || 'Em negociação',
        notes: data.notes || '',
        // campos extras em notes como JSON-embedded string por limitação de schema
        documents: data.documents || [],
        // guardamos dados extras em notes de forma legível
        _extra: JSON.stringify({
          biome: data.biome,
          state: data.state,
          municipality: data.municipality,
          seller_name: data.seller_name,
          seller_cpf_cnpj: data.seller_cpf_cnpj,
          seller_car: data.seller_car,
          seller_property_name: data.seller_property_name,
          seller_state: data.seller_state,
          seller_municipality: data.seller_municipality,
          seller_phone: data.seller_phone,
          buyer_name: data.buyer_name,
          buyer_cpf_cnpj: data.buyer_cpf_cnpj,
          buyer_property_name: data.buyer_property_name,
          buyer_state: data.buyer_state,
          buyer_municipality: data.buyer_municipality,
          buyer_phone: data.buyer_phone,
          issuing_body: data.issuing_body,
          certification_number: data.certification_number,
          certification_date: data.certification_date,
          registry_number: data.registry_number,
        }),
      };

      if (editingTx?.id) {
        return base44.entities.CRATransaction.update(editingTx.id, payload);
      }
      return base44.entities.CRATransaction.create(payload);
    },
    onSuccess: async () => {
      await refetch();
      setShowForm(false);
      setEditingTx(null);
      setForm(EMPTY_FORM);
      toast.success(editingTx ? 'Transação atualizada!' : 'Transação registrada com sucesso!');
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CRATransaction.delete(id),
    onSuccess: async () => { await refetch(); toast.success('Transação removida!'); },
    onError: () => toast.error('Erro ao remover')
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.CRATransaction.update(id, { status }),
    onSuccess: async () => { await refetch(); toast.success('Status atualizado!'); },
    onError: () => toast.error('Erro ao atualizar status')
  });

  const openEdit = (tx) => {
    let extra = {};
    try { extra = JSON.parse(tx._extra || '{}'); } catch {}
    setEditingTx(tx);
    setForm({
      ...EMPTY_FORM,
      cra_number: tx.cra_number || '',
      area_hectares: tx.area_hectares || '',
      price_per_hectare: tx.price_per_hectare || '',
      transaction_date: tx.transaction_date || '',
      status: tx.status || 'Em negociação',
      seller_email: tx.seller_email || '',
      buyer_email: tx.buyer_email || '',
      notes: tx.notes || '',
      documents: tx.documents || [],
      ...extra,
    });
    setShowForm(true);
    setActiveTab('transacoes');
  };

  const addDoc = (doc) => setForm(prev => ({ ...prev, documents: [...(prev.documents || []), doc] }));
  const removeDoc = (idx) => setForm(prev => ({ ...prev, documents: prev.documents.filter((_, i) => i !== idx) }));

  const totalValue = (parseFloat(form.area_hectares) || 0) * (parseFloat(form.price_per_hectare) || 0);

  if (loadingUser) return <div className="p-8 text-center text-emerald-700">Carregando...</div>;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-emerald-100 rounded-xl">
          <Leaf className="w-8 h-8 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">Cotas de Reserva Ambiental — CRA</h1>
          <p className="text-sm text-emerald-600">Compra e Venda · Lei 12.651/2012 · Art. 44</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-emerald-50 border border-emerald-200">
          <TabsTrigger value="transacoes" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <ArrowRightLeft className="w-4 h-4 mr-1.5" /> Transações
          </TabsTrigger>
          <TabsTrigger value="legislacao" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <Info className="w-4 h-4 mr-1.5" /> Legislação
          </TabsTrigger>
        </TabsList>

        {/* ======= TRANSAÇÕES ======= */}
        <TabsContent value="transacoes" className="space-y-4 mt-4">
          {!showForm && (
            <Button onClick={() => { setForm(EMPTY_FORM); setEditingTx(null); setShowForm(true); }}
              className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" /> Registrar Transação de CRA
            </Button>
          )}

          {/* FORMULÁRIO */}
          {showForm && (
            <Card className="border-2 border-emerald-300">
              <CardHeader className="border-b border-emerald-200 bg-emerald-50">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-emerald-900">
                      {editingTx ? 'Editar Transação' : 'Nova Transação de Compra e Venda de CRA'}
                    </CardTitle>
                    <CardDescription>Preencha os dados conforme o instrumento jurídico (Lei 12.651/2012)</CardDescription>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditingTx(null); setForm(EMPTY_FORM); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">

                {/* SEÇÃO 1 — CRA */}
                <section className="space-y-4">
                  <h3 className="font-bold text-emerald-800 border-b border-emerald-100 pb-2 flex items-center gap-2">
                    <Leaf className="w-4 h-4" /> Dados da CRA
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Número da CRA / Título</Label>
                      <Input placeholder="Ex: CRA-MT-00123" value={form.cra_number} onChange={e => set('cra_number', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Bioma *</Label>
                      <Select value={form.biome} onValueChange={v => set('biome', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{BIOMAS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Estado de Origem</Label>
                      <Select value={form.state} onValueChange={v => set('state', v)}>
                        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>{ESTADOS_BR.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Município de Origem</Label>
                      <Input placeholder="Município" value={form.municipality} onChange={e => set('municipality', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Área Negociada (ha) *</Label>
                      <Input type="number" step="0.01" min="0" placeholder="Ex: 100.00" value={form.area_hectares} onChange={e => set('area_hectares', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Valor por ha (R$)</Label>
                      <Input type="number" step="100" min="0" placeholder="Ex: 5000" value={form.price_per_hectare} onChange={e => set('price_per_hectare', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Data da Transação</Label>
                      <Input type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={v => set('status', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Em negociação">Em negociação</SelectItem>
                          <SelectItem value="Contrato assinado">Contrato assinado</SelectItem>
                          <SelectItem value="Concluída">Concluída</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {form.area_hectares && form.price_per_hectare && (
                      <div className="md:col-span-1 flex items-end">
                        <div className="w-full bg-emerald-100 border border-emerald-300 rounded-lg p-3">
                          <p className="text-xs text-emerald-600">Valor Total</p>
                          <p className="text-lg font-bold text-emerald-900">
                            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* SEÇÃO 2 — VENDEDOR */}
                <section className="space-y-4">
                  <h3 className="font-bold text-emerald-800 border-b border-emerald-100 pb-2">
                    👤 Dados do Vendedor (Proprietário da CRA)
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Nome / Razão Social *</Label>
                      <Input placeholder="Nome completo ou razão social" value={form.seller_name} onChange={e => set('seller_name', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>CPF / CNPJ</Label>
                      <Input placeholder="000.000.000-00" value={form.seller_cpf_cnpj} onChange={e => set('seller_cpf_cnpj', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>E-mail</Label>
                      <Input type="email" placeholder="vendedor@email.com" value={form.seller_email} onChange={e => set('seller_email', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefone</Label>
                      <Input placeholder="(00) 00000-0000" value={form.seller_phone} onChange={e => set('seller_phone', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>CAR da Propriedade de Origem</Label>
                      <Input placeholder="Número do CAR" value={form.seller_car} onChange={e => set('seller_car', e.target.value)} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Nome da Propriedade Cedente</Label>
                      <Input placeholder="Fazenda / Imóvel" value={form.seller_property_name} onChange={e => set('seller_property_name', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Estado</Label>
                      <Select value={form.seller_state} onValueChange={v => set('seller_state', v)}>
                        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>{ESTADOS_BR.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Município</Label>
                      <Input placeholder="Município" value={form.seller_municipality} onChange={e => set('seller_municipality', e.target.value)} />
                    </div>
                  </div>
                </section>

                {/* SEÇÃO 3 — COMPRADOR */}
                <section className="space-y-4">
                  <h3 className="font-bold text-emerald-800 border-b border-emerald-100 pb-2">
                    🏡 Dados do Comprador (Imóvel a ser Compensado)
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Nome / Razão Social *</Label>
                      <Input placeholder="Nome completo ou razão social" value={form.buyer_name} onChange={e => set('buyer_name', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>CPF / CNPJ</Label>
                      <Input placeholder="000.000.000-00" value={form.buyer_cpf_cnpj} onChange={e => set('buyer_cpf_cnpj', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>E-mail</Label>
                      <Input type="email" placeholder="comprador@email.com" value={form.buyer_email} onChange={e => set('buyer_email', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefone</Label>
                      <Input placeholder="(00) 00000-0000" value={form.buyer_phone} onChange={e => set('buyer_phone', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>CAR do Imóvel Comprador</Label>
                      <Input placeholder="Número do CAR" value={form.buyer_car} onChange={e => set('buyer_car', e.target.value)} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Nome da Propriedade Compradora</Label>
                      <Input placeholder="Fazenda / Imóvel" value={form.buyer_property_name} onChange={e => set('buyer_property_name', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Estado</Label>
                      <Select value={form.buyer_state} onValueChange={v => set('buyer_state', v)}>
                        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>{ESTADOS_BR.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Município</Label>
                      <Input placeholder="Município" value={form.buyer_municipality} onChange={e => set('buyer_municipality', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Propriedade vinculada</Label>
                      <Select value={form.buyer_property_id || ''} onValueChange={v => set('buyer_property_id', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                        <SelectContent>
                          {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>

                {/* SEÇÃO 4 — CERTIFICAÇÃO */}
                <section className="space-y-4">
                  <h3 className="font-bold text-emerald-800 border-b border-emerald-100 pb-2">
                    🏛️ Certificação e Registro
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Órgão Emissor / Certificador</Label>
                      <Input placeholder="Ex: SEMA-MT, INEA-RJ, OEMA" value={form.issuing_body} onChange={e => set('issuing_body', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Número do Certificado / Título CRA</Label>
                      <Input placeholder="Ex: CERT-CRA-001/2024" value={form.certification_number} onChange={e => set('certification_number', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Data de Emissão do Certificado</Label>
                      <Input type="date" value={form.certification_date} onChange={e => set('certification_date', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nº Registro Cartório / SICAR</Label>
                      <Input placeholder="Ex: REG-12345" value={form.registry_number} onChange={e => set('registry_number', e.target.value)} />
                    </div>
                  </div>
                </section>

                {/* SEÇÃO 5 — DOCUMENTOS */}
                <section className="space-y-4">
                  <h3 className="font-bold text-emerald-800 border-b border-emerald-100 pb-2">
                    📎 Documentos da Transação
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {[
                      'Contrato de Cessão de CRA',
                      'Certificado CRA',
                      'CAR Validado (Cedente)',
                      'CAR Validado (Cessionário)',
                      'Matrícula do Imóvel',
                      'Documento de Identidade',
                      'Outro',
                    ].map(type => (
                      <FileUploadButton
                        key={type}
                        label={type}
                        docType={type}
                        onUploaded={addDoc}
                        uploading={uploading}
                        setUploading={setUploading}
                      />
                    ))}
                  </div>
                  <DocList docs={form.documents} onRemove={removeDoc} />
                </section>

                {/* OBSERVAÇÕES */}
                <section className="space-y-2">
                  <Label>Observações / Cláusulas Especiais</Label>
                  <Textarea
                    placeholder="Condicionantes, prazos, cláusulas específicas do contrato..."
                    rows={3}
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                  />
                </section>

                <div className="flex gap-3 justify-end pt-4 border-t border-emerald-100">
                  <Button variant="outline" onClick={() => { setShowForm(false); setEditingTx(null); setForm(EMPTY_FORM); }}>Cancelar</Button>
                  <Button
                    onClick={() => saveMutation.mutate(form)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? 'Salvando...' : editingTx ? 'Salvar Alterações' : 'Registrar Transação'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* LISTA DE TRANSAÇÕES */}
          {!showForm && (
            <div className="space-y-3">
              {loadingTx && <p className="text-center text-gray-500 py-8">Carregando...</p>}
              {!loadingTx && transactions.length === 0 && (
                <Card className="border-dashed border-2">
                  <CardContent className="py-16 text-center text-gray-400">
                    <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Nenhuma transação de CRA registrada</p>
                    <p className="text-sm mt-1">Clique em "Registrar Transação" para começar</p>
                  </CardContent>
                </Card>
              )}
              {transactions.map(tx => {
                let extra = {};
                try { extra = JSON.parse(tx._extra || '{}'); } catch {}
                const statusCfg = STATUS_CONFIG[tx.status] || STATUS_CONFIG['Em negociação'];
                const StatusIcon = statusCfg.icon;
                return (
                  <Card key={tx.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-lg text-emerald-900">{tx.area_hectares} ha</span>
                            {extra.biome && <Badge variant="outline" className="text-xs">{extra.biome}</Badge>}
                            {tx.cra_number && <span className="text-xs text-gray-500">CRA: {tx.cra_number}</span>}
                          </div>
                          <div className="text-sm text-gray-600">
                            {tx.price_per_hectare > 0 && (
                              <span>R$ {tx.price_per_hectare?.toLocaleString('pt-BR')}/ha · <strong>Total: R$ {tx.total_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{tx.transaction_date}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${statusCfg.color} border flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" /> {tx.status}
                          </Badge>
                          <Select value={tx.status} onValueChange={v => updateStatusMutation.mutate({ id: tx.id, status: v })}>
                            <SelectTrigger className="h-7 text-xs w-32 border-gray-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Em negociação">Em negociação</SelectItem>
                              <SelectItem value="Contrato assinado">Contrato assinado</SelectItem>
                              <SelectItem value="Concluída">Concluída</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                          <p className="text-xs font-semibold text-blue-700 mb-1">VENDEDOR</p>
                          <p className="font-medium text-blue-900">{extra.seller_name || tx.seller_email || '—'}</p>
                          {extra.seller_cpf_cnpj && <p className="text-xs text-blue-600">{extra.seller_cpf_cnpj}</p>}
                          {extra.seller_car && <p className="text-xs text-blue-500">CAR: {extra.seller_car}</p>}
                          {extra.seller_property_name && <p className="text-xs text-blue-500">{extra.seller_property_name} · {extra.seller_state}/{extra.seller_municipality}</p>}
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                          <p className="text-xs font-semibold text-emerald-700 mb-1">COMPRADOR</p>
                          <p className="font-medium text-emerald-900">{extra.buyer_name || tx.buyer_email || '—'}</p>
                          {extra.buyer_cpf_cnpj && <p className="text-xs text-emerald-600">{extra.buyer_cpf_cnpj}</p>}
                          {tx.buyer_car && <p className="text-xs text-emerald-500">CAR: {tx.buyer_car}</p>}
                          {extra.buyer_property_name && <p className="text-xs text-emerald-500">{extra.buyer_property_name} · {extra.buyer_state}/{extra.buyer_municipality}</p>}
                        </div>
                      </div>

                      {(extra.issuing_body || extra.certification_number || extra.registry_number) && (
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 text-sm">
                          <p className="text-xs font-semibold text-amber-700 mb-1">CERTIFICAÇÃO</p>
                          <div className="flex flex-wrap gap-3 text-amber-800 text-xs">
                            {extra.issuing_body && <span>Órgão: {extra.issuing_body}</span>}
                            {extra.certification_number && <span>Cert.: {extra.certification_number}</span>}
                            {extra.certification_date && <span>Emissão: {extra.certification_date}</span>}
                            {extra.registry_number && <span>Registro: {extra.registry_number}</span>}
                          </div>
                        </div>
                      )}

                      {tx.documents?.length > 0 && (
                        <DocList docs={tx.documents} />
                      )}

                      {tx.notes && <p className="text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3">{tx.notes}</p>}

                      <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                        <Button size="sm" variant="outline" onClick={() => openEdit(tx)}>Editar</Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm('Remover transação?')) deleteMutation.mutate(tx.id); }}>
                          <Trash2 className="w-3 h-3 mr-1" /> Remover
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ======= LEGISLAÇÃO ======= */}
        <TabsContent value="legislacao" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-emerald-900">Cotas de Reserva Ambiental — CRA</CardTitle>
              <CardDescription>Fundamento legal: Lei 12.651/2012 (Código Florestal), Arts. 44 a 50</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm text-gray-700">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-emerald-900">O que é a CRA?</p>
                <p>A Cota de Reserva Ambiental é um título nominativo representativo de área com vegetação nativa existente ou em processo de recuperação, que pode ser utilizado por proprietários rurais para compensar o déficit de Reserva Legal em outro imóvel rural.</p>
              </div>
              <div className="space-y-3">
                <p className="font-semibold text-emerald-900">Percentuais de Reserva Legal exigidos:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[['Amazônia', '80%'], ['Cerrado', '35%'], ['Mata Atlântica', '20%'], ['Caatinga', '20%'], ['Pantanal', '20%'], ['Pampas', '20%']].map(([b, p]) => (
                    <div key={b} className="bg-white border rounded-lg p-3 text-center">
                      <p className="font-bold text-emerald-800 text-lg">{p}</p>
                      <p className="text-xs text-gray-500">{b}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-emerald-900">Requisitos para emissão da CRA (Art. 46):</p>
                <ul className="list-disc ml-5 space-y-1 text-gray-600">
                  <li>Inscrição no CAR (Cadastro Ambiental Rural) validada pelo órgão competente</li>
                  <li>Existência de vegetação nativa além do mínimo exigido de Reserva Legal</li>
                  <li>Inexistência de passivo ambiental no imóvel</li>
                  <li>Emissão pelo órgão ambiental estadual competente (OEMA/SEMA)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-emerald-900">Documentos necessários para a transação:</p>
                <ul className="list-disc ml-5 space-y-1 text-gray-600">
                  <li>Contrato de Cessão de CRA (instrumento público ou particular com firma reconhecida)</li>
                  <li>Certificado/Título da CRA emitido pelo órgão competente</li>
                  <li>CAR validado do imóvel cedente (origem)</li>
                  <li>CAR do imóvel cessionário (destinatário da compensação)</li>
                  <li>Matrícula atualizada do imóvel</li>
                  <li>Registro do contrato no SICAR e no Cartório de Imóveis</li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="font-semibold text-amber-900">⚠️ Restrições (Art. 48, §2º)</p>
                <p className="mt-1 text-amber-800">A CRA somente pode ser utilizada para compensar Reserva Legal em imóvel rural situado no mesmo bioma do imóvel que originou o título. Para o bioma Amazônia, a compensação deve ocorrer no mesmo Estado.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}