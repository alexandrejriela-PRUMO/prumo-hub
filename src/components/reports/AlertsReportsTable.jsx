import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function AlertsReportsTable({ alerts }) {
  const [sortConfig, setSortConfig] = useState({ key: 'alertDate', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  const sortedAlerts = React.useMemo(() => {
    const sorted = [...alerts];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [alerts, sortConfig]);

  const totalPages = Math.ceil(sortedAlerts.length / ITEMS_PER_PAGE);
  const paginatedAlerts = sortedAlerts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <div className="w-4 h-4" />;
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  const severityColor = (severity) => {
    const colors = {
      'Baixa': 'bg-blue-100 text-blue-800',
      'Média': 'bg-yellow-100 text-yellow-800',
      'Alta': 'bg-orange-100 text-orange-800',
      'Crítica': 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const statusColor = (status) => {
    const colors = {
      'Aberto': 'bg-yellow-100 text-yellow-800',
      'Em Análise': 'bg-blue-100 text-blue-800',
      'Resolvido': 'bg-green-100 text-green-800',
      'Ignorado': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum alerta encontrado com os filtros selecionados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhes dos Alertas ({sortedAlerts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('alertDate')}
                    className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                  >
                    Data
                    <SortIcon columnKey="alertDate" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('title')}
                    className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                  >
                    Título/Tipo
                    <SortIcon columnKey="title" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('severity')}
                    className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                  >
                    Gravidade
                    <SortIcon columnKey="severity" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Área (ha)</th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                  >
                    Status
                    <SortIcon columnKey="status" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {new Date(alert.alertDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {alert.title || alert.type || 'Sem título'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {alert.alertCategory === 'climate' ? '🌤️ Climático' : '🌍 Ambiental'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={severityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {(alert.affected_area_hectares || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusColor(alert.status || 'Aberto')}>
                      {alert.status || 'Aberto'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {alert.description || alert.message || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="text-sm text-gray-600">
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} de {sortedAlerts.length} alertas
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="min-w-10"
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}