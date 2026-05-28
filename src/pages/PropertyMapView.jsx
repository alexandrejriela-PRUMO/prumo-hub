import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useMap } from 'react-leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Layers, Info, TreePine, Droplets, Upload, Download, X, FileText, Satellite, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NDVIPanel from '@/components/map/NDVIPanel';
import AdvancedPropertyMap from '@/components/map/AdvancedPropertyMap';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
// KML to GeoJSON inline parser (no external dependency)
function kml(doc) {
  const features = [];
  const placemarks = doc.querySelectorAll('Placemark');
  placemarks.forEach(pm => {
    const name = pm.querySelector('name')?.textContent || '';
    const desc = pm.querySelector('description')?.textContent || '';
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
    if (geometry) features.push({ type: 'Feature', geometry, properties: { name, description: desc } });
  });
  return { type: 'FeatureCollection', features };
}
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LAYER_STYLES = {
  car: { color: '#f59e0b', weight: 3, fillOpacity: 0.08, fillColor: '#f59e0b' },
  app: { color: '#3b82f6', weight: 2, fillOpacity: 0.2, fillColor: '#3b82f6' },
  legalReserve: { color: '#10b981', weight: 2, fillOpacity: 0.2, fillColor: '#10b981' },
  recovery: { color: '#ef4444', weight: 2, fillOpacity: 0.2, fillColor: '#ef4444' },
  consolidated: { color: '#8b5cf6', weight: 2, fillOpacity: 0.15, fillColor: '#8b5cf6' },
};

// Random colors for user-uploaded KML layers
const KML_COLORS = ['#e11d48', '#0284c7', '#7c3aed', '#b45309', '#0f766e', '#be123c', '#1d4ed8'];

function FitBoundsLayer({ geoJsonList }) {
  const map = useMap();
  useEffect(() => {
    if (!geoJsonList || geoJsonList.length === 0) return;
    try {
      const combined = L.featureGroup();
      geoJsonList.forEach(gj => {
        if (!gj) return;
        try {
          const layer = L.geoJSON(gj);
          const b = layer.getBounds();
          if (b.isValid()) combined.addLayer(layer);
        } catch {}
      });
      const bounds = combined.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
    } catch {}
  }, [geoJsonList, map]);
  return null;
}

