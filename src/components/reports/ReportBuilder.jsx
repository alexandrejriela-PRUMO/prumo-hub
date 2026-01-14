import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FileText, AlertTriangle, FileCheck, Scale, CreditCard, Building2 } from 'lucide-react';

const dataSourceOptions = [
  { value: 'properties', label: 'Propriedades', icon: Building2 },
  { value: 'licenses', label: 'Licenças Ambientais', icon: FileCheck },
  { value: 'alerts', label: 'Alertas Ambientais', icon: AlertTriangle },
  { value: 'documents', label: 'Documentos', icon: FileText },
  { value: 'processes', label: 'Processos', icon: Scale },
  { value: 'invoices', label: 'Faturas', icon: CreditCard },
];

export default function ReportBuilder({ user, onGenerate }) {
  const [config, setConfig] = useState({
    title: '',
    dataSources: [],
    propertyId: '',
    dateRange: { start: '', end: '' },
    status: '',
    severity: ''
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ owner_email: user.email }),
    enabled: !!user?.email
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

  return (
    <div className="bg-white rounded-xl border shadow-sm">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">Configurar Relatório</h2>
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

        <button
          onClick={handleGenerate}
          className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Gerar Relatório
        </button>
      </div>
    </div>
  );
}