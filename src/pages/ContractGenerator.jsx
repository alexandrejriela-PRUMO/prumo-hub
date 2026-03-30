import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ContractForm from '@/components/contract/ContractForm';
import ContractEditorWYSIWYG from '@/components/contract/ContractEditorWYSIWYG';
import { ChevronLeft } from 'lucide-react';

export default function ContractGenerator() {
  const [step, setStep] = useState('form');
  const [contractData, setContractData] = useState(null);
  const [user, setUser] = useState(null);
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
    queryKey: ['contractTemplates', user?.email],
    queryFn: () => base44.entities.ContractTemplate.filter({ consultor_email: user?.email }),
    enabled: !!user?.email
  });

  const saveContractMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientContract.create(data),
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

  const handleFormSubmit = async (data) => {
    setContractData({
      ...data,
      consultor_email: user?.email,
      status: 'Proposta'
    });
    setStep('editor');
  };

  const handleSaveDocument = async (editorData) => {
    const fullData = {
      ...contractData,
      document_html: editorData.documentHtml,
      template_id: editorData.selectedTemplate
    };
    saveContractMutation.mutate(fullData);
  };

  const handleSendToSign = async (editorData) => {
    sendToSignMutation.mutate(editorData);
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
            {step === 'form' ? 'Gerador de Contratos' : 'Editar Contrato'}
          </h1>
          <p className="text-gray-600">
            {step === 'form'
              ? 'Crie um novo contrato e envie para assinatura digital'
              : 'Customize o contrato e envie para assinatura'}
          </p>
        </div>

        {step === 'form' && (
          <ContractForm onSubmit={handleFormSubmit} />
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