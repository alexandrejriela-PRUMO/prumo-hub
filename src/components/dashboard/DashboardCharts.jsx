import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DashboardCharts({ licenses, processes, alerts }) {
  // License status data
  const licenseData = [
    { name: 'Vigentes', value: licenses.filter(l => l.status === 'Vigente').length, color: '#10b981' },
    { name: 'A Vencer', value: licenses.filter(l => l.status === 'A Vencer').length, color: '#f59e0b' },
    { name: 'Vencidas', value: licenses.filter(l => l.status === 'Vencida').length, color: '#ef4444' }
  ];

  // License types distribution
  const licenseTypes = licenses.reduce((acc, license) => {
    const type = license.license_type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const licenseTypeData = Object.entries(licenseTypes).map(([name, value]) => ({
    name,
    quantidade: value
  }));

  // Process status data
  const processData = [
    { name: 'Em Andamento', value: processes.filter(p => p.status === 'Em Andamento').length },
    { name: 'Suspenso', value: processes.filter(p => p.status === 'Suspenso').length },
    { name: 'Arquivado', value: processes.filter(p => p.status === 'Arquivado').length },
    { name: 'Finalizado', value: processes.filter(p => p.status === 'Finalizado').length }
  ];

  // Alert severity data
  const alertData = [
    { name: 'Crítica', value: alerts.filter(a => a.severity === 'Crítica').length, color: '#dc2626' },
    { name: 'Alta', value: alerts.filter(a => a.severity === 'Alta').length, color: '#f59e0b' },
    { name: 'Média', value: alerts.filter(a => a.severity === 'Média').length, color: '#eab308' },
    { name: 'Baixa', value: alerts.filter(a => a.severity === 'Baixa').length, color: '#10b981' }
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* License Status Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status das Licenças</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={licenseData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {licenseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* License Types Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tipos de Licenças</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={licenseTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Process Status Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status dos Processos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={processData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Alerts Severity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gravidade dos Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={alertData.filter(a => a.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {alertData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}