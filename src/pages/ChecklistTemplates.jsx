import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus, Edit2, Trash2, Copy, ChevronLeft, GripVertical,
  ClipboardList, Clock, Tag, AlignLeft, CheckCircle2,
  ArrowUp, ArrowDown, X, Save, Layers, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  'Licenciamento Ambiental',
  'PRAD',
  'Regularização Ambiental',
  'Monitoramento',
  'Georreferenciamento',
  'Consultoria Técnica',
  'Outro'
];

const CATEGORY_COLORS = {
  'Licenciamento Ambiental': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'PRAD': 'bg-amber-100 text-amber-800 border-amber-200',
  'Regularização Ambiental': 'bg-blue-100 text-blue-800 border-blue-200',
  'Monitoramento': 'bg-purple-100 text-purple-800 border-purple-200',
  'Georreferenciamento': 'bg-orange-100 text-orange-800 border-orange-200',
  'Consultoria Técnica': 'bg-slate-100 text-slate-800 border-slate-200',
  'Outro': 'bg-gray-100 text-gray-800 border-gray-200',
};

const PRIORITY_COLORS = {
  'Alta': 'bg-red-100 text-red-700 border-red-200',
  'Média': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Baixa': 'bg-green-100 text-green-700 border-green-200',
};

function StepCard({ step, index, total, onChange, onRemove, onMoveUp, onMoveDown }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex flex-col gap-0.5 text-gray-300">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {index + 1}
        </div>
        <input
          type="text"
          value={step.title}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChange({ ...step, title: e.target.value })}
          className="flex-1 font-semibold text-gray-800 bg-transparent border-none outline-none text-sm placeholder:text-gray-400"
          placeholder="Título da etapa..."
        />
        <div className="flex items-center gap-1 ml-auto">
          <select
            value={step.default_priority}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onChange({ ...step, default_priority: e.target.value })}
            className={cn('text-xs px-2 py-1 rounded-full border font-medium cursor-pointer bg-transparent', PRIORITY_COLORS[step.default_priority])}
          >
            <option value="Alta">Alta</option>
            <option value="Média">Média</option>
            <option value="Baixa">Baixa</option>
          </select>
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={index === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
            <ArrowUp className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={index === total - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
            <ArrowDown className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 font-medium mb-1 block flex items-center gap-1">
              <AlignLeft className="w-3 h-3" /> Descrição
            </label>
            <textarea
              value={step.description || ''}
              onChange={(e) => onChange({ ...step, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 h-16"
              placeholder="Descreva esta etapa..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block flex items-center gap-1">
              <Clock className="w-3 h-3" /> Dias estimados
            </label>
            <input
              type="number"
              min={1}
              value={step.estimated_days || ''}
              onChange={(e) => onChange({ ...step, estimated_days: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              placeholder="Ex: 7"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateEditor({ template, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    template_name: template?.template_name || '',
    description: template?.description || '',
    category: template?.category || 'Licenciamento Ambiental',
    steps: template?.steps || []
  });

  const handleAddStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          id: Date.now().toString(),
          title: '',
          description: '',
          order: prev.steps.length,
          default_priority: 'Média',
          estimated_days: 5
        }
      ]
    }));
  };

  const handleUpdateStep = (index, updated) => {
    const steps = [...formData.steps];
    steps[index] = updated;
    setFormData(prev => ({ ...prev, steps }));
  };

  const handleRemoveStep = (index) => {
    setFormData(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
  };

  const handleMoveStep = (index, direction) => {
    const steps = [...formData.steps];
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    [steps[index], steps[target]] = [steps[target], steps[index]];
    setFormData(prev => ({ ...prev, steps }));
  };

  const handleSubmit = () => {
    if (!formData.template_name.trim()) {
      toast.error('Nome do modelo é obrigatório');
      return;
    }
    onSave(formData);
  };

  const totalDays = formData.steps.reduce((sum, s) => sum + (s.estimated_days || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50/20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium">
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Voltar</span>
        </button>
        <h2 className="font-bold text-gray-800 text-base truncate">
          {template ? 'Editar Modelo' : 'Novo Modelo de Checklist'}
        </h2>
        <Button onClick={handleSubmit} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 gap-2 text-sm">
          <Save className="w-4 h-4" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Info básica */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Informações do Modelo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">Nome do Modelo *</label>
              <input
                type="text"
                value={formData.template_name}
                onChange={(e) => setFormData(prev => ({ ...prev, template_name: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-gray-50"
                placeholder="Ex: Licenciamento LP/LI/LO"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Categoria
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-gray-50"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-gray-50 h-20"
              placeholder="Descreva quando usar este modelo..."
            />
          </div>
        </div>

        {/* Etapas */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Etapas do Checklist</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {formData.steps.length} etapas · {totalDays} dias estimados no total
              </p>
            </div>
            <Button onClick={handleAddStep} size="sm" variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <Plus className="w-4 h-4" /> Adicionar Etapa
            </Button>
          </div>

          {formData.steps.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhuma etapa adicionada</p>
              <p className="text-gray-400 text-xs mt-1">Clique em "Adicionar Etapa" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.steps.map((step, index) => (
                <StepCard
                  key={step.id}
                  step={step}
                  index={index}
                  total={formData.steps.length}
                  onChange={(updated) => handleUpdateStep(index, updated)}
                  onRemove={() => handleRemoveStep(index)}
                  onMoveUp={() => handleMoveStep(index, -1)}
                  onMoveDown={() => handleMoveStep(index, 1)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChecklistTemplates() {
  const [user, setUser] = React.useState(null);
  const [view, setView] = useState('list'); // list | create | edit
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['checklistTemplates', user?.email],
    queryFn: () => base44.entities.ChecklistTemplate.filter({ consultor_email: user?.email }, '-created_date'),
    enabled: !!user?.email
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ChecklistTemplate.create({ ...data, consultor_email: user?.email }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] }); toast.success('Modelo criado!'); setView('list'); }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ChecklistTemplate.update(selectedTemplate.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] }); toast.success('Modelo atualizado!'); setView('list'); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChecklistTemplate.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] }); toast.success('Modelo removido'); }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (t) => {
      const { id, created_date, updated_date, ...rest } = t;
      return base44.entities.ChecklistTemplate.create({ ...rest, template_name: `${t.template_name} (Cópia)` });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] }); toast.success('Modelo duplicado!'); }
  });

  const handleSave = (data) => {
    if (view === 'edit') updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const filtered = templates.filter(t => {
    const matchSearch = !search || t.template_name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'Todas' || t.category === filterCategory;
    return matchSearch && matchCat;
  });

  if (view === 'create' || view === 'edit') {
    return (
      <TemplateEditor
        template={view === 'edit' ? selectedTemplate : null}
        onSave={handleSave}
        onCancel={() => setView('list')}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 bg-clip-text text-transparent">
            Modelos de Checklist
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Crie e reutilize templates para seus projetos</p>
        </div>
        <Button
          onClick={() => { setSelectedTemplate(null); setView('create'); }}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Modelo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar modelos..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Todas', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                filterCategory === cat
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {templates.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{templates.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total de Modelos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{templates.reduce((s, t) => s + (t.steps?.length || 0), 0)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Etapas Cadastradas</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{templates.reduce((s, t) => s + (t.usage_count || 0), 0)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total de Usos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-purple-700">{new Set(templates.map(t => t.category)).size}</p>
            <p className="text-xs text-gray-500 mt-0.5">Categorias</p>
          </div>
        </div>
      )}

      {/* Template Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <Layers className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">
            {templates.length === 0 ? 'Nenhum modelo criado ainda' : 'Nenhum resultado encontrado'}
          </h3>
          <p className="text-gray-400 text-sm mt-1 mb-4">
            {templates.length === 0 ? 'Crie seu primeiro modelo para reutilizar em checklists' : 'Tente ajustar os filtros'}
          </p>
          {templates.length === 0 && (
            <Button onClick={() => { setSelectedTemplate(null); setView('create'); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" /> Criar Primeiro Modelo
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(template => {
            const totalDays = template.steps?.reduce((s, st) => s + (st.estimated_days || 0), 0) || 0;
            return (
              <div
                key={template.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group"
              >
                {/* Card Header */}
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-5 h-5 text-emerald-600" />
                    </div>
                    <Badge className={cn('text-xs border', CATEGORY_COLORS[template.category] || CATEGORY_COLORS['Outro'])}>
                      {template.category}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-2 leading-snug">
                    {template.template_name}
                  </h3>
                  {template.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{template.description}</p>
                  )}

                  {/* Stats Row */}
                  <div className="flex gap-3 text-xs text-gray-500 mt-3">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {template.steps?.length || 0} etapas
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      {totalDays}d estimados
                    </span>
                    {(template.usage_count || 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-purple-500" />
                        Usado {template.usage_count}x
                      </span>
                    )}
                  </div>

                  {/* Steps preview */}
                  {template.steps?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap gap-1.5">
                        {template.steps.slice(0, 4).map((s, i) => (
                          <span key={s.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {i + 1}. {s.title?.length > 18 ? s.title.slice(0, 18) + '…' : s.title}
                          </span>
                        ))}
                        {template.steps.length > 4 && (
                          <span className="text-xs text-emerald-600 font-medium px-1">+{template.steps.length - 4} mais</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
                  <button
                    onClick={() => { setSelectedTemplate(template); setView('edit'); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => duplicateMutation.mutate(template)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplicar
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Excluir este modelo?')) deleteMutation.mutate(template.id); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}