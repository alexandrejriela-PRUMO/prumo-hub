import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Search } from 'lucide-react';

export default function BudgetForm({ onSubmit, initialData = null, user = null, onFormChange = () => {} }) {
  const [clientSearch, setClientSearch] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const { data: crmClients = [] } = useQuery({
    queryKey: ['crm-clients-budget', user?.email],
    queryFn: () => base44.entities.ClientCRM.filter({ consultor_email: user?.email }),
    enabled: !!user?.email,
  });

  const filteredClients = clientSearch.length >= 1
    ? crmClients.filter(c =>
        c.client_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.client_email?.toLowerCase().includes(clientSearch.toLowerCase())
      )
    : crmClients.slice(0, 6);

  const selectClient = (client) => {
    setFormData(prev => ({
      ...prev,
      client_name: client.client_name || '',
      client_email: client.client_email || '',
    }));
    setClientSearch(client.client_name || '');
    setShowSuggestions(false);
  };

  const [formData, setFormData] = React.useState(initialData || {
    client_name: '',
    client_email: '',
    title: '',
    services: [],
    travel_cost: 0,
    fuel_cost: 0,
    additional_fees: [],
    discount_percentage: 0,
    validity_days: 30,
    notes: ''
  });

  const [currentService, setCurrentService] = React.useState({ name: '', description: '', hours: 0, hourly_rate: 0 });
  const [currentFee, setCurrentFee] = React.useState({ name: '', amount: 0 });

  const addService = () => {
    if (currentService.name && currentService.hourly_rate) {
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, { id: Date.now(), ...currentService }]
      }));
      setCurrentService({ name: '', description: '', hours: 0, hourly_rate: 0 });
    }
  };

  const removeService = (id) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  const addFee = () => {
    if (currentFee.name && currentFee.amount) {
      setFormData(prev => ({
        ...prev,
        additional_fees: [...prev.additional_fees, { id: Date.now(), ...currentFee }]
      }));
      setCurrentFee({ name: '', amount: 0 });
    }
  };

  const removeFee = (id) => {
    setFormData(prev => ({
      ...prev,
      additional_fees: prev.additional_fees.filter(f => f.id !== id)
    }));
  };

  const calculateTotal = () => {
    const servicesTotal = (formData?.services || []).reduce((acc, s) => acc + ((s?.hours || 0) * (s?.hourly_rate || 0)), 0);
    const feesTotal = (formData?.additional_fees || []).reduce((acc, f) => acc + (f?.amount || 0), 0);
    const subtotal = servicesTotal + parseFloat(formData?.travel_cost || 0) + parseFloat(formData?.fuel_cost || 0) + feesTotal;
    const discount = subtotal * ((formData?.discount_percentage || 0) / 100);
    return subtotal - discount;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      total_amount: calculateTotal()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium mb-1">Nome do Cliente *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                   className="pl-9"
                   placeholder="Buscar cliente cadastrado..."
                   value={clientSearch || formData.client_name}
                   onChange={(e) => {
                     onFormChange();
                     setClientSearch(e.target.value);
                     setFormData(prev => ({ ...prev, client_name: e.target.value }));
                     setShowSuggestions(true);
                   }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  required
                />
              </div>
              {showSuggestions && filteredClients.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-emerald-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => selectClient(c)}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-900">{c.client_name}</p>
                      {c.client_email && <p className="text-xs text-gray-400">{c.client_email}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email do Cliente *</label>
              <Input
                 type="email"
                 value={formData.client_email}
                 onChange={(e) => {
                   onFormChange();
                   setFormData({...formData, client_email: e.target.value});
                 }}
                placeholder="email@cliente.com"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Título do Orçamento *</label>
              <Input
                value={formData.title}
                onChange={(e) => {
                  onFormChange();
                  setFormData({...formData, title: e.target.value});
                }}
                placeholder="Ex: Consultoria Ambiental - Propriedade XYZ"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Serviços */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Serviços</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 border rounded-lg p-4 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome do Serviço</label>
                <Input
                  placeholder="Ex: CAR, Consultoria, Georreferenciamento"
                  value={currentService.name}
                  onChange={(e) => {
                    onFormChange();
                    setCurrentService({...currentService, name: e.target.value});
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descrição (opcional)</label>
                <Input
                  placeholder="Detalhes adicionais do serviço"
                  value={currentService.description}
                  onChange={(e) => {
                    onFormChange();
                    setCurrentService({...currentService, description: e.target.value});
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade de Horas</label>
                <Input
                  type="number"
                  placeholder="10 ou 20.5"
                  step="any"
                  value={currentService.hours || ''}
                  onChange={(e) => {
                    onFormChange();
                    setCurrentService({...currentService, hours: e.target.value === '' ? 0 : parseFloat(e.target.value)});
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor por Hora (R$)</label>
                <Input
                  type="number"
                  placeholder="150 ou 150.50"
                  step="any"
                  value={currentService.hourly_rate || ''}
                  onChange={(e) => {
                    onFormChange();
                    setCurrentService({...currentService, hourly_rate: e.target.value === '' ? 0 : parseFloat(e.target.value)});
                  }}
                />
              </div>
            </div>
            <Button type="button" onClick={addService} className="w-full" variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Adicionar Serviço
            </Button>
          </div>

          {formData.services.length > 0 && (
            <div className="space-y-2">
              {formData.services.map((service) => (
                <div key={service.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-gray-600">{service.hours}h × R$ {service.hourly_rate.toFixed(2)} = R$ {(service.hours * service.hourly_rate).toFixed(2)}</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => removeService(service.id)}
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custos Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Custos Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Valor do Deslocamento (R$)</label>
              <Input
                type="number"
                placeholder="100 ou 150.50"
                step="any"
                value={formData.travel_cost || ''}
                onChange={(e) => {
                  onFormChange();
                  setFormData({...formData, travel_cost: e.target.value === '' ? 0 : parseFloat(e.target.value)});
                }}
              />
              <p className="text-xs text-gray-500 mt-1">Custos de transporte e locomoção</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Custo de Combustível (R$)</label>
              <Input
                type="number"
                placeholder="50 ou 75.30"
                step="any"
                value={formData.fuel_cost || ''}
                onChange={(e) => {
                  onFormChange();
                  setFormData({...formData, fuel_cost: e.target.value === '' ? 0 : parseFloat(e.target.value)});
                }}
              />
              <p className="text-xs text-gray-500 mt-1">Gasolina, diesel ou outros combustíveis</p>
            </div>
          </div>

          {/* Taxas Adicionais */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-2">Outras Taxas</label>
            <div className="space-y-3 border rounded-lg p-4 bg-slate-50">
              <div className="space-y-2 mb-3">
                <label className="block text-xs font-medium text-gray-600">Descrição da Taxa</label>
                <Input
                  placeholder="Ex: Taxa administrativa, Pesquisa documental, Análise técnica"
                  value={currentFee.name}
                  onChange={(e) => {
                    onFormChange();
                    setCurrentFee({...currentFee, name: e.target.value});
                  }}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Valor da Taxa (R$)</label>
                  <Input
                    type="number"
                    placeholder="200 ou 200.50"
                    step="any"
                    value={currentFee.amount || ''}
                    onChange={(e) => {
                      onFormChange();
                      setCurrentFee({...currentFee, amount: e.target.value === '' ? 0 : parseFloat(e.target.value)});
                    }}
                  />
                </div>
                <Button type="button" onClick={addFee} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {formData.additional_fees.length > 0 && (
              <div className="space-y-2 mt-3">
                {formData.additional_fees.map((fee) => (
                  <div key={fee.id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span>{fee.name}: R$ {fee.amount.toFixed(2)}</span>
                    <Button
                      type="button"
                      onClick={() => removeFee(fee.id)}
                      variant="ghost"
                      size="icon"
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Desconto e Validade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Desconto e Validade</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Desconto (%)</label>
            <Input
              type="number"
              placeholder="10 ou 15.5"
              step="any"
              value={formData.discount_percentage || ''}
              onChange={(e) => {
                onFormChange();
                setFormData({...formData, discount_percentage: e.target.value === '' ? 0 : parseFloat(e.target.value)});
              }}
            />
            <p className="text-xs text-gray-500 mt-1">Percentual de desconto sobre o total</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Validade (dias)</label>
            <Input
              type="number"
              placeholder="30"
              value={formData.validity_days || ''}
              onChange={(e) => {
                onFormChange();
                setFormData({...formData, validity_days: e.target.value === '' ? 30 : parseInt(e.target.value)});
              }}
            />
            <p className="text-xs text-gray-500 mt-1">Quantos dias o orçamento é válido</p>
          </div>
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Valor Total</p>
            <p className="text-3xl font-bold text-emerald-900">R$ {calculateTotal().toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium mb-1">Observações</label>
        <textarea
          value={formData.notes}
          onChange={(e) => {
            onFormChange();
            setFormData({...formData, notes: e.target.value});
          }}
          placeholder="Observações adicionais..."
          className="w-full border rounded-lg p-3 text-sm"
          rows="4"
        />
      </div>

      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
        Próximo: Editar Documento
      </Button>
    </form>
  );
}