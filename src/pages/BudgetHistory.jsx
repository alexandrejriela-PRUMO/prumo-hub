import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Eye, Edit2, Send, Trash2, ArrowRight, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors = {
  'Rascunho': 'bg-slate-100 text-slate-800',
  'Enviado': 'bg-blue-100 text-blue-800',
  'Aceito': 'bg-green-100 text-green-800',
  'Rejeitado': 'bg-red-100 text-red-800'
};

export default function BudgetHistory() {
  const [user, setUser] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
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

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', user?.email],
    queryFn: () => base44.entities.Budget.filter({ consultor_email: user?.email }, '-created_date', 100),
    enabled: !!user?.email
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (budgetId) => base44.entities.Budget.delete(budgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento deletado');
      setShowDetail(false);
    },
    onError: (error) => {
      toast.error('Erro ao deletar: ' + error.message);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ budgetId, status }) =>
      base44.entities.Budget.update(budgetId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Status atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });

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
          <h1 className="text-3xl font-bold text-emerald-900 mb-2">Histórico de Orçamentos</h1>
          <p className="text-gray-600">Gerencie, edite e acompanhe todos os seus orçamentos</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : budgets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum orçamento criado ainda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {budgets.map(budget => (
              <Card key={budget.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{budget.budget_number} - {budget.client_name}</h3>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[budget.status]}`}>
                          {budget.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{budget.title}</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Email:</span> {budget.client_email}
                        </div>
                        <div>
                          <span className="text-gray-500">Valor:</span> R$ {budget.total_amount?.toFixed(2) || '0,00'}
                        </div>
                        <div>
                          <span className="text-gray-500">Criado:</span>{' '}
                          {formatDistanceToNow(new Date(budget.created_date), { locale: ptBR, addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBudget(budget);
                          setShowDetail(true);
                        }}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" /> Ver
                      </Button>
                      {budget.status === 'Rascunho' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                        >
                          <Edit2 className="w-4 h-4" /> Editar
                        </Button>
                      )}
                      {budget.status === 'Aceito' && (
                        <Button
                          size="sm"
                          className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <ArrowRight className="w-4 h-4" /> Gerar Contrato
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {showDetail && selectedBudget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{selectedBudget.budget_number}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{selectedBudget.client_name}</p>
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
                      <span className="text-gray-600">Email:</span> {selectedBudget.client_email}
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span> {selectedBudget.status}
                    </div>
                    <div>
                      <span className="text-gray-600">Valor Total:</span> R$ {selectedBudget.total_amount?.toFixed(2) || '0,00'}
                    </div>
                    <div>
                      <span className="text-gray-600">Validade:</span> {selectedBudget.validity_days} dias
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Documento</h4>
                  <div
                    className="border rounded-lg p-4 bg-white max-h-64 overflow-y-auto text-sm"
                    dangerouslySetInnerHTML={{ __html: selectedBudget.document_html }}
                  />
                </div>

                <div className="border-t pt-4 flex gap-2 justify-end">
                  {selectedBudget.status === 'Rascunho' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            budgetId: selectedBudget.id,
                            status: 'Enviado'
                          })
                        }
                        className="gap-2"
                      >
                        <Send className="w-4 h-4" /> Enviar
                      </Button>
                    </>
                  )}
                  {selectedBudget.status === 'Aceito' && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                    >
                      <ArrowRight className="w-4 h-4" /> Ir para Contrato
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() =>
                      deleteBudgetMutation.mutate(selectedBudget.id)
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