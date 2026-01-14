import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Shield, BarChart3, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function EasementReports({ easements, properties }) {
  // Summary metrics
  const metrics = {
    totalArea: easements.reduce((sum, e) => sum + (e.area_hectares || 0), 0),
    permanentArea: easements.filter(e => e.easement_type === 'Permanente')
      .reduce((sum, e) => sum + (e.area_hectares || 0), 0),
    temporaryArea: easements.filter(e => e.easement_type === 'Temporária')
      .reduce((sum, e) => sum + (e.area_hectares || 0), 0),
    totalCompensation: easements.reduce((sum, e) => 
      sum + (e.compensation?.compensation_value || 0), 0
    ),
    totalPaid: easements.reduce((sum, e) => 
      sum + (e.compensation?.total_paid || 0), 0
    ),
    totalCarbon: easements.reduce((sum, e) => 
      sum + (e.environmental_indicators?.carbon_stock || 0), 0
    ),
    byVegetation: {}
  };

  // Group by vegetation type
  easements.forEach(e => {
    if (!metrics.byVegetation[e.vegetation_type]) {
      metrics.byVegetation[e.vegetation_type] = { count: 0, area: 0 };
    }
    metrics.byVegetation[e.vegetation_type].count++;
    metrics.byVegetation[e.vegetation_type].area += e.area_hectares || 0;
  });

  // Export summary report
  const exportSummaryCSV = () => {
    if (easements.length === 0) {
      toast.error('Nenhuma servidão para exportar');
      return;
    }

    const headers = ['Servidão', 'Propriedade', 'Tipo', 'Área (ha)', 'Vegetação', 'Status', 'Data Início', 'Compensação (R$)'];
    const rows = easements.map(e => {
      const property = properties.find(p => p.id === e.property_id);
      return [
        e.easement_name,
        property?.property_name || 'N/A',
        e.easement_type,
        (e.area_hectares || 0).toFixed(2),
        e.vegetation_type,
        e.status,
        e.start_date ? format(new Date(e.start_date), 'dd/MM/yyyy') : 'N/A',
        (e.compensation?.compensation_value || 0).toFixed(2)
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `servidoes_ambientais_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Relatório exportado!');
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-600" />
                Resumo de Servidões Ambientais
              </CardTitle>
              <CardDescription>Estatísticas gerais e distribuição</CardDescription>
            </div>
            <Button 
              onClick={exportSummaryCSV} 
              variant="outline" 
              size="sm"
              disabled={easements.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Área Total Protegida</p>
              <p className="text-3xl font-bold text-green-600">{metrics.totalArea.toFixed(2)}</p>
              <p className="text-xs text-gray-500">hectares</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Servidões Permanentes</p>
              <p className="text-3xl font-bold text-blue-600">{metrics.permanentArea.toFixed(2)}</p>
              <p className="text-xs text-gray-500">hectares</p>
            </div>

            <div className="bg-emerald-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Compensação Total</p>
              <p className="text-2xl font-bold text-emerald-600">
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(metrics.totalCompensation)}
              </p>
            </div>

            <div className="bg-teal-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Carbono Protegido</p>
              <p className="text-3xl font-bold text-teal-600">{metrics.totalCarbon.toFixed(2)}</p>
              <p className="text-xs text-gray-500">tCO2e</p>
            </div>
          </div>

          {/* Distribution by Vegetation Type */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Distribuição por Tipo de Vegetação</h4>
            <div className="space-y-2">
              {Object.entries(metrics.byVegetation).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{type}</p>
                      <p className="text-sm text-gray-600">{data.count} servidão(ões)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{data.area.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">hectares</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Type Distribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">Permanentes</h4>
                <Badge className="bg-blue-100 text-blue-800">
                  {easements.filter(e => e.easement_type === 'Permanente').length}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-blue-600">{metrics.permanentArea.toFixed(2)} ha</p>
              <p className="text-sm text-gray-600 mt-1">
                {metrics.totalArea > 0 
                  ? `${(metrics.permanentArea / metrics.totalArea * 100).toFixed(1)}% do total`
                  : '0% do total'
                }
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">Temporárias</h4>
                <Badge className="bg-orange-100 text-orange-800">
                  {easements.filter(e => e.easement_type === 'Temporária').length}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-orange-600">{metrics.temporaryArea.toFixed(2)} ha</p>
              <p className="text-sm text-gray-600 mt-1">
                {metrics.totalArea > 0 
                  ? `${(metrics.temporaryArea / metrics.totalArea * 100).toFixed(1)}% do total`
                  : '0% do total'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Report */}
      {metrics.totalCompensation > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Compensação Financeira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalCompensation)}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Já Recebido</p>
                <p className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalPaid)}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">A Receber</p>
                <p className="text-2xl font-bold text-orange-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    metrics.totalCompensation - metrics.totalPaid
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}