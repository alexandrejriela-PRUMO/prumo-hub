import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

const GEOMETRY_TYPES = [
  { id: 'analysis', label: '🔍 Área para Análise NDVI', desc: 'Polígono específico para monitoramento' },
  { id: 'total', label: '📐 Área Total da Propriedade', desc: 'Delimitação total do imóvel' },
  { id: 'app', label: '💧 APP (Área de Proteção Permanente)', desc: 'Zona de proteção ambiental' },
  { id: 'legal_reserve', label: '🌳 Reserva Legal', desc: 'Área de conservação obrigatória' },
  { id: 'custom', label: '📌 Outra Categoria', desc: 'Defina um nome customizado' },
];

export default function DrawnGeometryCategoryModal({ isOpen, onClose, geometry, onSave, onNdviAnalysis }) {
  const [selectedType, setSelectedType] = useState('analysis');
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const typeConfig = GEOMETRY_TYPES.find(t => t.id === selectedType);
      let layerName = typeConfig.label;
      
      if (selectedType === 'custom') {
        if (!customName.trim()) {
          alert('Digite um nome para a categoria personalizada');
          setSaving(false);
          return;
        }
        layerName = customName.trim();
      }

      const layer = {
        id: String(Date.now()),
        name: layerName,
        type: selectedType,
        geometry,
        geojson: geometry,
        visible: true,
        color: {
          analysis: '#3b82f6',
          total: '#8b5cf6',
          app: '#06b6d4',
          legal_reserve: '#10b981',
          custom: '#f59e0b',
        }[selectedType],
      };

      onSave(layer);
      onClose();
      setCustomName('');
      setSelectedType('analysis');
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickNdvi = async () => {
    onNdviAnalysis(geometry);
    onClose();
    setCustomName('');
    setSelectedType('analysis');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>🎯</span> Classificar Área Desenhada
          </DialogTitle>
          <DialogDescription>
            Como você deseja categorizar este polígono na propriedade?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {GEOMETRY_TYPES.map(type => (
            <label
              key={type.id}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedType === type.id
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-emerald-200'
              }`}
            >
              <input
                type="radio"
                name="geometry-type"
                value={type.id}
                checked={selectedType === type.id}
                onChange={() => setSelectedType(type.id)}
                className="mt-1 w-4 h-4 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{type.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{type.desc}</p>
              </div>
            </label>
          ))}

          {selectedType === 'custom' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <Label htmlFor="custom-name" className="text-xs font-semibold text-amber-900">
                Nome da Categoria Personalizada
              </Label>
              <Input
                id="custom-name"
                placeholder="Ex: Área de Teste, Zona de Pastagem..."
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-4 border-t">
          <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>Após salvar, você poderá analisar esta área com NDVI usando o painel abaixo do mapa.</p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleQuickNdvi}
              variant="outline"
              className="flex-1 text-xs h-8"
            >
              🛰️ Analisar NDVI Agora
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || (selectedType === 'custom' && !customName.trim())}
              className="flex-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? 'Salvando...' : '💾 Salvar Camada'}
            </Button>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-xs h-8"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}