function LayerLegend({ activeLayers, kmlLayers }) {
  const builtins = [
    { key: 'car', label: 'CAR (Limite)', color: '#f59e0b' },
    { key: 'app', label: 'APP', color: '#3b82f6' },
    { key: 'legalReserve', label: 'Reserva Legal', color: '#10b981' },
    { key: 'recovery', label: 'Recuperação', color: '#ef4444' },
    { key: 'consolidated', label: 'Consolidada', color: '#8b5cf6' },
  ].filter(i => activeLayers[i.key]);

  const kmlVisible = kmlLayers.filter(l => l.visible);
  if (!builtins.length && !kmlVisible.length) return null;

  // Group KML layers by CAR number for organized display
  const kmlByCAR = kmlVisible.reduce((acc, l) => {
    const key = l.car_number ? `CAR: ${l.car_number}` : 'Importados';
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  return (
    <div className="absolute bottom-8 left-4 z-[1000] bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 border border-gray-200 max-w-[240px]">
      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Legenda</p>
      <div className="space-y-1.5">
        {builtins.map(i => (
          <div key={i.key} className="flex items-center gap-2">
            <div className="w-4 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: i.color, opacity: 0.7 }} />
            <span className="text-xs text-gray-600 leading-tight">{i.label}</span>
          </div>
        ))}
        {Object.entries(kmlByCAR).map(([carLabel, layers]) => (
          <div key={carLabel}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2 mb-1">{carLabel}</p>
            {layers.map(l => (
              <div key={l.id} className="flex items-center gap-2 ml-1">
                <div className="w-4 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color, opacity: 0.7 }} />
                <span className="text-xs text-gray-600 leading-tight truncate max-w-[170px]" title={l.name}>{l.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Convert GeoJSON to KML string
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
    } else if (geom.type === 'Point') {
      geomKml = `<Point><coordinates>${geom.coordinates[0]},${geom.coordinates[1]},0</coordinates></Point>`;
    }
    return `<Placemark><name>${name} ${i + 1}</name>${geomKml}</Placemark>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document><name>${name}</name>${placemarks.join('')}</Document>
</kml>`;
}

function downloadKml(content, filename) {
  const blob = new Blob([content], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PropertyMapView() {
   const { effectiveEmail, isEquipe, userType, isLoading: loadingUser } = useEffectiveUser();
   const [user, setUser] = useState(null);
   const [selectedPropertyId, setSelectedPropertyId] = useState('');
   const [activeLayers, setActiveLayers] = useState({
      satellite: true,
      car: true,
      app: true,
      legalReserve: true,
      recovery: false,
      consolidated: false,
    });
    const [kmlLayers, setKmlLayers] = useState([]);
    const [propertyAreas, setPropertyAreas] = useState([]);
    const [drawnGeometry, setDrawnGeometry] = useState(null);
    const fileInputRef = useRef(null);
    const savingRef = useRef(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { isEquipeProdutor } = useEffectiveUser();
  // equipe de produtor busca como produtor (owner_email)
  const isConsultorFamily = (userType === 'consultor' || (userType === 'equipe' && !isEquipeProdutor));

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', effectiveEmail, userType],
    queryFn: () => {
      if (!effectiveEmail) return [];
      if (isConsultorFamily) {
        return base44.entities.Property.filter({ consultor_email: effectiveEmail });
      }
      return base44.entities.Property.filter({ owner_email: effectiveEmail });
    },
    enabled: !!effectiveEmail,
  });

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  // Carregar areas e KML layers ao trocar propriedade
  useEffect(() => {
    if (!selectedProperty) return;
    const areas = selectedProperty.areas || [];
    const saved = selectedProperty.kml_layers || [];
    setPropertyAreas(areas);
    setKmlLayers(saved);
    setDrawnGeometry(null);
  }, [selectedPropertyId]);

  const { data: carData } = useQuery({
    queryKey: ['carManagement', selectedPropertyId],
    queryFn: () => base44.entities.CARManagement.filter({ property_id: selectedPropertyId }),
    enabled: !!selectedPropertyId,
    select: data => data[0],
  });

  const saveKmlLayers = async (layers) => {
    if (!selectedPropertyId || savingRef.current) return;
    savingRef.current = true;
    try {
      await base44.entities.Property.update(selectedPropertyId, { kml_layers: layers });
    } finally {
      savingRef.current = false;
    }
  };

  const toggleLayer = (key) => setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleKmlLayer = (id) => {
    const updated = kmlLayers.map(l => l.id === id ? { ...l, visible: !l.visible } : l);
    setKmlLayers(updated);
    saveKmlLayers(updated);
  };
  const removeKmlLayer = (id) => {
    const updated = kmlLayers.filter(l => l.id !== id);
    setKmlLayers(updated);
    saveKmlLayers(updated);
  };

  const parseGeoJson = (str) => {
    if (!str) return null;
    try { return typeof str === 'string' ? JSON.parse(str) : str; } catch { return null; }
  };

  const getCenter = () => {
    if (selectedProperty?.coordinates) {
      const [lat, lng] = selectedProperty.coordinates.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return [-15.7801, -47.9292];
  };

  // Handle KML file upload
  const handleKmlUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(ev.target.result, 'text/xml');
        const geojson = kml(doc);
        if (geojson && geojson.features?.length > 0) {
          const color = KML_COLORS[kmlLayers.length % KML_COLORS.length];
          const newLayer = {
            id: String(Date.now() + Math.random()),
            name: file.name.replace('.kml', ''),
            geojson,
            color,
            visible: true,
          };
          setKmlLayers(prev => {
            const updated = [...prev, newLayer];
            saveKmlLayers(updated);
            return updated;
          });
        }
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  // Export a specific builtin layer as KML
  const exportBuiltinKml = (key, label) => {
    let gj = null;
    if (key === 'car') gj = parseGeoJson(selectedProperty?.boundaries);
    else if (key === 'app') gj = parseGeoJson(carData?.map_layers?.app_layer_url);
    else if (key === 'legalReserve') gj = parseGeoJson(carData?.map_layers?.legal_reserve_url);
    else if (key === 'recovery') gj = parseGeoJson(carData?.map_layers?.recovery_area_url);
    else if (key === 'consolidated') gj = parseGeoJson(carData?.map_layers?.consolidated_area_url);
    if (!gj) return alert('Nenhum dado disponível para exportar esta camada.');
    const kmlStr = geojsonToKml(gj, label);
    downloadKml(kmlStr, `${selectedProperty?.property_name || 'propriedade'}_${label}.kml`);
  };

  const carGeoJson = parseGeoJson(selectedProperty?.boundaries);
  const carLayers = carData?.map_layers;

  // Collect all registered GeoJSON layers to fit bounds on load
  const allGeoJsonLayers = useMemo(() => {
    const list = [];
    if (carGeoJson) list.push(carGeoJson);
    if (carLayers?.app_layer_url) { const gj = parseGeoJson(carLayers.app_layer_url); if (gj) list.push(gj); }
    if (carLayers?.legal_reserve_url) { const gj = parseGeoJson(carLayers.legal_reserve_url); if (gj) list.push(gj); }
    if (carLayers?.recovery_area_url) { const gj = parseGeoJson(carLayers.recovery_area_url); if (gj) list.push(gj); }
    if (carLayers?.consolidated_area_url) { const gj = parseGeoJson(carLayers.consolidated_area_url); if (gj) list.push(gj); }
    kmlLayers.forEach(l => { if (l.visible && l.geojson) list.push(l.geojson); });
    return list;
  }, [carGeoJson, carLayers, kmlLayers]);

  const builtinLayerButtons = [
    { key: 'car', label: 'CAR', icon: '📋' },
    { key: 'app', label: 'APP', icon: '💧' },
    { key: 'legalReserve', label: 'Reserva Legal', icon: '🌳' },
    { key: 'recovery', label: 'Recuperação', icon: '🔴' },
    { key: 'consolidated', label: 'Consolidada', icon: '🟣' },
  ];

  const handleSaveArea = async (area) => {
      if (!selectedProperty || savingRef.current) return;
      savingRef.current = true;
      try {
        // Converter area para GeoJSON para KML
        const geoJson = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [area.coordinates]
          },
          properties: { name: area.name, type: area.type }
        };

        // Criar KML layer com coordenadas
        const kmlLayer = {
          id: area.id,
          name: `${area.name} (${area.type})`,
          geojson: geoJson,
          color: area.color,
          visible: true
        };

        const updatedAreas = [...propertyAreas, area];
        const updatedKmlLayers = [...kmlLayers, kmlLayer];
        
        setPropertyAreas(updatedAreas);
        setKmlLayers(updatedKmlLayers);
        
        // Persiste ambas as coleções no banco
        await base44.entities.Property.update(selectedProperty.id, { 
          areas: updatedAreas,
          kml_layers: updatedKmlLayers
        });
        
        toast.success(`Área "${area.name}" salva como KML na propriedade!`);
      } catch (err) {
        toast.error('Erro ao salvar área');
        console.error(err);
      } finally {
        savingRef.current = false;
      }
    };

  return (
    <div className="space-y-4">
      <Link
        to={createPageUrl('PropertyCentral')}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-medium"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-600" />
            Mapa Interativo da Propriedade
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Desenhe, importe e visualize camadas ambientais com precisão Google Earth</p>
        </div>
        {properties.length > 1 && (
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Selecionar propriedade..." />
            </SelectTrigger>
            <SelectContent>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.property_name} {p.city ? `— ${p.city}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Property Info Bar */}
      {selectedProperty && (
        <div className="flex flex-wrap gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm">
          <span className="font-semibold text-emerald-800">{selectedProperty.property_name}</span>
          {selectedProperty.city && <Badge variant="outline" className="text-emerald-700 border-emerald-300">{selectedProperty.city}/{selectedProperty.state}</Badge>}
          {selectedProperty.total_hectares && <Badge variant="outline" className="text-blue-700 border-blue-200">{selectedProperty.total_hectares} ha</Badge>}
          {(selectedProperty.car_numbers?.length > 0 ? selectedProperty.car_numbers : selectedProperty.car_number ? [selectedProperty.car_number] : []).map((car, i) => (
            <Badge key={i} variant="outline" className="text-amber-700 border-amber-200">CAR: {car}</Badge>
          ))}
          {carData && <Badge className={cn("text-white text-xs", carData.car_status === 'Validado' ? 'bg-emerald-600' : 'bg-amber-500')}>{carData.car_status}</Badge>}
        </div>
      )}

      {/* Layer Controls */}
      <Card className="border-gray-200">
        <CardContent className="p-3 space-y-3">
          {/* Satellite toggle + builtin layers */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 mr-1">
              <Layers className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Base:</span>
            </div>
            <button
              onClick={() => toggleLayer('satellite')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                activeLayers.satellite
                  ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-700"
              )}
            >
              🛰️ Satélite Google
            </button>
            <div className="h-4 w-px bg-gray-200 mx-1" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Camadas:</span>
            {builtinLayerButtons.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  activeLayers[key]
                    ? "bg-emerald-700 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700"
                )}
              >
                <span>{icon}</span>{label}
              </button>
            ))}
          </div>

          {/* KML layers row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide mr-1">KML:</span>
            <input ref={fileInputRef} type="file" accept=".kml" multiple className="hidden" onChange={handleKmlUpload} />
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-dashed" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3 h-3" /> Importar KML
            </Button>

            {/* Uploaded KML layer chips */}
            {kmlLayers.map(layer => {
              // Calcula área do KML
              const calcArea = (geojson) => {
                if (!geojson?.features) return null;
                let totalArea = 0;
                geojson.features.forEach(f => {
                  if (f.geometry?.type === 'Polygon' && f.geometry.coordinates[0]) {
                    const coords = f.geometry.coordinates[0];
                    const area = Math.abs(
                      coords.reduce((sum, [lng, lat], i) => {
                        const next = coords[(i + 1) % coords.length];
                        return sum + (lng * next[1] - lat * next[0]);
                      }, 0) / 2
                    );
                    totalArea += area * 111320 * 111320;
                  }
                });
                return totalArea > 0 ? (totalArea / 10000).toFixed(2) : null;
              };
              const areaHa = calcArea(layer.geojson);
              
              return (
                <div
                  key={layer.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-all"
                  style={{
                    backgroundColor: layer.visible ? layer.color + '22' : '#f9fafb',
                    borderColor: layer.visible ? layer.color : '#e5e7eb',
                    color: layer.visible ? layer.color : '#6b7280',
                  }}
                  onClick={() => toggleKmlLayer(layer.id)}
                  title={areaHa ? `${areaHa} ha` : undefined}
                >
                  <FileText className="w-3 h-3" />
                  <span className="max-w-[100px] truncate" title={layer.name}>{layer.name}</span>
                  {layer.car_number && (
                    <span className="text-[9px] opacity-60 font-normal border-l border-current pl-1 ml-0.5 truncate max-w-[60px]" title={`CAR: ${layer.car_number}`}>
                      {layer.car_number.slice(0, 8)}…
                    </span>
                  )}
                  {areaHa && <span className="text-xs opacity-70">({areaHa} ha)</span>}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeKmlLayer(layer.id); }}
                    className="ml-0.5 hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* Export buttons */}
            {selectedProperty && (
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Exportar:</span>
                {builtinLayerButtons.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => exportBuiltinKml(key, label)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-emerald-400 hover:text-emerald-700 transition-all"
                    title={`Exportar ${label} como KML`}
                  >
                    <Download className="w-3 h-3" />{label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Map */}
       {selectedProperty ? (
         <AdvancedPropertyMap
           property={selectedProperty}
           onSave={handleSaveArea}
           LAYER_STYLES={LAYER_STYLES}
           carGeoJson={carGeoJson}
           carLayers={carLayers}
           kmlLayers={kmlLayers}
           propertyAreas={propertyAreas}
           activeLayers={activeLayers}
           onLayerToggle={toggleLayer}
           parseGeoJson={parseGeoJson}
           onKmlImport={handleKmlUpload}
           allGeoJsonLayers={allGeoJsonLayers}
         />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-900">Nenhuma propriedade selecionada</p>
            <p className="text-sm text-gray-500">Selecione uma propriedade para visualizar o mapa</p>
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-amber-100 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <TreePine className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Reserva Legal</p>
              <p className="text-lg font-bold text-amber-900">{selectedProperty?.legal_reserve_hectares ?? '—'} <span className="text-sm font-normal">ha</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 bg-blue-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Droplets className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">APP</p>
              <p className="text-lg font-bold text-blue-900">{selectedProperty?.app_hectares ?? '—'} <span className="text-sm font-normal">ha</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 bg-emerald-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Área Total</p>
              <p className="text-lg font-bold text-emerald-900">{selectedProperty?.total_hectares ?? '—'} <span className="text-sm font-normal">ha</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NDVI GEE Panel */}
      {selectedProperty && (
        <NDVIPanel
          geometry={kmlLayers.find(l => l.visible && l.geojson)?.geojson || carGeoJson}
          coordinates={selectedProperty.coordinates}
          propertyName={selectedProperty.property_name}
          kmlLayers={kmlLayers}
          carData={{ car_polygon: carGeoJson, app: null, legal_reserve: null }}
          propertyAreas={propertyAreas}
        />
      )}

      {/* Help & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
          <div>
            <p className="font-semibold mb-1">Desenho de Áreas</p>
            <p>Clique em "Desenhar Área" e crie polígonos no mapa clicando para adicionar vértices. Clique no primeiro ponto ou use "Finalizar" para fechar.</p>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
          <div>
            <p className="font-semibold mb-1">Importação & Exportação</p>
            <p>Importe <strong>.KML</strong> (Google Earth, SICAR) e exporte camadas como KML. Use "Coordenadas" para criar polígonos por inserção manual de pontos.</p>
          </div>
        </div>
      </div>
    </div>
  );
}