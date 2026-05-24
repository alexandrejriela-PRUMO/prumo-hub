import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pencil, Save, X, AlertTriangle, MessageSquare } from 'lucide-react';

const DIVERGENCE_TYPES = [
  { value: 'geada_nao_registrada', label: 'Geada não registrada pela estação' },
  { value: 'chuva_intensa_local', label: 'Chuva intensa localizada' },
  { value: 'seca_local', label: 'Seca localizada (sem chuva na área)' },
  { value: 'granizo', label: 'Granizo na área' },
  { value: 'vento_forte_local', label: 'Vento forte localizado' },
  { value: 'enchente', label: 'Enchente / alagamento' },
  { value: 'dados_divergem_estacao', label: 'Dados divergem da estação meteorológica mais próxima' },
  { value: 'outro', label: 'Outro evento específico da área' },
];

export default function DayObservationEditor({ record, onSave }) {
  const [open, setOpen] = useState(false);
  const [observation, setObservation] = useState(record.observation || '');
  const [divergenceType, setDivergenceType] = useState(record.divergence_type || '');
  const [divergenceDetail, setDivergenceDetail] = useState(record.divergence_detail || '');
  const [correctedPrecipitation, setCorrectedPrecipitation] = useState(
    record.corrected_precipitation !== undefined ? String(record.corrected_precipitation) : ''
  );
  const [correctedEvents, setCorrectedEvents] = useState(record.corrected_events || '');

  const hasAnnotation = !!(record.observation || record.divergence_type || record.corrected_precipitation !== undefined || record.corrected_events);

  const handleSave = () => {
    const corrPrecip = correctedPrecipitation !== '' ? parseFloat(correctedPrecipitation) : undefined;
    onSave(record.date, {
      observation: observation.trim(),
      divergence_type: divergenceType,
      divergence_detail: divergenceDetail.trim(),
      corrected_precipitation: isNaN(corrPrecip) ? undefined : corrPrecip,
      corrected_events: correctedEvents.trim()
    });
    setOpen(false);
  };

  const handleClear = () => {
    setObservation('');
    setDivergenceType('');
    setDivergenceDetail('');
    setCorrectedPrecipitation('');
    setCorrectedEvents('');
    onSave(record.date, { observation: '', divergence_type: '', divergence_detail: '', corrected_precipitation: undefined, corrected_events: '' });
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
          hasAnnotation
            ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
        title={hasAnnotation ? 'Ver/editar observação' : 'Adicionar observação'}
      >
        {hasAnnotation ? (
          <>
            <MessageSquare className="w-3 h-3" />
            <span>Observação</span>
          </>
        ) : (
          <>
            <Pencil className="w-3 h-3" />
            <span>Anotar</span>
          </>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              Observação do Dia — {record.date}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Dados brutos do dia */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900 flex gap-4 flex-wrap">
              <span>🌡️ Máx: <strong>{record.temperature_max ?? '-'}°C</strong></span>
              <span>🌡️ Mín: <strong>{record.temperature_min ?? '-'}°C</strong></span>
              <span>💧 Precip: <strong>{record.precipitation ?? 0} mm</strong></span>
              <span>💨 Umid: <strong>{record.humidity_avg ?? '-'}%</strong></span>
            </div>

            {/* Observação livre */}
            <div className="space-y-2">
              <Label className="font-semibold">📝 Observação do campo</Label>
              <p className="text-xs text-gray-500">Descreva o que foi observado na propriedade neste dia (ex: perda de lavoura, colheita, plantio, visita técnica...)</p>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Chuva de granizo atingiu o talhão norte causando perda de aprox. 30% da lavoura de soja. Fotos registradas."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-amber-400 focus:outline-none min-h-[80px]"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 text-right">{observation.length}/500</p>
            </div>

            {/* Correção de Precipitação */}
            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                💧 Precipitação real na área (mm)
              </Label>
              <p className="text-xs text-gray-500">
                Dado da API: <strong>{record.precipitation ?? 0} mm</strong>. Se o valor real na sua área foi diferente, informe aqui. Este valor será usado nas estatísticas e no relatório exportado.
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={correctedPrecipitation}
                  onChange={(e) => setCorrectedPrecipitation(e.target.value)}
                  placeholder={`Valor da API: ${record.precipitation ?? 0}`}
                  className="max-w-[180px]"
                />
                <span className="text-sm text-gray-500">mm</span>
                {correctedPrecipitation !== '' && (
                  <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                    Corrigido: {correctedPrecipitation} mm
                  </Badge>
                )}
              </div>
            </div>

            {/* Eventos climáticos reais */}
            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                ⚡ Eventos climáticos reais na área
              </Label>
              <p className="text-xs text-gray-500">
                Informe eventos que ocorreram na área mas não foram capturados pela API (ex: granizo, geada, vento forte).
              </p>
              <Input
                value={correctedEvents}
                onChange={(e) => setCorrectedEvents(e.target.value)}
                placeholder="Ex: Granizo, Geada, Vento forte"
                className="w-full"
              />
            </div>

            {/* Divergência de dados */}
            <div className="space-y-2">
              <Label className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Divergência entre dados genéricos e a área real
              </Label>
              <p className="text-xs text-gray-500">
                Os dados importados são de estações ou médias regionais. Se o que ocorreu na sua área foi diferente, registre aqui.
                Isso aparecerá em destaque no relatório PDF.
              </p>
              <select
                value={divergenceType}
                onChange={(e) => setDivergenceType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
              >
                <option value="">— Nenhuma divergência —</option>
                {DIVERGENCE_TYPES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>

              {divergenceType && (
                <textarea
                  value={divergenceDetail}
                  onChange={(e) => setDivergenceDetail(e.target.value)}
                  placeholder="Detalhe a divergência (ex: a estação registrou 2mm, mas na área choveu mais de 40mm concentrados em 1h)"
                  className="w-full border border-orange-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-orange-400 focus:outline-none min-h-[70px]"
                  maxLength={400}
                />
              )}
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} className="flex-1 bg-amber-600 hover:bg-amber-700">
                <Save className="w-4 h-4 mr-2" />
                Salvar Observação
              </Button>
              {hasAnnotation && (
                <Button onClick={handleClear} variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                  <X className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}