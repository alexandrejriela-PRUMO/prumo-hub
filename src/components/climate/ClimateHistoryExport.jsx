import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar, 
  Download, 
  FileText, 
  Droplets, 
  Sun, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClimateHistoryExport({ climateRecord, propertyName }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const exportToCSV = () => {
    if (!climateRecord?.historical_records || climateRecord.historical_records.length === 0) {
      alert('Nenhum registro histórico disponível');
      return;
    }

    let records = climateRecord.historical_records;
    
    // Filtrar por data se especificado
    if (startDate && endDate) {
      records = records.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
      });
    }

    const headers = [
      'Data',
      'Temperatura Máxima (°C)',
      'Temperatura Mínima (°C)',
      'Precipitação (mm)',
      'Umidade Média (%)',
      'Eventos Climáticos'
    ].join(',');

    const rows = records.map(record => [
      format(parseISO(record.date), 'dd/MM/yyyy', { locale: ptBR }),
      record.temperature_max || '-',
      record.temperature_min || '-',
      record.precipitation || '0',
      record.humidity_avg || '-',
      (record.climate_events || []).join('; ')
    ].join(','));

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico_climatico_${propertyName}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    if (!climateRecord?.historical_records || climateRecord.historical_records.length === 0) {
      alert('Nenhum registro histórico disponível');
      return;
    }

    let records = climateRecord.historical_records;
    
    if (startDate && endDate) {
      records = records.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
      });
    }

    // Criar HTML para PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Histórico Climático - ${propertyName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
          .header { margin-bottom: 30px; }
          .info { background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1e40af; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
          tr:hover { background: #f9fafb; }
          .summary { margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 8px; }
          .event { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; margin: 2px; font-size: 12px; }
          .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Histórico Climático</h1>
          <p><strong>Propriedade:</strong> ${propertyName}</p>
          <p><strong>Local:</strong> ${climateRecord.location_name}</p>
          <p><strong>Período:</strong> ${startDate && endDate ? `${format(parseISO(startDate), 'dd/MM/yyyy')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}` : 'Todos os registros'}</p>
          <p><strong>Gerado em:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
        </div>

        <div class="info">
          <strong>💡 Finalidade:</strong> Este relatório pode ser utilizado para comprovação em seguros rurais, 
          análise de bancos para financiamentos agrícolas, e documentação de eventos climáticos para fins legais.
        </div>

        ${climateRecord.monthly_summary && climateRecord.monthly_summary.length > 0 ? `
          <div class="summary">
            <h3>📈 Resumo Mensal</h3>
            ${climateRecord.monthly_summary.slice(-6).map(month => `
              <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px;">
                <strong>${month.month}</strong><br>
                Precipitação Total: <strong>${month.total_precipitation || 0} mm</strong> | 
                Dias Secos: <strong>${month.dry_days || 0}</strong> | 
                Temp. Média: <strong>${month.avg_temperature || '-'} °C</strong>
                ${month.extreme_events && month.extreme_events.length > 0 ? `
                  <br><span style="color: #991b1b;">⚠️ ${month.extreme_events.length} evento(s) extremo(s)</span>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <h3>📅 Registros Diários</h3>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Temp. Máx/Mín (°C)</th>
              <th>Precipitação (mm)</th>
              <th>Umidade (%)</th>
              <th>Eventos</th>
            </tr>
          </thead>
          <tbody>
            ${records.slice(-90).reverse().map(record => `
              <tr>
                <td>${format(parseISO(record.date), 'dd/MM/yyyy', { locale: ptBR })}</td>
                <td>${record.temperature_max || '-'} / ${record.temperature_min || '-'}</td>
                <td>${record.precipitation || '0'}</td>
                <td>${record.humidity_avg || '-'}</td>
                <td>${(record.climate_events || []).map(e => `<span class="event">${e}</span>`).join(' ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Documento gerado automaticamente pelo sistema de Monitoramento Climático</p>
          <p>Este relatório contém dados meteorológicos históricos para fins de comprovação e análise</p>
        </div>
      </body>
      </html>
    `;

    // Criar blob e baixar
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico_climatico_${propertyName}_${format(new Date(), 'yyyy-MM-dd')}.html`;
    link.click();
    URL.revokeObjectURL(url);
    
    alert('Arquivo HTML gerado! Abra no navegador e use "Imprimir > Salvar como PDF" para gerar o PDF final.');
  };

  // Calcular estatísticas
  const calculateStats = () => {
    if (!climateRecord?.historical_records || climateRecord.historical_records.length === 0) {
      return null;
    }

    const records = climateRecord.historical_records;
    const totalPrecipitation = records.reduce((sum, r) => sum + (r.precipitation || 0), 0);
    const daysWithRain = records.filter(r => (r.precipitation || 0) > 0).length;
    const dryDays = records.length - daysWithRain;
    const avgTemp = records.reduce((sum, r) => sum + ((r.temperature_max || 0) + (r.temperature_min || 0)) / 2, 0) / records.length;
    const eventsCount = records.reduce((sum, r) => sum + (r.climate_events?.length || 0), 0);

    return {
      totalPrecipitation: totalPrecipitation.toFixed(1),
      daysWithRain,
      dryDays,
      avgTemp: avgTemp.toFixed(1),
      eventsCount,
      totalDays: records.length
    };
  };

  const stats = calculateStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Histórico Climático Exportável
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estatísticas Gerais */}
        {stats && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Droplets className="w-5 h-5" />
                <p className="text-sm font-medium">Precipitação Total</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.totalPrecipitation} mm</p>
              <p className="text-xs text-blue-700 mt-1">{stats.daysWithRain} dias com chuva</p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <Sun className="w-5 h-5" />
                <p className="text-sm font-medium">Dias Secos</p>
              </div>
              <p className="text-2xl font-bold text-amber-900">{stats.dryDays}</p>
              <p className="text-xs text-amber-700 mt-1">de {stats.totalDays} dias registrados</p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <p className="text-sm font-medium">Eventos Climáticos</p>
              </div>
              <p className="text-2xl font-bold text-red-900">{stats.eventsCount}</p>
              <p className="text-xs text-red-700 mt-1">eventos registrados</p>
            </div>
          </div>
        )}

        {/* Resumo Mensal */}
        {climateRecord?.monthly_summary && climateRecord.monthly_summary.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Resumo dos Últimos Meses
            </h4>
            <div className="space-y-2">
              {climateRecord.monthly_summary.slice(-6).reverse().map((month, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{month.month}</p>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span>💧 {month.total_precipitation || 0} mm</span>
                      <span>☀️ {month.dry_days || 0} dias secos</span>
                      <span>🌡️ {month.avg_temperature || '-'}°C</span>
                    </div>
                  </div>
                  {month.extreme_events && month.extreme_events.length > 0 && (
                    <Badge variant="destructive">{month.extreme_events.length} evento(s)</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Registros Diários Recentes */}
        {climateRecord?.historical_records && climateRecord.historical_records.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Últimos 30 Dias
            </h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {climateRecord.historical_records.slice(-30).reverse().map((record, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                  <div>
                    <p className="font-medium text-sm">{format(parseISO(record.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    <div className="flex gap-3 text-xs text-gray-600 mt-1">
                      <span>🌡️ {record.temperature_max || '-'}°/{record.temperature_min || '-'}°C</span>
                      <span>💧 {record.precipitation || 0} mm</span>
                      <span>💨 {record.humidity_avg || '-'}%</span>
                    </div>
                  </div>
                  {record.climate_events && record.climate_events.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {record.climate_events.map((event, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{event}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botões de Exportação */}
        <div className="pt-4 border-t">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-900">
              <strong>💡 Para que serve:</strong> Estes relatórios podem ser utilizados para:
            </p>
            <ul className="text-sm text-green-800 mt-2 ml-4 list-disc space-y-1">
              <li>Comprovação em seguros rurais (perda de safra, eventos climáticos)</li>
              <li>Análise de bancos para financiamentos e crédito agrícola</li>
              <li>Documentação para PROAGRO e programas governamentais</li>
              <li>Planejamento agrícola e estudos de viabilidade</li>
            </ul>
          </div>

          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Download className="w-4 h-4 mr-2" />
                Exportar Histórico
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exportar Histórico Climático</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Data Inicial (opcional)</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final (opcional)</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={exportToCSV} variant="outline" className="flex-1">
                    <FileText className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button onClick={exportToPDF} className="flex-1 bg-red-600 hover:bg-red-700">
                    <FileText className="w-4 h-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}