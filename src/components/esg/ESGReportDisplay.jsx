import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, FileText, TrendingUp, DollarSign, Leaf } from 'lucide-react';
import { toast } from 'sonner';

export default function ESGReportDisplay({ reportData, selectedMetrics }) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('esg-report-content');
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      pdf.save(`relatorio-esg-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-6 border border-emerald-200">
        <div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-2">Relatório ESG Personalizado</h2>
          <p className="text-gray-700">
            Gerado em {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Button
          onClick={exportToPDF}
          disabled={isExporting}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Exportando...' : 'Exportar PDF'}
        </Button>
      </div>

      {/* Conteúdo do Relatório */}
      <div id="esg-report-content" className="space-y-6 bg-white p-6 rounded-xl">
        {/* Resumo Executivo */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-700">Resumo Executivo</Badge>
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-700 font-medium">Pontuação ESG</p>
                    <p className="text-3xl font-bold text-emerald-900 mt-1">{reportData.esgScore || 0}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Impacto Ambiental</p>
                    <p className="text-3xl font-bold text-blue-900 mt-1">
                      {reportData.carbonReduction || 0} tCO2e
                    </p>
                  </div>
                  <Leaf className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-700 font-medium">Investimento Total</p>
                    <p className="text-3xl font-bold text-yellow-900 mt-1">
                      R$ {reportData.totalInvestment?.toLocaleString('pt-BR') || 0}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Empréstimos Verdes */}
        {selectedMetrics.greenLoans && reportData.greenLoans && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-700">Empréstimos Verdes</Badge>
            </h3>
            <Card>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.greenLoans.chartData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-sm text-gray-600">Total Solicitado</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        R$ {reportData.greenLoans.totalRequested?.toLocaleString('pt-BR') || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600">Total Aprovado</p>
                      <p className="text-2xl font-bold text-green-700">
                        R$ {reportData.greenLoans.totalApproved?.toLocaleString('pt-BR') || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-600">Taxa Média</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {reportData.greenLoans.averageRate || 0}% a.a.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Incentivos Fiscais */}
        {selectedMetrics.taxIncentives && reportData.taxIncentives && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-700">Incentivos Fiscais</Badge>
            </h3>
            <Card>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={reportData.taxIncentives.statusBreakdown || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {reportData.taxIncentives.statusBreakdown?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-gray-600">Benefício Estimado Anual</p>
                      <p className="text-2xl font-bold text-yellow-700">
                        R$ {reportData.taxIncentives.estimatedBenefit?.toLocaleString('pt-BR') || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm text-gray-600">Incentivos Ativos</p>
                      <p className="text-2xl font-bold text-orange-700">
                        {reportData.taxIncentives.activeCount || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-600">Em Análise</p>
                      <p className="text-2xl font-bold text-purple-700">
                        {reportData.taxIncentives.underAnalysisCount || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Certificações */}
        {selectedMetrics.certifications && reportData.certifications && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700">Certificações Sustentáveis</Badge>
            </h3>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {reportData.certifications.list?.map((cert, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{cert.type}</p>
                        <p className="text-sm text-gray-600">Status: {cert.status}</p>
                      </div>
                      <Badge className={
                        cert.status === 'Certificado' ? 'bg-green-100 text-green-700' :
                        cert.status === 'Em Auditoria' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {cert.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Impacto Ambiental */}
        {selectedMetrics.environmentalImpact && reportData.environmentalImpact && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700">Impacto Ambiental</Badge>
            </h3>
            <Card>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.environmentalImpact.timeline || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="carbon" stroke="#10b981" name="Carbono (tCO2e)" />
                    <Line type="monotone" dataKey="water" stroke="#3b82f6" name="Água (m³)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resumo Final */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conclusões e Recomendações</h3>
          <div className="space-y-3 text-gray-700">
            <p>
              Sua propriedade apresenta um perfil ESG em desenvolvimento, com iniciativas implementadas em pelo menos dois dos três pilares
              (Ambiental, Social, Governança).
            </p>
            <p>
              <strong>Recomendações:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Continuar investindo em práticas sustentáveis para melhorar a pontuação ESG</li>
              <li>Explorar novos programas de financiamento verde disponíveis</li>
              <li>Manter a regularidade das certificações obtidas</li>
              <li>Monitorar incentivos fiscais e cumprir seus requisitos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}