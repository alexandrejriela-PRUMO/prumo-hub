import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function PolygonDrawer({ positions, setPositions }) {
  useMapEvents({
    click(e) {
      setPositions([...positions, [e.latlng.lat, e.latlng.lng]]);
    },
  });
  return null;
}

export default function PropertyMap({ property, onSave, onCancel }) {
  const [positions, setPositions] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [manualCoords, setManualCoords] = useState('');

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

  const handleSave = () => {
    if (positions.length >= 3) {
      const closedPositions = [...positions, positions[0]];
      const geoJSON = {
        type: 'Polygon',
        coordinates: [closedPositions.map(pos => [pos[1], pos[0]])]
      };
      onSave(geoJSON);
    } else if (positions.length === 0 && property?.boundaries) {
      onSave(null);
    }
  };

  const clearPolygon = () => {
    setPositions([]);
    setIsDrawing(false);
  };

  const addManualPoint = () => {
    const coords = parseCoordinates(manualCoords);
    if (coords) {
      setPositions([...positions, coords]);
      setManualCoords('');
    }
  };

  React.useEffect(() => {
    if (property?.boundaries && positions.length === 0) {
      const coords = property.boundaries.coordinates[0].map(coord => [coord[1], coord[0]]);
      coords.pop();
      setPositions(coords);
    }
  }, [property]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-2">
        <Button
          type="button"
          onClick={() => setIsDrawing(!isDrawing)}
          className={isDrawing ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-600 hover:bg-gray-700'}
        >
          {isDrawing ? 'Desenhando... (clique no mapa)' : 'Iniciar Desenho'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={clearPolygon}
          disabled={positions.length === 0}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Limpar ({positions.length} pontos)
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Adicionar ponto manual: -30.034, -51.217"
          value={manualCoords}
          onChange={(e) => setManualCoords(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addManualPoint()}
        />
        <Button type="button" variant="outline" onClick={addManualPoint}>
          Adicionar
        </Button>
      </div>

      <div className="h-[500px] rounded-lg overflow-hidden border-2 border-gray-200">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          {isDrawing && <PolygonDrawer positions={positions} setPositions={setPositions} />}
          
          {positions.length >= 3 && (
            <Polygon
              positions={positions}
              pathOptions={{ color: '#16a34a', fillOpacity: 0.3 }}
            />
          )}
        </MapContainer>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Como usar:</strong> Clique em "Iniciar Desenho" e depois clique no mapa para adicionar pontos. 
          Você precisa de no mínimo 3 pontos para criar um polígono. Também pode adicionar pontos manualmente digitando as coordenadas.
        </p>
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          type="button" 
          onClick={handleSave}
          disabled={positions.length < 3}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Salvar Limites {positions.length >= 3 && `(${positions.length} pontos)`}
        </Button>
      </div>
    </div>
  );
}