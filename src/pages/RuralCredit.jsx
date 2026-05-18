import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, FileText, X, Loader2, Building2, DollarSign, AlertTriangle, TrendingDown } from 'lucide-react';
import SupabaseFileUpload from '@/components/storage/SupabaseFileUpload';
import ConsultorPropertySelector from '@/components/consultor/ConsultorPropertySelector';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

const TIPOS = ['Custeio', 'Investimento', 'Comercialização', 'Industrialização', 'Outro'];
const PROGRAMAS = ['Plano Safra', 'PRONAF', 'PRONAMP', 'ABC+', 'PCA', 'FCO Rural', 'Outro'];
const STATUS_OPTIONS = ['Em dia', 'Vencendo em breve', 'Inadimplente', 'Liquidado', 'Em renegociação'];
const DOC_TIPOS = ['Contrato de Financiamento', 'CPR', 'Garantia', 'Aditivo', 'Outro'];

const INITIAL_FORM = {
  instituicao: '',
  tipo_credito: 'Custeio',
  programa: '',
  numero_contrato: '',
  data_contratacao: '',
  data_vencimento: '',
  valor_contratado: '',
  saldo_devedor: '',
  taxa_juros: '',
  prazo_total_meses: '',
  num_parcelas: '',
  parcelas_pagas: '0',
  garantia: '',
  status: 'Em dia',
  property_id: '',
  notas: '',
  documentos: []
};

