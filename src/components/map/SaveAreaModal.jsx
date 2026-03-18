import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

const AREA_TYPES = {
  total: { label: '📐 Área Total', color: '#3b82f6' },
  app: { label: '💧 APP (Proteção Permanente)', color: '#10b981' },
  rl: { label: '🌳 Reserva Legal', color: '#f59e0b' },
  uso: { label: '🏞️ Área de Uso', color: '#8b5cf6' },
  analise: { label: '🔍 Área para Análise', color: '#ef4444' },
  servidao: { label: '⚖️ Servidões Administrativas', color: '#dc2626' },
  remanescente: { label: '🌲 Remanescente de Vegetação Nativa', color: '#059669' },
  pousio: { label: '🛤️ Pousio', color: '#d97706' },
  outro_restrito: { label: '📋 Outro Uso Restrito', color: '#7c3aed' },
};

export default function SaveAreaModal({ isOpen, onClose, geometry, onSave, existingAreas = [] }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('total');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    
    if (!name.trim()) {
      setError('Digite um nome para a área');
      return;
    }

    if (!geometry?.geometry?.coordinates) {
      setError('Geometria inválida');
      return;
    }

    // Normalizar e validar coordenadas
    let coords = geometry.geometry.coordinates[0] || [];
    
    if (coords.length < 3) {
      setError('Polígono deve ter no mínimo 3 pontos');
      return;
    }

    // Normalizar coordenadas para [lng, lat]
    coords = coords.map(p => [
      Number(p[0] ?? p.lng),
      Number(p[1] ?? p.lat)
    ]).filter(p => !isNaN(p[0]) && !isNaN(p[1]));

    if (coords.length < 3) {
      setError('Coordenadas inválidas');
      return;
    }

    // Fechar polígono se não estiver
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([first[0], first[1]]);
    }

    setSaving(true);
    try {
      const newArea = {
        id: `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        type,
        coordinates: coords,
        color: AREA_TYPES[type].color,
        createdAt: new Date().toISOString(),
      };

      onSave(newArea);
      setName('');
      setType('total');
      setError('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>💾</span> Salvar Área da Propriedade
          </DialogTitle>
          <DialogDescription>
            Classifique e nomeie a área que você desenhou
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="area-name" className="text-sm font-semibold">
              Nome da Área *
            </Label>
            <Input
              id="area-name"
              placeholder="Ex: APP Rio Fundo, Área de Teste..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-9"
            />
            <p className="text-xs text-gray-500">Um identificador para esta área na propriedade</p>
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="area-type" className="text-sm font-semibold">
              Tipo de Área *
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="area-type" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AREA_TYPES).map(([id, { label }]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Escolha qual tipo de área você está delimitando
            </p>
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>A área será salva na propriedade e disponibilizada para análise NDVI.</p>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-9 text-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 h-9 text-sm bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? 'Salvando...' : '💾 Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}