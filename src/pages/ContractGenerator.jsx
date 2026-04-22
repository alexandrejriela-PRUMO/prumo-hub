import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ContractForm from '@/components/contract/ContractForm';
import ContractEditorWYSIWYG from '@/components/contract/ContractEditorWYSIWYG';
import { ChevronLeft } from 'lucide-react';
import { useNavigationGuard } from '../hooks/useNavigationGuard';

export default function ContractGenerator() {
  const [step, setStep] = useState('form');
  const [contractData, setContractData] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Erro ao carregar usuário');
      } finally {
        setLoadingUser(false);
      }
    };
    loadUser();
  }, []);

  // Proteger contra saída do gerador sem salvar
  useNavigationGuard(isDirty);

  const { data: templates = [] } = useQuery({
    queryKey: ['contractTemplates', user?.email],
    queryFn: () => base44.entities.ContractTemplate.filter({ consultor_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', user?.email],
    queryFn: () => base44.entities.ClientContract.filter({ consultor_email: user?.email }, '-created_date', 100),
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

  const deleteContractMutation = useMutation({
    mutationFn: (contractId) => base44.entities.ClientContract.delete(contractId),
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
            <div>
              <h1 className="text-3xl font-bold text-emerald-900 mb-2">
                {step === 'form' ? 'Gerador de Contratos' : step === 'editor' ? 'Editar Contrato' : 'Meus Contratos'}
              </h1>
              <p className="text-gray-600">
                {step === 'form'
                  ? 'Crie um novo contrato e envie para assinatura digital'
                  : step === 'editor'
                  ? 'Customize o contrato e envie para assinatura'
                  : 'Visualize, edite e gerencie seus contratos'}
              </p>
            </div>
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
          <div className="space-y-4">
            {contracts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Nenhum contrato criado ainda</p>
              </div>
            ) : (
              contracts.map(contract => (
                <div key={contract.id} className="border rounded-lg p-4 hover:bg-emerald-50/50 cursor-pointer" onClick={() => setSelectedContract(contract)}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold">{contract.contract_number}</h3>
                      <p className="text-sm text-gray-600">{contract.object}</p>
                      <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                        <div><span className="text-gray-500">Cliente:</span> {contract.client_name}</div>
                        <div><span className="text-gray-500">Valor:</span> R$ {contract.total_value?.toFixed(2)}</div>
                        <div><span className={`px-2 py-1 rounded text-xs font-medium ${contract.status === 'Assinado' ? 'bg-green-100 text-green-800' : contract.status === 'Em Assinatura' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{contract.status}</span></div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteContractMutation.mutate(contract.id);
                      }}
                    >
                      Deletar
                    </Button>
                  </div>
                </div>
              ))
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