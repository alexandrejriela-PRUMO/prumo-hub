import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

const LAYER_TYPES = [
  { value: 'total_area', label: 'Área Total da Propriedade' },
  { value: 'app', label: 'APP (Proteção Permanente)' },
  { value: 'car', label: 'CAR (Cadastro Ambiental)' },
  { value: 'legal_reserve', label: 'Reserva Legal' },
  { value: 'recovery', label: 'Recuperação' },
  { value: 'custom', label: 'Outro (Personalizado)' },
];

export default function LayerCategoryModal({ isOpen, onClose, geometry, onSave, existingLayers = [] }) {
  const [selectedType, setSelectedType] = useState('custom');
  const [customName, setCustomName] = useState('');
  const [color, setColor] = useState('#66bd63');
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');

    // Valida nome
    const layerName = selectedType === 'custom' ? customName.trim() : LAYER_TYPES.find(t => t.value === selectedType)?.label;
    if (!layerName) {
      setError('Digite um nome para a camada');
      return;
    }

    // Cria objeto da camada
    const newLayer = {
      id: `layer-${Date.now()}`,
      name: layerName,
      type: selectedType,
      geojson: geometry,
      color: color,
      visible: true,
    };

    onSave(newLayer);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSelectedType('custom');
    setCustomName('');
    setColor('#66bd63');
    setError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
        onClose();
      }
    }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Categorizar Camada no Mapa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Camada</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAYER_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedType === 'custom' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Camada</label>
              <Input
                placeholder="Ex: Área de Cultivo"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Cor no Mapa</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
              />
              <div className="text-sm text-gray-500">{color}</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
            Salvar Camada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}