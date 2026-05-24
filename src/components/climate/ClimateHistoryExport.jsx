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
  MessageSquare,
  Filter
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import DayObservationEditor from './DayObservationEditor';

const DIVERGENCE_LABELS = {
  geada_nao_registrada: 'Geada não registrada pela estação',
  chuva_intensa_local: 'Chuva intensa localizada',
  seca_local: 'Seca localizada (sem chuva na área)',
  granizo: 'Granizo na área',
  vento_forte_local: 'Vento forte localizado',
  enchente: 'Enchente / alagamento',
  dados_divergem_estacao: 'Dados divergem da estação meteorológica mais próxima',
  outro: 'Outro evento específico da área',
};

export default function ClimateHistoryExport({ climateRecord, propertyName }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);

  const hasRecords = !!(climateRecord?.historical_records && climateRecord.historical_records.length > 0);

  // Retorna precipitação efetiva (corrigida se disponível) e eventos efetivos
  const effectivePrecip = (r) => r.corrected_precipitation !== undefined ? r.corrected_precipitation : (r.precipitation ?? 0);
  const effectiveEvents = (r) => {
    if (r.corrected_events) {
      return r.corrected_events.split(',').map(e => e.trim()).filter(Boolean);
    }
    return r.climate_events || [];
  };

  const PERIOD_OPTIONS = [
    { label: '7 dias', value: 7 },
    { label: '30 dias', value: 30 },
    { label: '60 dias', value: 60 },
    { label: '90 dias', value: 90 },
    { label: '120 dias', value: 120 },
    { label: '180 dias', value: 180 },
    { label: '240 dias', value: 240 },
    { label: '365 dias', value: 365 },
  ];

  // Registros filtrados pelo período selecionado (para stats + lista)
  const allRecords = climateRecord?.historical_records || [];
  const periodRecords = allRecords.slice(-periodDays).reverse();

  // Salvar observação de um dia no banco
  const handleSaveObservation = async (date, { observation, divergence_type, divergence_detail, corrected_precipitation, corrected_events }) => {
    if (!climateRecord?.id) return;
    setSaving(true);
    try {
      const updatedRecords = (climateRecord.historical_records || []).map(r => {
        if (r.date === date) {
          const updated = { ...r, observation, divergence_type, divergence_detail, corrected_events };
          if (corrected_precipitation !== undefined) {
            updated.corrected_precipitation = corrected_precipitation;
          } else {
            delete updated.corrected_precipitation;
          }
          return updated;
        }
        return r;
      });
      await base44.entities.ClimateMonitoring.update(climateRecord.id, {
        historical_records: updatedRecords
      });
      toast.success('Observação salva!');
      // Forçar re-render local sem refetch pesado: mutar in-place
      climateRecord.historical_records = updatedRecords;
    } catch (e) {
      toast.error('Erro ao salvar observação');
    } finally {
      setSaving(false);
    }
  };

  const getFilteredRecords = () => {
    let records = climateRecord?.historical_records || [];
    if (startDate && endDate) {
      records = records.filter(r => {
        const d = new Date(r.date);
        return d >= new Date(startDate) && d <= new Date(endDate);
      });
    }
    return records;
  };

  const exportToCSV = () => {
    if (!hasRecords) return;
    const records = getFilteredRecords();

    const headers = [
      'Data', 'Temp. Máx (°C)', 'Temp. Mín (°C)', 'Precipitação Efetiva (mm)', 'Precip. Original API (mm)',
      'Umidade Média (%)', 'Vento Máx (km/h)', 'Eventos Climáticos',
      'Observação do Campo', 'Tipo de Divergência', 'Detalhe da Divergência'
    ].join(';');

    const rows = records.map(r => [
      format(parseISO(r.date), 'dd/MM/yyyy', { locale: ptBR }),
      r.temperature_max ?? '-',
      r.temperature_min ?? '-',
      effectivePrecip(r),
      r.corrected_precipitation !== undefined ? `(API: ${r.precipitation ?? 0})` : '',
      r.humidity_avg ?? '-',
      r.wind_speed_max ?? '-',
      effectiveEvents(r).join(' | '),
      (r.observation || '').replace(/;/g, ','),
      r.divergence_type ? (DIVERGENCE_LABELS[r.divergence_type] || r.divergence_type) : '',
      (r.divergence_detail || '').replace(/;/g, ',')
    ].join(';'));

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico_climatico_${propertyName}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!hasRecords) return;
    const records = getFilteredRecords().slice(-90).reverse();

    const annotatedCount = records.filter(r => r.observation || r.divergence_type).length;
    const divergentCount = records.filter(r => r.divergence_type).length;

    const rowsHtml = records.map(r => {
      const hasDivergence = !!r.divergence_type;
      const hasObs = !!r.observation;
      const hasCorrectedPrecip = r.corrected_precipitation !== undefined;
      const hasCorrectedEvents = !!r.corrected_events;
      const rowStyle = hasDivergence ? 'background:#fff7ed;' : (hasObs || hasCorrectedPrecip || hasCorrectedEvents ? 'background:#fefce8;' : '');
      const precipDisplay = hasCorrectedPrecip
        ? `<strong style="color:#1d4ed8;">${r.corrected_precipitation} mm</strong> <span style="color:#9ca3af;text-decoration:line-through;font-size:10px;">${r.precipitation ?? 0}</span>`
        : `${r.precipitation ?? '0'}`;
      
      return `
        <tr style="${rowStyle}">
          <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb; white-space:nowrap;">
            ${format(parseISO(r.date), 'dd/MM/yyyy', { locale: ptBR })}
          </td>
          <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb; text-align:center;">
            ${r.temperature_max ?? '-'} / ${r.temperature_min ?? '-'}
          </td>
          <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb; text-align:center;">
            ${precipDisplay}
          </td>
          <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb; text-align:center;">
            ${r.humidity_avg ?? '-'}
          </td>
          <td style="padding:8px 10px; border-bottom:1px solid #e5e7eb;">
            ${effectiveEvents(r).map(e => `<span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;font-size:11px;margin-right:3px;">${e}</span>`).join('')}
            ${hasCorrectedPrecip ? `<div style="margin-top:5px;color:#1d4ed8;font-size:11px;"><strong>💧 Precipitação corrigida:</strong> ${r.corrected_precipitation} mm (API registrou ${r.precipitation ?? 0} mm)</div>` : ''}
            ${hasObs ? `<div style="margin-top:5px;color:#78350f;font-size:11px;"><strong>📝 Obs:</strong> ${r.observation}</div>` : ''}
            ${hasDivergence ? `
              <div style="margin-top:5px;background:#fff7ed;border:1px solid #fed7aa;border-radius:4px;padding:4px 8px;font-size:11px;">
                <strong style="color:#c2410c;">⚠️ Divergência:</strong> <span style="color:#9a3412;">${DIVERGENCE_LABELS[r.divergence_type] || r.divergence_type}</span>
                ${r.divergence_detail ? `<br><span style="color:#7c2d12;">→ ${r.divergence_detail}</span>` : ''}
              </div>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    const periodo = startDate && endDate
      ? `${format(parseISO(startDate), 'dd/MM/yyyy')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}`
      : 'Todos os registros disponíveis';

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Histórico Climático — ${propertyName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #111827; font-size: 13px; }
    h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; font-size: 22px; }
    h2 { color: #374151; font-size: 16px; margin-top: 30px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
    .header-info { display: flex; gap: 40px; flex-wrap: wrap; margin: 20px 0; }
    .info-block { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 10px 16px; border-radius: 4px; }
    .purpose-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .purpose-box ul { margin: 8px 0 0 20px; line-height: 1.8; }
    .disclaimer { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px 16px; margin: 16px 0; }
    .disclaimer strong { color: #c2410c; }
    .stats-grid { display: flex; gap: 20px; flex-wrap: wrap; margin: 20px 0; }
    .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 20px; min-width: 150px; }
    .stat-number { font-size: 26px; font-weight: bold; color: #1e40af; }
    .stat-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    thead tr { background: #1e40af; color: white; }
    th { padding: 10px; text-align: left; font-size: 12px; }
    td { vertical-align: top; }
    tr:hover td { background: #f9fafb; }
    .legend { display: flex; gap: 20px; margin: 12px 0; font-size: 11px; }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-dot { width: 14px; height: 14px; border-radius: 3px; }
    .footer { margin-top: 50px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; color: #6b7280; font-size: 11px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>

  <h1>📊 Histórico Climático — Comprovação Técnica</h1>

  <div class="header-info">
    <div class="info-block"><strong>Propriedade:</strong><br>${propertyName}</div>
    <div class="info-block"><strong>Local monitorado:</strong><br>${climateRecord.location_name || '-'}</div>
    <div class="info-block"><strong>Período:</strong><br>${periodo}</div>
    <div class="info-block"><strong>Gerado em:</strong><br>${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
  </div>

  <div class="purpose-box">
    <strong>💡 Finalidade deste documento:</strong>
    <ul>
      <li>Comprovação para seguros rurais (perda de safra, eventos climáticos)</li>
      <li>Documentação para PROAGRO e programas governamentais</li>
      <li>Análise de crédito rural e financiamentos agrícolas</li>
      <li>Registro técnico de eventos para fins judiciais e administrativos</li>
    </ul>
  </div>

  ${(annotatedCount > 0 || divergentCount > 0) ? `
  <div class="disclaimer">
    <strong>⚠️ Nota sobre divergências e observações de campo:</strong><br>
    Este relatório inclui <strong>${annotatedCount} dia(s) com observações de campo</strong> e 
    <strong>${divergentCount} dia(s) com divergências registradas</strong> em relação aos dados de estações 
    meteorológicas regionais. Dados de estações são representativos de uma área mais ampla — eventos 
    localizados como granizo, chuvas intensas pontuais ou secas em microclimas podem divergir dos valores 
    tabelares. As anotações abaixo representam a observação técnica do responsável na área.
  </div>
  ` : ''}

  <h2>📈 Resumo Estatístico</h2>
  <div class="stats-grid">
  <div class="stat-box"><div class="stat-number">${records.length}</div><div class="stat-label">Dias com registros</div></div>
  <div class="stat-box"><div class="stat-number">${records.reduce((s, r) => s + effectivePrecip(r), 0).toFixed(1)} mm</div><div class="stat-label">Precipitação total (efetiva)</div></div>
  <div class="stat-box"><div class="stat-number">${records.filter(r => effectivePrecip(r) > 0).length}</div><div class="stat-label">Dias com chuva</div></div>
  <div class="stat-box"><div class="stat-number">${annotatedCount}</div><div class="stat-label">Dias c/ observação</div></div>
  <div class="stat-box"><div class="stat-number">${divergentCount}</div><div class="stat-label">Divergências registradas</div></div>
  </div>

  <h2>📅 Registros Diários</h2>

  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#fff7ed;border:1px solid #fed7aa;"></div> Linha com divergência registrada</div>
    <div class="legend-item"><div class="legend-dot" style="background:#fefce8;border:1px solid #fde68a;"></div> Linha com observação de campo</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Temp. Máx/Mín (°C)</th>
        <th>Precip. (mm)</th>
        <th>Umidade (%)</th>
        <th>Eventos / Observações / Divergências</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <p>Documento gerado pelo sistema de Monitoramento Climático — PRUMO Hub</p>
    <p>Fonte dos dados: Open-Meteo / ERA5 (dados regionais) + observações de campo registradas pelo responsável técnico</p>
    <p>Este relatório contém dados meteorológicos históricos para fins de comprovação técnica e análise</p>
  </div>

</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico_climatico_${propertyName}_${format(new Date(), 'yyyy-MM-dd')}.html`;
    link.click();
    URL.revokeObjectURL(url);
    setExportDialogOpen(false);
  };

  // Estatísticas baseadas no período selecionado, usando valores corrigidos quando disponíveis
  const totalPrecip = periodRecords.reduce((s, r) => s + effectivePrecip(r), 0);
  const daysWithRain = periodRecords.filter(r => effectivePrecip(r) > 0).length;
  const annotatedTotal = allRecords.filter(r => r.observation || r.divergence_type || r.corrected_precipitation !== undefined || r.corrected_events).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Histórico Climático Exportável
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Filtro de Período */}
        {hasRecords && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-600 font-medium">Período:</span>
            <div className="flex gap-1.5 flex-wrap">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPeriodDays(opt.value)}
                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                    periodDays === opt.value
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400 hover:text-emerald-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Estatísticas */}
        {hasRecords && (
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <Droplets className="w-4 h-4" />
                <p className="text-xs font-medium">Precipitação Total</p>
              </div>
              <p className="text-xl font-bold text-blue-900">{totalPrecip.toFixed(1)} mm</p>
              <p className="text-xs text-blue-700 mt-1">{daysWithRain} dias com chuva</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 mb-1">
                <Sun className="w-4 h-4" />
                <p className="text-xs font-medium">Dias Secos</p>
              </div>
              <p className="text-xl font-bold text-amber-900">{periodRecords.length - daysWithRain}</p>
              <p className="text-xs text-amber-700 mt-1">de {periodRecords.length} dias</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-xs font-medium">Eventos Climáticos</p>
              </div>
              <p className="text-xl font-bold text-red-900">
                {periodRecords.reduce((s, r) => s + effectiveEvents(r).length, 0)}
              </p>
              <p className="text-xs text-red-700 mt-1">registros automáticos</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700 mb-1">
                <MessageSquare className="w-4 h-4" />
                <p className="text-xs font-medium">Obs. de Campo</p>
              </div>
              <p className="text-xl font-bold text-orange-900">{annotatedTotal}</p>
              <p className="text-xs text-orange-700 mt-1">dias com anotação</p>
            </div>
          </div>
        )}

        {/* Registros Diários com editor inline */}
        {hasRecords && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Últimos {periodDays} Dias
              </h4>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Clique em "Anotar" para adicionar observações ao PDF
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {periodRecords.map((record, idx) => {
                const hasDivergence = !!record.divergence_type;
                const hasObs = !!record.observation;
                return (
                  <div
                    key={idx}
                    className={`p-3 border rounded-lg transition-shadow ${
                      hasDivergence
                        ? 'bg-orange-50 border-orange-200'
                        : hasObs
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-white border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="font-medium text-sm">{format(parseISO(record.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                          <div className="flex gap-2 text-xs text-gray-600 flex-wrap">
                            <span>🌡️ {record.temperature_max ?? '-'}°/{record.temperature_min ?? '-'}°C</span>
                            {record.corrected_precipitation !== undefined ? (
                              <span className="text-blue-700 font-semibold">
                                💧 {record.corrected_precipitation} mm
                                <span className="text-gray-400 font-normal line-through ml-1">{record.precipitation ?? 0}</span>
                              </span>
                            ) : (
                              <span>💧 {record.precipitation ?? 0} mm</span>
                            )}
                            <span>💨 {record.humidity_avg ?? '-'}%</span>
                            {record.corrected_events && (
                              <span className="text-purple-700 font-semibold">⚡ {record.corrected_events}</span>
                            )}
                          </div>
                        </div>
                        {hasObs && (
                          <p className="text-xs text-yellow-800 mt-1.5 italic">
                            <MessageSquare className="w-3 h-3 inline mr-1" />
                            {record.observation}
                          </p>
                        )}
                        {hasDivergence && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <AlertTriangle className="w-3 h-3 text-orange-600 flex-shrink-0" />
                            <p className="text-xs text-orange-700 font-medium">
                              {DIVERGENCE_LABELS[record.divergence_type] || record.divergence_type}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <DayObservationEditor
                          record={record}
                          onSave={handleSaveObservation}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
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

        {/* Exportação */}
        <div className="pt-4 border-t">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-900 font-semibold mb-2">💡 Para que serve este relatório:</p>
            <ul className="text-sm text-green-800 ml-4 list-disc space-y-1">
              <li>Comprovação em seguros rurais (perda de safra, eventos climáticos)</li>
              <li>Análise de bancos para financiamentos e crédito agrícola</li>
              <li>Documentação para PROAGRO e programas governamentais</li>
              <li>Evidência técnica de divergências entre dados regionais e o evento real na área</li>
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
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Data Final (opcional)</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                {!hasRecords && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    Nenhum registro histórico disponível. Importe o histórico real primeiro.
                  </p>
                )}
                {annotatedTotal > 0 && (
                  <p className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    ✅ {annotatedTotal} dia(s) com observações de campo serão incluídos em destaque no PDF.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button onClick={exportToCSV} variant="outline" className="flex-1" disabled={!hasRecords}>
                    <FileText className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button onClick={exportToPDF} className="flex-1 bg-red-600 hover:bg-red-700" disabled={!hasRecords}>
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