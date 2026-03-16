import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus, Pencil, Trash2, Upload, FileText, X, Loader2,
  Building2, Calendar, AlertTriangle, CheckCircle2, Clock, DollarSign,
  TrendingDown, ChevronDown, ChevronUp, Paperclip
} from 'lucide-react';
import ConsultorPropertySelector from '@/components/consultor/ConsultorPropertySelector';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

const TIPOS = ['Custeio', 'Investimento', 'Comercialização', 'Industrialização', 'Outro'];
const PROGRAMAS = ['Plano Safra', 'PRONAF', 'PRONAMP', 'ABC+', 'PCA', 'FCO Rural', 'Outro'];
const STATUS_MAP = {
  'Em dia': 'bg-emerald-100 text-emerald-700',
  'Vencendo em breve': 'bg-amber-100 text-amber-700',
  'Inadimplente': 'bg-red-100 text-red-700',
  'Liquidado': 'bg-gray-100 text-gray-600',
  'Em renegociação': 'bg-blue-100 text-blue-700',
};
const DOC_TIPOS = ['Contrato de Financiamento', 'CPR', 'Garantia', 'Aditivo Contratual', 'Outro'];

const EMPTY = {
  instituicao: '', tipo_credito: 'Custeio', programa: '', numero_contrato: '',
  data_contratacao: '', data_vencimento: '', valor_contratado: '', saldo_devedor: '',
  taxa_juros: '', prazo_total_meses: '', num_parcelas: '', parcelas_pagas: '0',
  garantia: '', status: 'Em dia', property_id: '', client_name: '', notas: '',
  parcelas: [], documentos: [],
};

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function StatusBadge({ status }) {
  return <Badge className={`${STATUS_MAP[status] || 'bg-gray-100 text-gray-600'} border-0 text-xs`}>{status}</Badge>;
}

function AlertBadge({ vencimento }) {
  if (!vencimento) return null;
  const diff = differenceInDays(parseISO(vencimento), new Date());
  if (diff < 0) return <span className="flex items-center gap-1 text-xs text-red-600 font-semibold"><AlertTriangle className="w-3 h-3" />Vencido</span>;
  if (diff <= 30) return <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold"><Clock className="w-3 h-3" />Vence em {diff}d</span>;
  return null;
}

