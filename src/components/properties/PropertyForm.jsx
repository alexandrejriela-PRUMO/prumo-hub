import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Users2 } from 'lucide-react';

const DIRECTIONS = ['Norte', 'Sul', 'Leste', 'Oeste', 'Nordeste', 'Noroeste', 'Sudeste', 'Sudoeste'];

const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const ruralActivities = [
  'Agricultura', 'Pecuária', 'Silvicultura', 'Fruticultura',
  'Horticultura', 'Avicultura', 'Piscicultura', 'Apicultura', 'Reflorestamento'
];

const urbanActivities = [
  'Residencial', 'Comercial', 'Industrial', 'Serviços',
  'Misto (Residencial/Comercial)', 'Institucional', 'Educacional', 'Saúde',
  'Hoteleiro / Turismo', 'Logística / Armazém', 'Varejo', 'Escritórios / Corporativo',
  'Alimentação / Restaurante', 'Entretenimento / Lazer', 'Tecnologia / Coworking',
  'Galpão Industrial', 'Shopping / Centro Comercial', 'Posto de Combustível',
  'Clínica / Consultório', 'Estacionamento', 'Religioso', 'Outro'
];

export default function PropertyForm({ property, user, onSubmit, onCancel }) {
  const isConsultor = user?.user_type === 'consultor';

  const initialActivities = property?.activities
    ? (typeof property.activities === 'string' ? property.activities.split(',').map(a => a.trim()).filter(Boolean) : property.activities)
    : [];

  const [formData, setFormData] = useState(property ? {
    ...property,
    activities: initialActivities,
    property_type: property.property_type || 'rural',
  } : {
    property_name: '',
    property_type: 'rural',
    location: '',
    city: '',
    state: 'RS',
    coordinates: '',
    total_hectares: '',
    app_hectares: '',
    legal_reserve_hectares: '',
    total_area_m2: '',
    built_area_m2: '',
    main_activity: '',
    activities: [],
    client_name: '',
    client_contact: '',
  });

  const [activityInput, setActivityInput] = useState('');

  const isUrban = formData.property_type === 'urbano';
  const currentActivities = isUrban ? urbanActivities : ruralActivities;

  const addActivity = (activity) => {
    if (activity && !formData.activities.includes(activity)) {
      setFormData({ ...formData, activities: [...formData.activities, activity] });
      setActivityInput('');
    }
  };

  const removeActivity = (activity) => {
    setFormData({ ...formData, activities: formData.activities.filter(a => a !== activity) });
  };

  const handleTypeChange = (type) => {
    setFormData({ ...formData, property_type: type, main_activity: '', activities: [] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      owner_email: property?.owner_email || user.email,
      total_hectares: !isUrban && formData.total_hectares ? parseFloat(formData.total_hectares) : undefined,
      app_hectares: !isUrban && formData.app_hectares ? parseFloat(formData.app_hectares) : undefined,
      legal_reserve_hectares: !isUrban && formData.legal_reserve_hectares ? parseFloat(formData.legal_reserve_hectares) : undefined,
      total_area_m2: isUrban && formData.total_area_m2 ? parseFloat(formData.total_area_m2) : undefined,
      built_area_m2: isUrban && formData.built_area_m2 ? parseFloat(formData.built_area_m2) : undefined,
      activities: formData.activities.length > 0 ? formData.activities.join(', ') : '',
      authorized_users: '',
      ...(isConsultor && !property ? { consultor_email: user.email } : {}),
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">

        {/* Nome */}
        <div className="space-y-2 md:col-span-2">
          <Label>Nome da Propriedade ou Empreendimento *</Label>
          <Input
            value={formData.property_name}
            onChange={(e) => setFormData({ ...formData, property_name: e.target.value })}
            placeholder="Ex: Fazenda Santa Maria"
            required
          />
        </div>

        {/* Tipo: Rural ou Urbano */}
        <div className="space-y-2 md:col-span-2">
          <Label>Tipo *</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleTypeChange('rural')}
              className={`flex-1 py-2.5 px-4 rounded-lg border-2 font-semibold text-sm transition-all ${
                !isUrban
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              🌾 Rural
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('urbano')}
              className={`flex-1 py-2.5 px-4 rounded-lg border-2 font-semibold text-sm transition-all ${
                isUrban
                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              🏙️ Urbano
            </button>
          </div>
        </div>

        {/* Endereço */}
        <div className="space-y-2 md:col-span-2">
          <Label>Endereço Completo</Label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder={isUrban ? 'Ex: Rua das Flores, 123 - Centro' : 'Ex: Rodovia BR-116, Km 245'}
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
          <Select value={formData.state} onValueChange={(v) => setFormData({ ...formData, state: v })} required>
            <SelectTrigger><SelectValue /></SelectTrigger>
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
          <p className="text-xs text-gray-500">Use o mapa para definir os limites completos da propriedade</p>
        </div>

        {/* Campos RURAL */}
        {!isUrban && (
          <>
            <div className="space-y-2">
              <Label>Total de Hectares</Label>
              <Input type="number" step="0.01" value={formData.total_hectares}
                onChange={(e) => setFormData({ ...formData, total_hectares: e.target.value })} placeholder="100.50" />
            </div>
            <div className="space-y-2">
              <Label>Hectares de APP</Label>
              <Input type="number" step="0.01" value={formData.app_hectares}
                onChange={(e) => setFormData({ ...formData, app_hectares: e.target.value })} placeholder="20.00" />
            </div>
            <div className="space-y-2">
              <Label>Hectares de Reserva Legal</Label>
              <Input type="number" step="0.01" value={formData.legal_reserve_hectares}
                onChange={(e) => setFormData({ ...formData, legal_reserve_hectares: e.target.value })} placeholder="20.00" />
            </div>
          </>
        )}

        {/* Campos URBANO */}
        {isUrban && (
          <>
            <div className="space-y-2">
              <Label>Área Total (m²)</Label>
              <Input type="number" step="0.01" value={formData.total_area_m2}
                onChange={(e) => setFormData({ ...formData, total_area_m2: e.target.value })} placeholder="500.00" />
            </div>
            <div className="space-y-2">
              <Label>Área Construída (m²)</Label>
              <Input type="number" step="0.01" value={formData.built_area_m2}
                onChange={(e) => setFormData({ ...formData, built_area_m2: e.target.value })} placeholder="350.00" />
            </div>
          </>
        )}

        {/* Atividade Principal */}
        <div className="space-y-2 md:col-span-2">
          <Label>Atividade Principal</Label>
          <Select value={formData.main_activity} onValueChange={(v) => setFormData({ ...formData, main_activity: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {currentActivities.map(activity => (
                <SelectItem key={activity} value={activity}>{activity}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Atividades (apenas rural) */}
      {!isUrban && (
        <div className="space-y-2">
          <Label>Atividades na Propriedade</Label>
          <Select value={activityInput} onValueChange={(v) => { addActivity(v); }}>
            <SelectTrigger><SelectValue placeholder="Adicionar atividade..." /></SelectTrigger>
            <SelectContent>
              {ruralActivities.filter(a => !formData.activities.includes(a)).map(activity => (
                <SelectItem key={activity} value={activity}>{activity}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.activities.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.activities.map((activity, idx) => (
                <Badge key={idx} variant="outline" className="pr-1">
                  {activity}
                  <button type="button" onClick={() => removeActivity(activity)} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {isConsultor && (
        <div className="space-y-4 pt-4 border-t border-dashed border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Dados do Cliente Responsável</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Cliente / Produtor</Label>
              <Input value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="Ex: João da Silva" />
            </div>
            <div className="space-y-2">
              <Label>Contato do Cliente</Label>
              <Input value={formData.client_contact}
                onChange={(e) => setFormData({ ...formData, client_contact: e.target.value })}
                placeholder="Telefone ou email" />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {property ? 'Atualizar' : 'Criar'} Propriedade
        </Button>
      </div>
    </form>
  );
}