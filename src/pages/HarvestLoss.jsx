import React, { useState, useEffect } from 'react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
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
import { Plus, Pencil, Trash2, FileText, X, Loader2, Wheat, AlertTriangle } from 'lucide-react';
import SupabaseFileUpload from '@/components/storage/SupabaseFileUpload';
import ConsultorPropertySelector from '@/components/consultor/ConsultorPropertySelector';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const TIPOS_EVENTO = ['Seca', 'Geada', 'Granizo', 'Excesso de Chuva', 'Pragas / Doenças', 'Vendaval', 'Outro'];
const STATUS_OPTIONS = ['Registrado', 'Em Análise', 'Laudo Emitido', 'Seguro Acionado', 'Prorrogação Solicitada', 'Concluído'];
const UNIDADES = ['sc/ha', 'kg/ha', 't/ha'];
const EVIDENCIA_TIPOS = ['Foto da Lavoura', 'Laudo Técnico', 'Imagem de Satélite', 'Boletim Meteorológico', 'Outro'];
const DOC_TIPOS = ['Relatório Técnico', 'Pedido de Prorrogação', 'Comunicado ao Banco', 'Outro'];

const EVENTO_COLORS = {
  'Seca': 'bg-orange-100 text-orange-700',
  'Geada': 'bg-blue-100 text-blue-700',
  'Granizo': 'bg-slate-100 text-slate-700',
  'Excesso de Chuva': 'bg-cyan-100 text-cyan-700',
  'Pragas / Doenças': 'bg-red-100 text-red-700',
  'Vendaval': 'bg-purple-100 text-purple-700',
  'Outro': 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS = {
  'Registrado': 'bg-gray-100 text-gray-600',
  'Em Análise': 'bg-blue-100 text-blue-700',
  'Laudo Emitido': 'bg-amber-100 text-amber-700',
  'Seguro Acionado': 'bg-violet-100 text-violet-700',
  'Prorrogação Solicitada': 'bg-orange-100 text-orange-700',
  'Concluído': 'bg-emerald-100 text-emerald-700',
};

const INITIAL_FORM = {
  cultura: '',
  area_plantada: '',
  area_afetada: '',
  data_evento: '',
  tipo_evento: 'Seca',
  produtividade_esperada: '',
  produtividade_obtida: '',
  unidade_produtividade: 'sc/ha',
  percentual_perda: '',
  status: 'Registrado',
  seguro_rural: false,
  seguradora: '',
  numero_apolice: '',
  property_id: '',
  notas: '',
  evidencias: [],
  documentos: []
};

export default function HarvestLossPage() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  const qc = useQueryClient();

  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { effectiveEmail: harvestEffectiveEmail, userType: harvestUserType, isEquipeProdutor: harvestIsEquipeProdutor, loading: harvestUserLoading } = useEffectiveUser();
  // equipe de produtor busca como produtor (owner_email)
  const isConsultor = (harvestUserType === 'consultor' || (harvestUserType === 'equipe' && !harvestIsEquipeProdutor));

  const { data: properties = [] } = useQuery({
    queryKey: ['props-harvest', harvestEffectiveEmail, harvestUserType],
    queryFn: async () => {
      if (!harvestEffectiveEmail) return [];
      if (isConsultor) {
        const res = await base44.functions.invoke('listConsultorClients', {});
        return res.data?.properties || [];
      }
      return base44.entities.Property.filter({ owner_email: harvestEffectiveEmail }, 'client_name', 300);
    },
    enabled: !!harvestEffectiveEmail && !harvestUserLoading,
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['harvest-loss', harvestEffectiveEmail, selectedPropertyId, isConsultor],
    queryFn: async () => {
      if (!harvestEffectiveEmail) return [];
      const propFilter = selectedPropertyId ? { property_id: selectedPropertyId } : {};
      const [byConsultor, byClient] = await Promise.all([
        base44.entities.HarvestLoss.filter({ consultor_email: harvestEffectiveEmail, ...propFilter }, '-data_evento', 200),
        base44.entities.HarvestLoss.filter({ client_email: harvestEffectiveEmail, ...propFilter }, '-data_evento', 200),
      ]);
      const all = [...byConsultor, ...byClient];
      const seen = new Set();
      return all.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
    },
    enabled: !!harvestEffectiveEmail && !harvestUserLoading,
  });

  const createM = useMutation({
    mutationFn: (data) => base44.entities.HarvestLoss.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harvest-loss'] });
      toast.success('Evento registrado com sucesso!');
      closeForm();
    },
    onError: (err) => toast.error(err?.message || 'Erro ao salvar')
  });

  const updateM = useMutation({
    mutationFn: (data) => base44.entities.HarvestLoss.update(data.id, data.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harvest-loss'] });
      toast.success('Evento atualizado com sucesso!');
      closeForm();
    },
    onError: (err) => toast.error(err?.message || 'Erro ao atualizar')
  });

  const deleteM = useMutation({
    mutationFn: (id) => base44.entities.HarvestLoss.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harvest-loss'] });
      toast.success('Evento removido!');
    },
    onError: (err) => toast.error(err?.message || 'Erro ao remover')
  });

  const openForm = (item = null) => {
    if (item?.id) {
      setEditing(item);
      setForm({
        ...INITIAL_FORM,
        ...item,
        area_plantada: String(item.area_plantada || ''),
        area_afetada: String(item.area_afetada || ''),
        produtividade_esperada: String(item.produtividade_esperada || ''),
        produtividade_obtida: String(item.produtividade_obtida || ''),
        percentual_perda: String(item.percentual_perda || ''),
        evidencias: item.evidencias || [],
        documentos: item.documentos || []
      });
    } else {
      setEditing(null);
      setForm(INITIAL_FORM);
    }
    setShowForm(true);
  };

  const closeForm = () => {
    if (!editing && (form.cultura || form.data_evento)) {
      const confirmed = window.confirm('Você tem alterações não salvas. Deseja fechar sem salvar?');
      if (!confirmed) return;
    }
    setShowForm(false);
    setEditing(null);
    setForm(INITIAL_FORM);
  };

  const handleUpload = (filePath, fileName, target) => {
    const entry = {
      name: fileName,
      url: filePath,
      tipo: target === 'evidencias' ? 'Foto da Lavoura' : 'Relatório Técnico',
      upload_date: new Date().toISOString()
    };
    setForm(p => ({ ...p, [target]: [...(p[target] || []), entry] }));
  };

  const removeItem = (target, idx) => {
    setForm(p => ({ ...p, [target]: p[target].filter((_, i) => i !== idx) }));
  };

  const calcPerda = () => {
    const esp = parseFloat(form.produtividade_esperada);
    const obt = parseFloat(form.produtividade_obtida);
    if (esp > 0 && obt >= 0) {
      const pct = Math.max(0, Math.round(((esp - obt) / esp) * 100));
      setForm(p => ({ ...p, percentual_perda: String(pct) }));
    }
  };

  const validateForm = () => {
    if (!form.cultura?.trim()) return 'Preencha a cultura afetada';
    if (!form.tipo_evento) return 'Selecione o tipo de evento';
    if (!form.data_evento) return 'Preencha a data do evento';
    const areaPlantada = parseFloat(form.area_plantada) || 0;
    const areaAfetada = parseFloat(form.area_afetada) || 0;
    if (areaAfetada > 0 && areaPlantada > 0 && areaAfetada > areaPlantada) return 'Área afetada não pode exceder plantada';
    const perda = parseFloat(form.percentual_perda) || 0;
    if (perda < 0 || perda > 100) return 'Percentual deve estar entre 0 e 100%';
    return null;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const error = validateForm();
    if (error) { toast.error(error); return; }

    const clientProp = properties.find(p => p.id === form.property_id) || properties[0];
    const payload = {
      cultura: form.cultura.trim(),
      area_plantada: parseFloat(form.area_plantada) || 0,
      area_afetada: parseFloat(form.area_afetada) || 0,
      data_evento: form.data_evento,
      tipo_evento: form.tipo_evento,
      produtividade_esperada: parseFloat(form.produtividade_esperada) || 0,
      produtividade_obtida: parseFloat(form.produtividade_obtida) || 0,
      unidade_produtividade: form.unidade_produtividade || 'sc/ha',
      percentual_perda: parseFloat(form.percentual_perda) || 0,
      status: form.status || 'Registrado',
      seguro_rural: form.seguro_rural === true,
      seguradora: form.seguro_rural ? form.seguradora || '' : '',
      numero_apolice: form.seguro_rural ? form.numero_apolice || '' : '',
      property_id: form.property_id || clientProp?.id || '',
      notas: form.notas || '',
      consultor_email: user?.email,
      client_email: isConsultor ? (clientProp?.owner_email || '') : user?.email,
      client_name: clientProp?.client_name || clientProp?.property_name || 'Sem especificar',
      evidencias: Array.isArray(form.evidencias) ? form.evidencias : [],
      documentos: Array.isArray(form.documentos) ? form.documentos : []
    };

    if (editing?.id) {
      updateM.mutate({ id: editing.id, payload });
    } else {
      createM.mutate(payload);
    }
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
          { label: 'Total Eventos', value: records.length, icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Área Afetada', value: `${totalArea.toLocaleString('pt-BR')} ha`, icon: Wheat, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Perda Média', value: `${mediaPerda}%`, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Em Análise', value: records.filter(r => r.status === 'Em Análise').length, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50' },
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
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Wheat className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Nenhum evento registrado</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => openForm()}>
            <Plus className="w-4 h-4 mr-1" />Registrar
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800">{r.cultura}</h3>
                    <Badge className={`${EVENTO_COLORS[r.tipo_evento]} border-0 text-xs`}>{r.tipo_evento}</Badge>
                    <Badge className={`${STATUS_COLORS[r.status]} border-0 text-xs`}>{r.status}</Badge>
                    {r.percentual_perda > 0 && <Badge className="bg-red-100 text-red-700 border-0 text-xs font-bold">{r.percentual_perda}%</Badge>}
                  </div>
                  <div className="text-sm text-gray-600">
                    {r.data_evento && <span>{format(parseISO(r.data_evento), 'dd/MM/yyyy')}</span>}
                    {r.area_afetada > 0 && <span className="ml-3">Área: {r.area_afetada} ha</span>}
                    {r.seguro_rural && <Badge className="ml-3 bg-violet-100 text-violet-700 border-0 text-xs">Seguro</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openForm(r)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <Pencil className="w-4 h-4 text-gray-400" />
                  </button>
                  <button onClick={() => { if (confirm('Tem certeza?')) deleteM.mutate(r.id); }} className="p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-800">{editing ? 'Editar Evento' : 'Registrar Frustração de Safra'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="evento" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="evento" className="flex-1">Evento</TabsTrigger>
              <TabsTrigger value="perdas" className="flex-1">Perdas</TabsTrigger>
              <TabsTrigger value="evidencias" className="flex-1">Evidências</TabsTrigger>
              <TabsTrigger value="documentos" className="flex-1">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="evento" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Cultura *</Label><Input value={form.cultura} onChange={e => setForm(p => ({ ...p, cultura: e.target.value }))} placeholder="Ex: Soja, Milho" /></div>
                <div>
                  <Label>Tipo Evento *</Label>
                  <Select value={form.tipo_evento} onValueChange={v => setForm(p => ({ ...p, tipo_evento: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS_EVENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data *</Label><Input type="date" value={form.data_evento} onChange={e => setForm(p => ({ ...p, data_evento: e.target.value }))} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Área Plantada (ha)</Label><Input type="number" step="0.1" value={form.area_plantada} onChange={e => setForm(p => ({ ...p, area_plantada: e.target.value }))} /></div>
                <div><Label>Área Afetada (ha)</Label><Input type="number" step="0.1" value={form.area_afetada} onChange={e => setForm(p => ({ ...p, area_afetada: e.target.value }))} /></div>
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
                <div className="flex items-center gap-3 pt-6 col-span-2">
                  <input type="checkbox" id="seguro" checked={form.seguro_rural} onChange={e => setForm(p => ({ ...p, seguro_rural: e.target.checked }))} className="w-4 h-4 accent-emerald-600" />
                  <Label htmlFor="seguro" className="cursor-pointer">Possui seguro rural?</Label>
                </div>
                {form.seguro_rural && (
                  <>
                    <div><Label>Seguradora</Label><Input value={form.seguradora} onChange={e => setForm(p => ({ ...p, seguradora: e.target.value }))} /></div>
                    <div><Label>Apólice</Label><Input value={form.numero_apolice} onChange={e => setForm(p => ({ ...p, numero_apolice: e.target.value }))} /></div>
                  </>
                )}
                <div className="col-span-2"><Label>Notas</Label><Input value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} /></div>
              </div>
            </TabsContent>

            <TabsContent value="perdas" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Unidade</Label>
                  <Select value={form.unidade_produtividade} onValueChange={v => setForm(p => ({ ...p, unidade_produtividade: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div />
                <div><Label>Esperada ({form.unidade_produtividade})</Label><Input type="number" step="0.1" value={form.produtividade_esperada} onChange={e => setForm(p => ({ ...p, produtividade_esperada: e.target.value }))} onBlur={calcPerda} /></div>
                <div><Label>Obtida ({form.unidade_produtividade})</Label><Input type="number" step="0.1" value={form.produtividade_obtida} onChange={e => setForm(p => ({ ...p, produtividade_obtida: e.target.value }))} onBlur={calcPerda} /></div>
                <div className="col-span-2"><Label>Percentual Perda (%)</Label><Input type="number" step="0.1" max="100" value={form.percentual_perda} onChange={e => setForm(p => ({ ...p, percentual_perda: e.target.value }))} /></div>
              </div>
              {form.percentual_perda > 0 && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-sm font-semibold text-red-800 mb-2">Impacto: {form.percentual_perda}%</p>
                  <div className="h-3 bg-red-200 rounded-full">
                    <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(100, parseFloat(form.percentual_perda))}%`, backgroundColor: parseFloat(form.percentual_perda) > 70 ? '#dc2626' : parseFloat(form.percentual_perda) > 40 ? '#f97316' : '#f59e0b' }} />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="evidencias" className="space-y-3 mt-4">
              {form.evidencias?.map((e, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                  <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">{e.name}</a>
                    <Select value={e.tipo} onValueChange={v => setForm(p => ({ ...p, evidencias: p.evidencias.map((x, j) => j === i ? { ...x, tipo: v } : x) }))}>
                      <SelectTrigger className="h-6 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{EVIDENCIA_TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <button onClick={() => removeItem('evidencias', i)} className="p-1 hover:bg-gray-200 rounded"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <SupabaseFileUpload
                folder="safra-evidencias"
                accept="image/*,.pdf"
                label="Anexar evidências"
                onUploadDone={(fp, fn) => handleUpload(fp, fn, 'evidencias')}
              />
            </TabsContent>

            <TabsContent value="documentos" className="space-y-3 mt-4">
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
                  <button onClick={() => removeItem('documentos', i)} className="p-1 hover:bg-gray-200 rounded"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <SupabaseFileUpload
                folder="safra-documentos"
                accept=".pdf,.doc,.docx"
                label="Anexar documentos"
                onUploadDone={(fp, fn) => handleUpload(fp, fn, 'documentos')}
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