import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import BudgetForm from '@/components/budget/BudgetForm';
import BudgetEditorWYSIWYG from '@/components/budget/BudgetEditorWYSIWYG';
import { ChevronLeft, Download, FileEdit, Trash2, Clock, User, DollarSign, FileText, Plus, Eye } from 'lucide-react';

import { useNavigationGuard } from '../hooks/useNavigationGuard';

export default function BudgetGenerator() {
  const [step, setStep] = React.useState('form'); // form, editor, history
  const [budgetData, setBudgetData] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [selectedBudget, setSelectedBudget] = React.useState(null);
  const [isDirty, setIsDirty] = React.useState(false);
  const queryClient = useQueryClient();

  // Proteger contra saída do gerador sem salvar
  useNavigationGuard(isDirty);

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
    setIsDirty(true);
    setStep('editor');
  };

  const handleStepChange = (newStep) => {
    if (budgetData && newStep !== 'editor') {
      const confirmed = window.confirm('Você tem alterações não salvas. Deseja sair sem salvar?');
      if (!confirmed) return;
      setBudgetData(null);
      setIsDirty(false);
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
    setIsDirty(false);
  };

  const handleSendDocument = async (editorData) => {
    sendBudgetMutation.mutate(editorData);
    setIsDirty(false);
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
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
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
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
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
          <BudgetForm onSubmit={handleFormSubmit} user={user} onFormChange={() => setIsDirty(true)} />
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
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-emerald-900">Orçamentos Salvos</h2>
                <p className="text-sm text-gray-500 mt-0.5">{budgets.length} orçamento{budgets.length !== 1 ? 's' : ''} encontrado{budgets.length !== 1 ? 's' : ''}</p>
              </div>
              <Button onClick={() => setStep('form')} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="w-4 h-4" /> Novo Orçamento
              </Button>
            </div>

            {budgets.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhum orçamento salvo ainda</p>
                <p className="text-gray-400 text-sm mt-1">Crie seu primeiro orçamento clicando em "Novo Orçamento"</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {budgets.map(budget => {
                  const statusColor = budget.status === 'Aceito'
                    ? 'bg-emerald-100 text-emerald-800'
                    : budget.status === 'Enviado'
                    ? 'bg-blue-100 text-blue-800'
                    : budget.status === 'Recusado'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-600';

                  const createdAt = budget.created_date
                    ? new Date(budget.created_date).toLocaleDateString('pt-BR')
                    : '—';

                  return (
                    <Card key={budget.id} className="hover:shadow-md transition-shadow border-gray-100">
                      <CardContent className="p-0">
                        <div className="flex items-stretch">
                          {/* Barra lateral colorida */}
                          <div className="w-1.5 rounded-l-lg bg-emerald-600 flex-shrink-0" />
                          <div className="flex-1 p-5">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              {/* Info principal */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                    {budget.budget_number}
                                  </span>
                                  <Badge className={`text-xs border-0 ${statusColor}`}>{budget.status || 'Rascunho'}</Badge>
                                </div>
                                <h3 className="font-bold text-gray-900 text-base leading-snug truncate">
                                  {budget.title || 'Orçamento de Serviços'}
                                </h3>
                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                                  <span className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                    {budget.client_name || '—'}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                    <strong className="text-emerald-700">
                                      R$ {(budget.total_amount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </strong>
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    {createdAt}
                                  </span>
                                </div>
                              </div>

                              {/* Ações */}
                              <div className="flex gap-2 flex-shrink-0 items-center">
                                {budget.document_html && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 text-xs"
                                    onClick={(e) => handleDownloadPDF(e, budget)}
                                    title="Baixar PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" /> PDF
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => handleOpenBudget(budget)}
                                  title="Abrir no Editor"
                                >
                                  <FileEdit className="w-3.5 h-3.5" /> Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Deseja deletar este orçamento?')) {
                                      deleteBudgetMutation.mutate(budget.id);
                                    }
                                  }}
                                  title="Deletar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
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