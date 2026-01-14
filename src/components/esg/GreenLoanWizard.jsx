import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronRight, ChevronLeft, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GreenLoanWizard({ user, properties, onClose }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    selectedProperty: properties[0]?.id || '',
    loanType: '',
    purpose: '',
    amount: '',
    checklist: {}
  });

  const loanTypes = [
    { id: 'reforestation', name: 'Reflorestamento', icon: '🌱' },
    { id: 'renewable_energy', name: 'Energia Renovável', icon: '☀️' },
    { id: 'sustainable_agriculture', name: 'Agricultura Sustentável', icon: '🌾' },
    { id: 'water_management', name: 'Gestão de Recursos Hídricos', icon: '💧' },
    { id: 'carbon_credit', name: 'Crédito de Carbono', icon: '🌍' }
  ];

  const checklists = {
    reforestation: [
      'Documentação da propriedade (CAR, CCIR)',
      'Projeto técnico de reflorestamento',
      'Comprovação de capacidade financeira',
      'Comprovante de endereço (últimos 3 meses)',
      'Extrato bancário (últimos 6 meses)'
    ],
    renewable_energy: [
      'Projeto de energia renovável',
      'Orçamento detalhado',
      'Documentação da propriedade',
      'Comprovante de renda anual',
      'Parecer técnico (se necessário)'
    ],
    sustainable_agriculture: [
      'Plano de produção sustentável',
      'Histórico de produção (2 últimos anos)',
      'Certificações existentes',
      'Documentação da propriedade',
      'Demonstrativo de viabilidade econômica'
    ],
    water_management: [
      'Plano de gestão de água',
      'Análise de qualidade de água',
      'Documentação da propriedade',
      'Estimativa de economia de água',
      'Cronograma de implementação'
    ],
    carbon_credit: [
      'Inventário de emissões baseline',
      'Plano de redução de carbono',
      'Documentação da propriedade',
      'Análise de impacto ambiental',
      'Histórico de atividades (3 anos)'
    ]
  };

  const steps = [
    { number: 1, name: 'Propriedade', icon: '🏠' },
    { number: 2, name: 'Tipo de Empréstimo', icon: '💚' },
    { number: 3, name: 'Documentação', icon: '📋' },
    { number: 4, name: 'Confirmação', icon: '✓' }
  ];

  const handleChecklistItem = (item) => {
    setFormData(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [item]: !prev.checklist[item]
      }
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const selectedLoanType = loanTypes.find(t => t.id === formData.loanType);
      
      await base44.entities.GreenLoan.create({
        property_id: formData.selectedProperty,
        applicant_email: user.email,
        loan_type: selectedLoanType.name,
        requested_amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        status: 'Em Análise',
        application_date: new Date().toISOString().split('T')[0],
        term_months: 60,
        financial_institution: 'Santa Rute Engenharia Rural'
      });

      toast.success('Solicitação de empréstimo verde enviada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao criar empréstimo:', error);
      toast.error('Erro ao criar solicitação de empréstimo');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.selectedProperty !== '';
      case 2:
        return formData.loanType !== '' && formData.purpose !== '' && formData.amount !== '';
      case 3:
        const requiredDocs = checklists[formData.loanType] || [];
        return Object.values(formData.checklist).filter(Boolean).length >= Math.ceil(requiredDocs.length * 0.8);
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Solicitar Empréstimo Verde</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {steps.map((s) => (
            <div key={s.number} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full text-lg ${
                step >= s.number
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step > s.number ? '✓' : s.icon}
              </div>
              {s.number < steps.length && (
                <div className={`w-12 h-1 ${
                  step > s.number ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-6 min-h-[300px]">
          {/* Step 1: Propriedade */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900">Selecione a Propriedade</h3>
              <div className="space-y-2">
                {properties.map((prop) => (
                  <label
                    key={prop.id}
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.selectedProperty === prop.id
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="property"
                      value={prop.id}
                      checked={formData.selectedProperty === prop.id}
                      onChange={(e) => setFormData({ ...formData, selectedProperty: e.target.value })}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{prop.property_name}</p>
                      <p className="text-sm text-gray-600">{prop.total_hectares}ha • {prop.city}, {prop.state}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Tipo de Empréstimo */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900">Tipo de Empréstimo e Finalidade</h3>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Tipo de Empréstimo</label>
                <div className="grid grid-cols-2 gap-3">
                  {loanTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setFormData({ ...formData, loanType: type.id })}
                      className={`p-4 border rounded-lg text-center transition-all ${
                        formData.loanType === type.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-green-400'
                      }`}
                    >
                      <span className="text-2xl block mb-2">{type.icon}</span>
                      <p className="text-sm font-medium text-gray-900">{type.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Finalidade do Empréstimo</label>
                <Input
                  placeholder="Descreva a finalidade do empréstimo"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Valor Solicitado (R$)</label>
                <Input
                  type="number"
                  placeholder="50000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step 3: Documentação */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900">Documentação Necessária</h3>
              <p className="text-sm text-gray-600">Confirme que possui pelo menos 80% dos documentos</p>
              
              <div className="space-y-2">
                {(checklists[formData.loanType] || []).map((doc) => (
                  <label
                    key={doc}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={formData.checklist[doc] || false}
                      onCheckedChange={() => handleChecklistItem(doc)}
                    />
                    <span className="text-sm text-gray-700">{doc}</span>
                  </label>
                ))}
              </div>

              {(() => {
                const requiredDocs = checklists[formData.loanType] || [];
                const completed = Object.values(formData.checklist).filter(Boolean).length;
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                      <strong>Progresso:</strong> {completed}/{requiredDocs.length} documentos confirmados ({Math.round((completed / requiredDocs.length) * 100)}%)
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Step 4: Confirmação */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900">Resumo da Solicitação</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Propriedade:</span>
                  <span className="font-medium">{properties.find(p => p.id === formData.selectedProperty)?.property_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">{loanTypes.find(t => t.id === formData.loanType)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor:</span>
                  <span className="font-medium">R$ {parseFloat(formData.amount).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Finalidade:</span>
                  <span className="font-medium text-right max-w-xs">{formData.purpose}</span>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900">
                  <CheckCircle2 className="w-4 h-4 inline mr-2" />
                  Sua solicitação será enviada para análise. Você receberá atualizações por email.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <DialogFooter className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!isStepValid()}
              className="bg-green-600 hover:bg-green-700"
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Solicitação'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}