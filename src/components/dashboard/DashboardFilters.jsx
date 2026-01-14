import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardFilters({ filters, onFiltersChange, onReset }) {
  const handleDateChange = (field, date) => {
    onFiltersChange({ ...filters, [field]: date });
  };

  return (
    <Card className="border-2 border-emerald-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-900">Filtros Avançados</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="ml-auto text-gray-600 hover:text-emerald-600"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Period Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Período</label>
            <Select value={filters.period} onValueChange={(value) => onFiltersChange({ ...filters, period: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="90days">Últimos 90 dias</SelectItem>
                <SelectItem value="year">Último ano</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* License Status Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Status Licenças</label>
            <Select value={filters.licenseStatus} onValueChange={(value) => onFiltersChange({ ...filters, licenseStatus: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Vigente">Vigentes</SelectItem>
                <SelectItem value="A Vencer">A Vencer</SelectItem>
                <SelectItem value="Vencida">Vencidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Alert Severity Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Gravidade Alertas</label>
            <Select value={filters.alertSeverity} onValueChange={(value) => onFiltersChange({ ...filters, alertSeverity: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Crítica">Crítica</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Process Status Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Status Processos</label>
            <Select value={filters.processStatus} onValueChange={(value) => onFiltersChange({ ...filters, processStatus: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                <SelectItem value="Suspenso">Suspenso</SelectItem>
                <SelectItem value="Arquivado">Arquivado</SelectItem>
                <SelectItem value="Finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range (if custom period selected) */}
          {filters.period === 'custom' && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Data Inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? format(filters.startDate, 'PPP', { locale: ptBR }) : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.startDate}
                      onSelect={(date) => handleDateChange('startDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Data Final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? format(filters.endDate, 'PPP', { locale: ptBR }) : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.endDate}
                      onSelect={(date) => handleDateChange('endDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}