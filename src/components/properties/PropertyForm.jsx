import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Users2, UserPlus } from 'lucide-react';

const DIRECTIONS = ['Norte', 'Sul', 'Leste', 'Oeste', 'Nordeste', 'Noroeste', 'Sudeste', 'Sudoeste'];

const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const ruralActivities = [
  'Agricultura', 'Pecuária', 'Bovinocultura', 'Suinocultura', 'Avicultura',
  'Silvicultura', 'Fruticultura', 'Horticultura', 'Piscicultura', 'Apicultura', 'Reflorestamento'
];

const LIVESTOCK_ACTIVITIES = ['Suinocultura', 'Bovinocultura', 'Avicultura'];

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
  const [existingClients, setExistingClients] = useState([]);

  useEffect(() => {
    if (isConsultor && !property && user?.email) {
      base44.entities.Property.filter({ consultor_email: user.email })
        .then(props => {
          // Extract unique clients
          const map = new Map();
          props.forEach(p => {
            if (p.owner_email && !map.has(p.owner_email)) {
              map.set(p.owner_email, { email: p.owner_email, name: p.client_name || p.owner_email });
            }
          });
          setExistingClients(Array.from(map.values()));
        })
        .catch(() => {});
    }
  }, [isConsultor, property, user?.email]);

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
    client_email: '',
    client_contact: '',
    owner_names: '',
    owner_names_list: [],
    car_number: '',
    iptu_number: '',
    registration_numbers: '',
    contact_phone: '',
    contact_email: '',
    fiscal_address: '',
  });

  // Lista de proprietários
  const parseOwnersList = () => {
    if (property?.owner_names_list) {
      try { return typeof property.owner_names_list === 'string' ? JSON.parse(property.owner_names_list) : property.owner_names_list; } catch { return []; }
    }
    // fallback: se vier como string antiga, transforma em lista
    if (property?.owner_names) return property.owner_names.split(',').map(n => n.trim()).filter(Boolean);
    return [];
  };
  const [ownersList, setOwnersList] = useState(parseOwnersList());
  const [newOwnerName, setNewOwnerName] = useState('');

  const addOwner = () => {
    if (!newOwnerName.trim()) return;
    setOwnersList([...ownersList, newOwnerName.trim()]);
    setNewOwnerName('');
  };
  const removeOwner = (idx) => setOwnersList(ownersList.filter((_, i) => i !== idx));

  const [activityInput, setActivityInput] = useState('');

  // Dados extras rurais
  const parseRuralExtra = () => {
    try {
      return property?.rural_extra ? JSON.parse(property.rural_extra) : {};
    } catch { return {}; }
  };
  const [ruralExtra, setRuralExtra] = useState(parseRuralExtra());
  const setExtra = (key, val) => setRuralExtra(prev => ({ ...prev, [key]: val }));

  // Confrontantes
  const [neighbors, setNeighbors] = useState(
    property?.neighbors ? (typeof property.neighbors === 'string' ? JSON.parse(property.neighbors) : property.neighbors) : []
  );
  const [newNeighbor, setNewNeighbor] = useState({ direction: 'Norte', name: '', location: '', registration: '' });

  const addNeighbor = () => {
    if (!newNeighbor.name.trim()) return;
    setNeighbors([...neighbors, { ...newNeighbor }]);
    setNewNeighbor({ direction: 'Norte', name: '', location: '', registration: '' });
  };

  const removeNeighbor = (idx) => {
    setNeighbors(neighbors.filter((_, i) => i !== idx));
  };

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
      owner_email: property?.owner_email || (isConsultor ? formData.client_email : user.email),
      total_hectares: !isUrban && formData.total_hectares ? parseFloat(formData.total_hectares) : undefined,
      app_hectares: !isUrban && formData.app_hectares ? parseFloat(formData.app_hectares) : undefined,
      legal_reserve_hectares: !isUrban && formData.legal_reserve_hectares ? parseFloat(formData.legal_reserve_hectares) : undefined,
      total_area_m2: isUrban && formData.total_area_m2 ? parseFloat(formData.total_area_m2) : undefined,
      built_area_m2: isUrban && formData.built_area_m2 ? parseFloat(formData.built_area_m2) : undefined,
      activities: formData.activities.length > 0 ? formData.activities.join(', ') : '',
      authorized_users: '',
      owner_names: ownersList.join(', '),
      owner_names_list: JSON.stringify(ownersList),
      neighbors: !isUrban ? JSON.stringify(neighbors) : '[]',
      rural_extra: !isUrban ? JSON.stringify(ruralExtra) : '{}',
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

        {/* Confrontantes - apenas Rural */}
        {!isUrban && (
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-emerald-700" />
              <Label className="text-emerald-800 font-semibold">Confrontantes</Label>
            </div>

            {/* Lista existente */}
            {neighbors.length > 0 && (
              <div className="space-y-2">
                {neighbors.map((n, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                    <Badge className="bg-emerald-700 text-white shrink-0 mt-0.5">{n.direction}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-emerald-900">{n.name}</p>
                      {n.location && <p className="text-emerald-700 text-xs">📍 {n.location}</p>}
                      {n.registration && <p className="text-emerald-700 text-xs">📄 Matrícula: {n.registration}</p>}
                    </div>
                    <button type="button" onClick={() => removeNeighbor(idx)} className="text-red-400 hover:text-red-600 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário para adicionar confrontante */}
            <div className="border border-dashed border-emerald-300 rounded-lg p-3 space-y-2 bg-emerald-50/40">
              <p className="text-xs text-emerald-700 font-medium">Adicionar confrontante</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Direção</Label>
                  <Select value={newNeighbor.direction} onValueChange={(v) => setNewNeighbor({ ...newNeighbor, direction: v })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIRECTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nome do confrontante *</Label>
                  <Input
                    className="h-8 text-sm"
                    value={newNeighbor.name}
                    onChange={(e) => setNewNeighbor({ ...newNeighbor, name: e.target.value })}
                    placeholder="Ex: João da Silva"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Localização</Label>
                  <Input
                    className="h-8 text-sm"
                    value={newNeighbor.location}
                    onChange={(e) => setNewNeighbor({ ...newNeighbor, location: e.target.value })}
                    placeholder="Ex: Município de São Luiz"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Matrícula</Label>
                  <Input
                    className="h-8 text-sm"
                    value={newNeighbor.registration}
                    onChange={(e) => setNewNeighbor({ ...newNeighbor, registration: e.target.value })}
                    placeholder="Ex: 12.345"
                  />
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addNeighbor}
                className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 w-full gap-1 mt-1">
                <Plus className="w-3 h-3" /> Adicionar Confrontante
              </Button>
            </div>
          </div>
        )}

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

      {/* Campos condicionais rurais */}
      {!isUrban && (
        <div className="space-y-4">

          {/* Barragem / Açude */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-lg">💧</span>
              <Label className="font-semibold text-blue-800">Barragem / Açude</Label>
              <div className="flex gap-3 ml-auto">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="has_dam" checked={ruralExtra.has_dam === true}
                    onChange={() => setExtra('has_dam', true)} className="accent-blue-600" />
                  <span className="text-blue-800">Sim</span>
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="has_dam" checked={ruralExtra.has_dam === false || ruralExtra.has_dam === undefined}
                    onChange={() => setExtra('has_dam', false)} className="accent-blue-600" />
                  <span className="text-blue-800">Não</span>
                </label>
              </div>
            </div>
            {ruralExtra.has_dam && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-blue-700">Quantidade de Barragens</Label>
                  <Input type="number" min="0" className="h-8"
                    value={ruralExtra.dam_count || ''}
                    onChange={(e) => setExtra('dam_count', e.target.value)}
                    placeholder="Ex: 2" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-blue-700">Quantidade de Açudes</Label>
                  <Input type="number" min="0" className="h-8"
                    value={ruralExtra.pond_count || ''}
                    onChange={(e) => setExtra('pond_count', e.target.value)}
                    placeholder="Ex: 3" />
                </div>
              </div>
            )}
          </div>

          {/* Pecuária intensiva — por tipo de animal */}
          {formData.activities.includes('Suinocultura') && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🐷</span>
                <Label className="font-semibold text-amber-800">Suinocultura</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-amber-700">Nº de suínos</Label>
                  <Input type="number" min="0" className="h-8"
                    value={ruralExtra.swine_count || ''}
                    onChange={(e) => setExtra('swine_count', e.target.value)}
                    placeholder="Ex: 2000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-amber-700">Capacidade máxima</Label>
                  <Input type="number" min="0" className="h-8"
                    value={ruralExtra.swine_capacity || ''}
                    onChange={(e) => setExtra('swine_capacity', e.target.value)}
                    placeholder="Ex: 2400" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-amber-700">Nº de galpões</Label>
                  <Input type="number" min="0" className="h-8"
                    value={ruralExtra.swine_sheds || ''}
                    onChange={(e) => setExtra('swine_sheds', e.target.value)}
                    placeholder="Ex: 2" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-amber-700">Nº de esterqueiras</Label>
                  <Input type="number" min="0" className="h-8"
                    value={ruralExtra.swine_manure_pits || ''}
                    onChange={(e) => setExtra('swine_manure_pits', e.target.value)}
                    placeholder="Ex: 1" />
                </div>
              </div>
            </div>
          )}

          {formData.activities.includes('Bovinocultura') && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🐄</span>
                <Label className="font-semibold text-orange-800">Bovinocultura</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-orange-700">Nº de bovinos (total)</Label>
                  <Input type="number" min="0" className="h-8"
                    value={ruralExtra.cattle_count || ''}
                    onChange={(e) => setExtra('cattle_count', e.target.value)}
                    placeholder="Ex: 150" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-orange-700">Matrizes (vacas)</Label>
                  <Input type="number" min="0" className="h-8"
                    value={ruralExtra.cattle_cows || ''}
                    onChange={(e) => setExtra('cattle_cows', e.target.value)}
                    placeholder="Ex: 60" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-orange-700">Tipo de criação</Label>
                  <select className="h-8 w-full border border-gray-300 rounded px-2 text-sm"
                    value={ruralExtra.cattle_type || ''}
                    onChange={(e) => setExtra('cattle_type', e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="Corte">Corte</option>
                    <option value="Leite">Leite</option>
                    <option value="Misto">Misto (Corte/Leite)</option>
                    <option value="Cria">Cria</option>
                    <option value="Recria">Recria</option>
                    <option value="Engorda">Engorda</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-orange-700">UA (Unidades Animais)</Label>
                  <Input type="number" min="0" step="0.1" className="h-8"
                    value={ruralExtra.cattle_ua || ''}
                    onChange={(e) => setExtra('cattle_ua', e.target.value)}
                    placeholder="Ex: 120" />
                </div>
              </div>
            </div>
          )}

          {formData.activities.includes('Avicultura') && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🐔</span>
                <Label className="font-semibold text-yellow-800">Avicultura</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-yellow-700">Nº de aves</Label>
                  <Input type="number" min="0" className="h-8"
                    value={ruralExtra.poultry_count || ''}
                    onChange={(e) => setExtra('poultry_count', e.target.value)}
                    placeholder="Ex: 20000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-yellow-700">Capacidade do aviário</Label>
                  <Input type="number" min="0" className="h-8"
                    value={ruralExtra.poultry_capacity || ''}
                    onChange={(e) => setExtra('poultry_capacity', e.target.value)}
                    placeholder="Ex: 24000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-yellow-700">Tipo de ave</Label>
                  <select className="h-8 w-full border border-gray-300 rounded px-2 text-sm"
                    value={ruralExtra.poultry_type || ''}
                    onChange={(e) => setExtra('poultry_type', e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="Frango de Corte">Frango de Corte</option>
                    <option value="Poedeira">Poedeira</option>
                    <option value="Peru">Peru</option>
                    <option value="Pato">Pato</option>
                    <option value="Misto">Misto</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-yellow-700">Nº de aviários</Label>
                  <Input type="number" min="0" className="h-8"
                    value={ruralExtra.poultry_sheds || ''}
                    onChange={(e) => setExtra('poultry_sheds', e.target.value)}
                    placeholder="Ex: 2" />
                </div>
              </div>
            </div>
          )}

          {/* Agricultura - desde quando */}
          {formData.activities.includes('Agricultura') && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌱</span>
                <Label className="font-semibold text-green-800">Dados de Agricultura</Label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-green-700">Atividade agrícola realizada desde</Label>
                <Input type="date" className="h-9"
                  value={ruralExtra.agriculture_since || ''}
                  onChange={(e) => setExtra('agriculture_since', e.target.value)} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dados dos Proprietários e Documentação */}
      <div className="space-y-4 pt-4 border-t border-dashed border-emerald-200">
        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Dados dos Proprietários e Documentação</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Nome(s) do(s) Proprietário(s)</Label>
            {ownersList.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {ownersList.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                    <span className="flex-1 text-emerald-900 font-medium">{name}</span>
                    <button type="button" onClick={() => removeOwner(idx)} className="text-red-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newOwnerName}
                onChange={(e) => setNewOwnerName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOwner(); }}}
                placeholder="Ex: João da Silva"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addOwner}
                className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 shrink-0 gap-1">
                <UserPlus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
          </div>
          {!isUrban && (
            <div className="space-y-2">
              <Label>Número do CAR</Label>
              <Input value={formData.car_number || ''}
                onChange={(e) => setFormData({ ...formData, car_number: e.target.value })}
                placeholder="Ex: RS-4300000-XXXX..." />
            </div>
          )}
          {isUrban && (
            <div className="space-y-2">
              <Label>Número do IPTU</Label>
              <Input value={formData.iptu_number || ''}
                onChange={(e) => setFormData({ ...formData, iptu_number: e.target.value })}
                placeholder="Ex: 0000.000.000.000" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Número(s) da(s) Matrícula(s)</Label>
            <Input value={formData.registration_numbers || ''}
              onChange={(e) => setFormData({ ...formData, registration_numbers: e.target.value })}
              placeholder="Ex: 12.345, 12.346" />
          </div>
          <div className="space-y-2">
            <Label>Telefone para Contato</Label>
            <Input value={formData.contact_phone || ''}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              placeholder="Ex: (51) 99999-9999" />
          </div>
          <div className="space-y-2">
            <Label>Email de Contato</Label>
            <Input type="email" value={formData.contact_email || ''}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              placeholder="Ex: joao@email.com" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Endereço Fiscal</Label>
            <Input value={formData.fiscal_address || ''}
              onChange={(e) => setFormData({ ...formData, fiscal_address: e.target.value })}
              placeholder="Ex: Rua das Flores, 123 - Centro - Porto Alegre/RS" />
          </div>
        </div>
      </div>

      {isConsultor && (
        <div className="space-y-4 pt-4 border-t border-dashed border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Dados do Cliente Responsável</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Cliente / Produtor</Label>
              <Input value={formData.client_name || ''}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="Ex: João da Silva" />
            </div>
            <div className="space-y-2">
              <Label>Email do Cliente *</Label>
              <Input type="email" value={formData.client_email || ''}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                placeholder="Ex: joao@email.com"
                required={isConsultor && !property} />
            </div>
            <div className="space-y-2">
              <Label>Contato do Cliente</Label>
              <Input value={formData.client_contact || ''}
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