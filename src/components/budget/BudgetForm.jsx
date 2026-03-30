import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

export default function BudgetForm({ onSubmit, initialData = null }) {
  const [formData, setFormData] = useState(initialData || {
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

  const [currentService, setCurrentService] = useState({ name: '', description: '', hours: 0, hourly_rate: 0 });
  const [currentFee, setCurrentFee] = useState({ name: '', amount: 0 });

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
    const servicesTotal = formData.services.reduce((acc, s) => acc + (s.hours * s.hourly_rate), 0);
    const feesTotal = formData.additional_fees.reduce((acc, f) => acc + f.amount, 0);
    const subtotal = servicesTotal + parseFloat(formData.travel_cost || 0) + parseFloat(formData.fuel_cost || 0) + feesTotal;
    const discount = subtotal * (formData.discount_percentage / 100);
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
            <div>
              <label className="block text-sm font-medium mb-1">Nome do Cliente *</label>
              <Input
                value={formData.client_name}
                onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email do Cliente *</label>
              <Input
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Título do Orçamento *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
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
              <Input
                placeholder="Nome do serviço"
                value={currentService.name}
                onChange={(e) => setCurrentService({...currentService, name: e.target.value})}
              />
              <Input
                placeholder="Descrição (opcional)"
                value={currentService.description}
                onChange={(e) => setCurrentService({...currentService, description: e.target.value})}
              />
              <Input
                type="number"
                placeholder="Horas"
                step="0.5"
                value={currentService.hours}
                onChange={(e) => setCurrentService({...currentService, hours: parseFloat(e.target.value) || 0})}
              />
              <Input
                type="number"
                placeholder="Valor hora (R$)"
                step="0.01"
                value={currentService.hourly_rate}
                onChange={(e) => setCurrentService({...currentService, hourly_rate: parseFloat(e.target.value) || 0})}
              />
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
              <label className="block text-sm font-medium mb-1">Deslocamento (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.travel_cost}
                onChange={(e) => setFormData({...formData, travel_cost: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Combustível (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.fuel_cost}
                onChange={(e) => setFormData({...formData, fuel_cost: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          {/* Taxas Adicionais */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-2">Outras Taxas</label>
            <div className="space-y-3 border rounded-lg p-4 bg-slate-50">
              <div className="flex gap-3">
                <Input
                  placeholder="Descrição da taxa"
                  value={currentFee.name}
                  onChange={(e) => setCurrentFee({...currentFee, name: e.target.value})}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Valor (R$)"
                  step="0.01"
                  value={currentFee.amount}
                  onChange={(e) => setCurrentFee({...currentFee, amount: parseFloat(e.target.value) || 0})}
                  className="w-32"
                />
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
              step="0.01"
              value={formData.discount_percentage}
              onChange={(e) => setFormData({...formData, discount_percentage: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Validade (dias)</label>
            <Input
              type="number"
              value={formData.validity_days}
              onChange={(e) => setFormData({...formData, validity_days: parseInt(e.target.value) || 30})}
            />
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
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
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