import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Leaf, Satellite, Loader2, AlertCircle } from 'lucide-react';

const NDVI_LEVELS = [
  { min: 0.6, label: 'Vegetação Densa', color: '#006837', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  { min: 0.4, label: 'Vegetação Moderada', color: '#66bd63', bg: 'bg-green-100', text: 'text-green-700' },
  { min: 0.2, label: 'Vegetação Esparsa', color: '#fee08b', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  { min: 0.05, label: 'Solo Exposto / Pastagem Degradada', color: '#f46d43', bg: 'bg-orange-100', text: 'text-orange-700' },
  { min: -1, label: 'Área Sem Vegetação / Água', color: '#d73027', bg: 'bg-red-100', text: 'text-red-700' },
];

function getNdviLevel(val) {
  if (val == null) return null;
  return NDVI_LEVELS.find(l => val >= l.min) || NDVI_LEVELS[NDVI_LEVELS.length - 1];
}

function NdviBadge({ value }) {
  const level = getNdviLevel(value);
  if (!level) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${level.bg} ${level.text}`}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: level.color }} />
      {level.label}
    </span>
  );
}

function NdviBar({ value }) {
  const pct = Math.max(0, Math.min(1, (value + 0.2) / 1.2)) * 100;
  const level = getNdviLevel(value);
  return (
    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div
        className="h-3 rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: level?.color || '#ccc' }}
      />
    </div>
  );
}

function StatCard({ label, value, unit = '' }) {
  return (
    <div className="flex flex-col items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
      <span className="text-xs text-gray-500 mb-1">{label}</span>
      <span className="text-xl font-bold text-gray-800">{value != null ? value.toFixed(3) : '—'}<span className="text-xs font-normal text-gray-400 ml-1">{unit}</span></span>
    </div>
  );
}

export default function NDVIPanel({ geometry, coordinates, propertyName }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dataset, setDataset] = useState('sentinel2');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const hasGeometry = (geometry && (
    geometry.type === 'FeatureCollection' ? geometry.features?.length > 0 : !!geometry.type
  )) || !!coordinates;

  const analyze = async () => {
    if (!hasGeometry) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {};
      if (geometry) payload.boundaries_geojson = geometry;
      else if (coordinates) payload.center_coordinates = coordinates;
      const resp = await base44.functions.invoke('geeNdviAnalysis', payload);
      setResult(resp.data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Erro ao consultar GEE');
    } finally {
      setLoading(false);
    }
  };

  const historyData = result?.history?.filter(h => h?.mean != null).map(h => ({
    name: h.label,
    NDVI: parseFloat(h.mean?.toFixed(3)),
    period: h.period
  })) || [];

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
            <Satellite className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-900 text-sm">Análise NDVI — Google Earth Engine</h3>
            <p className="text-xs text-emerald-600">Índice de saúde da vegetação via satélite</p>
          </div>
        </div>

        {!hasGeometry && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Cadastre coordenadas ou importe um KML da propriedade para ativar a análise NDVI.
          </div>
        )}

        {/* Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Início</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Fim</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Satélite</label>
            <Select value={dataset} onValueChange={setDataset}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sentinel2">Sentinel-2 (10m)</SelectItem>
                <SelectItem value="landsat8">Landsat-8 (30m)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 justify-end">
            <Button
              onClick={analyze}
              disabled={loading || !hasGeometry}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Leaf className="w-3 h-3" />}
              {loading ? 'Analisando...' : 'Analisar'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Results */}
        {result?.ndvi_mean != null && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Resultado do Período</span>
              <Badge variant="outline" className="text-xs">{result.source || 'MODIS'}</Badge>
            </div>

            {/* Main NDVI */}
            <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-800">NDVI Médio</span>
                <span className="text-lg">{result.emoji}</span>
              </div>
              <NdviBar value={result.ndvi_mean} />
              <div className="text-2xl font-black text-emerald-700 text-center py-1">
                {result.ndvi_mean?.toFixed(3) ?? '—'}
              </div>
              <div className="text-center text-xs font-semibold text-gray-700">{result.status}</div>
              <div className="text-center text-xs text-gray-500">{result.desc}</div>
            </div>

            {/* Trend */}
            {result.ndvi_prev_year != null && (
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Ano Anterior" value={result.ndvi_prev_year} />
                <div className="flex flex-col items-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs text-gray-500 mb-1">Tendência</span>
                  <span className={`text-xl font-bold ${result.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {result.trend >= 0 ? '+' : ''}{result.trend?.toFixed(3)}
                  </span>
                </div>
              </div>
            )}

            {/* NDVI Palette Reference */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Referência de Saúde</p>
              {NDVI_LEVELS.map((l, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
                  <span>{l.label}</span>
                  <span className="ml-auto text-gray-400">{i === 0 ? '> 0.6' : i === 4 ? '< 0.05' : `${l.min.toFixed(2)}–${NDVI_LEVELS[i - 1].min.toFixed(2)}`}</span>
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-400 text-center">
              Fonte: {result.source} · {result.date_range?.start} a {result.date_range?.end}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}