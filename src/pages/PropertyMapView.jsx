import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMap } from 'react-leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Info, TreePine, Droplets, ChevronLeft, RefreshCw, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NDVIPanel from '@/components/map/NDVIPanel';
import AdvancedPropertyMap from '@/components/map/AdvancedPropertyMap';
import MapLayersPanel from '@/components/map/MapLayersPanel';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const SICAR_R2_BASE = 'https://pub-619a5d7497a843dc84ca61263b654ac5.r2.dev/car/sicar-rs';
const SICAR_LAYER_NAMES_MAP = {
  car_polygon: 'Polígono do CAR', app: 'APP', legal_reserve: 'Reserva Legal',
  consolidated_area: 'Área Consolidada', remanescente: 'Vegetação Nativa',
  pousio: 'Pousio', hidrografia: 'Hidrografia', servidao: 'Servidão Administrativa',
  uso_restrito: 'Uso Restrito',
};
const SICAR_LAYER_COLORS_MAP = {
  car_polygon: '#f59e0b', app: '#3b82f6', legal_reserve: '#10b981',
  consolidated_area: '#8b5cf6', remanescente: '#0f766e', pousio: '#f59e0b',
  hidrografia: '#0284c7', servidao: '#be123c', uso_restrito: '#7c3aed',
};

