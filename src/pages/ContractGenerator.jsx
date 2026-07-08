import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ContractForm from '@/components/contract/ContractForm';
import ContractEditorWYSIWYG from '@/components/contract/ContractEditorWYSIWYG';
import ContractEmailHistory from '@/components/contract/ContractEmailHistory';
import { ChevronLeft, Download, Copy, Trash2, FileText, Mail, Plus } from 'lucide-react';
import { useNavigationGuard } from '../hooks/useNavigationGuard';
import { useEffectiveUser } from '../hooks/useEffectiveUser';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ContractGenerator() {
  const { user, effectiveEmail, isLoading: loadingUser } = useEffectiveUser();
  const [step, setStep] = React.useState('form');
  const [historyTab, setHistoryTab] = React.useState('contracts');
  const [contractData, setContractData] = React.useState(null);
  const [selectedContract, setSelectedContract] = React.useState(null);
  const [isDirty, setIsDirty] = React.useState(false);
  const queryClient = useQueryClient();

  // Proteger contra saída do gerador sem salvar
  useNavigationGuard(isDirty);

  const { data: templates = [] } = useQuery({
    queryKey: ['contractTemplates', effectiveEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('listConsultorContracts', {});
      return res.data?.templates || [];
    },
    enabled: !!effectiveEmail
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', effectiveEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('listClientContracts', {});
      return res.data?.contracts || [];
    },
    enabled: !!effectiveEmail
  });

  const saveContractMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createClientContract', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Contrato salvo com sucesso!');
      setTimeout(() => window.location.href = '/Contracts', 2000);
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + error.message);
    }
  });

  const sendToSignMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('setupClicksignContract', {
        contract_data: contractData,
        document_html: data.documentHtml,
        signers: contractData.signers
      });
      return response;
    },
    onSuccess: (response) => {
      if (response.data?.clicksign_key) {
        toast.success('Contrato enviado para assinatura!');
        setTimeout(() => window.location.href = '/Contracts', 2000);
      }
    },
    onError: (error) => {
      toast.error('Erro ao enviar para assinatura: ' + error.message);
    }
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (templateData) => 
      base44.entities.ContractTemplate.create({
        consultor_email: user?.email,
        contract_type: contractData?.contract_type,
        ...templateData
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractTemplates'] });
      toast.success('Modelo salvo com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar modelo: ' + error.message);
    }
  });

  const deleteContractMutation = useMutation({
    mutationFn: (contractId) => base44.functions.invoke('deleteClientContract', { id: contractId }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato deletado');
      setSelectedContract(null);
    },
    onError: (error) => {
      toast.error('Erro ao deletar: ' + error.message);
    }
  });

  const handleFormSubmit = async (data) => {
    setContractData({
      ...data,
      consultor_email: user?.email,
      status: 'Proposta'
    });
    setIsDirty(true);
    setStep('editor');
  };

  const handleStepChange = (newStep) => {
    if (contractData && newStep !== 'editor') {
      const confirmed = window.confirm('Você tem alterações não salvas. Deseja sair sem salvar?');
      if (!confirmed) return;
      setContractData(null);
      setIsDirty(false);
    }
    setStep(newStep);
  };

  const handleSaveDocument = async (editorData) => {
    const now = new Date().toISOString();
    const documents = [];

    // Se vier pdfUrl gerado pelo editor, salva como documento
    if (editorData.pdfUrl) {
      documents.push({
        name: `Contrato - ${contractData.contract_type || 'Gerado'} - ${new Date().toLocaleDateString('pt-BR')}`,
        url: editorData.pdfUrl,
        type: 'Proposta',
        upload_date: now,
      });
    }

    const fullData = {
      ...contractData,
      consultor_email: user?.email,
      document_html: editorData.documentHtml,
      template_id: editorData.selectedTemplate || contractData.template_id,
      documents,
    };
    saveContractMutation.mutate(fullData);
    setIsDirty(false);
  };

  const handleSendToSign = async (editorData) => {
    sendToSignMutation.mutate(editorData);
    setIsDirty(false);
  };

  const exportContractPDF = async (contract) => {
    const html = contract.document_html;
    if (!html) {
      toast.error('Este contrato não possui conteúdo HTML para exportar.');
      return;
    }
    try {
      toast.info('Gerando PDF...');
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;padding:40px;background:#fff;font-family:Calibri,Arial,sans-serif;line-height:1.8;color:#333;';
      container.innerHTML = html;
      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#fff', useCORS: true });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      while (heightLeft >= 0) {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
        position -= 297;
        if (heightLeft > 0) pdf.addPage();
      }
      pdf.save(`contrato-${contract.contract_number || contract.id}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF: ' + error.message);
    }
  };

  const loadContractIntoEditor = (contract) => {
    if (!contract.document_html) {
      toast.error('Este contrato não possui conteúdo HTML para usar como modelo.');
      return;
    }
    setContractData({
      ...contract,
      consultor_email: user?.email,
    });
    setIsDirty(true);
    setStep('editor');
    toast.success('Contrato carregado no editor!');
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50/30 py-8">
      <div className="max-w-5xl mx-auto px-4">
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
            <h1 className="text-3xl font-bold text-emerald-900">
              {step === 'form' ? 'Gerador de Contratos' : step === 'editor' ? 'Editar Contrato' : 'Meus Contratos'}
            </h1>
            {step === 'form' && (
              <Button
                onClick={() => setStep('history')}
                variant="outline"
                className="gap-2"
              >
                Ver Histórico ({contracts.length})
              </Button>
            )}
          </div>
        </div>

        {step === 'form' && (
          <ContractForm user={user} templates={templates} onSubmit={handleFormSubmit} onFormChange={() => setIsDirty(true)} />
        )}

        {step === 'editor' && contractData && (
          <ContractEditorWYSIWYG
            contractData={contractData}
            templates={templates}
            onSave={handleSaveDocument}
            onSendToSign={handleSendToSign}
            onSaveTemplate={(data) => saveTemplateMutation.mutate(data)}
          />
        )}

        {step === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-emerald-900">Histórico de Contratos</h2>
              </div>
              <Button onClick={() => setStep('form')} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="w-4 h-4" /> Novo Contrato
              </Button>
            </div>

            {/* Abas */}
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setHistoryTab('contracts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  historyTab === 'contracts'
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                Contratos ({contracts.length})
              </button>
              <button
                onClick={() => setHistoryTab('emails')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  historyTab === 'emails'
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail className="w-4 h-4" />
                E-mails Enviados
              </button>
            </div>

            {historyTab === 'emails' && (
              <ContractEmailHistory consultorEmail={effectiveEmail} />
            )}

            {historyTab === 'contracts' && (
            <div className="space-y-4">
            {contracts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Nenhum contrato criado ainda</p>
              </div>
            ) : (
              contracts.map(contract => (
                <div key={contract.id} className="border rounded-lg p-4 bg-white hover:bg-emerald-50/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-emerald-900">{contract.contract_number || '—'}</h3>
                      <p className="text-sm text-gray-600 truncate">{contract.object}</p>
                      <div className="flex flex-wrap gap-4 text-sm mt-2">
                        <span><span className="text-gray-500">Cliente:</span> {contract.client_name}</span>
                        <span><span className="text-gray-500">Valor:</span> R$ {contract.total_value?.toFixed(2) || '0,00'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${contract.status === 'Assinado' ? 'bg-green-100 text-green-800' : contract.status === 'Em Assinatura' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{contract.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => exportContractPDF(contract)}
                        disabled={!contract.document_html}
                        title={!contract.document_html ? 'Sem conteúdo HTML salvo' : 'Exportar PDF'}
                      >
                        <Download className="w-3 h-3" /> PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => loadContractIntoEditor(contract)}
                        disabled={!contract.document_html}
                        title={!contract.document_html ? 'Sem conteúdo HTML salvo' : 'Abrir no editor'}
                      >
                        <Copy className="w-3 h-3" /> Usar como Modelo
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (window.confirm('Deletar este contrato?')) {
                            deleteContractMutation.mutate(contract.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
            </div>
            )}
          </div>
        )}

        {(saveContractMutation.isPending || sendToSignMutation.isPending || saveTemplateMutation.isPending) && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
            <Card className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p>{sendToSignMutation.isPending ? 'Enviando para assinatura...' : saveTemplateMutation.isPending ? 'Salvando modelo...' : 'Salvando contrato...'}</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}