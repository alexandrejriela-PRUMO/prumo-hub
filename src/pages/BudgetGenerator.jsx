import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import BudgetForm from '@/components/budget/BudgetForm';
import BudgetEditorWYSIWYG from '@/components/budget/BudgetEditorWYSIWYG';
import { ChevronLeft, Download, FileEdit } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function BudgetGenerator() {
  const [step, setStep] = useState('form'); // form, editor, history
  const [budgetData, setBudgetData] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
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

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', user?.email],
    queryFn: () => base44.entities.Budget.filter({ consultor_email: user?.email }, '-created_date', 100),
    enabled: !!user?.email
  });

  const saveBudgetMutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        const { id, ...rest } = data;
        return base44.entities.Budget.update(id, rest);
      }
      return base44.entities.Budget.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento salvo com sucesso!');
      setTimeout(() => setStep('history'), 1500);
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
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento enviado por email com sucesso!');
      setTimeout(() => setStep('history'), 2000);
    },
    onError: (error) => {
      toast.error('Erro ao enviar orçamento: ' + error.message);
    }
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (budgetId) => base44.entities.Budget.delete(budgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento deletado');
      setSelectedBudget(null);
    },
    onError: (error) => {
      toast.error('Erro ao deletar: ' + error.message);
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

  const handleStepChange = (newStep) => {
    if (budgetData && newStep !== 'editor') {
      const confirmed = window.confirm('Você tem alterações não salvas. Deseja sair sem salvar?');
      if (!confirmed) return;
      setBudgetData(null);
    }
    setStep(newStep);
  };

  const handleSaveDocument = async (editorData) => {
    // Garantir que IDs dos serviços sejam strings (validação da API)
    const services = (budgetData.services || []).map(s => ({
      ...s,
      id: String(s.id),
    }));
    const additional_fees = (budgetData.additional_fees || []).map(f => ({
      ...f,
      id: String(f.id),
    }));

    const fullData = {
      ...budgetData,
      services,
      additional_fees,
      document_html: editorData.documentHtml,
      logo_url: editorData.logoBase64 || budgetData.logo_url,
    };
    saveBudgetMutation.mutate(fullData);
  };

  const handleSendDocument = async (editorData) => {
    sendBudgetMutation.mutate(editorData);
  };

  // Abre o editor com um orçamento do histórico
  const handleOpenBudget = (budget) => {
    setBudgetData(budget);
    setStep('editor');
  };

  // Download PDF direto de um orçamento salvo
  const handleDownloadPDF = async (e, budget) => {
    e.stopPropagation();
    if (!budget.document_html) {
      toast.error('Este orçamento não possui documento gerado. Abra-o e salve novamente.');
      return;
    }
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.backgroundColor = '#fff';
    container.style.padding = '40px';
    container.innerHTML = budget.document_html;
    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#fff', useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`orcamento-${budget.budget_number || budget.id}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar PDF');
    } finally {
      document.body.removeChild(container);
    }
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
            {(step === 'editor' || step === 'history') && (
              <Button
                onClick={() => handleStepChange('form')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-emerald-900 mb-2">
                {step === 'form' ? 'Gerador de Orçamentos' : step === 'editor' ? 'Editar Documento' : 'Histórico de Orçamentos'}
              </h1>
              <p className="text-gray-600">
                {step === 'form'
                  ? 'Crie um novo orçamento com detalhes de serviços e custos'
                  : step === 'editor'
                  ? 'Customize o documento e envie para o cliente'
                  : 'Visualize, edite e acompanhe seus orçamentos'}
              </p>
            </div>
            {step === 'form' && (
              <Button
                onClick={() => setStep('history')}
                variant="outline"
                className="gap-2"
              >
                Ver Histórico ({budgets.length})
              </Button>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        {step === 'form' && (
          <BudgetForm onSubmit={handleFormSubmit} user={user} />
        )}

        {step === 'editor' && budgetData && (
          <BudgetEditorWYSIWYG
            budgetData={budgetData}
            consultorData={user}
            onSave={handleSaveDocument}
            onSend={handleSendDocument}
          />
        )}

        {step === 'history' && (
          <div className="space-y-4">
            {budgets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Nenhum orçamento criado ainda</p>
              </div>
            ) : (
              budgets.map(budget => (
                <div key={budget.id} className="border rounded-lg p-4 hover:bg-emerald-50/50 cursor-pointer" onClick={() => handleOpenBudget(budget)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-emerald-900">{budget.budget_number} - {budget.client_name}</h3>
                      <p className="text-sm text-gray-600 truncate">{budget.title}</p>
                      <div className="flex flex-wrap gap-4 text-sm mt-2">
                        <span className="text-gray-500">Email: {budget.client_email}</span>
                        <span className="text-gray-500">Valor: <strong>R$ {budget.total_amount?.toFixed(2)}</strong></span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${budget.status === 'Aceito' ? 'bg-green-100 text-green-800' : budget.status === 'Enviado' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{budget.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={(e) => handleDownloadPDF(e, budget)}
                        title="Baixar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleOpenBudget(budget)}
                        title="Abrir Editor"
                      >
                        <FileEdit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteBudgetMutation.mutate(budget.id)}
                      >
                        Deletar
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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