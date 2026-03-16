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
import {
  Plus, Pencil, Trash2, Upload, FileText, X, Loader2,
  Wheat, AlertTriangle, Image as ImageIcon, ChevronDown, ChevronUp, Paperclip
} from 'lucide-react';
import ConsultorPropertySelector from '@/components/consultor/ConsultorPropertySelector';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const TIPOS_EVENTO = ['Seca', 'Geada', 'Granizo', 'Excesso de Chuva', 'Pragas / Doenças', 'Vendaval', 'Outro'];
const EVIDENCIA_TIPOS = ['Foto da Lavoura', 'Laudo Técnico', 'Imagem de Satélite', 'Boletim Meteorológico', 'Outro'];
const DOC_TIPOS = ['Relatório Técnico', 'Pedido de Prorrogação', 'Comunicado ao Banco', 'Outro'];
const STATUS_LIST = ['Registrado', 'Em Análise', 'Laudo Emitido', 'Seguro Acionado', 'Prorrogação Solicitada', 'Concluído'];
const UNIDADES = ['sc/ha', 'kg/ha', 't/ha'];

const STATUS_MAP = {
  'Registrado': 'bg-gray-100 text-gray-600',
  'Em Análise': 'bg-blue-100 text-blue-700',
  'Laudo Emitido': 'bg-amber-100 text-amber-700',
  'Seguro Acionado': 'bg-violet-100 text-violet-700',
  'Prorrogação Solicitada': 'bg-orange-100 text-orange-700',
  'Concluído': 'bg-emerald-100 text-emerald-700',
};

const EVENTO_COLORS = {
  'Seca': 'bg-orange-100 text-orange-700',
  'Geada': 'bg-blue-100 text-blue-700',
  'Granizo': 'bg-slate-100 text-slate-700',
  'Excesso de Chuva': 'bg-cyan-100 text-cyan-700',
  'Pragas / Doenças': 'bg-red-100 text-red-700',
  'Vendaval': 'bg-purple-100 text-purple-700',
  'Outro': 'bg-gray-100 text-gray-600',
};

const EMPTY = {
  cultura: '', area_plantada: '', area_afetada: '', data_evento: '',
  tipo_evento: 'Seca', produtividade_esperada: '', produtividade_obtida: '',
  unidade_produtividade: 'sc/ha', percentual_perda: '', status: 'Registrado',
  seguro_rural: false, seguradora: '', numero_apolice: '',
  property_id: '', client_name: '', notas: '',
  evidencias: [], documentos: [],
};

const fmt = (v, u = 'sc/ha') => `${Number(v || 0).toLocaleString('pt-BR')} ${u}`;

