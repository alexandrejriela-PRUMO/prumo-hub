import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, Eye, EyeOff, Download, Upload, X, FileText, Satellite } from 'lucide-react';
import { cn } from '@/lib/utils';

const LAYER_LABELS = {
  car_polygon: 'Perímetro',
  app: 'APP',
  legal_reserve: 'Reserva Legal',
  consolidated_area: 'Á. Consolidada',
  remanescente: 'Veg. Nativa',
  pousio: 'Pousio',
  hidrografia: 'Hidrografia',
  servidoes: 'Servidões',
  outro_uso_restrito: 'Uso Restrito',
};

const LAYER_LABELS_EXPORT = {
  car_polygon: 'Perimetro',
  app: 'APP',
  legal_reserve: 'Reserva_Legal',
  consolidated_area: 'Area_Consolidada',
  remanescente: 'Veg_Nativa',
  pousio: 'Pousio',
  hidrografia: 'Hidrografia',
  servidoes: 'Servidoes',
  outro_uso_restrito: 'Uso_Restrito',
};

const BUILTIN_LAYERS = [
  { key: 'satellite', label: 'Satélite', icon: '🛰️', color: '#0284c7' },
  { key: 'car', label: 'CAR', icon: '📋', color: '#f59e0b' },
  { key: 'app', label: 'APP', icon: '💧', color: '#3b82f6' },
  { key: 'legalReserve', label: 'Res. Legal', icon: '🌳', color: '#10b981' },
  { key: 'recovery', label: 'Recuperação', icon: '🔴', color: '#ef4444' },
  { key: 'consolidated', label: 'Consolidada', icon: '🟣', color: '#8b5cf6' },
];

