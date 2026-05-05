import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapDrawingToolbar from './MapDrawingToolbar';
import CoordinateInputPanel from './CoordinateInputPanel';
import MapMeasurementTools from './MapMeasurementTools';
import SaveAreaModal from './SaveAreaModal';
import { toast } from 'sonner';

const AREA_TYPES = {
  total: { label: '📐 Área Total', color: '#3b82f6' },
  app: { label: '💧 APP', color: '#10b981' },
  rl: { label: '🌳 Reserva Legal', color: '#f59e0b' },
  uso: { label: '🏞️ Área de Uso', color: '#8b5cf6' },
  analise: { label: '🔍 Análise', color: '#ef4444' },
};

// Component para gerenciar clicks nos layers
function LayerClickHandler({ propertyAreas, kmlLayers }) {
  const map = useMap();

  return null;
}

// Simple drawing layer component
function DrawingLayer({ onPolygonCreated, featureGroupRef }) {
  const map = useMap();
  
  useEffect(() => {
    const polygon = [];
    const polylineLayer = L.polyline([], { color: '#10b981', weight: 2, dashArray: '5, 5' });
    const pointsLayer = L.featureGroup();
    polylineLayer.addTo(map);
    pointsLayer.addTo(map);

    const handleClick = (e) => {
      const { lat, lng } = e.latlng;
      polygon.push([lat, lng]);
      
      // Add marker
      L.circleMarker([lat, lng], { radius: 5, color: '#10b981', fillColor: '#10b981', fillOpacity: 0.8 })
        .addTo(pointsLayer);
      
      // Update polyline
      polylineLayer.setLatLngs(polygon);
    };

    const handleRightClick = (e) => {
       if (polygon.length > 2) {
         polygon.push(polygon[0]); // Close polygon
         const geojson = {
           type: 'Feature',
           geometry: { type: 'Polygon', coordinates: [[...polygon.map(p => [p[1], p[0]])]] },
           properties: { name: 'Polígono desenhado' }
         };
         console.log('[DrawingLayer] Polígono criado:', JSON.stringify(geojson));
         onPolygonCreated(geojson);
         polylineLayer.remove();
         pointsLayer.remove();
         map.off('click', handleClick);
         map.off('contextmenu', handleRightClick);
       }
     };

    map.on('click', handleClick);
    map.on('contextmenu', handleRightClick);

    return () => {
      map.off('click', handleClick);
      map.off('contextmenu', handleRightClick);
      polylineLayer.remove();
      pointsLayer.remove();
    };
  }, [map, onPolygonCreated]);

  return null;
}

// Calculate area and perimeter
function getGeometryStats(geojson) {
  if (!geojson || !geojson.geometry) return {};
  
  const coords = geojson.geometry.coordinates?.[0] || [];
  if (coords.length < 3) return {};

  // Simple area calc
  let area = 0;
  const rad = Math.PI / 180;
  for (let i = 0; i < coords.length - 1; i++) {
    const lat1 = coords[i][1] * rad;
    const lng1 = coords[i][0] * rad;
    const lat2 = coords[i + 1][1] * rad;
    const lng2 = coords[i + 1][0] * rad;
    area += lng1 * Math.sin(lat2) - lng2 * Math.sin(lat1);
  }
  
  const R = 6371000;
  area = Math.abs(area) * R * R / 2 / 10000;

  return { area: `${area.toFixed(2)} ha`, vertices: coords.length - 1 };
}

