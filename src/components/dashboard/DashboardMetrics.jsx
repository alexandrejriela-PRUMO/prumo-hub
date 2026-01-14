import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileCheck, 
  FileText, 
  Scale, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export default function DashboardMetrics({ licenses, documents, processes, alerts }) {
  // Calculate metrics
  const validLicenses = licenses.filter(l => l.status === 'Vigente').length;
  const expiredLicenses = licenses.filter(l => l.status === 'Vencida').length;
  const activeLicenses = licenses.filter(l => l.status !== 'Vencida').length;
  
  const activeAlerts = alerts.filter(a => a.status === 'Ativo').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'Crítica' || a.severity === 'Alta').length;
  
  const activeProcesses = processes.filter(p => p.status === 'Em Andamento').length;
  const completedProcesses = processes.filter(p => p.status === 'Finalizado').length;

  const metrics = [
    {
      title: 'Licenças Vigentes',
      value: validLicenses,
      total: licenses.length,
      icon: FileCheck,
      color: 'emerald',
      trend: validLicenses > expiredLicenses ? 'up' : 'down',
      footer: `${expiredLicenses} vencida${expiredLicenses !== 1 ? 's' : ''}`
    },
    {
      title: 'Documentos',
      value: documents.length,
      total: null,
      icon: FileText,
      color: 'blue',
      trend: null,
      footer: 'CAR, CCIR e outros'
    },
    {
      title: 'Processos Ativos',
      value: activeProcesses,
      total: processes.length,
      icon: Scale,
      color: 'amber',
      trend: completedProcesses > activeProcesses ? 'up' : null,
      footer: `${completedProcesses} finalizados`
    },
    {
      title: 'Alertas Ambientais',
      value: activeAlerts,
      total: alerts.length,
      icon: AlertTriangle,
      color: criticalAlerts > 0 ? 'red' : 'emerald',
      trend: null,
      footer: `${criticalAlerts} crítico${criticalAlerts !== 1 ? 's' : ''}`
    }
  ];

  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-200'
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200'
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-200'
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200'
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const colors = colorClasses[metric.color];
        
        return (
          <Card key={index} className={`border-2 ${colors.border} hover:shadow-lg transition-shadow`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <h3 className="text-3xl font-bold text-gray-900">{metric.value}</h3>
                    {metric.total && (
                      <span className="text-sm text-gray-500">/ {metric.total}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {metric.trend === 'up' && (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    )}
                    {metric.trend === 'down' && (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <p className="text-xs text-gray-500">{metric.footer}</p>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${colors.bg}`}>
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}