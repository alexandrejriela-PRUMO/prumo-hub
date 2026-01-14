import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, FileText, AlertTriangle, FileCheck, Scale, CreditCard, Building2 } from 'lucide-react';

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
    <Card>
      <CardHeader>
        <CardTitle>Configurar Relatório</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Título do Relatório</Label>
          <Input
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            placeholder="Ex: Relatório Ambiental Mensal"
          />
        </div>

        <div className="space-y-3">
          <Label>Fontes de Dados</Label>
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
                  <Checkbox
                    checked={config.dataSources.includes(option.value)}
                    onCheckedChange={() => toggleDataSource(option.value)}
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
            <Label>Filtrar por Propriedade</Label>
            <Select
              value={config.propertyId}
              onValueChange={(v) => setConfig({ ...config, propertyId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as propriedades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todas as propriedades</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.property_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={config.status}
              onValueChange={(v) => setConfig({ ...config, status: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todos os status</SelectItem>
                <SelectItem value="Aberto">Aberto</SelectItem>
                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                <SelectItem value="Resolvido">Resolvido</SelectItem>
                <SelectItem value="Vigente">Vigente</SelectItem>
                <SelectItem value="Vencida">Vencida</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data Inicial</Label>
            <Input
              type="date"
              value={config.dateRange.start}
              onChange={(e) => setConfig({
                ...config,
                dateRange: { ...config.dateRange, start: e.target.value }
              })}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Final</Label>
            <Input
              type="date"
              value={config.dateRange.end}
              onChange={(e) => setConfig({
                ...config,
                dateRange: { ...config.dateRange, end: e.target.value }
              })}
            />
          </div>
        </div>

        {config.dataSources.includes('alerts') && (
          <div className="space-y-2">
            <Label>Gravidade (Alertas)</Label>
            <Select
              value={config.severity}
              onValueChange={(v) => setConfig({ ...config, severity: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as gravidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todas as gravidades</SelectItem>
                <SelectItem value="Baixa">Baixa</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Crítica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          size="lg"
        >
          <FileText className="w-4 h-4 mr-2" />
          Gerar Relatório
        </Button>
      </CardContent>
    </Card>
  );
}