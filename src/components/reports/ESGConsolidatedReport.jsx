import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileDown, Calendar, BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ESGConsolidatedReport({ userEmail, property }) {
  const [showDialog, setShowDialog] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState({
    protectedArea: true,
    carbonCredits: true,
    psaValue: true,
    resolvedAlerts: true,
    processes: true,
    easements: true
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const metrics = [
    { id: 'protectedArea', label: 'Área Protegida (PSA + Servidão)', icon: '🌳' },
    { id: 'carbonCredits', label: 'Créditos de Carbono Gerados', icon: '♻️' },
    { id: 'psaValue', label: 'Valor Total de PSA', icon: '💰' },
    { id: 'resolvedAlerts', label: 'Alertas Resolvidos', icon: '✅' },
    { id: 'processes', label: 'Processos Ambientais', icon: '⚖️' },
    { id: 'easements', label: 'Servidões Ambientais', icon: '🛡️' }
  };

  const toggleMetric = (metricId) => {
    setSelectedMetrics(prev => ({
      ...prev,
      [metricId]: !prev[metricId]
    }));
  };

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Selecione o período do relatório');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Data inicial não pode ser maior que data final');
      return;
    }

    setLoading(true);
    try {
      const [processes, alerts, credits, psaContracts, easements] = await Promise.all([
        base44.entities.Process.filter({ client_email: userEmail }, '-created_date'),
        base44.entities.EnvironmentalAlert.filter({ property_id: property?.id }, '-created_date'),
        base44.entities.CarbonCredit.filter({ property_id: property?.id }, '-created_date'),
        base44.entities.PSAContract.filter({ property_id: property?.id }, '-created_date'),
        base44.entities.EnvironmentalEasement.filter({ property_id: property?.id }, '-created_date')
      ]);

      const filterByDate = (items) => {
        return items.filter(item => {
          const date = new Date(item.created_date);
          return date >= new Date(startDate) && date <= new Date(endDate);
        });
      };

      const filteredProcesses = filterByDate(processes);
      const filteredAlerts = filterByDate(alerts);
      const filteredCredits = filterByDate(credits);
      const filteredPSA = filterByDate(psaContracts);
      const filteredEasements = filterByDate(easements);

      const report = {
        period: { start: startDate, end: endDate },
        propertyName: property?.property_name,
        generatedDate: new Date().toLocaleDateString('pt-BR'),
        metrics: {
          protectedArea: (filteredPSA.reduce((sum, p) => sum + (p.area_hectares || 0), 0) + 
                          filteredEasements.reduce((sum, e) => sum + (e.area_hectares || 0), 0)).toFixed(2),
          carbonCredits: filteredCredits.reduce((sum, c) => sum + (c.verified_credits || 0), 0).toFixed(2),
          psaValue: filteredPSA.reduce((sum, p) => sum + (p.total_contract_value || 0), 0),
          resolvedAlerts: filteredAlerts.filter(a => a.status === 'Resolvido').length,
          totalAlerts: filteredAlerts.length,
          processes: filteredProcesses.length,
          easements: filteredEasements.length,
          psaContracts: filteredPSA.length
        },
        details: {
          processes: filteredProcesses,
          alerts: filteredAlerts,
          credits: filteredCredits,
          psa: filteredPSA,
          easements: filteredEasements
        }
      };

      setReportData(report);
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      const element = document.getElementById('report-content');
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      pdf.save(`relatorio-esg-${reportData.propertyName}-${reportData.generatedDate}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <FileDown className="w-4 h-4 mr-2" />
        Gerar Relatório ESG
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerador de Relatório ESG Consolidado</DialogTitle>
          </DialogHeader>

          {!reportData ? (
            <div className="space-y-6">
              {/* Seleção de Período */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Período do Relatório
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data Inicial</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Data Final</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Seleção de Métricas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Métricas a Incluir
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {metrics.map(metric => (
                    <label
                      key={metric.id}
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedMetrics[metric.id]}
                        onCheckedChange={() => toggleMetric(metric.id)}
                      />
                      <span className="text-sm text-gray-700">
                        {metric.icon} {metric.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={generateReport}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    'Gerar Relatório'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview do Relatório */}
              <div
                id="report-content"
                className="bg-white p-8 space-y-6 border rounded-lg"
              >
                {/* Header */}
                <div className="text-center space-y-2 border-b pb-6">
                  <h2 className="text-3xl font-bold text-gray-900">Relatório ESG</h2>
                  <p className="text-gray-600">{reportData.propertyName}</p>
                  <p className="text-sm text-gray-500">
                    Período: {new Date(reportData.period.start).toLocaleDateString('pt-BR')} a {' '}
                    {new Date(reportData.period.end).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Métricas Selecionadas */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedMetrics.protectedArea && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-600">Área Protegida</p>
                      <p className="text-2xl font-bold text-green-700">{reportData.metrics.protectedArea}</p>
                      <p className="text-xs text-gray-500">hectares</p>
                    </div>
                  )}
                  {selectedMetrics.carbonCredits && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-600">Créditos de Carbono</p>
                      <p className="text-2xl font-bold text-blue-700">{reportData.metrics.carbonCredits}</p>
                      <p className="text-xs text-gray-500">tCO2e</p>
                    </div>
                  )}
                  {selectedMetrics.psaValue && (
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-sm text-emerald-600">Valor de PSA</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        R$ {(reportData.metrics.psaValue / 1000).toFixed(0)}k
                      </p>
                    </div>
                  )}
                  {selectedMetrics.resolvedAlerts && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-600">Alertas Resolvidos</p>
                      <p className="text-2xl font-bold text-purple-700">
                        {reportData.metrics.resolvedAlerts}/{reportData.metrics.totalAlerts}
                      </p>
                    </div>
                  )}
                  {selectedMetrics.processes && (
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-600">Processos Ambientais</p>
                      <p className="text-2xl font-bold text-orange-700">{reportData.metrics.processes}</p>
                    </div>
                  )}
                  {selectedMetrics.easements && (
                    <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                      <p className="text-sm text-teal-600">Servidões Ambientais</p>
                      <p className="text-2xl font-bold text-teal-700">{reportData.metrics.easements}</p>
                    </div>
                  )}
                </div>

                {/* Resumo */}
                <div className="space-y-2 text-sm text-gray-600 border-t pt-4">
                  <p>Contratos PSA Ativos: <strong>{reportData.metrics.psaContracts}</strong></p>
                  <p>Total de Alertas: <strong>{reportData.metrics.totalAlerts}</strong></p>
                  <p>Relatório Gerado: <strong>{reportData.generatedDate}</strong></p>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setReportData(null)}
                >
                  Voltar
                </Button>
                <Button
                  onClick={exportToPDF}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}