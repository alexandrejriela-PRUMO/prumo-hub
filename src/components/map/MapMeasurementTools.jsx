import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Ruler, MapPin } from 'lucide-react';

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate polygon area using Shoelace formula (in hectares)
function calculatePolygonArea(coordinates) {
  if (!coordinates || coordinates.length < 3) return 0;
  
  const rad = Math.PI / 180;
  let area = 0;
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const lat1 = coordinates[i][1] * rad;
    const lng1 = coordinates[i][0] * rad;
    const lat2 = coordinates[i + 1][1] * rad;
    const lng2 = coordinates[i + 1][0] * rad;
    area += lng1 * Math.sin(lat2) - lng2 * Math.sin(lat1);
  }
  
  const R = 6371000; // Earth's radius in meters
  return Math.abs(area) * R * R / 2 / 10000; // Convert to hectares
}

// Calculate perimeter in kilometers
function calculatePerimeter(coordinates) {
  if (!coordinates || coordinates.length < 2) return 0;
  let perimeter = 0;
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const distance = calculateDistance(
      coordinates[i][1], coordinates[i][0],
      coordinates[i + 1][1], coordinates[i + 1][0]
    );
    perimeter += distance;
  }
  
  return perimeter;
}

export default function MapMeasurementTools({ geometry }) {
  const [selectedTool, setSelectedTool] = useState(null);
  const [measurements, setMeasurements] = useState(null);

  const calculateMeasurements = () => {
    if (!geometry || geometry.type !== 'Polygon' || !geometry.coordinates[0]) {
      return null;
    }

    const coords = geometry.coordinates[0];
    const area = calculatePolygonArea(coords);
    const perimeter = calculatePerimeter(coords);

    return {
      area: `${area.toFixed(2)} ha`,
      perimeter: `${(perimeter / 1000).toFixed(2)} km`,
      vertices: coords.length - 1,
      perimeterMeters: perimeter.toFixed(0)
    };
  };

  React.useEffect(() => {
    if (selectedTool === 'measure') {
      setMeasurements(calculateMeasurements());
    }
  }, [geometry, selectedTool]);

  if (!geometry || geometry.type !== 'Polygon') {
    return null;
  }

  return (
    <Dialog open={selectedTool === 'measure'} onOpenChange={(open) => {
      setSelectedTool(open ? 'measure' : null);
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
          <Ruler className="w-3 h-3" />
          Medir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Medições</DialogTitle>
        </DialogHeader>

        {measurements && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide mb-1">Área</p>
                <p className="text-xl font-bold text-emerald-900">{measurements.area}</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 font-medium uppercase tracking-wide mb-1">Perímetro</p>
                <p className="text-xl font-bold text-blue-900">{measurements.perimeter}</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-700 font-medium uppercase tracking-wide mb-2">Detalhes</p>
              <div className="space-y-1 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Vértices:</span>
                  <strong>{measurements.vertices}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Perímetro (m):</span>
                  <strong>{measurements.perimeterMeters} m</strong>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
              <p className="font-semibold mb-1">💡 Dica</p>
              <p>Use a ferramenta de desenho para criar novas áreas ou importar KML para medir.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}