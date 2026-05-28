import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, Layers, Sparkles, CheckCircle2, Link2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const LAYERS = [
  { key: 'car_polygon_url', label: 'Polígono do CAR', color: 'emerald', aiAnalysis: true },
  { key: 'app_layer_url', label: 'APP (Área de Preservação Permanente)', color: 'blue' },
  { key: 'legal_reserve_url', label: 'Reserva Legal', color: 'green' },
  { key: 'consolidated_area_url', label: 'Área Consolidada', color: 'yellow' },
  { key: 'recovery_area_url', label: 'Área em Recuperação', color: 'orange' },
  { key: 'servidoes_url', label: 'Servidões Administrativas', color: 'red' },
  { key: 'remanescente_url', label: 'Remanescente de Vegetação Nativa', color: 'teal' },
  { key: 'pousio_url', label: 'Pousio', color: 'amber' },
  { key: 'outro_uso_restrito_url', label: 'Outro Uso Restrito', color: 'purple' },
];

const KML_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#0f766e', '#be123c', '#1d4ed8', '#b45309'];

// KML inline parser
function parseKmlToGeoJson(doc) {
  const features = [];
  doc.querySelectorAll('Placemark').forEach(pm => {
    const name = pm.querySelector('name')?.textContent || '';
    const parseCoords = (str) => str.trim().split(/\s+/).map(c => {
      const parts = c.split(',').map(Number);
      return [parts[0], parts[1]];
    }).filter(c => !isNaN(c[0]) && !isNaN(c[1]));

    let geometry = null;
    const polygon = pm.querySelector('Polygon');
    const lineString = pm.querySelector('LineString');
    const point = pm.querySelector('Point');

    if (polygon) {
      const outer = polygon.querySelector('outerBoundaryIs coordinates');
      if (outer) geometry = { type: 'Polygon', coordinates: [parseCoords(outer.textContent)] };
    } else if (lineString) {
      const coords = lineString.querySelector('coordinates');
      if (coords) geometry = { type: 'LineString', coordinates: parseCoords(coords.textContent) };
    } else if (point) {
      const coords = point.querySelector('coordinates');
      if (coords) {
        const c = parseCoords(coords.textContent)[0];
        if (c) geometry = { type: 'Point', coordinates: c };
      }
    }
    if (geometry) features.push({ type: 'Feature', geometry, properties: { name } });
  });
  return { type: 'FeatureCollection', features };
}

export default function CARMapLayers({ carRecord, onUpdate, property, onPropertyUpdate }) {
  const [uploading, setUploading] = useState({});
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const layers = carRecord?.map_layers || {};

  // Handle KML upload: convert to GeoJSON and save to Property.kml_layers too
  const handleUpload = async (e, layerKey, triggerAI) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(p => ({ ...p, [layerKey]: true }));

    try {
      const layerConfig = LAYERS.find(l => l.key === layerKey);
      const isKml = file.name.endsWith('.kml') || file.name.endsWith('.kmz');

      // Upload raw file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newLayers = { ...layers, [layerKey]: file_url };

      // If KML, also parse and save to Property.kml_layers for the interactive map
      if (isKml && property) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(ev.target.result, 'text/xml');
            const geojson = parseKmlToGeoJson(doc);

            if (geojson.features?.length > 0) {
              const existingKmlLayers = property.kml_layers || [];
              const colorIndex = existingKmlLayers.length % KML_COLORS.length;

              // Build a descriptive name: "LayerType - CAR: [number]"
              const carRef = carRecord.car_number ? ` [CAR: ${carRecord.car_number}]` : '';
              const layerName = `${layerConfig?.label || file.name.replace('.kml', '')}${carRef}`;

              const newKmlLayer = {
                id: String(Date.now() + Math.random()),
                name: layerName,
                geojson,
                color: KML_COLORS[colorIndex],
                visible: true,
                car_entity_id: carRecord.id,
                car_number: carRecord.car_number || null,
                layer_type: layerKey,
              };

              const updatedKmlLayers = [...existingKmlLayers, newKmlLayer];
              await base44.entities.Property.update(property.id, { kml_layers: updatedKmlLayers });
              if (onPropertyUpdate) onPropertyUpdate(updatedKmlLayers);
              toast.success('Camada KML vinculada ao Mapa Interativo!');
            }
          } catch (err) {
            console.warn('Erro ao parsear KML para mapa:', err);
          }
        };
        reader.readAsText(file);
      }

      // AI analysis for car polygon
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

  // Count how many layers are linked to map
  const linkedToMap = LAYERS.filter(l => {
    const url = layers[l.key];
    return url && (url.endsWith('.kml') || url.endsWith('.kmz'));
  }).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="w-4 h-4 text-emerald-600" />
            Mapa da Propriedade — Camadas
          </CardTitle>
          {linkedToMap > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
              <Link2 className="w-3 h-3" />
              {linkedToMap} camada(s) KML no Mapa Interativo
            </div>
          )}
        </div>
        {carRecord.car_number && (
          <p className="text-xs text-gray-500 mt-1">
            Camadas do <strong>CAR: {carRecord.car_number}</strong> — KMLs serão vinculados automaticamente ao Mapa Interativo
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {LAYERS.map(({ key, label, color, aiAnalysis: hasAI }) => {
          const fileUrl = layers[key];
          const isKmlFile = fileUrl && (fileUrl.endsWith('.kml') || fileUrl.endsWith('.kmz'));
          return (
            <div key={key} className={`p-3 rounded-lg border bg-${color}-50 border-${color}-200 flex items-center justify-between gap-3`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium text-${color}-800`}>{label}</p>
                  {isKmlFile && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 font-medium flex items-center gap-0.5">
                      <Link2 className="w-2.5 h-2.5" /> no mapa
                    </span>
                  )}
                </div>
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