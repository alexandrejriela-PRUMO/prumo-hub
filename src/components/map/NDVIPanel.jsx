import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Leaf, TrendingUp, TrendingDown, Minus, RefreshCw, Satellite, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLOR_MAP = {
  emerald: { bar: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-600' },
  green:   { bar: 'bg-green-500',   bg: 'bg-green-50',   border: 'border-green-200',   text: 'text-green-800',   badge: 'bg-green-600'   },
  yellow:  { bar: 'bg-yellow-400',  bg: 'bg-yellow-50',  border: 'border-yellow-200',  text: 'text-yellow-800',  badge: 'bg-yellow-500'  },
  orange:  { bar: 'bg-orange-500',  bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-800',  badge: 'bg-orange-500'  },
  red:     { bar: 'bg-red-500',     bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-800',     badge: 'bg-red-600'     },
};

// NDVI scale bar visual
function NDVIBar({ value }) {
  const pct = Math.max(0, Math.min(1, (value + 0.2) / 1.2)) * 100;
  return (
    <div className="relative w-full h-3 rounded-full overflow-hidden" style={{
      background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #22c55e, #16a34a)'
    }}>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md rounded-full"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

export default function NDVIPanel({ selectedProperty }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await base44.functions.invoke('geeNdviAnalysis', {
        boundaries_geojson: selectedProperty.boundaries || null,
        center_coordinates: selectedProperty.coordinates || null,
      });
      if (res.data.error) throw new Error(res.data.error);
      setData(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const c = data ? (COLOR_MAP[data.color] || COLOR_MAP.green) : null;

  const trendIcon = data?.trend != null
    ? data.trend > 0.02 ? <TrendingUp className="w-4 h-4 text-emerald-600" />
    : data.trend < -0.02 ? <TrendingDown className="w-4 h-4 text-red-500" />
    : <Minus className="w-4 h-4 text-gray-400" />
    : null;

  const trendLabel = data?.trend != null
    ? data.trend > 0.02 ? 'Melhora anual'
    : data.trend < -0.02 ? 'Queda anual'
    : 'Estável'
    : null;

  return (
    <div className="rounded-xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-800 to-emerald-700">
        <div className="flex items-center gap-2">
          <Satellite className="w-4 h-4 text-emerald-300" />
          <span className="text-sm font-semibold text-white">Satélite GEE — Saúde da Vegetação (NDVI)</span>
        </div>
        <Button
          size="sm"
          onClick={runAnalysis}
          disabled={loading || !selectedProperty}
          className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-white/30 border gap-1.5"
          variant="outline"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          {loading ? 'Analisando...' : data ? 'Atualizar' : 'Analisar'}
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        {!data && !loading && !error && (
          <div className="text-center py-4">
            <Leaf className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Clique em <strong>Analisar</strong> para obter a saúde da vegetação via MODIS/NDVI.</p>
            <p className="text-xs text-gray-400 mt-1">Fonte: Google Earth Engine · MODIS Terra 250m</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-4">
            <RefreshCw className="w-6 h-6 text-emerald-500 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-gray-500">Consultando Google Earth Engine...</p>
            <p className="text-xs text-gray-400 mt-1">Isso pode levar alguns segundos</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {data && c && (
          <div className="space-y-3">
            {/* Status badge + NDVI value */}
            <div className={cn("flex items-center justify-between p-3 rounded-xl border", c.bg, c.border)}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{data.emoji}</span>
                <div>
                  <p className={cn("text-sm font-bold", c.text)}>{data.status}</p>
                  <p className="text-xs text-gray-500">{data.desc}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn("text-2xl font-black", c.text)}>{data.ndvi_mean}</p>
                <p className="text-xs text-gray-400">NDVI</p>
              </div>
            </div>

            {/* NDVI bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Solo exposto</span><span>Vegetação densa</span>
              </div>
              <NDVIBar value={data.ndvi_mean} />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>-0.2</span><span>0</span><span>0.2</span><span>0.4</span><span>0.6</span><span>1.0</span>
              </div>
            </div>

            {/* Trend vs last year */}
            {data.ndvi_prev_year !== null && (
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-lg">
                {trendIcon}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700">{trendLabel} vs. mesmo período no ano anterior</p>
                  <p className="text-xs text-gray-500">Anterior: NDVI {data.ndvi_prev_year} · Variação: {data.trend > 0 ? '+' : ''}{data.trend}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">
                📅 {data.date_range?.start} → {data.date_range?.end}
              </Badge>
              <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">
                🛰️ {data.source}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}