export default function HarvestLossPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [expandedId, setExpandedId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState('evidencias');
  const [user, setUser] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const qc = useQueryClient();

  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: properties = [] } = useQuery({
    queryKey: ['props-harvest', user?.email],
    queryFn: () => base44.entities.Property.filter({ consultor_email: user.email }, 'client_name', 300),
    enabled: !!user?.email,
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['harvest-loss', user?.email, selectedPropertyId],
    queryFn: () => {
      const filter = { consultor_email: user.email };
      if (selectedPropertyId) filter.property_id = selectedPropertyId;
      return base44.entities.HarvestLoss.filter(filter, '-data_evento', 200);
    },
    enabled: !!user?.email,
  });

  const createM = useMutation({ mutationFn: d => base44.entities.HarvestLoss.create(d), onSuccess: () => { qc.invalidateQueries(['harvest-loss']); closeForm(); toast.success('Evento registrado!'); } });
  const updateM = useMutation({ mutationFn: ({ id, data }) => base44.entities.HarvestLoss.update(id, data), onSuccess: () => { qc.invalidateQueries(['harvest-loss']); closeForm(); toast.success('Atualizado!'); } });
  const deleteM = useMutation({ mutationFn: id => base44.entities.HarvestLoss.delete(id), onSuccess: () => { qc.invalidateQueries(['harvest-loss']); toast.success('Removido.'); } });

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openForm = (item = null) => {
    setEditing(item);
    setForm(item ? { ...EMPTY, ...item, area_plantada: String(item.area_plantada || ''), area_afetada: String(item.area_afetada || ''), produtividade_esperada: String(item.produtividade_esperada || ''), produtividade_obtida: String(item.produtividade_obtida || ''), percentual_perda: String(item.percentual_perda || '') } : EMPTY);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const calcPerda = () => {
    const esp = parseFloat(form.produtividade_esperada);
    const obt = parseFloat(form.produtividade_obtida);
    if (esp > 0 && obt >= 0) {
      const pct = Math.max(0, Math.round(((esp - obt) / esp) * 100));
      setF('percentual_perda', String(pct));
    }
  };

  const handleUpload = async (e, target) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setUploadTarget(target);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const entry = { name: file.name, url: file_url, tipo: target === 'evidencias' ? 'Foto da Lavoura' : 'Relatório Técnico', upload_date: new Date().toISOString() };
      setForm(p => ({ ...p, [target]: [...(p[target] || []), entry] }));
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeItem = (target, idx) => setForm(p => ({ ...p, [target]: p[target].filter((_, i) => i !== idx) }));

  const handleSubmit = () => {
    if (!form.cultura || !form.tipo_evento || !form.data_evento) { toast.error('Preencha cultura, tipo de evento e data.'); return; }
    const clientProp = properties.find(p => p.id === form.property_id);
    const payload = { ...form, area_plantada: parseFloat(form.area_plantada) || 0, area_afetada: parseFloat(form.area_afetada) || 0, produtividade_esperada: parseFloat(form.produtividade_esperada) || 0, produtividade_obtida: parseFloat(form.produtividade_obtida) || 0, percentual_perda: parseFloat(form.percentual_perda) || 0, consultor_email: user?.email, client_name: clientProp?.client_name || form.client_name };
    if (editing) updateM.mutate({ id: editing.id, data: payload });
    else createM.mutate(payload);
  };

  const totalArea = records.reduce((s, r) => s + (r.area_afetada || 0), 0);
  const mediaPerda = records.length > 0 ? Math.round(records.reduce((s, r) => s + (r.percentual_perda || 0), 0) / records.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Frustração de Safra</h1>
          <p className="text-sm text-gray-500 mt-1">Registro e gestão de eventos de perda de produção</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openForm()}>
          <Plus className="w-4 h-4 mr-2" />Registrar Evento
        </Button>
      </div>

      <ConsultorPropertySelector
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onSelect={setSelectedPropertyId}
        isLoading={!user}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Eventos', value: records.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: AlertTriangle },
          { label: 'Área Total Afetada', value: `${totalArea.toLocaleString('pt-BR')} ha`, color: 'text-amber-600', bg: 'bg-amber-50', icon: Wheat },
          { label: 'Perda Média', value: `${mediaPerda}%`, color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
          { label: 'Em Análise', value: records.filter(r => r.status === 'Em Análise').length, color: 'text-violet-600', bg: 'bg-violet-50', icon: FileText },
        ].map(({ label, value, color, bg, icon: Icon }) => (
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
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Wheat className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Nenhum evento de frustração de safra registrado</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => openForm()}><Plus className="w-4 h-4 mr-1" />Registrar</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => {
            const expanded = expandedId === r.id;
            return (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 flex items-start gap-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : r.id)}>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Wheat className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{r.cultura}</p>
                      <Badge className={`${EVENTO_COLORS[r.tipo_evento] || 'bg-gray-100 text-gray-600'} border-0 text-xs`}>{r.tipo_evento}</Badge>
                      <Badge className={`${STATUS_MAP[r.status] || 'bg-gray-100 text-gray-600'} border-0 text-xs`}>{r.status}</Badge>
                      {r.percentual_perda > 0 && <Badge className="bg-red-100 text-red-700 border-0 text-xs font-bold">{r.percentual_perda}% de perda</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap text-xs text-gray-500">
                      {r.client_name && <span>{r.client_name}</span>}
                      {r.data_evento && <span>{format(parseISO(r.data_evento), 'dd/MM/yyyy')}</span>}
                      {r.area_afetada > 0 && <span>{r.area_afetada} ha afetados</span>}
                      {r.seguro_rural && <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">Seguro Rural</Badge>}
                    </div>
                    {r.produtividade_esperada > 0 && (
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-gray-500">Esperada: <strong className="text-gray-700">{fmt(r.produtividade_esperada, r.unidade_produtividade)}</strong></span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-500">Obtida: <strong className="text-red-600">{fmt(r.produtividade_obtida, r.unidade_produtividade)}</strong></span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(r.evidencias?.length > 0 || r.documentos?.length > 0) && (
                      <span className="flex items-center gap-0.5 text-xs text-blue-500">
                        <Paperclip className="w-3 h-3" />{(r.evidencias?.length || 0) + (r.documentos?.length || 0)}
                      </span>
                    )}
                    <button onClick={e => { e.stopPropagation(); openForm(r); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                    <button onClick={e => { e.stopPropagation(); if (confirm('Remover?')) deleteM.mutate(r.id); }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
                {expanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50 space-y-3">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      {r.area_plantada > 0 && <div><p className="text-xs text-gray-400">Área Plantada</p><p className="font-medium">{r.area_plantada} ha</p></div>}
                      {r.area_afetada > 0 && <div><p className="text-xs text-gray-400">Área Afetada</p><p className="font-medium">{r.area_afetada} ha</p></div>}
                      {r.seguradora && <div><p className="text-xs text-gray-400">Seguradora</p><p className="font-medium">{r.seguradora}</p></div>}
                      {r.numero_apolice && <div><p className="text-xs text-gray-400">Apólice</p><p className="font-medium">{r.numero_apolice}</p></div>}
                      {r.notas && <div className="col-span-2 lg:col-span-4"><p className="text-xs text-gray-400">Notas</p><p className="text-gray-600">{r.notas}</p></div>}
                    </div>
                    {(r.evidencias?.length > 0 || r.documentos?.length > 0) && (
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Arquivos</p>
                        <div className="flex flex-wrap gap-2">
                          {[...(r.evidencias || []), ...(r.documentos || [])].map((f, i) => (
                            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-blue-600 hover:border-blue-300">
                              {f.tipo?.includes('Foto') ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}{f.name}
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
            <DialogTitle className="text-emerald-800">{editing ? 'Editar Evento' : 'Registrar Frustração de Safra'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="evento">
            <TabsList className="w-full">
              <TabsTrigger value="evento" className="flex-1">Evento</TabsTrigger>
              <TabsTrigger value="perdas" className="flex-1">Perdas</TabsTrigger>
              <TabsTrigger value="evidencias" className="flex-1">Evidências</TabsTrigger>
              <TabsTrigger value="documentos" className="flex-1">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="evento" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Cultura Afetada *</Label><Input value={form.cultura} onChange={e => setF('cultura', e.target.value)} placeholder="Ex: Soja, Milho, Trigo" /></div>
                <div>
                  <Label>Tipo de Evento *</Label>
                  <Select value={form.tipo_evento} onValueChange={v => setF('tipo_evento', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS_EVENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data do Evento *</Label><Input type="date" value={form.data_evento} onChange={e => setF('data_evento', e.target.value)} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setF('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Área Plantada (ha)</Label><Input type="number" step="0.1" value={form.area_plantada} onChange={e => setF('area_plantada', e.target.value)} /></div>
                <div><Label>Área Afetada (ha)</Label><Input type="number" step="0.1" value={form.area_afetada} onChange={e => setF('area_afetada', e.target.value)} /></div>
                <div>
                  <Label>Cliente / Propriedade</Label>
                  <Select value={form.property_id || '__none__'} onValueChange={v => setF('property_id', v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.client_name || p.property_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" id="seguro" checked={form.seguro_rural} onChange={e => setF('seguro_rural', e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                  <Label htmlFor="seguro" className="cursor-pointer">Possui seguro rural?</Label>
                </div>
                {form.seguro_rural && <>
                  <div><Label>Seguradora</Label><Input value={form.seguradora} onChange={e => setF('seguradora', e.target.value)} placeholder="Nome da seguradora" /></div>
                  <div><Label>Nº da Apólice</Label><Input value={form.numero_apolice} onChange={e => setF('numero_apolice', e.target.value)} /></div>
                </>}
                <div className="col-span-2"><Label>Notas</Label><Input value={form.notas} onChange={e => setF('notas', e.target.value)} placeholder="Observações adicionais" /></div>
              </div>
            </TabsContent>

            <TabsContent value="perdas" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Unidade de Produtividade</Label>
                  <Select value={form.unidade_produtividade} onValueChange={v => setF('unidade_produtividade', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div />
                <div>
                  <Label>Produtividade Esperada ({form.unidade_produtividade})</Label>
                  <Input type="number" step="0.1" value={form.produtividade_esperada} onChange={e => setF('produtividade_esperada', e.target.value)} onBlur={calcPerda} />
                </div>
                <div>
                  <Label>Produtividade Obtida ({form.unidade_produtividade})</Label>
                  <Input type="number" step="0.1" value={form.produtividade_obtida} onChange={e => setF('produtividade_obtida', e.target.value)} onBlur={calcPerda} />
                </div>
                <div className="col-span-2">
                  <Label>Percentual de Perda (%)</Label>
                  <Input type="number" step="0.1" max="100" value={form.percentual_perda} onChange={e => setF('percentual_perda', e.target.value)} />
                  {form.produtividade_esperada && form.produtividade_obtida && (
                    <p className="text-xs text-gray-400 mt-1">Calculado automaticamente ao sair dos campos acima</p>
                  )}
                </div>
              </div>
              {form.percentual_perda > 0 && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-sm font-semibold text-red-800 mb-2">Impacto da Perda</p>
                  <div className="h-3 bg-red-200 rounded-full">
                    <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(100, parseFloat(form.percentual_perda))}%`, backgroundColor: parseFloat(form.percentual_perda) > 70 ? '#dc2626' : parseFloat(form.percentual_perda) > 40 ? '#f97316' : '#f59e0b' }} />
                  </div>
                  <p className="text-xs mt-1.5 text-red-600 font-bold">{form.percentual_perda}% de perda estimada</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="evidencias" className="space-y-3 mt-4">
              <p className="text-xs text-gray-500">Fotos da lavoura, laudos técnicos, imagens de satélite, boletins meteorológicos.</p>
              {form.evidencias?.map((e, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                  {e.tipo?.includes('Foto') ? <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">{e.name}</a>
                    <Select value={e.tipo} onValueChange={v => setForm(p => ({ ...p, evidencias: p.evidencias.map((x, j) => j === i ? { ...x, tipo: v } : x) }))}>
                      <SelectTrigger className="h-6 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{EVIDENCIA_TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <button onClick={() => removeItem('evidencias', i)} className="p-1 hover:bg-gray-200 rounded"><X className="w-3.5 h-3.5 text-gray-400" /></button>
                </div>
              ))}
              <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-sm text-gray-500 ${uploading && uploadTarget === 'evidencias' ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading && uploadTarget === 'evidencias' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading && uploadTarget === 'evidencias' ? 'Enviando...' : 'Anexar fotos, laudos ou boletins'}
                <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={e => handleUpload(e, 'evidencias')} />
              </label>
            </TabsContent>

            <TabsContent value="documentos" className="space-y-3 mt-4">
              <p className="text-xs text-gray-500">Relatórios técnicos, pedidos de prorrogação ao banco, comunicados.</p>
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
                  <button onClick={() => removeItem('documentos', i)} className="p-1 hover:bg-gray-200 rounded"><X className="w-3.5 h-3.5 text-gray-400" /></button>
                </div>
              ))}
              <label className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-sm text-gray-500 ${uploading && uploadTarget === 'documentos' ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading && uploadTarget === 'documentos' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading && uploadTarget === 'documentos' ? 'Enviando...' : 'Anexar relatório técnico ou pedido de prorrogação'}
                <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={e => handleUpload(e, 'documentos')} />
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