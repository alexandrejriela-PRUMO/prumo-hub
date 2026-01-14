import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TaxIncentiveWizard({ user, properties, onClose }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    selectedProperty: properties[0]?.id || '',
    incentiveType: '',
    sustainablePractice: '',
    checklist: {}
  });

  const incentives = [
    { id: 'iptu_exemption', name: 'Isenção de IPTU Rural', icon: '🏡' },
    { id: 'itr_reduction', name: 'Redução de ITR', icon: '📉' },
    { id: 'icms_exemption', name: 'Isenção de ICMS', icon: '💳' },
    { id: 'state_subsidy', name: 'Subsídio Estadual', icon: '💰' },
    { id: 'presumed_credit', name: 'Crédito Presumido', icon: '📊' }
  ];

  const practices = [
    'Reflorestamento',
    'Agricultura Orgânica',
    'Conservação de APP',
    'Energia Renovável',
    'Gestão de Resíduos',
    'Sequestro de Carbono'
  ];

  const checklists = {
    iptu_exemption: [
      'Comprovante de propriedade (CCIR)',
      'Documentação da propriedade rural',
      'Comprovante de práticas sustentáveis',
      'Foto satélite da propriedade',
      'Declaração de imposto de renda'
    ],
    itr_reduction: [
      'Cadastro de Pessoa Física (CPF)',
      'Documentação do imóvel rural',
      'Projeto de uso sustentável',
      'Comprovante de renda',
      'Atestado de conformidade legal'
    ],
    icms_exemption: [
      'Inscrição Estadual',
      'Certificação de produto sustentável',
      'Documentação da cadeia produtiva',
      'Contrato com comprador',
      'Documentação fiscal dos últimos 2 anos'
    ],
    state_subsidy: [
      'Cadastro no sistema estadual',
      'Projeto de investimento sustentável',
      'Orçamento detalhado',
      'Documentação da propriedade',
      'Plano de viabilidade econômica'
    ],
    presumed_credit: [
      'Nota Fiscal da compra de insumos',
      'Documentação de produção',
      'Registro de operações (últimos 2 anos)',
      'Comprovante de conformidade',
      'Demonstrativo de cálculo'
    ]
  };

  const steps = [
    { number: 1, name: 'Propriedade', icon: '🏠' },
    { number: 2, name: 'Incentivo', icon: '💚' },
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
      const selectedIncentive = incentives.find(i => i.id === formData.incentiveType);
      
      await base44.entities.TaxIncentive.create({
        property_id: formData.selectedProperty,
        applicant_email: user.email,
        incentive_type: selectedIncentive.name,
        incentive_name: selectedIncentive.name,
        sustainable_practice: formData.sustainablePractice,
        application_status: 'Em Análise',
        eligibility_status: 'Em Análise',
        application_date: new Date().toISOString().split('T')[0]
      });

      toast.success('Solicitação de incentivo fiscal enviada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao criar incentivo:', error);
      toast.error('Erro ao criar solicitação de incentivo');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.selectedProperty !== '';
      case 2:
        return formData.incentiveType !== '' && formData.sustainablePractice !== '';
      case 3:
        const requiredDocs = checklists[formData.incentiveType] || [];
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
          <DialogTitle>Solicitar Incentivo Fiscal</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {steps.map((s) => (
            <div key={s.number} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full text-lg ${
                step >= s.number
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step > s.number ? '✓' : s.icon}
              </div>
              {s.number < steps.length && (
                <div className={`w-12 h-1 ${
                  step > s.number ? 'bg-yellow-600' : 'bg-gray-200'
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
                        ? 'border-yellow-600 bg-yellow-50'
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

          {/* Step 2: Tipo de Incentivo */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900">Tipo de Incentivo Fiscal</h3>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Incentivo Disponível</label>
                <div className="grid grid-cols-1 gap-2">
                  {incentives.map((inc) => (
                    <button
                      key={inc.id}
                      onClick={() => setFormData({ ...formData, incentiveType: inc.id })}
                      className={`flex items-center gap-3 p-4 border rounded-lg text-left transition-all ${
                        formData.incentiveType === inc.id
                          ? 'border-yellow-600 bg-yellow-50'
                          : 'border-gray-200 hover:border-yellow-400'
                      }`}
                    >
                      <span className="text-2xl">{inc.icon}</span>
                      <span className="font-medium text-gray-900">{inc.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Prática Sustentável</label>
                <div className="grid grid-cols-2 gap-2">
                  {practices.map((practice) => (
                    <button
                      key={practice}
                      onClick={() => setFormData({ ...formData, sustainablePractice: practice })}
                      className={`p-3 border rounded-lg text-sm transition-all ${
                        formData.sustainablePractice === practice
                          ? 'border-yellow-600 bg-yellow-50 font-medium'
                          : 'border-gray-200 hover:border-yellow-400'
                      }`}
                    >
                      {practice}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Documentação */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900">Documentação Necessária</h3>
              <p className="text-sm text-gray-600">Confirme que possui pelo menos 80% dos documentos</p>
              
              <div className="space-y-2">
                {(checklists[formData.incentiveType] || []).map((doc) => (
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
                const requiredDocs = checklists[formData.incentiveType] || [];
                const completed = Object.values(formData.checklist).filter(Boolean).length;
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-900">
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
                  <span className="text-gray-600">Incentivo:</span>
                  <span className="font-medium">{incentives.find(i => i.id === formData.incentiveType)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Prática Sustentável:</span>
                  <span className="font-medium">{formData.sustainablePractice}</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900">
                  <CheckCircle2 className="w-4 h-4 inline mr-2" />
                  Sua solicitação será enviada para análise de elegibilidade. Você receberá atualizações por email.
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
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700"
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