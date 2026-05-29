import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, FileText, Layers, Download, Edit, Trash2, TreePine } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors = {
  'Validado': 'bg-green-100 text-green-700 border-green-200',
  'Em análise pelo órgão ambiental': 'bg-blue-100 text-blue-700 border-blue-200',
  'Pendente de análise': 'bg-gray-100 text-gray-600 border-gray-200',
  'Com inconsistências': 'bg-red-100 text-red-700 border-red-200',
  'Cancelado': 'bg-red-100 text-red-700 border-red-200',
  'Necessita retificação': 'bg-orange-100 text-orange-700 border-orange-200',
};

export default function CARSelector({ carRecords, selectedCarId, onSelectCar, onEdit, onDelete, canEdit }) {
  const [open, setOpen] = useState(false);

  if (!carRecords || carRecords.length === 0) return null;
  if (carRecords.length === 1) {
    const car = carRecords[0];
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
        <div className="flex items-center gap-2">
          <TreePine className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-900 truncate max-w-xs">
            {car.car_number ? car.car_number.slice(-20) : 'CAR 1'}
          </span>
          <Badge className={cn('text-xs border', statusColors[car.car_status] || 'bg-gray-100 text-gray-600')}>
            {car.car_status}
          </Badge>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-700" onClick={() => onEdit(car.id)}>
              <Edit className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500" onClick={() => onDelete(car.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  const selected = carRecords.find(c => c.id === selectedCarId) || carRecords[0];

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <TreePine className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-emerald-900 truncate">
            {selected?.car_number ? selected.car_number.slice(-30) : `CAR ${carRecords.findIndex(c => c.id === selected?.id) + 1}`}
          </span>
          {selected && (
            <Badge className={cn('text-xs border flex-shrink-0', statusColors[selected.car_status] || 'bg-gray-100 text-gray-600')}>
              {selected.car_status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-emerald-600 font-medium">{carRecords.length} CARs</span>
          <ChevronDown className={cn('w-4 h-4 text-emerald-600 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-emerald-200 rounded-xl shadow-lg overflow-hidden">
          {carRecords.map((car, idx) => {
            const isSelected = car.id === (selectedCarId || carRecords[0]?.id);
            return (
              <div
                key={car.id}
                className={cn(
                  'flex items-center justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-emerald-50 transition-colors border-b last:border-b-0 border-gray-100',
                  isSelected && 'bg-emerald-50'
                )}
                onClick={() => { onSelectCar(car.id); setOpen(false); }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', isSelected ? 'bg-emerald-500' : 'bg-gray-300')} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {car.car_number
                        ? `CAR ${idx + 1} — ...${car.car_number.slice(-20)}`
                        : `CAR ${idx + 1}`}
                    </p>
                    {(car.municipality || car.car_area_hectares) && (
                      <p className="text-xs text-gray-400">
                        {car.municipality && `${car.municipality}/${car.state} `}
                        {car.car_area_hectares && `• ${car.car_area_hectares} ha`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge className={cn('text-xs border', statusColors[car.car_status] || 'bg-gray-100 text-gray-600')}>
                    {car.car_status}
                  </Badge>
                  {canEdit && (
                    <>
                      <button
                        className="p-1 rounded hover:bg-emerald-100 text-emerald-700 transition-colors"
                        onClick={(e) => { e.stopPropagation(); onEdit(car.id); setOpen(false); }}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-red-50 text-red-500 transition-colors"
                        onClick={(e) => { e.stopPropagation(); onDelete(car.id); setOpen(false); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}