// ── MapContent extracted as a module-level component to preserve React fiber identity ──
function MapContent({ 
  activeLayers, carGeoJson, carLayers, kmlLayers, propertyAreas,
  drawnGeometry, isDrawing, handleAddPolygon, featureGroupRef,
  parseGeoJson, LAYER_STYLES, isFullscreen, mapRef
}) {
  const map = useMap();

  useEffect(() => {
    if (map) mapRef.current = map;
    if (isFullscreen && map) map.invalidateSize();
  }, [isFullscreen, map, mapRef]);

  return (
    <>
      {activeLayers.satellite ? (
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution='&copy; Google Earth'
          maxZoom={20}
        />
      ) : (
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
      )}

      {activeLayers.car && carGeoJson && (
        <GeoJSON data={carGeoJson} style={LAYER_STYLES.car} />
      )}

      {activeLayers.app && carLayers?.app_layer_url && (() => {
        const gj = parseGeoJson(carLayers.app_layer_url);
        return gj ? <GeoJSON data={gj} style={LAYER_STYLES.app} /> : null;
      })()}

      {activeLayers.legalReserve && carLayers?.legal_reserve_url && (() => {
        const gj = parseGeoJson(carLayers.legal_reserve_url);
        return gj ? <GeoJSON data={gj} style={LAYER_STYLES.legalReserve} /> : null;
      })()}

      {propertyAreas?.map(area => {
        const geojson = {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [area.coordinates] },
          properties: { name: area.name, type: area.type }
        };
        return (
          <GeoJSON
            key={area.id}
            data={geojson}
            style={{ color: area.color, weight: 2.5, fillOpacity: 0.2, fillColor: area.color }}
            onEachFeature={(feature, layer) => {
              layer.on('click', () => {
                if (!map) return;
                const bounds = L.latLngBounds(area.coordinates.map(([lng, lat]) => [lat, lng]));
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
              });
            }}
          />
        );
      })}

      {kmlLayers?.filter(l => l.visible).map(layer => (
        <GeoJSON
          key={layer.id}
          data={layer.geojson}
          style={{ color: layer.color, weight: 2, fillOpacity: 0.18, fillColor: layer.color }}
          onEachFeature={(feature, geoJsonLayer) => {
            geoJsonLayer.on('click', () => {
              if (!map || !layer.geojson?.geometry?.coordinates) return;
              const coords = layer.geojson.geometry.coordinates[0];
              const bounds = L.latLngBounds(coords.map(([lng, lat]) => [lat, lng]));
              map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            });
          }}
        />
      ))}

      {drawnGeometry && (
        <GeoJSON
          data={drawnGeometry}
          style={{ color: '#10b981', weight: 3, fillOpacity: 0.25, fillColor: '#10b981' }}
        />
      )}

      {isDrawing && (
        <DrawingLayer
          onPolygonCreated={handleAddPolygon}
          featureGroupRef={featureGroupRef}
        />
      )}
    </>
  );
}