function geojsonToKml(geojson, name = 'Camada') {
  const features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
  const placemarks = features.map((f, i) => {
    const geom = f.geometry || f;
    const coordsToKml = (coords) => coords.map(c => `${c[0]},${c[1]},0`).join(' ');
    let geomKml = '';
    if (geom.type === 'Polygon') {
      const outer = coordsToKml(geom.coordinates[0]);
      geomKml = `<Polygon><outerBoundaryIs><LinearRing><coordinates>${outer}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
    } else if (geom.type === 'MultiPolygon') {
      geomKml = geom.coordinates.map(poly => {
        const outer = coordsToKml(poly[0]);
        return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${outer}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
      }).join('');
    } else if (geom.type === 'LineString') {
      geomKml = `<LineString><coordinates>${coordsToKml(geom.coordinates)}</coordinates></LineString>`;
    }
    return `<Placemark><name>${name} ${i + 1}</name>${geomKml}</Placemark>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document><name>${name}</name>${placemarks.join('')}</Document>\n</kml>`;
}

function downloadKml(content, filename) {
  const blob = new Blob([content], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function MapLayersPanel({
  activeLayers,
  onToggleLayer,
  kmlLayers = [],
  onToggleKmlLayer,
  onRemoveKmlLayer,
  onKmlUpload,
  propertyName = '',
  fileInputRef,
}) {
  const [open, setOpen] = useState(true);
  const [expandedCars, setExpandedCars] = useState({});

  const sicarGroups = kmlLayers.filter(l => l.source === 'SICAR').reduce((acc, l) => {
    const key = l.car_number || 'SICAR';
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  const userLayers = kmlLayers.filter(l => l.source !== 'SICAR');

  const toggleCarExpand = (carNum) => setExpandedCars(prev => ({ ...prev, [carNum]: !prev[carNum] }));

  const handleExportAll = (carNum, layers) => {
    layers.forEach(l => {
      const label = LAYER_LABELS_EXPORT[l.layer_type] || l.name;
      const kmlStr = geojsonToKml(l.geojson, label);
      const carShort = carNum.slice(-8);
      downloadKml(kmlStr, `${propertyName}_CAR${carShort}_${label}.kml`);
    });
  };

  const handleExportLayer = (carNum, layer) => {
    const label = LAYER_LABELS_EXPORT[layer.layer_type] || layer.name;
    const kmlStr = geojsonToKml(layer.geojson, label);
    const carShort = carNum.slice(-8);
    downloadKml(kmlStr, `${propertyName}_CAR${carShort}_${label}.kml`);
  };

  return (
    <div className="w-full select-none">
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-gray-800">Camadas</span>
          {Object.values(activeLayers).filter(Boolean).length > 0 && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 font-semibold">
              {Object.values(activeLayers).filter(Boolean).length}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
      </button>

      {open && (
        <div className="mt-1 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 overflow-hidden max-h-[70vh] overflow-y-auto">
          {/* Base Layers */}
          <div className="p-3 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Base</p>
            <div className="flex flex-wrap gap-1.5">
              {BUILTIN_LAYERS.map(({ key, label, icon, color }) => {
                const active = activeLayers[key];
                return (
                  <button
                    key={key}
                    onClick={() => onToggleLayer(key)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border"
                    style={active
                      ? { backgroundColor: color + '22', borderColor: color, color }
                      : { backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#9ca3af' }
                    }
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SICAR Layers grouped by CAR */}
          {Object.keys(sicarGroups).length > 0 && (
            <div className="p-3 border-b border-gray-100 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SICAR / CAR</p>
              {Object.entries(sicarGroups).map(([carNum, layers]) => {
                const expanded = expandedCars[carNum] !== false; // default aberto
                const allVisible = layers.every(l => l.visible);
                const carLabel = carNum !== 'SICAR' ? `…${carNum.slice(-14)}` : 'SICAR';

                return (
                  <div key={carNum} className="border border-amber-200 rounded-lg overflow-hidden bg-amber-50/30">
                    {/* CAR Header */}
                    <div className="flex items-center justify-between px-2 py-1.5 bg-amber-50">
                      <button
                        className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                        onClick={() => toggleCarExpand(carNum)}
                      >
                        <span className="text-[10px] font-bold text-amber-800 truncate" title={carNum}>
                          📋 {carLabel}
                        </span>
                        {expanded ? <ChevronUp className="w-3 h-3 text-amber-600 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-amber-600 flex-shrink-0" />}
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        <button
                          onClick={() => {
                            layers.forEach(l => {
                              if (l.visible === allVisible) onToggleKmlLayer(l.id);
                            });
                          }}
                          className="p-0.5 rounded hover:bg-amber-100 text-amber-600 transition-colors"
                          title={allVisible ? 'Ocultar todas' : 'Mostrar todas'}
                        >
                          {allVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleExportAll(carNum, layers.filter(l => l.geojson))}
                          className="p-0.5 rounded hover:bg-amber-100 text-amber-600 transition-colors"
                          title="Exportar todas as camadas deste CAR"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* CAR Layer list */}
                    {expanded && (
                      <div className="p-2 space-y-1">
                        {layers.map(layer => {
                          const label = LAYER_LABELS[layer.layer_type] || layer.name;
                          return (
                            <div key={layer.id} className="flex items-center gap-1.5 group">
                              {/* Color dot + toggle */}
                              <button
                                onClick={() => onToggleKmlLayer(layer.id)}
                                className="flex items-center gap-1.5 flex-1 min-w-0 text-left rounded px-1.5 py-1 hover:bg-gray-100 transition-colors"
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0 transition-opacity"
                                  style={{ backgroundColor: layer.color, opacity: layer.visible ? 1 : 0.3 }}
                                />
                                <span className={cn('text-xs truncate', layer.visible ? 'text-gray-800' : 'text-gray-400 line-through')}>
                                  {label}
                                </span>
                              </button>
                              {/* Export individual */}
                              {layer.geojson && (
                                <button
                                  onClick={() => handleExportLayer(carNum, layer)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-amber-100 text-amber-500 transition-all"
                                  title={`Exportar ${label} como KML`}
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => onRemoveKmlLayer(layer.id)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-red-400 transition-all"
                                title="Remover camada"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* User KML Layers */}
          {userLayers.length > 0 && (
            <div className="p-3 border-b border-gray-100 space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Importados</p>
              {userLayers.map(layer => (
                <div key={layer.id} className="flex items-center gap-1.5 group">
                  <button
                    onClick={() => onToggleKmlLayer(layer.id)}
                    className="flex items-center gap-1.5 flex-1 min-w-0 text-left rounded px-1.5 py-1 hover:bg-gray-100 transition-colors"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: layer.color, opacity: layer.visible ? 1 : 0.3 }}
                    />
                    <span className={cn('text-xs truncate', layer.visible ? 'text-gray-800' : 'text-gray-400 line-through')}>
                      {layer.name}
                    </span>
                  </button>
                  <button
                    onClick={() => onRemoveKmlLayer(layer.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-red-400 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Import KML button */}
          <div className="p-3">
            <input ref={fileInputRef} type="file" accept=".kml" multiple className="hidden" onChange={onKmlUpload} />
            <button
              onClick={() => fileInputRef?.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-emerald-300 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Importar KML
            </button>
          </div>
        </div>
      )}
    </div>
  );
}