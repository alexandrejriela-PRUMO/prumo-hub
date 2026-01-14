import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';

export default function AlertsReportsFilters({ filters, onFilterChange, properties }) {
  const handleReset = () => {
    onFilterChange({
      alertType: 'all',
      severity: 'all',
      dateRange: { start: null, end: null },
      propertyId: 'all',
      minArea: 0
    });
  };

  const activeFilters = Object.values(filters).filter(v => 
    (typeof v === 'string' && v !== 'all') || 
    (typeof v === 'number' && v > 0) ||
    (typeof v === 'object' && (v.start || v.end))
  ).length;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Filters Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Alert Type */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Tipo de Alerta</label>
              <select
                value={filters.alertType}
                onChange={(e) => onFilterChange({ ...filters, alertType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="environmental">Ambientais</option>
                <option value="climate">Climáticos</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Gravidade</label>
              <select
                value={filters.severity}
                onChange={(e) => onFilterChange({ ...filters, severity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">Todas</option>
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica</option>
              </select>
            </div>

            {/* Property */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Propriedade</label>
              <select
                value={filters.propertyId}
                onChange={(e) => onFilterChange({ ...filters, propertyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="all">Todas</option>
                {properties.map(prop => (
                  <option key={prop.id} value={prop.id}>{prop.property_name}</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Data Inicial</label>
              <Input
                type="date"
                value={filters.dateRange.start || ''}
                onChange={(e) => onFilterChange({
                  ...filters,
                  dateRange: { ...filters.dateRange, start: e.target.value }
                })}
                className="text-sm"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Data Final</label>
              <Input
                type="date"
                value={filters.dateRange.end || ''}
                onChange={(e) => onFilterChange({
                  ...filters,
                  dateRange: { ...filters.dateRange, end: e.target.value }
                })}
                className="text-sm"
              />
            </div>
          </div>

          {/* Min Area */}
          <div className="lg:w-1/5">
            <label className="text-sm font-medium text-gray-700 block mb-2">Área Mínima (ha)</label>
            <Input
              type="number"
              min="0"
              value={filters.minArea}
              onChange={(e) => onFilterChange({ ...filters, minArea: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="text-sm"
            />
          </div>

          {/* Active Filters Display */}
          {activeFilters > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">{activeFilters} filtro(s) ativo(s)</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="text-xs text-emerald-600 hover:text-emerald-700"
              >
                <X className="w-3 h-3 mr-1" />
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}