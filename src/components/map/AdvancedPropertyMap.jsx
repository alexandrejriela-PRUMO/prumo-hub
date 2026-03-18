import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, FeatureGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import MapDrawingToolbar from './MapDrawingToolbar';
import CoordinateInputPanel from './CoordinateInputPanel';
import MapMeasurementTools from './MapMeasurementTools';
import { toast } from 'sonner';

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
    if (featureGroupRef.current && featureGroupRef.current.getLayers().length > 0) {
      const layer = featureGroupRef.current.getLayers()[0];
      const geojson = layer.toGeoJSON();
      setDrawnGeometry(geojson);
      setIsDrawing(false);
      toast.success('Polígono desenhado com sucesso');
    } else {
      toast.error('Desenhe um polígono primeiro');
    }
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
    onSave(drawnGeometry);
    setDrawnGeometry(null);
    setIsDrawing(false);
  };

  const measurements = drawnGeometry ? getGeometryStats(drawnGeometry) : null;

  const getCenter = () => {
    if (property?.coordinates) {
      const [lat, lng] = property.coordinates.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return [-15.7801, -47.9292];
  };

  const MapContent = () => {
    const map = useMap();
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

        {/* Drawing control */}
        {isDrawing && (
          <FeatureGroup ref={featureGroupRef}>
            <EditControl
              position="topleft"
              onCreated={() => {}}
              onEdited={() => {}}
              onDeleted={() => {}}
              draw={{
                polygon: true,
                polyline: false,
                rectangle: false,
                circle: false,
                marker: false,
                circlemarker: false
              }}
              edit={{ featureGroup: featureGroupRef.current }}
            />
          </FeatureGroup>
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
    </div>
  );
}