async function fetchSICARLayersForMap(carNumber) {
  // Converte UUID sem pontos para formato com pontos (como estão no R2)
  // Ex: RS-4313904-3C36C4F0AD9244A58814CDEBE5F38A15
  //  → RS-4313904-3C36.C4F0.AD92.44A5.8814.CDEB.E5F3.8A15
  const addDots = (num) => {
    const parts = num.split('-');
    if (parts.length < 3) return num;
    const uuid = parts.slice(2).join('-').replace(/\./g, '');
    const dotted = uuid.match(/.{1,4}/g)?.join('.') || uuid;
    return `${parts[0]}-${parts[1]}-${dotted}`;
  };

  const withDots = addDots(carNumber);
  const withoutDots = carNumber.replace(/\./g, '');

  // Tenta com pontos primeiro (formato atual do R2), depois sem pontos (fallback)
  const cacheBust = `?t=${Date.now()}`;
  let res = await fetch(`${SICAR_R2_BASE}/${withDots}.geojson${cacheBust}`, { cache: 'no-store' });
  if (!res.ok) res = await fetch(`${SICAR_R2_BASE}/${withoutDots}.geojson${cacheBust}`, { cache: 'no-store' });
  if (!res.ok) return null;

  const geojson = await res.json();
  if (!geojson.features?.length) return null;

  const byLayer = {};
  geojson.features.forEach(f => {
    const layer = f.properties?._layer;
    if (!layer) return;
    if (!byLayer[layer]) byLayer[layer] = { type: 'FeatureCollection', features: [] };
    byLayer[layer].features.push(f);
  });

  const kmlItems = Object.entries(byLayer).map(([layer, fc]) => ({
    id: `sicar-${withoutDots}-${layer}`,
    name: SICAR_LAYER_NAMES_MAP[layer] || layer,
    geojson: fc,
    color: SICAR_LAYER_COLORS_MAP[layer] || '#6b7280',
    visible: true,
    car_number: withoutDots,
    layer_type: layer,
    source: 'SICAR',
  }));

  return kmlItems.length > 0 ? kmlItems : null;
}

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
   const queryClient = useQueryClient();
   const [user, setUser] = useState(null);
   const [selectedPropertyId, setSelectedPropertyId] = useState('');
   const [reloadingSICAR, setReloadingSICAR] = useState(false);
   const [sicarProgress, setSicarProgress] = useState({ done: 0, total: 0 });
   const [activeLayers, setActiveLayers] = useState({
      satellite: true,
      car: true,
      app: true,
      legalReserve: true,
      recovery: false,
      consolidated: false,
    });
    const [kmlLayers, setKmlLayers] = useState([]);
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

  const { data: carData } = useQuery({
    queryKey: ['carManagement', selectedPropertyId],
    queryFn: () => base44.entities.CARManagement.filter({ property_id: selectedPropertyId }),
    enabled: !!selectedPropertyId,
    select: data => data[0],
  });

  const { data: carRecords = [], isSuccess: carRecordsLoaded } = useQuery({
    queryKey: ['carRecordsMap', selectedPropertyId],
    queryFn: () => base44.entities.CARManagement.filter({ property_id: selectedPropertyId }),
    enabled: !!selectedPropertyId,
  });

  // Carregar KML layers ao trocar propriedade — deduplica por id
  useEffect(() => {
    if (!selectedProperty) return;
    if (!carRecordsLoaded) return; // aguarda query terminar antes de limpar
    const saved = selectedProperty.kml_layers || [];
    // Deduplica por id mantendo apenas a primeira ocorrência
    const seen = new Set();
    const deduped = saved.filter(l => {
      if (!l.id || seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });
    const SICAR_LAYER_TYPES = ['car_polygon','app','legal_reserve','consolidated_area','remanescente','pousio','hidrografia','servidoes','outro_uso_restrito'];

    const normalized = deduped.map(l => {
      const isSicar =
        l.source === 'SICAR' ||
        (l.id && l.id.startsWith('sicar-')) ||
        (l.layer_type && SICAR_LAYER_TYPES.includes(l.layer_type));

      if (!isSicar) return l;

      // Recupera car_number do id se estiver faltando
      // Padrão: sicar-{car_number}-{layer_type}
      let carNumber = l.car_number;
      if (!carNumber && l.id && l.id.startsWith('sicar-')) {
        const withoutPrefix = l.id.slice(6); // remove 'sicar-'
        const layerSuffix = SICAR_LAYER_TYPES.find(lt => withoutPrefix.endsWith('-' + lt));
        if (layerSuffix) {
          carNumber = withoutPrefix.slice(0, -(layerSuffix.length + 1)); // remove '-{layer_type}'
        }
      }

      return {
        ...l,
        source: 'SICAR',
        ...(carNumber ? { car_number: carNumber } : {}),
      };
    });

    const needsPersist =
      deduped.length !== saved.length ||
      normalized.some((l, i) => l.source !== deduped[i]?.source || l.car_number !== deduped[i]?.car_number);

    if (needsPersist) {
      base44.entities.Property.update(selectedProperty.id, { kml_layers: normalized }).catch(() => {});
    }

    // Remove camadas SICAR cujo car_number não tem CAR cadastrado
    // Normaliza removendo pontos do segmento hex para comparar RS-XXX-AABB.CCDD == RS-XXX-AABBCCDD
    const normCarNum = (n) => (n || '').replace(/\./g, '').toUpperCase();
    const carNumbersAtivos = new Set(carRecords.map(c => normCarNum(c.car_number)).filter(Boolean));
    const semOrfas = normalized.filter(l => {
      if (l.source !== 'SICAR') return true;
      if (!l.car_number) return false;
      return carNumbersAtivos.has(normCarNum(l.car_number));
    });

    if (semOrfas.length !== normalized.length) {
      base44.entities.Property.update(selectedProperty.id, { kml_layers: semOrfas }).catch(() => {});
    }

    console.log('[SICAR-DEBUG] carNumbersAtivos:', [...carNumbersAtivos]);
    console.log('[SICAR-DEBUG] camadas SICAR encontradas:', normalized.filter(l => l.source === 'SICAR').map(l => ({ id: l.id, car_number: l.car_number, normado: normCarNum(l.car_number) })));
    console.log('[SICAR-DEBUG] semOrfas SICAR:', semOrfas.filter(l => l.source === 'SICAR').length, 'de', normalized.filter(l => l.source === 'SICAR').length);
    setKmlLayers(semOrfas);
    setDrawnGeometry(null);
  }, [selectedPropertyId, carRecords, carRecordsLoaded]);

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
  const toggleKmlLayers = (ids) => {
    const idSet = new Set(ids);
    const updated = kmlLayers.map(l => idSet.has(l.id) ? { ...l, visible: !l.visible } : l);
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

  // Export a specific builtin layer as KML (kept for future use)
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

  const exportSicarLayer = (carNumber, layerType, label) => {
    const layer = kmlLayers.find(l => l.car_number === carNumber && l.layer_type === layerType);
    if (!layer?.geojson) return alert('Camada não disponível para este CAR.');
    const kmlStr = geojsonToKml(layer.geojson, label);
    const carShort = carNumber.slice(-8);
    downloadKml(kmlStr, `${selectedProperty?.property_name || 'propriedade'}_CAR${carShort}_${label}.kml`);
  };

  const exportAllSicarLayers = (carNumber) => {
    const layers = kmlLayers.filter(l => l.car_number === carNumber && l.geojson);
    if (!layers.length) return alert('Nenhuma camada disponível para este CAR.');
    layers.forEach(l => {
      const label = LAYER_LABELS_EXPORT[l.layer_type] || l.name;
      const kmlStr = geojsonToKml(l.geojson, label);
      const carShort = carNumber.slice(-8);
      downloadKml(kmlStr, `${selectedProperty?.property_name || 'propriedade'}_CAR${carShort}_${label}.kml`);
    });
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

  const handleSaveArea = async (area) => {
      if (!selectedProperty || savingRef.current) return;
      savingRef.current = true;
      try {
        const geoJson = {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [area.coordinates] },
          properties: { name: area.name, type: area.type }
        };

        const kmlLayer = {
          id: area.id,
          name: `${area.name} (${area.type})`,
          geojson: geoJson,
          color: area.color,
          visible: true
        };

        const updatedKmlLayers = [...kmlLayers, kmlLayer];
        setKmlLayers(updatedKmlLayers);
        
        await base44.entities.Property.update(selectedProperty.id, { kml_layers: updatedKmlLayers });
        toast.success(`Área "${area.name}" salva!`);
      } catch (err) {
        toast.error('Erro ao salvar área');
        console.error(err);
      } finally {
        savingRef.current = false;
      }
    };

  const handleReloadSICAR = async () => {
    if (!selectedProperty) return;
    const normCarNum = (n) => (n || '').replace(/\./g, '').toUpperCase();
    const carsInMap = new Set(
      kmlLayers.filter(l => l.source === 'SICAR').map(l => normCarNum(l.car_number))
    );
    const carsToLoad = carRecords.filter(c => c.car_number);
    if (!carsToLoad.length) {
      toast.info('Nenhum CAR cadastrado com número válido.');
      return;
    }
    setReloadingSICAR(true);
    setSicarProgress({ done: 0, total: carsToLoad.length });
    let loaded = 0;
    for (const car of carsToLoad) {
      try {
        const kmlItems = await fetchSICARLayersForMap(car.car_number);
        console.log('[SICAR]', car.car_number, '→', kmlItems ? kmlItems.length + ' camadas' : 'null (sem dados)');
        if (kmlItems) {
          const prop = await base44.entities.Property.get(selectedPropertyId);
          const existingKml = (prop.kml_layers || []).filter(
            l => normCarNum(l.car_number) !== normCarNum(car.car_number) || l.source !== 'SICAR'
          );
          const updated = [...existingKml, ...kmlItems];
          await base44.entities.Property.update(selectedPropertyId, { kml_layers: updated });
          setKmlLayers(prev => [
            ...prev.filter(l => normCarNum(l.car_number) !== normCarNum(car.car_number) || l.source !== 'SICAR'),
            ...kmlItems,
          ]);
          loaded++;
        }
      } catch { /* ignora falha individual */ }
      setSicarProgress(p => ({ ...p, done: p.done + 1 }));
    }
    setReloadingSICAR(false);
    queryClient.invalidateQueries(['properties', effectiveEmail, userType]);
    loaded > 0
      ? toast.success(`Camadas SICAR carregadas para ${loaded} CAR(s)!`)
      : toast.warning('Nenhuma camada SICAR encontrada para os CARs sem camadas.');
  };

  const calcKmlArea = (geojson) => {
    if (!geojson?.features) return null;
    let totalArea = 0;
    geojson.features.forEach(f => {
      if (f.geometry?.type === 'Polygon' && f.geometry.coordinates[0]) {
        const coords = f.geometry.coordinates[0];
        const area = Math.abs(coords.reduce((sum, [lng, lat], i) => {
          const next = coords[(i + 1) % coords.length];
          return sum + (lng * next[1] - lat * next[0]);
        }, 0) / 2);
        totalArea += area * 111320 * 111320;
      }
    });
    return totalArea > 0 ? (totalArea / 10000).toFixed(2) : null;
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
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {selectedProperty && carRecords.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReloadSICAR}
              disabled={reloadingSICAR}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 gap-2"
            >
              {reloadingSICAR
                ? <><Loader2 className="w-4 h-4 animate-spin" />Carregando {sicarProgress.done}/{sicarProgress.total} CARs...</>
                : <><RefreshCw className="w-4 h-4" />Recarregar Camadas SICAR</>
              }
            </Button>
          )}
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
      </div>

      {/* Property Info Bar */}
      {selectedProperty && (
        <div className="flex flex-wrap gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm">
          <span className="font-semibold text-emerald-800">{selectedProperty.property_name}</span>
          {selectedProperty.city && <Badge variant="outline" className="text-emerald-700 border-emerald-300">{selectedProperty.city}/{selectedProperty.state}</Badge>}
          {selectedProperty.total_hectares && <Badge variant="outline" className="text-blue-700 border-blue-200">{selectedProperty.total_hectares} ha</Badge>}
          {(selectedProperty.car_numbers?.length > 0
            ? selectedProperty.car_numbers
            : selectedProperty.car_number
            ? [selectedProperty.car_number]
            : []
          ).map((car, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-amber-700 border-amber-200 font-mono text-[10px] max-w-[160px] truncate"
              title={car}
            >
              CAR {i + 1}: …{car.slice(-12)}
            </Badge>
          ))}
          {carData && <Badge className={cn("text-white text-xs", carData.car_status === 'Validado' ? 'bg-emerald-600' : 'bg-amber-500')}>{carData.car_status}</Badge>}
        </div>
      )}

      {/* Advanced Map + Layers Panel (side-by-side on desktop) */}
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
         <div className="lg:col-span-3">
           {selectedProperty ? (
             <AdvancedPropertyMap
               key={selectedPropertyId}
               property={selectedProperty}
               onSave={handleSaveArea}
               LAYER_STYLES={LAYER_STYLES}
               carGeoJson={carGeoJson}
               carLayers={carLayers}
               kmlLayers={kmlLayers}
               propertyAreas={[]}
               activeLayers={activeLayers}
               onLayerToggle={toggleLayer}
               parseGeoJson={parseGeoJson}
               onKmlImport={handleKmlUpload}
               allGeoJsonLayers={allGeoJsonLayers}
               onToggleKmlLayer={toggleKmlLayer}
               onRemoveKmlLayer={removeKmlLayer}
               layerFileInputRef={fileInputRef}
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
         </div>

         {/* Layers Panel on the right */}
         <div className="lg:col-span-1 h-fit">
           {selectedProperty && (
             <MapLayersPanel
               activeLayers={activeLayers}
               onToggleLayer={toggleLayer}
               kmlLayers={kmlLayers}
               onToggleKmlLayer={toggleKmlLayer}
               onToggleKmlLayers={toggleKmlLayers}
               onRemoveKmlLayer={removeKmlLayer}
               onKmlUpload={handleKmlUpload}
               propertyName={selectedProperty.property_name || ''}
               fileInputRef={fileInputRef}
             />
           )}
         </div>
       </div>

      {/* Info Cards */}
      {(() => {
        const somaCarRL = carRecords.reduce((s, c) => s + (parseFloat(c.legal_reserve_hectares) || 0), 0);
        const somaCarApp = carRecords.reduce((s, c) => s + (parseFloat(c.app_hectares) || 0), 0);
        const somaCarTotal = carRecords.reduce((s, c) => s + (parseFloat(c.car_area_hectares) || 0), 0);

        const exibeRL = somaCarRL > 0 ? somaCarRL.toFixed(2) : (carRecords.length > 0 ? (selectedProperty?.legal_reserve_hectares ?? '—') : '—');
        const exibeApp = somaCarApp > 0 ? somaCarApp.toFixed(2) : (carRecords.length > 0 ? (selectedProperty?.app_hectares ?? '—') : '—');
        const exibeTotal = somaCarTotal > 0 ? somaCarTotal.toFixed(2) : (carRecords.length > 0 ? (selectedProperty?.total_hectares ?? '—') : '—');

        const labelRL = somaCarRL > 0 && carRecords.length > 1 ? 'Reserva Legal (soma CARs)' : 'Reserva Legal';
        const labelApp = somaCarApp > 0 && carRecords.length > 1 ? 'APP (soma CARs)' : 'APP';
        const labelTotal = somaCarTotal > 0 && carRecords.length > 1 ? 'Área Total (soma CARs)' : 'Área Total';

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-amber-100 bg-amber-50/50">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <TreePine className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">{labelRL}</p>
                  <p className="text-lg font-bold text-amber-900">{exibeRL} <span className="text-sm font-normal">ha</span></p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-100 bg-blue-50/50">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Droplets className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">{labelApp}</p>
                  <p className="text-lg font-bold text-blue-900">{exibeApp} <span className="text-sm font-normal">ha</span></p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-100 bg-emerald-50/50">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">{labelTotal}</p>
                  <p className="text-lg font-bold text-emerald-900">{exibeTotal} <span className="text-sm font-normal">ha</span></p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* NDVI GEE Panel */}
      {selectedProperty && (
        <NDVIPanel
          geometry={kmlLayers.find(l => l.visible && l.geojson)?.geojson || carGeoJson}
          coordinates={selectedProperty.coordinates}
          propertyName={selectedProperty.property_name}
          kmlLayers={kmlLayers}
          carData={{
            car_polygon: carGeoJson,
            app: kmlLayers.find(l => l.layer_type === 'app' && l.visible)?.geojson || null,
            legal_reserve: kmlLayers.find(l => l.layer_type === 'legal_reserve' && l.visible)?.geojson || null,
          }}
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