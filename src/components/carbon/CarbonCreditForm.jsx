import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

export default function CarbonCreditForm({ credit, properties, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(credit || {
    property_id: '',
    project_name: '',
    project_type: 'Reflorestamento',
    description: '',
    area_hectares: '',
    start_date: '',
    end_date: '',
    status: 'Planejamento',
    estimated_credits: '',
    verified_credits: '',
    available_credits: '',
    sold_credits: '',
    certification_standard: '',
    validator: '',
    methodology: '',
    responsible_email: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      area_hectares: parseFloat(formData.area_hectares) || 0,
      estimated_credits: parseFloat(formData.estimated_credits) || 0,
      verified_credits: parseFloat(formData.verified_credits) || 0,
      available_credits: parseFloat(formData.available_credits) || 0,
      sold_credits: parseFloat(formData.sold_credits) || 0
    };

    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
          <CardTitle>{credit ? 'Editar Projeto' : 'Novo Projeto de Crédito de Carbono'}</CardTitle>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Selecione a propriedade</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.property_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Nome do Projeto *</Label>
                  <Input
                    required
                    value={formData.project_name}
                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                    placeholder="Ex: Reflorestamento APP Córrego Limpo"
                  />
                </div>

                <div>
                  <Label>Tipo de Projeto *</Label>
                  <select
                    required
                    value={formData.project_type}
                    onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Reflorestamento">Reflorestamento</option>
                    <option value="Conservação Florestal">Conservação Florestal</option>
                    <option value="Recuperação de APP">Recuperação de APP</option>
                    <option value="Sistemas Agroflorestais">Sistemas Agroflorestais</option>
                    <option value="Manejo Sustentável">Manejo Sustentável</option>
                    <option value="Agricultura Regenerativa">Agricultura Regenerativa</option>
                    <option value="Outro">Outro</option>
                  </select>
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
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Data de Término Prevista</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Status *</Label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Planejamento">Planejamento</option>
                    <option value="Em Implementação">Em Implementação</option>
                    <option value="Em Validação">Em Validação</option>
                    <option value="Validado">Validado</option>
                    <option value="Certificado">Certificado</option>
                    <option value="Comercializado">Comercializado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div>
                  <Label>Responsável (Email)</Label>
                  <Input
                    type="email"
                    value={formData.responsible_email}
                    onChange={(e) => setFormData({ ...formData, responsible_email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div>
                <Label>Descrição do Projeto</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva os objetivos e características do projeto..."
                  rows={3}
                />
              </div>
            </div>

            {/* Carbon Credits */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Créditos de Carbono</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Créditos Estimados (tCO2e)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.estimated_credits}
                    onChange={(e) => setFormData({ ...formData, estimated_credits: e.target.value })}
                    placeholder="Ex: 1000.50"
                  />
                </div>

                <div>
                  <Label>Créditos Verificados (tCO2e)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.verified_credits}
                    onChange={(e) => setFormData({ ...formData, verified_credits: e.target.value })}
                    placeholder="Ex: 850.25"
                  />
                </div>

                <div>
                  <Label>Créditos Disponíveis (tCO2e)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.available_credits}
                    onChange={(e) => setFormData({ ...formData, available_credits: e.target.value })}
                    placeholder="Ex: 500.00"
                  />
                </div>

                <div>
                  <Label>Créditos Vendidos (tCO2e)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.sold_credits}
                    onChange={(e) => setFormData({ ...formData, sold_credits: e.target.value })}
                    placeholder="Ex: 350.25"
                  />
                </div>
              </div>
            </div>

            {/* Certification */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900">Certificação e Validação</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Padrão de Certificação</Label>
                  <select
                    value={formData.certification_standard}
                    onChange={(e) => setFormData({ ...formData, certification_standard: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Selecione</option>
                    <option value="VCS (Verified Carbon Standard)">VCS (Verified Carbon Standard)</option>
                    <option value="Gold Standard">Gold Standard</option>
                    <option value="CCB (Climate, Community & Biodiversity)">CCB (Climate, Community & Biodiversity)</option>
                    <option value="REDD+">REDD+</option>
                    <option value="CAR (Climate Action Reserve)">CAR (Climate Action Reserve)</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <Label>Validador/Certificador</Label>
                  <Input
                    value={formData.validator}
                    onChange={(e) => setFormData({ ...formData, validator: e.target.value })}
                    placeholder="Nome da empresa validadora"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Metodologia Aplicada</Label>
                  <Input
                    value={formData.methodology}
                    onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                    placeholder="Ex: VM0015 - Metodologia de Reflorestamento"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="pt-4 border-t">
              <Label>Observações Gerais</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informações adicionais sobre o projeto..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                {credit ? 'Atualizar Projeto' : 'Criar Projeto'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}