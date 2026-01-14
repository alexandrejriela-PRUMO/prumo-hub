import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

const environmentalServiceOptions = [
  'Proteção de Recursos Hídricos',
  'Conservação de Biodiversidade',
  'Sequestro de Carbono',
  'Conservação do Solo',
  'Recuperação de APP',
  'Manutenção de Corredores Ecológicos',
  'Proteção de Nascentes',
  'Outro'
];

export default function PSAContractForm({ contract, properties, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(contract || {
    property_id: '',
    contract_name: '',
    contract_number: '',
    program_name: '',
    payer: '',
    beneficiary_email: '',
    environmental_services: [],
    area_hectares: '',
    start_date: '',
    end_date: '',
    status: 'Em Aprovação',
    payment_value: '',
    payment_periodicity: 'Mensal',
    total_contract_value: '',
    payment_method: 'Transferência Bancária',
    compliance_score: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      area_hectares: parseFloat(formData.area_hectares) || 0,
      payment_value: parseFloat(formData.payment_value) || 0,
      total_contract_value: parseFloat(formData.total_contract_value) || 0,
      compliance_score: formData.compliance_score ? parseFloat(formData.compliance_score) : undefined
    };

    onSubmit(data);
  };

  const toggleService = (service) => {
    const services = formData.environmental_services || [];
    if (services.includes(service)) {
      setFormData({
        ...formData,
        environmental_services: services.filter(s => s !== service)
      });
    } else {
      setFormData({
        ...formData,
        environmental_services: [...services, service]
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
          <CardTitle>{contract ? 'Editar Contrato PSA' : 'Novo Contrato de PSA'}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Informações Básicas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Propriedade *</Label>
                  <select
                    required
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione a propriedade</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.property_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Nome do Contrato *</Label>
                  <Input
                    required
                    value={formData.contract_name}
                    onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
                    placeholder="Ex: PSA Proteção Hídrica 2024"
                  />
                </div>

                <div>
                  <Label>Número do Contrato</Label>
                  <Input
                    value={formData.contract_number}
                    onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                    placeholder="Ex: PSA-2024-001"
                  />
                </div>

                <div>
                  <Label>Nome do Programa</Label>
                  <Input
                    value={formData.program_name}
                    onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
                    placeholder="Ex: Produtor de Água"
                  />
                </div>

                <div>
                  <Label>Pagador *</Label>
                  <Input
                    required
                    value={formData.payer}
                    onChange={(e) => setFormData({ ...formData, payer: e.target.value })}
                    placeholder="Nome da instituição/empresa pagadora"
                  />
                </div>

                <div>
                  <Label>Email do Beneficiário *</Label>
                  <Input
                    required
                    type="email"
                    value={formData.beneficiary_email}
                    onChange={(e) => setFormData({ ...formData, beneficiary_email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <Label>Área (hectares) *</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={formData.area_hectares}
                    onChange={(e) => setFormData({ ...formData, area_hectares: e.target.value })}
                    placeholder="Ex: 50.5"
                  />
                </div>

                <div>
                  <Label>Status *</Label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Em Aprovação">Em Aprovação</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Suspenso">Suspenso</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div>
                  <Label>Data de Início *</Label>
                  <Input
                    required
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Data de Término</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Environmental Services */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Serviços Ambientais *</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {environmentalServiceOptions.map(service => (
                  <label key={service} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData.environmental_services || []).includes(service)}
                      onChange={() => toggleService(service)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Information */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Informações de Pagamento</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Valor por Período *</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={formData.payment_value}
                    onChange={(e) => setFormData({ ...formData, payment_value: e.target.value })}
                    placeholder="Ex: 5000.00"
                  />
                </div>

                <div>
                  <Label>Periodicidade *</Label>
                  <select
                    required
                    value={formData.payment_periodicity}
                    onChange={(e) => setFormData({ ...formData, payment_periodicity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Mensal">Mensal</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>

                <div>
                  <Label>Valor Total do Contrato</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.total_contract_value}
                    onChange={(e) => setFormData({ ...formData, total_contract_value: e.target.value })}
                    placeholder="Ex: 60000.00"
                  />
                </div>

                <div>
                  <Label>Forma de Pagamento</Label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Transferência Bancária">Transferência Bancária</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Depósito">Depósito</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Compliance */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Conformidade</h3>
              <div>
                <Label>Score de Conformidade (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.compliance_score}
                  onChange={(e) => setFormData({ ...formData, compliance_score: e.target.value })}
                  placeholder="Ex: 95.5"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="pt-4 border-t">
              <Label>Observações Gerais</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informações adicionais sobre o contrato..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {contract ? 'Atualizar Contrato' : 'Criar Contrato'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}