const STATUS_COLORS = {
  'Em dia': 'bg-emerald-100 text-emerald-700',
  'Vencendo em breve': 'bg-amber-100 text-amber-700',
  'Inadimplente': 'bg-red-100 text-red-700',
  'Liquidado': 'bg-gray-100 text-gray-600',
  'Em renegociação': 'bg-blue-100 text-blue-700'
};

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RuralCreditPage() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  const qc = useQueryClient();

  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const isConsultor = user?.user_type === 'consultor' || user?.user_type === 'equipe';

  const { data: properties = [] } = useQuery({
    queryKey: ['props-credit', user?.email],
    queryFn: () => {
      const filter = isConsultor ? { consultor_email: user.email } : { owner_email: user.email };
      return base44.entities.Property.filter(filter, 'client_name', 300);
    },
    enabled: !!user?.email,
  });

  const { data: credits = [], isLoading } = useQuery({
    queryKey: ['rural-credits', user?.email, selectedPropertyId, isConsultor],
    queryFn: async () => {
      // Busca por consultor_email (funciona tanto para consultor quanto para produtor que criou direto)
      // E também por client_email para cobrir todos os casos
      const propFilter = selectedPropertyId ? { property_id: selectedPropertyId } : {};
      const [byConsultor, byClient] = await Promise.all([
        base44.entities.RuralCredit.filter({ consultor_email: user.email, ...propFilter }, '-created_date', 200),
        base44.entities.RuralCredit.filter({ client_email: user.email, ...propFilter }, '-created_date', 200),
      ]);
      const all = [...byConsultor, ...byClient];
      const seen = new Set();
      return all.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
    },
    enabled: !!user?.email,
  });

  const createM = useMutation({
    mutationFn: (data) => base44.entities.RuralCredit.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rural-credits'] });
      toast.success('Crédito cadastrado com sucesso!');
      closeForm();
    },
    onError: (err) => toast.error(err?.message || 'Erro ao salvar')
  });

  const updateM = useMutation({
    mutationFn: (data) => base44.entities.RuralCredit.update(data.id, data.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rural-credits'] });
      toast.success('Crédito atualizado com sucesso!');
      closeForm();
    },
    onError: (err) => toast.error(err?.message || 'Erro ao atualizar')
  });

  const deleteM = useMutation({
    mutationFn: (id) => base44.entities.RuralCredit.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rural-credits'] });
      toast.success('Crédito removido!');
    },
    onError: (err) => toast.error(err?.message || 'Erro ao remover')
  });

  const openForm = (item = null) => {
    if (item?.id) {
      setEditing(item);
      setForm({
        ...INITIAL_FORM,
        ...item,
        valor_contratado: String(item.valor_contratado || ''),
        saldo_devedor: String(item.saldo_devedor || ''),
        taxa_juros: String(item.taxa_juros || ''),
        prazo_total_meses: String(item.prazo_total_meses || ''),
        num_parcelas: String(item.num_parcelas || ''),
        parcelas_pagas: String(item.parcelas_pagas || '0'),
        documentos: item.documentos || []
      });
    } else {
      setEditing(null);
      setForm(INITIAL_FORM);
    }
    setShowForm(true);
  };

  const closeForm = () => {
    if (!editing && (form.instituicao || form.valor_contratado || form.data_vencimento)) {
      const confirmed = window.confirm('Você tem alterações não salvas. Deseja fechar sem salvar?');
      if (!confirmed) return;
    }
    setShowForm(false);
    setEditing(null);
    setForm(INITIAL_FORM);
  };

  const handleUploadDoc = (filePath, fileName) => {
    setForm(p => ({
      ...p,
      documentos: [...(p.documentos || []), {
        name: fileName,
        url: filePath,
        tipo: 'Contrato de Financiamento',
        upload_date: new Date().toISOString()
      }]
    }));
  };

  const removeDoc = (idx) => {
    setForm(p => ({ ...p, documentos: p.documentos.filter((_, i) => i !== idx) }));
  };

  const validateForm = () => {
    if (!form.instituicao?.trim()) return 'Preencha a instituição financeira';
    if (!form.valor_contratado || parseFloat(form.valor_contratado) <= 0) return 'Valor contratado inválido';
    if (!form.data_vencimento) return 'Data de vencimento é obrigatória';
    const saldo = parseFloat(form.saldo_devedor) || 0;
    if (saldo < 0) return 'Saldo devedor não pode ser negativo';
    return null;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const error = validateForm();
    if (error) { toast.error(error); return; }

    const clientProp = properties.find(p => p.id === form.property_id) || properties[0];
    const payload = {
      instituicao: form.instituicao.trim(),
      tipo_credito: form.tipo_credito || 'Custeio',
      programa: form.programa || '',
      numero_contrato: form.numero_contrato || '',
      data_contratacao: form.data_contratacao || '',
      data_vencimento: form.data_vencimento,
      valor_contratado: parseFloat(form.valor_contratado),
      saldo_devedor: parseFloat(form.saldo_devedor) || 0,
      taxa_juros: parseFloat(form.taxa_juros) || 0,
      prazo_total_meses: parseInt(form.prazo_total_meses) || 0,
      num_parcelas: parseInt(form.num_parcelas) || 0,
      parcelas_pagas: Math.min(parseInt(form.parcelas_pagas) || 0, parseInt(form.num_parcelas) || 0),
      garantia: form.garantia || '',
      status: form.status || 'Em dia',
      notas: form.notas || '',
      property_id: form.property_id || clientProp?.id || '',
      consultor_email: user?.email,
      client_email: isConsultor ? (clientProp?.owner_email || '') : user?.email,
      client_name: clientProp?.client_name || clientProp?.property_name || 'Sem especificar',
      documentos: Array.isArray(form.documentos) ? form.documentos : []
    };

    if (editing?.id) {
      updateM.mutate({ id: editing.id, payload });
    } else {
      createM.mutate(payload);
    }
  };

  const totalContratado = credits.reduce((s, c) => s + (c.valor_contratado || 0), 0);
  const totalSaldo = credits.reduce((s, c) => s + (c.saldo_devedor || 0), 0);
  const inadimplentes = credits.filter(c => c.status === 'Inadimplente').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Gestão de Crédito Rural</h1>
          <p className="text-sm text-gray-500 mt-1">Controle de financiamentos e operações de crédito</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openForm()}>
          <Plus className="w-4 h-4 mr-2" />Novo Crédito
        </Button>
      </div>

      {isConsultor && properties.length > 0 && (
        <ConsultorPropertySelector
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onSelect={setSelectedPropertyId}
          isLoading={!user}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Contratos', value: credits.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Valor Contratado', value: fmt(totalContratado), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Saldo Devedor', value: fmt(totalSaldo), icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Inadimplentes', value: inadimplentes, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-800">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : credits.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Nenhum crédito cadastrado</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => openForm()}>
            <Plus className="w-4 h-4 mr-1" />Cadastrar
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {credits.map(c => {
            const pct = c.num_parcelas > 0 ? Math.round((c.parcelas_pagas / c.num_parcelas) * 100) : 0;
            const daysUntilExpiry = c.data_vencimento ? differenceInDays(parseISO(c.data_vencimento), new Date()) : null;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800">{c.instituicao}</h3>
                      <Badge className={`${STATUS_COLORS[c.status]} border-0 text-xs`}>{c.status}</Badge>
                      {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
                        <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                          Vence em {Math.max(0, daysUntilExpiry)}d
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-bold">{fmt(c.valor_contratado)}</span>
                      {c.saldo_devedor > 0 && <span className="text-gray-500 ml-3">Saldo: {fmt(c.saldo_devedor)}</span>}
                    </div>
                    {c.num_parcelas > 0 && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="h-1.5 bg-gray-100 rounded-full flex-1 max-w-xs">
                          <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-gray-600">{c.parcelas_pagas}/{c.num_parcelas} ({pct}%)</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openForm(c)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <Pencil className="w-4 h-4 text-gray-400" />
                    </button>
                    <button onClick={() => { if (confirm('Tem certeza?')) deleteM.mutate(c.id); }} className="p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-800">{editing ? 'Editar Crédito Rural' : 'Novo Crédito Rural'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basico" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="basico" className="flex-1">Básico</TabsTrigger>
              <TabsTrigger value="financeiro" className="flex-1">Financeiro</TabsTrigger>
              <TabsTrigger value="documentos" className="flex-1">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Instituição Financeira *</Label>
                  <Input value={form.instituicao} onChange={e => setForm(p => ({ ...p, instituicao: e.target.value }))} placeholder="Ex: Banco do Brasil" />
                </div>
                <div>
                  <Label>Tipo de Crédito</Label>
                  <Select value={form.tipo_credito} onValueChange={v => setForm(p => ({ ...p, tipo_credito: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Programa</Label>
                  <Select value={form.programa || ''} onValueChange={v => setForm(p => ({ ...p, programa: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Nenhum</SelectItem>
                      {PROGRAMAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Nº do Contrato</Label><Input value={form.numero_contrato} onChange={e => setForm(p => ({ ...p, numero_contrato: e.target.value }))} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data Contratação</Label><Input type="date" value={form.data_contratacao} onChange={e => setForm(p => ({ ...p, data_contratacao: e.target.value }))} /></div>
                <div><Label>Data Vencimento *</Label><Input type="date" value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))} /></div>
                <div>
                  <Label>Propriedade</Label>
                  <Select value={form.property_id || ''} onValueChange={v => setForm(p => ({ ...p, property_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Nenhuma</SelectItem>
                      {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Garantia</Label><Input value={form.garantia} onChange={e => setForm(p => ({ ...p, garantia: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Notas</Label><Input value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} /></div>
              </div>
            </TabsContent>

            <TabsContent value="financeiro" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Valor Contratado (R$) *</Label><Input type="number" step="0.01" value={form.valor_contratado} onChange={e => setForm(p => ({ ...p, valor_contratado: e.target.value }))} /></div>
                <div><Label>Saldo Devedor (R$)</Label><Input type="number" step="0.01" value={form.saldo_devedor} onChange={e => setForm(p => ({ ...p, saldo_devedor: e.target.value }))} /></div>
                <div><Label>Taxa de Juros (% a.a.)</Label><Input type="number" step="0.01" value={form.taxa_juros} onChange={e => setForm(p => ({ ...p, taxa_juros: e.target.value }))} /></div>
                <div><Label>Prazo (meses)</Label><Input type="number" value={form.prazo_total_meses} onChange={e => setForm(p => ({ ...p, prazo_total_meses: e.target.value }))} /></div>
                <div><Label>Nº de Parcelas</Label><Input type="number" value={form.num_parcelas} onChange={e => setForm(p => ({ ...p, num_parcelas: e.target.value }))} /></div>
                <div><Label>Parcelas Pagas</Label><Input type="number" value={form.parcelas_pagas} onChange={e => setForm(p => ({ ...p, parcelas_pagas: e.target.value }))} /></div>
              </div>
            </TabsContent>

            <TabsContent value="documentos" className="space-y-4 mt-4">
              {form.documentos?.map((d, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                  <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">{d.name}</a>
                    <Select value={d.tipo} onValueChange={v => setForm(p => ({ ...p, documentos: p.documentos.map((x, j) => j === i ? { ...x, tipo: v } : x) }))}>
                      <SelectTrigger className="h-6 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{DOC_TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <button onClick={() => removeDoc(i)} className="p-1 hover:bg-gray-200 rounded"><X className="w-3.5 h-3.5 text-gray-400" /></button>
                </div>
              ))}
              <SupabaseFileUpload
                folder="credito-rural"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                label="Anexar documentos"
                onUploadDone={handleUploadDoc}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
            <Button variant="outline" onClick={closeForm} disabled={createM.isPending || updateM.isPending}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSubmit} disabled={createM.isPending || updateM.isPending}>
              {createM.isPending || updateM.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}