export default function AdvancedPropertyMap({ 
  property, 
  onSave, 
  LAYER_STYLES,
  carGeoJson,
  carLayers,
  kmlLayers,
  propertyAreas = [],
  activeLayers,
  onLayerToggle,
  parseGeoJson,
  onKmlImport,
  allGeoJsonLayers = []
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveAreaModalOpen, setSaveAreaModalOpen] = useState(false);
  const [lastSavedAreaId, setLastSavedAreaId] = useState(null);
  const featureGroupRef = useRef(null);
  const mapRef = useRef(null);

  const handleStartDraw = () => {
    setIsDrawing(true);
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
      setDrawnGeometry(null);
    }
  };

  const handleFinishDraw = () => {
   toast.info('Clique com botão direito no mapa para finalizar o polígono');
  };

  const handleCancelDraw = () => {
    setIsDrawing(false);
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
      setDrawnGeometry(null);
    }
  };

  const handleClearAll = () => {
    if (confirm('Limpar todos os desenhos?')) {
      setDrawnGeometry(null);
      setIsDrawing(false);
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
      }
    }
  };

  const handleAddPolygon = (geojson) => {
    setDrawnGeometry(geojson);
    setIsDrawing(false);
    if (featureGroupRef.current) {
      const layer = L.geoJSON(geojson);
      featureGroupRef.current.clearLayers();
      featureGroupRef.current.addLayer(layer);
    }
    toast.success('Polígono finalizado! Clique em "Salvar Área" para prosseguir.');
  };

  const handleSaveGeometry = () => {
    if (!drawnGeometry) {
      toast.error('Nenhuma área desenhada para salvar');
      return;
    }
    // Abre modal para salvar a área com nome e tipo
    setSaveAreaModalOpen(true);
  };

  const handleSaveArea = (area) => {
    console.log('[AdvancedPropertyMap] Área salva:', JSON.stringify(area));
    onSave(area);
    setDrawnGeometry(null);
    setIsDrawing(false);
    setLastSavedAreaId(area.id);
    toast.success(`Área "${area.name}" salva como ${AREA_TYPES[area.type]?.label || area.type}!`);
  };

  // Zoom automático para última área salva ou para todas as áreas ao carregar
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    // Se tem área recém-salva, foca nela
    if (lastSavedAreaId) {
      const area = propertyAreas.find(a => a.id === lastSavedAreaId);
      if (area?.coordinates) {
        const bounds = L.latLngBounds(
          area.coordinates.map(([lng, lat]) => [lat, lng])
        );
        setTimeout(() => {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }, 100);
        return;
      }
    }

    // Senão, tenta usar todas as camadas (CAR + KML + áreas)
    if (allGeoJsonLayers && allGeoJsonLayers.length > 0) {
      try {
        const combined = L.featureGroup();
        allGeoJsonLayers.forEach(gj => {
          if (gj) {
            try {
              const layer = L.geoJSON(gj);
              const b = layer.getBounds();
              if (b.isValid()) combined.addLayer(layer);
            } catch {}
          }
        });
        const bounds = combined.getBounds();
        if (bounds.isValid()) {
          setTimeout(() => {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
          }, 100);
          return;
        }
      } catch {}
    }

    // Se não funcionar, centraliza na propriedade
    if (property?.coordinates) {
      const coordStr = String(property.coordinates).trim();
      const [lat, lng] = coordStr.split(/[,;]/).map(c => Number(c.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        setTimeout(() => {
          map.setView([lat, lng], 13);
        }, 100);
      }
    }
  }, [allGeoJsonLayers, property?.coordinates]);

  // Calcula área de um polígono (GeoJSON)
  const calculateArea = (geojson) => {
    if (!geojson || geojson.type !== 'Polygon' && geojson.type !== 'Feature') return null;
    
    const coords = geojson.type === 'Feature' 
      ? geojson.geometry?.coordinates[0] 
      : geojson.coordinates[0];
    
    if (!coords || coords.length < 3) return null;
    
    // Shoelace formula para área
    const area = Math.abs(
      coords.reduce((sum, [lng, lat], i) => {
        const next = coords[(i + 1) % coords.length];
        return sum + (lng * next[1] - lat * next[0]);
      }, 0) / 2
    );
    
    // Converte de graus² para metros²
    const metersPerDegree = 111320;
    const areaMeters = area * metersPerDegree * metersPerDegree;
    const hectares = (areaMeters / 10000).toFixed(2);
    const km2 = (areaMeters / 1000000).toFixed(2);
    const m2 = Math.round(areaMeters);
    
    return { hectares, km2, m2, meters: areaMeters };
  };

  const measurements = drawnGeometry ? (() => {
    const areaData = calculateArea(drawnGeometry);
    return areaData ? {
      area: `${areaData.hectares} ha (${areaData.km2} km²) • ${areaData.m2.toLocaleString('pt-BR')} m²`,
      vertices: drawnGeometry.geometry?.coordinates[0]?.length - 1 || 0,
    } : null;
  })() : null;

  const getCenter = () => {
    if (property?.coordinates) {
      const coords = property.coordinates.trim().split(',').map(c => Number(c.trim()));
      if (coords.length >= 2 && coords.every(n => !isNaN(n))) {
        // Se property.coordinates é [lat, lng], retorna diretamente
        // Leaflet espera [lat, lng]
        return coords;
      }
    }
    return [-15.7801, -47.9292]; // Brasília como fallback
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-gray-200 shadow-lg ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
    }`} style={{ height: isFullscreen ? '100vh' : '560px' }}>
      <MapContainer
        ref={mapRef}
        center={getCenter()}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <MapContent
          activeLayers={activeLayers}
          carGeoJson={carGeoJson}
          carLayers={carLayers}
          kmlLayers={kmlLayers}
          propertyAreas={propertyAreas}
          drawnGeometry={drawnGeometry}
          isDrawing={isDrawing}
          handleAddPolygon={handleAddPolygon}
          featureGroupRef={featureGroupRef}
          parseGeoJson={parseGeoJson}
          LAYER_STYLES={LAYER_STYLES}
          isFullscreen={isFullscreen}
          mapRef={mapRef}
        />
      </MapContainer>

      {/* Toolbar */}
      <MapDrawingToolbar
        isDrawing={isDrawing}
        onStartDraw={handleStartDraw}
        onFinishDraw={handleFinishDraw}
        onCancelDraw={handleCancelDraw}
        onClearAll={handleClearAll}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        measurements={measurements}
      />

      {/* Tools row */}
      {!isDrawing && (
        <div className="absolute top-4 right-4 z-[500] flex gap-2 bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 border border-gray-200">
          <CoordinateInputPanel onAddPolygon={handleAddPolygon} />
          {drawnGeometry && <MapMeasurementTools geometry={drawnGeometry} />}
          {drawnGeometry && (
            <button
              onClick={handleSaveGeometry}
              className="px-3 py-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all"
            >
              ✓ Salvar
            </button>
          )}
        </div>
      )}

      {/* Summary card after draw finalized */}
      {!isDrawing && drawnGeometry && (
        <div className="absolute bottom-4 left-4 right-4 z-[500] bg-white/98 backdrop-blur rounded-xl shadow-lg p-4 border border-emerald-200 max-w-md mx-auto">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-emerald-900 flex items-center gap-2 mb-2">
                <span className="text-lg">✓</span> Polígono Desenhado
              </h3>
              {measurements?.area && (
                <div className="bg-emerald-50 rounded-lg p-2 text-sm text-emerald-800 border border-emerald-100">
                  <p className="font-semibold text-emerald-900">{measurements.area}</p>
                  {measurements.vertices && <p className="text-xs mt-1 opacity-75">📍 {measurements.vertices} pontos</p>}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleSaveGeometry}
                className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all"
              >
                💾 Salvar Área
              </button>
              <button
                onClick={handleCancelDraw}
                className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all"
              >
                ✕ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Area Modal */}
      <SaveAreaModal
        isOpen={saveAreaModalOpen}
        onClose={() => setSaveAreaModalOpen(false)}
        geometry={drawnGeometry}
        onSave={handleSaveArea}
      />
    </div>
  );
}