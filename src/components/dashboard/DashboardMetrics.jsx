import React from 'react';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
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
          <Card 
            key={index} 
            className={`border-2 ${colors.border} hover:shadow-xl hover:border-emerald-300 transition-all duration-300 ease-out hover:-translate-y-1 cursor-default`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{metric.title}</p>
                  <div className="flex items-baseline gap-2 mt-3">
                    <h3 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"><AnimatedCounter value={metric.value} /></h3>
                    {metric.total && (
                      <span className="text-sm text-gray-400 font-medium">/ {metric.total}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {metric.trend === 'up' && (
                      <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                        <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs text-green-700 font-medium">Crescendo</span>
                      </div>
                    )}
                    {metric.trend === 'down' && (
                      <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-full">
                        <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                        <span className="text-xs text-red-700 font-medium">Atenção</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">{metric.footer}</p>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${colors.bg} group-hover:scale-110 transition-transform duration-300`}>
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