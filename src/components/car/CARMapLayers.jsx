import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Layers, Sparkles, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const LAYERS = [
  { key: 'car_polygon_url', label: 'Polígono do CAR', color: 'emerald', aiAnalysis: true },
  { key: 'app_layer_url', label: 'APP (Área de Preservação Permanente)', color: 'blue' },
  { key: 'legal_reserve_url', label: 'Reserva Legal', color: 'green' },
  { key: 'consolidated_area_url', label: 'Área Consolidada', color: 'yellow' },
  { key: 'recovery_area_url', label: 'Área em Recuperação', color: 'orange' },
];

export default function CARMapLayers({ carRecord, onUpdate }) {
  const [uploading, setUploading] = useState({});
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const layers = carRecord?.map_layers || {};

  const handleUpload = async (e, layerKey, triggerAI) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(p => ({ ...p, [layerKey]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newLayers = { ...layers, [layerKey]: file_url };

      if (triggerAI && layerKey === 'car_polygon_url') {
        setAnalyzingAI(true);
        try {
          const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: `Analise o arquivo de polígono do CAR enviado (${file.name}). Este arquivo representa o Cadastro Ambiental Rural de uma propriedade rural brasileira. Com base no nome do arquivo e extensão, forneça uma análise técnica resumida sobre: 1) Tipo de arquivo e compatibilidade com sistemas como SICAR/SIGEF, 2) Recomendações para o polígono do CAR, 3) Possíveis camadas que devem acompanhar este arquivo (APP, Reserva Legal etc), 4) Instruções de uso. Seja direto e técnico, máximo 200 palavras.`,
            response_json_schema: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                file_type_notes: { type: 'string' },
                recommendations: { type: 'array', items: { type: 'string' } }
              }
            }
          });
          newLayers.ai_analysis = JSON.stringify(analysis);
        } catch { /* ignora falha de IA */ }
        setAnalyzingAI(false);
      }

      onUpdate({ map_layers: newLayers });
      toast.success('Arquivo enviado com sucesso!');
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(p => ({ ...p, [layerKey]: false }));
    }
  };

  const aiAnalysis = layers.ai_analysis ? (() => { try { return JSON.parse(layers.ai_analysis); } catch { return null; } })() : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="w-4 h-4 text-emerald-600" />
          Mapa da Propriedade — Camadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {LAYERS.map(({ key, label, color, aiAnalysis: hasAI }) => {
          const fileUrl = layers[key];
          return (
            <div key={key} className={`p-3 rounded-lg border bg-${color}-50 border-${color}-200 flex items-center justify-between gap-3`}>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-${color}-800`}>{label}</p>
                {fileUrl && (
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={`text-xs text-${color}-600 hover:underline flex items-center gap-1 mt-0.5`}>
                    <Download className="w-3 h-3" /> Ver arquivo
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {fileUrl && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                <label>
                  <Button variant="outline" size="sm" asChild disabled={uploading[key]} className="cursor-pointer h-8">
                    <div className="flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      {uploading[key] ? 'Enviando...' : fileUrl ? 'Atualizar' : 'Upload'}
                    </div>
                  </Button>
                  <input type="file" className="hidden" accept=".kml,.kmz,.shp,.zip,.geojson,.tif,.tiff,.png,.jpg,.pdf"
                    onChange={e => handleUpload(e, key, hasAI)} />
                </label>
              </div>
            </div>
          );
        })}

        {/* IA Analysis */}
        {analyzingAI && (
          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
            <span className="text-sm text-purple-700">Analisando polígono do CAR com IA...</span>
          </div>
        )}
        {aiAnalysis && (
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-800">Análise IA do Polígono do CAR</span>
            </div>
            <p className="text-sm text-purple-800">{aiAnalysis.summary}</p>
            {aiAnalysis.file_type_notes && <p className="text-xs text-purple-700"><strong>Tipo de arquivo:</strong> {aiAnalysis.file_type_notes}</p>}
            {aiAnalysis.recommendations?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-purple-700 mb-1">Recomendações:</p>
                <ul className="list-disc list-inside text-xs text-purple-700 space-y-0.5">
                  {aiAnalysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}