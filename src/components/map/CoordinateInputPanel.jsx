import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function CoordinateInputPanel({ onAddPolygon }) {
  const [coords, setCoords] = useState([]);
  const [inputLat, setInputLat] = useState('');
  const [inputLng, setInputLng] = useState('');
  const [format, setFormat] = useState('latlong'); // 'latlong' ou 'utm'

  const addCoordinate = () => {
    if (!inputLat || !inputLng) {
      toast.error('Preencha latitude e longitude');
      return;
    }
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Coordenadas inválidas');
      return;
    }

    setCoords([...coords, { lat, lng }]);
    setInputLat('');
    setInputLng('');
  };

  const removeCoordinate = (idx) => {
    setCoords(coords.filter((_, i) => i !== idx));
  };

  const createPolygon = () => {
    if (coords.length < 3) {
      toast.error('Mínimo 3 pontos para criar polígono');
      return;
    }

    // Fechar polígono se o último ponto não for igual ao primeiro
    const polygon = [...coords.map(c => [c.lng, c.lat])];
    if (polygon[0][0] !== polygon[polygon.length - 1][0] || 
        polygon[0][1] !== polygon[polygon.length - 1][1]) {
      polygon.push(polygon[0]);
    }

    const geojson = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [polygon]
      },
      properties: { name: 'Polígono por Coordenadas' }
    };

    onAddPolygon(geojson);
    setCoords([]);
    setInputLat('');
    setInputLng('');
    toast.success('Polígono criado com sucesso');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
          <MapPin className="w-3 h-3" />
          Coordenadas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inserir Coordenadas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value="latlong"
                checked={format === 'latlong'}
                onChange={(e) => setFormat(e.target.value)}
              />
              Lat/Long
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value="utm"
                checked={format === 'utm'}
                onChange={(e) => setFormat(e.target.value)}
              />
              UTM (em breve)
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Latitude</label>
              <Input
                type="number"
                step="0.00001"
                placeholder="-15.7801"
                value={inputLat}
                onChange={(e) => setInputLat(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Longitude</label>
              <Input
                type="number"
                step="0.00001"
                placeholder="-47.9292"
                value={inputLng}
                onChange={(e) => setInputLng(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <Button
            size="sm"
            onClick={addCoordinate}
            className="w-full h-8 text-xs gap-1.5"
          >
            <Plus className="w-3 h-3" />
            Adicionar Ponto
          </Button>

          {coords.length > 0 && (
            <Card className="bg-gray-50">
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700">Pontos ({coords.length})</p>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {coords.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs p-2 bg-white border border-gray-200 rounded"
                    >
                      <span className="text-gray-600">
                        {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
                      </span>
                      <button
                        onClick={() => removeCoordinate(i)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <Button
                  size="sm"
                  onClick={createPolygon}
                  className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  Criar Polígono
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}