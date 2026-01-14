import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function PropertyMap({ property, onSave, onCancel }) {
  const [drawnItems, setDrawnItems] = useState(null);
  const mapRef = useRef(null);

  const parseCoordinates = (coordString) => {
    if (!coordString) return null;
    try {
      const parts = coordString.split(',').map(p => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const center = parseCoordinates(property?.coordinates) || [-15.7939, -47.8828];

  const handleCreated = (e) => {
    const layer = e.layer;
    const geoJSON = layer.toGeoJSON();
    setDrawnItems(geoJSON.geometry);
  };

  const handleEdited = (e) => {
    const layers = e.layers;
    layers.eachLayer((layer) => {
      const geoJSON = layer.toGeoJSON();
      setDrawnItems(geoJSON.geometry);
    });
  };

  const handleDeleted = () => {
    setDrawnItems(null);
  };

  const handleSave = () => {
    if (drawnItems) {
      onSave(drawnItems);
    } else if (property?.boundaries) {
      onSave(null); // Remove boundaries if deleted
    }
  };

  useEffect(() => {
    if (property?.boundaries) {
      setDrawnItems(property.boundaries);
    }
  }, [property]);

  return (
    <div className="space-y-4">
      <div className="h-[500px] rounded-lg overflow-hidden border-2 border-gray-200">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          <FeatureGroup>
            <EditControl
              position="topright"
              onCreated={handleCreated}
              onEdited={handleEdited}
              onDeleted={handleDeleted}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: {
                  allowIntersection: false,
                  drawError: {
                    color: '#e74c3c',
                    message: '<strong>Erro!</strong> As bordas não podem se cruzar.'
                  },
                  shapeOptions: {
                    color: '#16a34a',
                    fillOpacity: 0.3
                  }
                }
              }}
              edit={{
                featureGroup: mapRef.current,
                edit: true,
                remove: true
              }}
            />
            
            {property?.boundaries && !drawnItems && (
              <Polygon
                positions={property.boundaries.coordinates[0].map(coord => [coord[1], coord[0]])}
                pathOptions={{ color: '#16a34a', fillOpacity: 0.3 }}
              />
            )}
          </FeatureGroup>
        </MapContainer>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Como usar:</strong> Use o ícone de polígono (▢) no canto superior direito do mapa para desenhar os limites da propriedade. 
          Clique nos pontos do mapa para definir os vértices. Você pode editar ou deletar polígonos existentes usando os ícones de edição.
        </p>
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          type="button" 
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Salvar Limites
        </Button>
      </div>
    </div>
  );
}