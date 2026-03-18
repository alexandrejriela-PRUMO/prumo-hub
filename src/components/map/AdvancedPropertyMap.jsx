import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapDrawingToolbar from './MapDrawingToolbar';
import CoordinateInputPanel from './CoordinateInputPanel';
import MapMeasurementTools from './MapMeasurementTools';
import LayerCategoryModal from './LayerCategoryModal';
import { toast } from 'sonner';

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

export default function AdvancedPropertyMap({ 
  property, 
  onSave, 
  LAYER_STYLES,
  carGeoJson,
  carLayers,
  kmlLayers,
  activeLayers,
  onLayerToggle,
  parseGeoJson,
  onKmlImport
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
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
   setIsDrawing(false);
   toast.success('Clique com botão direito para finalizar o polígono');
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
    if (featureGroupRef.current) {
      const layer = L.geoJSON(geojson);
      featureGroupRef.current.clearLayers();
      featureGroupRef.current.addLayer(layer);
    }
  };

  const handleSaveGeometry = () => {
    if (!drawnGeometry) {
      toast.error('Nenhuma área desenhada para salvar');
      return;
    }
    // Abre modal para categorizar a camada
    setCategoryModalOpen(true);
  };

  const handleSaveCategorizedLayer = (layer) => {
    console.log('[AdvancedPropertyMap] Camada categorizada sendo salva:', JSON.stringify(layer));
    // Salva o layer como antes, mas agora com tipo e cor
    onSave(drawnGeometry, layer);
    setDrawnGeometry(null);
    setIsDrawing(false);
    toast.success(`Camada "${layer.name}" salva no mapa`);
  };

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

  const MapContent = () => {
    let map;
    try {
      map = useMap();
    } catch (e) {
      // useMap pode falhar se não estiver dentro de MapContainer
      map = null;
    }
    useEffect(() => {
      if (isFullscreen) {
        map.invalidateSize();
      }
    }, [isFullscreen, map]);

    return (
      <>
        {/* Base layers */}
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

        {/* CAR boundary */}
        {activeLayers.car && carGeoJson && (
          <GeoJSON data={carGeoJson} style={LAYER_STYLES.car} />
        )}

        {/* APP */}
        {activeLayers.app && carLayers?.app_layer_url && (() => {
          const gj = parseGeoJson(carLayers.app_layer_url);
          return gj ? <GeoJSON data={gj} style={LAYER_STYLES.app} /> : null;
        })()}

        {/* Legal Reserve */}
        {activeLayers.legalReserve && carLayers?.legal_reserve_url && (() => {
          const gj = parseGeoJson(carLayers.legal_reserve_url);
          return gj ? <GeoJSON data={gj} style={LAYER_STYLES.legalReserve} /> : null;
        })()}

        {/* KML layers */}
        {kmlLayers?.filter(l => l.visible).map(layer => (
          <GeoJSON
            key={layer.id}
            data={layer.geojson}
            style={{ color: layer.color, weight: 2, fillOpacity: 0.18, fillColor: layer.color }}
          />
        ))}

        {/* Drawn geometry */}
        {drawnGeometry && (
          <GeoJSON
            data={drawnGeometry}
            style={{ color: '#10b981', weight: 3, fillOpacity: 0.25, fillColor: '#10b981' }}
          />
        )}

        {/* Drawing handler */}
        {isDrawing && (
          <DrawingLayer 
            onPolygonCreated={handleAddPolygon}
            featureGroupRef={featureGroupRef}
          />
        )}
      </>
    );
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
        <MapContent />
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
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveGeometry}
                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all"
              >
                💾 Salvar
              </button>
              <button
                onClick={handleCancelDraw}
                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-all"
              >
                ✕ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Layer Category Modal */}
      <LayerCategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        geometry={drawnGeometry}
        onSave={handleSaveCategorizedLayer}
        existingLayers={kmlLayers}
      />
    </div>
  );
}