import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, AlertTriangle, FileCheck, Scale, CreditCard, Building2, Save } from 'lucide-react';
import { toast } from 'sonner';

const dataSourceOptions = [
  { value: 'properties', label: 'Propriedades', icon: Building2 },
  { value: 'licenses', label: 'Licenças Ambientais', icon: FileCheck },
  { value: 'alerts', label: 'Alertas Ambientais', icon: AlertTriangle },
  { value: 'documents', label: 'Documentos', icon: FileText },
  { value: 'processes', label: 'Processos', icon: Scale },
  { value: 'invoices', label: 'Faturas', icon: CreditCard },
];

export default function ReportBuilder({ user, onGenerate, editingReport, onCancelEdit }) {
  const [config, setConfig] = useState(editingReport?.config || {
    title: '',
    dataSources: [],
    propertyId: '',
    dateRange: { start: '', end: '' },
    status: '',
    severity: ''
  });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [reportName, setReportName] = useState(editingReport?.report_name || '');
  const [reportDescription, setReportDescription] = useState(editingReport?.description || '');

  const queryClient = useQueryClient();

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ owner_email: user.email }),
    enabled: !!user?.email
  });

  const saveReportMutation = useMutation({
    mutationFn: (data) => {
      if (editingReport) {
        return base44.entities.SavedReport.update(editingReport.id, data);
      }
      return base44.entities.SavedReport.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedReports'] });
      toast.success(editingReport ? 'Relatório atualizado!' : 'Relatório salvo com sucesso!');
      setShowSaveDialog(false);
      setReportName('');
      setReportDescription('');
      if (onCancelEdit) onCancelEdit();
    }
  });

  const toggleDataSource = (source) => {
    setConfig({
      ...config,
      dataSources: config.dataSources.includes(source)
        ? config.dataSources.filter(s => s !== source)
        : [...config.dataSources, source]
    });
  };

  const handleGenerate = () => {
    if (config.dataSources.length === 0) {
      alert('Selecione ao menos uma fonte de dados');
      return;
    }
    onGenerate(config);
  };

  const handleSaveReport = () => {
    if (!reportName.trim()) {
      toast.error('Digite um nome para o relatório');
      return;
    }
    if (config.dataSources.length === 0) {
      toast.error('Selecione ao menos uma fonte de dados');
      return;
    }

    saveReportMutation.mutate({
      user_email: user.email,
      report_name: reportName.trim(),
      description: reportDescription.trim(),
      config: config,
      last_used: new Date().toISOString()
    });
  };

  return (
    <>
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {editingReport ? 'Editar Relatório Salvo' : 'Configurar Relatório'}
          </h2>
          {editingReport && (
            <button
              onClick={onCancelEdit}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Cancelar Edição
            </button>
          )}
        </div>
        <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Título do Relatório</label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            placeholder="Ex: Relatório Ambiental Mensal"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Fontes de Dados</label>
          <div className="grid md:grid-cols-2 gap-3">
            {dataSourceOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    config.dataSources.includes(option.value)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleDataSource(option.value)}
                >
                  <input
                    type="checkbox"
                    checked={config.dataSources.includes(option.value)}
                    onChange={() => toggleDataSource(option.value)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <Icon className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-sm">{option.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Filtrar por Propriedade</label>
            <select
              value={config.propertyId}
              onChange={(e) => setConfig({ ...config, propertyId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todas as propriedades</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.property_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              value={config.status}
              onChange={(e) => setConfig({ ...config, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos os status</option>
              <option value="Aberto">Aberto</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Resolvido">Resolvido</option>
              <option value="Vigente">Vigente</option>
              <option value="Vencida">Vencida</option>
              <option value="Pendente">Pendente</option>
              <option value="Pago">Pago</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data Inicial</label>
            <input
              type="date"
              value={config.dateRange.start}
              onChange={(e) => setConfig({
                ...config,
                dateRange: { ...config.dateRange, start: e.target.value }
              })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data Final</label>
            <input
              type="date"
              value={config.dateRange.end}
              onChange={(e) => setConfig({
                ...config,
                dateRange: { ...config.dateRange, end: e.target.value }
              })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {config.dataSources.includes('alerts') && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Gravidade (Alertas)</label>
            <select
              value={config.severity}
              onChange={(e) => setConfig({ ...config, severity: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todas as gravidades</option>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
              <option value="Crítica">Crítica</option>
            </select>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Gerar Relatório
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-6 py-3 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            {editingReport ? 'Atualizar' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>

    {showSaveDialog && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
          <h3 className="text-lg font-semibold">
            {editingReport ? 'Atualizar Relatório' : 'Salvar Relatório'}
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Relatório *</label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Ex: Relatório Mensal de Alertas"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Descreva o propósito deste relatório..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSaveDialog(false)}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveReport}
              disabled={saveReportMutation.isPending}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
            >
              {saveReportMutation.isPending ? 'Salvando...' : (editingReport ? 'Atualizar' : 'Salvar')}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}