export default function RuralCreditPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [expandedId, setExpandedId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const qc = useQueryClient();

  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: properties = [] } = useQuery({
    queryKey: ['props-credit', user?.email],
    queryFn: () => base44.entities.Property.filter({ consultor_email: user.email }, 'client_name', 300),
    enabled: !!user?.email,
  });

  const { data: credits = [], isLoading } = useQuery({
    queryKey: ['rural-credits', user?.email, selectedPropertyId],
    queryFn: () => {
      const filter = { consultor_email: user.email };
      if (selectedPropertyId) filter.property_id = selectedPropertyId;
      return base44.entities.RuralCredit.filter(filter, '-created_date', 200);
    },
    enabled: !!user?.email,
  });

  const createM = useMutation({ mutationFn: d => base44.entities.RuralCredit.create(d), onSuccess: () => { qc.invalidateQueries(['rural-credits']); closeForm(); toast.success('Crédito cadastrado!'); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => base44.entities.RuralCredit.update(id, data), onSuccess: () => { qc.invalidateQueries(['rural-credits']); closeForm(); toast.success('Atualizado!'); } });
  const deleteM = useMutation({ mutationFn: id => base44.entities.RuralCredit.delete(id), onSuccess: () => { qc.invalidateQueries(['rural-credits']); toast.success('Removido.'); } });

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openForm = (item = null) => {
    setEditing(item);
    setForm(item ? { ...EMPTY, ...item, valor_contratado: String(item.valor_contratado || ''), saldo_devedor: String(item.saldo_devedor || ''), taxa_juros: String(item.taxa_juros || ''), prazo_total_meses: String(item.prazo_total_meses || ''), num_parcelas: String(item.num_parcelas || ''), parcelas_pagas: String(item.parcelas_pagas || 0) } : EMPTY);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleUploadDoc = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(p => ({ ...p, documentos: [...(p.documentos || []), { name: file.name, url: file_url, tipo: 'Contrato de Financiamento', upload_date: new Date().toISOString() }] }));
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeDoc = (idx) => setForm(p => ({ ...p, documentos: p.documentos.filter((_, i) => i !== idx) }));

  const handleSubmit = () => {
    if (!form.instituicao || !form.valor_contratado || !form.data_vencimento) { toast.error('Preencha instituição, valor e data de vencimento.'); return; }
    const clientProp = properties.find(p => p.id === form.property_id);
    const payload = { ...form, valor_contratado: parseFloat(form.valor_contratado) || 0, saldo_devedor: parseFloat(form.saldo_devedor) || 0, taxa_juros: parseFloat(form.taxa_juros) || 0, prazo_total_meses: parseInt(form.prazo_total_meses) || 0, num_parcelas: parseInt(form.num_parcelas) || 0, parcelas_pagas: parseInt(form.parcelas_pagas) || 0, consultor_email: user?.email, client_name: clientProp?.client_name || form.client_name };
    if (editing) updateM.mutate({ id: editing.id, data: payload });
    else createM.mutate(payload);
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Contratos', value: credits.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Valor Contratado', value: fmt(totalContratado), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Saldo Devedor', value: fmt(totalSaldo), icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Inadimplentes', value: inadimplentes, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
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

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : credits.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Nenhum crédito cadastrado</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => openForm()}><Plus className="w-4 h-4 mr-1" />Cadastrar</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {credits.map(c => {
            const expanded = expandedId === c.id;
            const pct = c.num_parcelas > 0 ? Math.round((c.parcelas_pagas / c.num_parcelas) * 100) : 0;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 flex items-start gap-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : c.id)}>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{c.instituicao}</p>
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">{c.tipo_credito}</Badge>
                      <StatusBadge status={c.status} />
                      <AlertBadge vencimento={c.data_vencimento} />
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      {c.client_name && <span className="text-xs text-gray-500">{c.client_name}</span>}
                      {c.numero_contrato && <span className="text-xs text-gray-400">Nº {c.numero_contrato}</span>}
                      {c.programa && <span className="text-xs text-emerald-600">{c.programa}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-700">{fmt(c.valor_contratado)}</span>
                      {c.saldo_devedor > 0 && <span className="text-xs text-amber-600">Saldo: {fmt(c.saldo_devedor)}</span>}
                      {c.data_vencimento && <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" />Vence: {format(parseISO(c.data_vencimento), 'dd/MM/yyyy')}</span>}
                      {c.num_parcelas > 0 && <span className="text-xs text-gray-500">{c.parcelas_pagas}/{c.num_parcelas} parcelas ({pct}%)</span>}
                    </div>
                    {c.num_parcelas > 0 && (
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full w-48 max-w-full">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.documentos?.length > 0 && <span className="flex items-center gap-0.5 text-xs text-blue-500"><Paperclip className="w-3 h-3" />{c.documentos.length}</span>}
                    <button onClick={e => { e.stopPropagation(); openForm(c); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                    <button onClick={e => { e.stopPropagation(); if (confirm('Remover?')) deleteM.mutate(c.id); }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
                {expanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm bg-gray-50">
                    {c.taxa_juros > 0 && <div><p className="text-xs text-gray-400">Taxa de Juros</p><p className="font-medium">{c.taxa_juros}% a.a.</p></div>}
                    {c.prazo_total_meses > 0 && <div><p className="text-xs text-gray-400">Prazo</p><p className="font-medium">{c.prazo_total_meses} meses</p></div>}
                    {c.garantia && <div><p className="text-xs text-gray-400">Garantia</p><p className="font-medium">{c.garantia}</p></div>}
                    {c.data_contratacao && <div><p className="text-xs text-gray-400">Contratação</p><p className="font-medium">{format(parseISO(c.data_contratacao), 'dd/MM/yyyy')}</p></div>}
                    {c.notas && <div className="col-span-2 lg:col-span-4"><p className="text-xs text-gray-400">Notas</p><p className="text-gray-600">{c.notas}</p></div>}
                    {c.documentos?.length > 0 && (
                      <div className="col-span-2 lg:col-span-4">
                        <p className="text-xs text-gray-400 mb-1">Documentos</p>
                        <div className="flex flex-wrap gap-2">
                          {c.documentos.map((d, i) => (
                            <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-blue-600 hover:border-blue-300">
                              <FileText className="w-3 h-3" />{d.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-800">{editing ? 'Editar Crédito Rural' : 'Novo Crédito Rural'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basico">
            <TabsList className="w-full">
              <TabsTrigger value="basico" className="flex-1">Informações Básicas</TabsTrigger>
              <TabsTrigger value="financeiro" className="flex-1">Condições Financeiras</TabsTrigger>
              <TabsTrigger value="documentos" className="flex-1">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Instituição Financeira *</Label><Input value={form.instituicao} onChange={e => setF('instituicao', e.target.value)} placeholder="Ex: Banco do Brasil" /></div>
                <div>
                  <Label>Tipo de Crédito *</Label>
                  <Select value={form.tipo_credito} onValueChange={v => setF('tipo_credito', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Programa</Label>
                  <Select value={form.programa || '__none__'} onValueChange={v => setF('programa', v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {PROGRAMAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Número do Contrato</Label><Input value={form.numero_contrato} onChange={e => setF('numero_contrato', e.target.value)} placeholder="Nº do contrato" /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setF('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.keys(STATUS_MAP).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data de Contratação</Label><Input type="date" value={form.data_contratacao} onChange={e => setF('data_contratacao', e.target.value)} /></div>
                <div><Label>Data de Vencimento *</Label><Input type="date" value={form.data_vencimento} onChange={e => setF('data_vencimento', e.target.value)} /></div>
                <div>
                  <Label>Cliente / Propriedade</Label>
                  <Select value={form.property_id || '__none__'} onValueChange={v => setF('property_id', v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar cliente..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.client_name || p.property_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Garantia Vinculada</Label><Input value={form.garantia} onChange={e => setF('garantia', e.target.value)} placeholder="Ex: Hipoteca, penhor" /></div>
                <div className="col-span-2"><Label>Notas</Label><Input value={form.notas} onChange={e => setF('notas', e.target.value)} placeholder="Observações adicionais" /></div>
              </div>
            </TabsContent>

            <TabsContent value="financeiro" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Valor Contratado (R$) *</Label><Input type="number" step="0.01" value={form.valor_contratado} onChange={e => setF('valor_contratado', e.target.value)} /></div>
                <div><Label>Saldo Devedor (R$)</Label><Input type="number" step="0.01" value={form.saldo_devedor} onChange={e => setF('saldo_devedor', e.target.value)} /></div>
                <div><Label>Taxa de Juros (% a.a.)</Label><Input type="number" step="0.01" value={form.taxa_juros} onChange={e => setF('taxa_juros', e.target.value)} /></div>
                <div><Label>Prazo Total (meses)</Label><Input type="number" value={form.prazo_total_meses} onChange={e => setF('prazo_total_meses', e.target.value)} /></div>
                <div><Label>Nº de Parcelas</Label><Input type="number" value={form.num_parcelas} onChange={e => setF('num_parcelas', e.target.value)} /></div>
                <div><Label>Parcelas Pagas</Label><Input type="number" value={form.parcelas_pagas} onChange={e => setF('parcelas_pagas', e.target.value)} /></div>
              </div>
              {form.num_parcelas > 0 && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-sm text-emerald-800">
                  <p className="font-semibold mb-1">Progresso das Parcelas</p>
                  <div className="h-2 bg-emerald-200 rounded-full">
                    <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((parseInt(form.parcelas_pagas || 0) / parseInt(form.num_parcelas)) * 100))}%` }} />
                  </div>
                  <p className="text-xs mt-1 text-emerald-600">{form.parcelas_pagas || 0}/{form.num_parcelas} pagas · {Math.min(100, Math.round((parseInt(form.parcelas_pagas || 0) / parseInt(form.num_parcelas)) * 100))}%</p>
                </div>
              )}
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
              <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-sm text-gray-500 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Enviando...' : 'Anexar contrato, CPR, garantias ou aditivos'}
                <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleUploadDoc} />
              </label>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-4">
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} disabled={createM.isPending || updateM.isPending}>
              {createM.isPending || updateM.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}