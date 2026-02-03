import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const commonActivities = [
  'Agricultura',
  'Pecuária',
  'Silvicultura',
  'Fruticultura',
  'Horticultura',
  'Avicultura',
  'Piscicultura',
  'Apicultura',
  'Reflorestamento'
];

export default function PropertyForm({ property, user, onSubmit, onCancel }) {
  const initialActivities = property?.activities 
    ? (typeof property.activities === 'string' ? property.activities.split(',').map(a => a.trim()) : property.activities)
    : [];
  
  const [formData, setFormData] = useState(property ? {
    ...property,
    activities: initialActivities
  } : {
    property_name: '',
    location: '',
    city: '',
    state: 'RS',
    coordinates: '',
    total_hectares: '',
    app_hectares: '',
    legal_reserve_hectares: '',
    main_activity: '',
    activities: [],
    authorized_users: []
  });

  const [activityInput, setActivityInput] = useState('');

  const addActivity = (activity) => {
    if (activity && !formData.activities.includes(activity)) {
      setFormData({
        ...formData,
        activities: [...formData.activities, activity]
      });
      setActivityInput('');
    }
  };

  const removeActivity = (activity) => {
    setFormData({
      ...formData,
      activities: formData.activities.filter(a => a !== activity)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      owner_email: property?.owner_email || user.email,
      total_hectares: formData.total_hectares ? parseFloat(formData.total_hectares) : undefined,
      app_hectares: formData.app_hectares ? parseFloat(formData.app_hectares) : undefined,
      legal_reserve_hectares: formData.legal_reserve_hectares ? parseFloat(formData.legal_reserve_hectares) : undefined,
      activities: formData.activities.length > 0 ? formData.activities.join(', ') : '',
    };
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label>Nome da Propriedade *</Label>
          <Input
            value={formData.property_name}
            onChange={(e) => setFormData({ ...formData, property_name: e.target.value })}
            placeholder="Ex: Fazenda Santa Maria"
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Endereço Completo</Label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Ex: Rodovia BR-116, Km 245"
          />
        </div>

        <div className="space-y-2">
          <Label>Cidade *</Label>
          <Input
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Ex: Porto Alegre"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Estado *</Label>
          <Select
            value={formData.state}
            onValueChange={(v) => setFormData({ ...formData, state: v })}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {states.map(state => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Coordenadas do Centro (lat, lng)</Label>
          <Input
            value={formData.coordinates}
            onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
            placeholder="Ex: -30.0346, -51.2177"
          />
          <p className="text-xs text-gray-500">
            Use o mapa para definir os limites completos da propriedade
          </p>
        </div>

        <div className="space-y-2">
          <Label>Total de Hectares</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.total_hectares}
            onChange={(e) => setFormData({ ...formData, total_hectares: e.target.value })}
            placeholder="100.50"
          />
        </div>

        <div className="space-y-2">
          <Label>Hectares de APP</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.app_hectares}
            onChange={(e) => setFormData({ ...formData, app_hectares: e.target.value })}
            placeholder="20.00"
          />
        </div>

        <div className="space-y-2">
          <Label>Hectares de Reserva Legal</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.legal_reserve_hectares}
            onChange={(e) => setFormData({ ...formData, legal_reserve_hectares: e.target.value })}
            placeholder="20.00"
          />
        </div>

        <div className="space-y-2">
          <Label>Atividade Principal</Label>
          <Select
            value={formData.main_activity}
            onValueChange={(v) => setFormData({ ...formData, main_activity: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {commonActivities.map(activity => (
                <SelectItem key={activity} value={activity}>{activity}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Atividades na Propriedade</Label>
        <div className="flex gap-2">
          <Select
            value={activityInput}
            onValueChange={(v) => {
              addActivity(v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Adicionar atividade..." />
            </SelectTrigger>
            <SelectContent>
              {commonActivities
                .filter(a => !formData.activities.includes(a))
                .map(activity => (
                  <SelectItem key={activity} value={activity}>{activity}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        {formData.activities.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.activities.map((activity, idx) => (
              <Badge key={idx} variant="outline" className="pr-1">
                {activity}
                <button
                  type="button"
                  onClick={() => removeActivity(activity)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {property ? 'Atualizar' : 'Criar'} Propriedade
        </Button>
      </div>
    </form>
  );
}