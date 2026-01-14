import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, FileText, Table2, BarChart3, Calendar, Filter, Save } from 'lucide-react';
import AlertsReportsFilters from '@/components/reports/AlertsReportsFilters';
import AlertsReportsTable from '@/components/reports/AlertsReportsTable';
import SavedFiltersManager from '@/components/reports/SavedFiltersManager';
import { exportToCSV, exportToPDF } from '@/functions/alertsReportsExport';

const COLORS = ['#1B4332', '#40916C', '#52B788', '#D6CDA4', '#E63946'];

export default function AlertsReports() {
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [filters, setFilters] = useState({
    alertType: 'all',
    severity: 'all',
    dateRange: { start: null, end: null },
    propertyId: 'all',
    minArea: 0
  });

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);

  // Fetch environmental alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['environmentalAlerts', user?.email],
    queryFn: () => base44.entities.EnvironmentalAlert.filter(
      { responsible_email: user?.email },
      '-detection_date',
      500
    ),
    enabled: !!user?.email
  });

  // Fetch climate alerts
  const { data: climateMonitoring = [] } = useQuery({
    queryKey: ['climateMonitoring', user?.email],
    queryFn: async () => {
      const properties = await base44.entities.Property.filter({ owner_email: user?.email });
      const allMonitoring = [];
      for (const prop of properties) {
        const monitoring = await base44.entities.ClimateMonitoring.filter({ property_id: prop.id });
        allMonitoring.push(...monitoring);
      }
      return allMonitoring;
    },
    enabled: !!user?.email
  });

  // Fetch properties for filtering
  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  // Merge and filter alerts
  const filteredAlerts = useMemo(() => {
    let combined = [
      ...alerts.map(a => ({
        ...a,
        alertCategory: 'environmental',
        alertDate: a.detection_date
      })),
      ...climateMonitoring.flatMap(cm => 
        cm.alerts?.map(alert => ({
          ...alert,
          alertCategory: 'climate',
          propertyId: cm.property_id,
          location: cm.location_name,
          alertDate: alert.date
        })) || []
      )
    ];

    // Apply filters
    if (filters.alertType !== 'all') {
      combined = combined.filter(a => {
        if (filters.alertType === 'environmental') return a.alertCategory === 'environmental';
        if (filters.alertType === 'climate') return a.alertCategory === 'climate';
        return true;
      });
    }

    if (filters.severity !== 'all') {
      combined = combined.filter(a => a.severity === filters.severity);
    }

    if (filters.propertyId !== 'all') {
      combined = combined.filter(a => a.property_id === filters.propertyId || a.propertyId === filters.propertyId);
    }

    if (filters.dateRange.start) {
      combined = combined.filter(a => new Date(a.alertDate) >= new Date(filters.dateRange.start));
    }

    if (filters.dateRange.end) {
      combined = combined.filter(a => new Date(a.alertDate) <= new Date(filters.dateRange.end));
    }

    if (filters.minArea > 0) {
      combined = combined.filter(a => (a.affected_area_hectares || 0) >= filters.minArea);
    }

    return combined;
  }, [alerts, climateMonitoring, filters]);

  // Chart data
  const severityChart = useMemo(() => {
    const counts = { Baixa: 0, Média: 0, Alta: 0, Crítica: 0 };
    filteredAlerts.forEach(a => {
      counts[a.severity] = (counts[a.severity] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filteredAlerts]);

  const typeChart = useMemo(() => {
    const counts = {};
    filteredAlerts.forEach(a => {
      const type = a.alertCategory === 'climate' ? a.type : a.alert_type;
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredAlerts]);

  const timelineChart = useMemo(() => {
    const byMonth = {};
    filteredAlerts.forEach(a => {
      const date = new Date(a.alertDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    return Object.entries(byMonth)
      .sort()
      .slice(-12)
      .map(([month, count]) => ({ month, count }));
  }, [filteredAlerts]);

  const handleExportCSV = () => {
    exportToCSV(filteredAlerts, 'alertas-relatorio');
  };

  const handleExportPDF = () => {
    exportToPDF(filteredAlerts, severityChart, typeChart, 'alertas-relatorio');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-emerald-600" />
          Relatórios de Alertas
        </h1>
        <p className="text-gray-600">Analise e exporte dados sobre alertas ambientais e climáticos</p>
      </div>

      {/* Filters */}
      <AlertsReportsFilters
        filters={filters}
        onFilterChange={setFilters}
        properties={properties}
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-2">Total de Alertas</p>
              <p className="text-3xl font-bold text-emerald-600">{filteredAlerts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-2">Críticos</p>
              <p className="text-3xl font-bold text-red-600">
                {filteredAlerts.filter(a => a.severity === 'Crítica').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-2">Área Total (ha)</p>
              <p className="text-3xl font-bold text-blue-600">
                {filteredAlerts.reduce((sum, a) => sum + (a.affected_area_hectares || 0), 0).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-2">Em Aberto</p>
              <p className="text-3xl font-bold text-yellow-600">
                {filteredAlerts.filter(a => a.status === 'Aberto').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={viewMode === 'table' ? 'default' : 'outline'}
          onClick={() => setViewMode('table')}
          className="gap-2"
        >
          <Table2 className="w-4 h-4" />
          Tabela
        </Button>
        <Button
          variant={viewMode === 'charts' ? 'default' : 'outline'}
          onClick={() => setViewMode('charts')}
          className="gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          Gráficos
        </Button>
        <div className="flex-1" />
        <Button
          onClick={() => setShowSavedFilters(true)}
          variant="outline"
          className="gap-2"
        >
          Filtros Salvos
        </Button>
        <Button onClick={handleExportCSV} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          CSV
        </Button>
        <Button onClick={handleExportPDF} variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          PDF
        </Button>
      </div>

      {/* Saved Filters Manager */}
      <SavedFiltersManager
        user={user}
        currentFilters={filters}
        onLoadFilter={setFilters}
        isOpen={showSavedFilters}
        onClose={() => setShowSavedFilters(false)}
      />

      {/* Content */}
      {viewMode === 'table' ? (
        <AlertsReportsTable alerts={filteredAlerts} />
      ) : (
        <div className="space-y-6">
          {/* Severity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Gravidade</CardTitle>
            </CardHeader>
            <CardContent>
              {severityChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={severityChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1B4332" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-8">Sem dados para este período</p>
              )}
            </CardContent>
          </Card>

          {/* Type Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Alertas por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              {typeChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-8">Sem dados para este período</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Linha do Tempo (Últimos 12 Meses)</CardTitle>
            </CardHeader>
            <CardContent>
              {timelineChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timelineChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#1B4332"
                      strokeWidth={2}
                      dot={{ fill: '#1B4332' }}
                      name="Alertas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-8">Sem dados para este período</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}