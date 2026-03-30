import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import BudgetForm from '@/components/budget/BudgetForm';
import BudgetEditorPro from '@/components/budget/BudgetEditorPro';
import { ChevronLeft } from 'lucide-react';

export default function BudgetGenerator() {
  const [step, setStep] = useState('form'); // form, editor
  const [budgetData, setBudgetData] = useState(null);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Erro ao carregar usuário');
      }
    };
    loadUser();
  }, []);

  const { data: templates = [] } = useQuery({
    queryKey: ['budgetTemplates', user?.email],
    queryFn: () => base44.entities.BudgetTemplate.filter({ consultor_email: user?.email }),
    enabled: !!user?.email
  });

  const saveBudgetMutation = useMutation({
    mutationFn: (data) => base44.entities.Budget.create(data),
    onSuccess: (result) => {
      toast.success('Orçamento salvo com sucesso!');
      setBudgetData(result);
    },
    onError: (error) => {
      toast.error('Erro ao salvar orçamento: ' + error.message);
    }
  });

  const sendBudgetMutation = useMutation({
    mutationFn: async (data) => {
      const budget = await base44.entities.Budget.create({
        ...budgetData,
        document_html: data.documentHtml,
        logo_url: data.logoUrl,
        template_id: data.selectedTemplate,
        status: 'Enviado',
        sent_at: new Date().toISOString()
      });
      
      // Enviar email
      await base44.functions.invoke('sendBudgetEmail', {
        budget_id: budget.id,
        client_email: budgetData.client_email,
        client_name: budgetData.client_name,
        document_html: data.documentHtml
      });

      return budget;
    },
    onSuccess: () => {
      toast.success('Orçamento enviado por email com sucesso!');
      setTimeout(() => window.location.reload(), 2000);
    },
    onError: (error) => {
      toast.error('Erro ao enviar orçamento: ' + error.message);
    }
  });

  const handleFormSubmit = async (data) => {
    const budgetNumber = `ORC-${Date.now().toString().slice(-8)}`;
    const newData = {
      ...data,
      consultor_email: user?.email,
      budget_number: budgetNumber,
      status: 'Rascunho'
    };
    setBudgetData(newData);
    setStep('editor');
  };

  const handleSaveDocument = async (editorData) => {
    const fullData = {
      ...budgetData,
      ...editorData
    };
    saveBudgetMutation.mutate(fullData);
  };

  const handleSendDocument = async (editorData) => {
    sendBudgetMutation.mutate(editorData);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50/30 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {step === 'editor' && (
              <Button
                onClick={() => setStep('form')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
            )}
          </div>
          <h1 className="text-3xl font-bold text-emerald-900 mb-2">
            {step === 'form' ? 'Gerador de Orçamentos' : 'Editar Documento'}
          </h1>
          <p className="text-gray-600">
            {step === 'form'
              ? 'Crie um novo orçamento com detalhes de serviços e custos'
              : 'Customize o documento e envie para o cliente'}
          </p>
        </div>

        {/* Conteúdo */}
        {step === 'form' && (
          <BudgetForm onSubmit={handleFormSubmit} />
        )}

        {step === 'editor' && budgetData && (
          <BudgetEditorPro
            budgetData={budgetData}
            onSave={handleSaveDocument}
            onSend={handleSendDocument}
          />
        )}

        {saveBudgetMutation.isPending && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
            <Card className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p>Salvando orçamento...</p>
              </div>
            </Card>
          </div>
        )}

        {sendBudgetMutation.isPending && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
            <Card className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p>Enviando orçamento por email...</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}