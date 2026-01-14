import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Plus, 
  Droplets, 
  FileCheck,
  DollarSign, 
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  Edit,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import PSAContractForm from '../components/psa/PSAContractForm';
import PSAContractDetails from '../components/psa/PSAContractDetails';
import PSAReports from '../components/psa/PSAReports';

export default function PSAContractsPage() {
  const [user, setUser] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('all');

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => {
      if (user?.role === 'admin') {
        return base44.entities.Property.list('-created_date', 1000);
      }
      return base44.entities.Property.filter(
        { owner_email: user.email },
        '-created_date',
        100
      );
    },
    enabled: !!user?.email
  });

  const { data: allContracts = [], isLoading } = useQuery({
    queryKey: ['psaContracts'],
    queryFn: () => base44.entities.PSAContract.list('-created_date', 1000),
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PSAContract.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['psaContracts'] });
      setShowForm(false);
      setEditingContract(null);
      toast.success('Contrato de PSA criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar contrato');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PSAContract.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['psaContracts'] });
      setShowForm(false);
      setEditingContract(null);
      toast.success('Contrato atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar contrato');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PSAContract.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['psaContracts'] });
      toast.success('Contrato removido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover contrato');
    }
  });

  const handleSubmit = (data) => {
    if (editingContract) {
      updateMutation.mutate({ id: editingContract.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (contract) => {
    setEditingContract(contract);
    setShowForm(true);
  };

  const handleDelete = (contract) => {
    if (window.confirm(`Tem certeza que deseja remover o contrato "${contract.contract_name}"?`)) {
      deleteMutation.mutate(contract.id);
    }
  };

  // Filter contracts
  const filteredContracts = allContracts.filter(contract => {
    const propertyMatch = selectedProperty === 'all' || contract.property_id === selectedProperty;
    const statusMatch = statusFilter === 'all' || contract.status === statusFilter;
    return propertyMatch && statusMatch;
  });

  // Calculate statistics
  const stats = {
    totalContracts: filteredContracts.length,
    activeContracts: filteredContracts.filter(c => c.status === 'Ativo').length,
    totalArea: filteredContracts.reduce((sum, c) => sum + (c.area_hectares || 0), 0),
    totalValue: filteredContracts.reduce((sum, c) => sum + (c.total_contract_value || 0), 0),
    totalReceived: filteredContracts.reduce((sum, c) => {
      const received = (c.payments_received || []).reduce((pSum, p) => pSum + (p.amount || 0), 0);
      return sum + received;
    }, 0),
    avgCompliance: filteredContracts.length > 0
      ? filteredContracts.reduce((sum, c) => sum + (c.compliance_score || 0), 0) / filteredContracts.length
      : 0
  };

  const statusConfig = {
    'Ativo': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    'Em Aprovação': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    'Suspenso': { color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
    'Concluído': { color: 'bg-blue-100 text-blue-800', icon: FileCheck },
    'Cancelado': { color: 'bg-red-100 text-red-800', icon: AlertCircle }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-blue-900">O que é PSA (Pagamento por Serviços Ambientais)?</h3>
            <p className="text-blue-800 text-sm">
              <strong>PSA:</strong> Mecanismo de compensação financeira que remunera proprietários rurais pela prestação de serviços ambientais, como proteção de recursos hídricos, conservação de biodiversidade, sequestro de carbono e manutenção de corredores ecológicos.
            </p>
            <p className="text-blue-800 text-sm">
              <strong>Operacionalização:</strong> Contrato entre proprietário (beneficiário) e pagador (instituição, empresa ou governo) que define: serviços ambientais, área envolvida, obrigações, monitoramento e valores de pagamento periódico.
            </p>
            <p className="text-blue-800 text-sm">
              <strong>Benefícios:</strong> Renda adicional, reconhecimento ambiental e potencial para créditos de carbono ou certificações que agregam valor ao imóvel.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Droplets className="w-8 h-8 text-blue-600" />
            Pagamento por Serviços Ambientais (PSA)
          </h1>
          <p className="text-gray-600 mt-1">Gerencie contratos de PSA e monitore conformidade</p>
        </div>
        <Button
          onClick={() => {
            setEditingContract(null);
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <PSAContractForm
          contract={editingContract}
          properties={properties}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingContract(null);
          }}
        />
      )}

      {/* Details Modal */}
      {selectedContract && (
        <PSAContractDetails
          contract={selectedContract}
          property={properties.find(p => p.id === selectedContract.property_id)}
          onClose={() => setSelectedContract(null)}
          onEdit={() => {
            setEditingContract(selectedContract);
            setSelectedContract(null);
            setShowForm(true);
          }}
          onDelete={() => {
            handleDelete(selectedContract);
            setSelectedContract(null);
          }}
        />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Propriedade
              </label>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas as Propriedades</option>
                {properties.map(prop => (
                  <option key={prop.id} value={prop.id}>{prop.property_name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos os Status</option>
                <option value="Ativo">Ativo</option>
                <option value="Em Aprovação">Em Aprovação</option>
                <option value="Suspenso">Suspenso</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total de Contratos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalContracts}</div>
                <p className="text-sm text-green-600 mt-1">{stats.activeContracts} ativos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Área Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.totalArea.toFixed(2)}</div>
                <p className="text-sm text-gray-500 mt-1">hectares</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Valor Total dos Contratos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(stats.totalValue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total Recebido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(stats.totalReceived)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Conformidade Média</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.avgCompliance.toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">A Receber</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(stats.totalValue - stats.totalReceived)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Contracts */}
          <Card>
            <CardHeader>
              <CardTitle>Contratos Recentes</CardTitle>
              <CardDescription>Últimos contratos de PSA cadastrados</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredContracts.length === 0 ? (
                <div className="text-center py-12">
                  <Droplets className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum contrato cadastrado ainda</p>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Contrato
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredContracts.slice(0, 5).map(contract => {
                    const StatusIcon = statusConfig[contract.status]?.icon || Clock;
                    const property = properties.find(p => p.id === contract.property_id);
                    
                    return (
                      <div
                        key={contract.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                        onClick={() => setSelectedContract(contract)}
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Droplets className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">{contract.contract_name}</h3>
                            <p className="text-sm text-gray-600">{property?.property_name || 'Propriedade não encontrada'}</p>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <Badge className={cn('text-xs', statusConfig[contract.status]?.color)}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {contract.status}
                              </Badge>
                              <span className="text-sm text-gray-600">{contract.area_hectares} ha</span>
                              {contract.compliance_score !== undefined && (
                                <span className="text-sm text-gray-600">
                                  Conformidade: {contract.compliance_score}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.payment_value || 0)}
                          </div>
                          <p className="text-xs text-gray-500">{contract.payment_periodicity}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Carregando contratos...</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <Droplets className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Nenhum contrato encontrado</p>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Novo Contrato
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredContracts.map(contract => {
                const StatusIcon = statusConfig[contract.status]?.icon || Clock;
                const property = properties.find(p => p.id === contract.property_id);
                const totalReceived = (contract.payments_received || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                const progressPercent = contract.total_contract_value > 0
                  ? (totalReceived / contract.total_contract_value * 100).toFixed(1)
                  : 0;

                return (
                  <Card key={contract.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{contract.contract_name}</CardTitle>
                          <CardDescription className="mt-1">
                            {property?.property_name || 'Propriedade não encontrada'}
                          </CardDescription>
                        </div>
                        <Badge className={cn('ml-2', statusConfig[contract.status]?.color)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {contract.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Pagador</p>
                          <p className="font-medium text-gray-900 text-sm">{contract.payer}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Área</p>
                          <p className="font-medium text-gray-900">{contract.area_hectares} ha</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Valor do Contrato</p>
                          <p className="font-medium text-green-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.total_contract_value || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Pagamento</p>
                          <p className="font-medium text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.payment_value || 0)}
                          </p>
                          <p className="text-xs text-gray-500">{contract.payment_periodicity}</p>
                        </div>
                      </div>

                      {contract.total_contract_value > 0 && (
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progresso de Pagamento</span>
                            <span>{progressPercent}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {contract.compliance_score !== undefined && (
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">Score de Conformidade</span>
                          <span className="font-semibold text-blue-600">{contract.compliance_score}%</span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => setSelectedContract(contract)}
                          variant="outline"
                          className="flex-1"
                        >
                          Ver Detalhes
                        </Button>
                        <Button
                          onClick={() => handleEdit(contract)}
                          variant="outline"
                          size="icon"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(contract)}
                          variant="outline"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports">
          <PSAReports contracts={filteredContracts} properties={properties} />
        </TabsContent>
      </Tabs>
    </div>
  );
}