import React from 'react';
import { LayersControl, TileLayer, GeoJSON } from 'react-leaflet';

const { BaseLayer, Overlay } = LayersControl;

export default function MapLayers({ alerts = [] }) {
  // Converter alertas para formato GeoJSON
  const alertsGeoJSON = {
    type: 'FeatureCollection',
    features: alerts.map(alert => {
      if (!alert.coordinates) return null;
      
      const coords = alert.coordinates.split(',').map(c => parseFloat(c.trim()));
      if (coords.length !== 2 || coords.some(isNaN)) return null;

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [coords[1], coords[0]] // [lng, lat]
        },
        properties: {
          title: alert.title,
          severity: alert.severity,
          type: alert.alert_type,
          status: alert.status
        }
      };
    }).filter(f => f !== null)
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Crítica': return '#dc2626';
      case 'Alta': return '#ea580c';
      case 'Média': return '#ca8a04';
      case 'Baixa': return '#2563eb';
      default: return '#6b7280';
    }
  };

  return (
    <LayersControl position="topright">
      {/* Base Layers */}
      <BaseLayer checked name="Mapa Padrão">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
      </BaseLayer>

      <BaseLayer name="Satélite">
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri'
        />
      </BaseLayer>

      <BaseLayer name="Topográfico">
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenTopoMap'
        />
      </BaseLayer>

      {/* Overlays */}
      <Overlay checked name="Alertas Ambientais">
        <GeoJSON
          data={alertsGeoJSON}
          pointToLayer={(feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: 8,
              fillColor: getSeverityColor(feature.properties.severity),
              color: '#fff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8
            });
          }}
          onEachFeature={(feature, layer) => {
            layer.bindPopup(`
              <div style="font-family: system-ui;">
                <h3 style="font-weight: bold; margin-bottom: 4px;">${feature.properties.title}</h3>
                <p style="font-size: 12px; color: #666;">
                  <strong>Tipo:</strong> ${feature.properties.type}<br>
                  <strong>Gravidade:</strong> ${feature.properties.severity}<br>
                  <strong>Status:</strong> ${feature.properties.status}
                </p>
              </div>
            `);
          }}
        />
      </Overlay>

      {/* Camadas de dados geoespaciais (simuladas - necessitam backend) */}
      <Overlay name="Camada PRODES (simulada)">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0}
        />
      </Overlay>

      <Overlay name="Camada MapBiomas (simulada)">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0}
        />
      </Overlay>

      <Overlay name="Camada DETER (simulada)">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0}
        />
      </Overlay>
    </LayersControl>
  );
}