import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Eye, Edit2, Download, Trash2, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const statusColors = {
  'Proposta': 'bg-yellow-100 text-yellow-800',
  'Em Assinatura': 'bg-blue-100 text-blue-800',
  'Assinado': 'bg-green-100 text-green-800',
  'Encerrado': 'bg-gray-100 text-gray-800',
  'Cancelado': 'bg-red-100 text-red-800'
};

export default function MyContracts() {
  const [user, setUser] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const queryClient = useQueryClient();

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

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', user?.email],
    queryFn: () => base44.entities.ClientContract.filter({ consultor_email: user?.email }, '-created_date', 100),
    enabled: !!user?.email
  });

  const deleteContractMutation = useMutation({
    mutationFn: (contractId) => base44.entities.ClientContract.delete(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato deletado');
      setShowDetail(false);
    },
    onError: (error) => {
      toast.error('Erro ao deletar: ' + error.message);
    }
  });

  const exportPDF = async (contract) => {
    try {
      const element = document.createElement('div');
      element.innerHTML = contract.document_html;
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      document.body.appendChild(element);

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#fff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

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

      pdf.save(`${contract.contract_number}.pdf`);
      toast.success('PDF exportado');
      document.body.removeChild(element);
    } catch (error) {
      toast.error('Erro ao exportar PDF');
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
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-emerald-900 mb-2">Meus Contratos</h1>
          <p className="text-gray-600">Visualize, edite e gerencie seus contratos</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : contracts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum contrato criado ainda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {contracts.map(contract => (
              <Card key={contract.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{contract.contract_number}</h3>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[contract.status]}`}>
                          {contract.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{contract.object}</p>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Cliente:</span> {contract.client_name}
                        </div>
                        <div>
                          <span className="text-gray-500">Tipo:</span> {contract.contract_type}
                        </div>
                        <div>
                          <span className="text-gray-500">Valor:</span> R$ {contract.total_value?.toFixed(2) || '0,00'}
                        </div>
                        <div>
                          <span className="text-gray-500">Criado:</span>{' '}
                          {formatDistanceToNow(new Date(contract.created_date), { locale: ptBR, addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedContract(contract);
                          setShowDetail(true);
                        }}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" /> Ver
                      </Button>
                      {contract.status === 'Proposta' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                        >
                          <Edit2 className="w-4 h-4" /> Editar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportPDF(contract)}
                        className="gap-1"
                      >
                        <Download className="w-4 h-4" /> PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {showDetail && selectedContract && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{selectedContract.contract_number}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{selectedContract.client_name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetail(false)}
                >
                  ✕
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Informações</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Cliente:</span> {selectedContract.client_name}
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span> {selectedContract.status}
                    </div>
                    <div>
                      <span className="text-gray-600">Tipo:</span> {selectedContract.contract_type}
                    </div>
                    <div>
                      <span className="text-gray-600">Valor:</span> R$ {selectedContract.total_value?.toFixed(2) || '0,00'}
                    </div>
                    <div>
                      <span className="text-gray-600">Vigência:</span> {selectedContract.start_date} a {selectedContract.end_date}
                    </div>
                    <div>
                      <span className="text-gray-600">Condições:</span> {selectedContract.payment_terms}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Documento</h4>
                  <div
                    className="border rounded-lg p-4 bg-white max-h-64 overflow-y-auto text-sm"
                    dangerouslySetInnerHTML={{ __html: selectedContract.document_html }}
                  />
                </div>

                <div className="border-t pt-4 flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => exportPDF(selectedContract)}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" /> Exportar PDF
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      deleteContractMutation.mutate(selectedContract.id)
                    }
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Deletar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDetail(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}