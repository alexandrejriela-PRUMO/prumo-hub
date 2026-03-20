import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Plus, 
  Leaf, 
  TrendingUp, 
  DollarSign, 
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  BarChart3,
  Filter,
  Edit,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import CarbonCreditForm from '../components/carbon/CarbonCreditForm';
import CarbonCreditDetails from '../components/carbon/CarbonCreditDetails';
import CarbonMarketNews from '../components/carbon/CarbonMarketNews';
import CarbonReports from '../components/carbon/CarbonReports';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

export default function CarbonCreditsPage() {
  const [user, setUser] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  const [selectedCredit, setSelectedCredit] = useState(null);
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

  const { effectiveEmail, userType } = useEffectiveUser();
  const isConsultor = userType === 'consultor' || userType === 'equipe';

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', effectiveEmail, userType],
    queryFn: () => isConsultor
      ? base44.entities.Property.filter({ consultor_email: effectiveEmail })
      : base44.entities.Property.filter({ owner_email: effectiveEmail }),
    enabled: !!effectiveEmail
  });

  const { data: allCredits = [], isLoading } = useQuery({
    queryKey: ['carbonCredits'],
    queryFn: () => base44.entities.CarbonCredit.list('-created_date', 1000),
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CarbonCredit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carbonCredits'] });
      setShowForm(false);
      setEditingCredit(null);
      toast.success('Projeto de crédito de carbono criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar projeto');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CarbonCredit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carbonCredits'] });
      setShowForm(false);
      setEditingCredit(null);
      toast.success('Projeto atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar projeto');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CarbonCredit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carbonCredits'] });
      toast.success('Projeto removido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover projeto');
    }
  });

  const handleSubmit = (data) => {
    if (editingCredit) {
      updateMutation.mutate({ id: editingCredit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (credit) => {
    setEditingCredit(credit);
    setShowForm(true);
  };

  const handleDelete = (credit) => {
    if (window.confirm(`Tem certeza que deseja remover o projeto "${credit.project_name}"?`)) {
      deleteMutation.mutate(credit.id);
    }
  };

  // Filter credits based on property and status
  const filteredCredits = allCredits.filter(credit => {
    const propertyMatch = selectedProperty === 'all' || credit.property_id === selectedProperty;
    const statusMatch = statusFilter === 'all' || credit.status === statusFilter;
    return propertyMatch && statusMatch;
  });

  // Calculate statistics
  const stats = {
    totalProjects: filteredCredits.length,
    totalEstimated: filteredCredits.reduce((sum, c) => sum + (c.estimated_credits || 0), 0),
    totalVerified: filteredCredits.reduce((sum, c) => sum + (c.verified_credits || 0), 0),
    totalAvailable: filteredCredits.reduce((sum, c) => sum + (c.available_credits || 0), 0),
    totalSold: filteredCredits.reduce((sum, c) => sum + (c.sold_credits || 0), 0),
    totalRevenue: filteredCredits.reduce((sum, c) => {
      const revenue = (c.transactions || []).reduce((tSum, t) => 
        tSum + (t.type === 'Venda' ? (t.quantity * t.price_per_credit) : 0), 0
      );
      return sum + revenue;
    }, 0)
  };

  const statusConfig = {
    'Planejamento': { color: 'bg-gray-100 text-gray-800', icon: Clock },
    'Em Implementação': { color: 'bg-blue-100 text-blue-800', icon: TrendingUp },
    'Em Validação': { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    'Validado': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    'Certificado': { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
    'Comercializado': { color: 'bg-purple-100 text-purple-800', icon: DollarSign },
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
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-green-900">O que são Créditos de Carbono?</h3>
            <p className="text-green-800 text-sm">
              <strong>Créditos de Carbono:</strong> Certificados que representam a redução ou sequestro de uma tonelada de CO₂ (ou equivalente). Gerados por projetos que diminuem emissões ou removem carbono da atmosfera (reflorestamento, conservação florestal, manejo sustentável).
            </p>
            <p className="text-green-800 text-sm">
              <strong>Padrões de Certificação:</strong> VCS, Gold Standard, REDD+ e outros padrões validam e certificam os créditos para comercialização em mercados regulado ou voluntário.
            </p>
            <p className="text-green-800 text-sm">
              <strong>Monetização:</strong> Venda de créditos a empresas que buscam neutralizar suas emissões, gerando receita adicional para sua propriedade.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Leaf className="w-8 h-8 text-green-600" />
            Créditos de Carbono
          </h1>
          <p className="text-gray-600 mt-1">Gerencie seus projetos e transações de créditos de carbono</p>
        </div>
        <Button
          onClick={() => {
            setEditingCredit(null);
            setShowForm(true);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <CarbonCreditForm
          credit={editingCredit}
          properties={properties}
          user={user}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingCredit(null);
          }}
        />
      )}

      {/* Details Modal */}
      {selectedCredit && (
        <CarbonCreditDetails
          credit={selectedCredit}
          property={properties.find(p => p.id === selectedCredit.property_id)}
          onClose={() => setSelectedCredit(null)}
          onEdit={() => {
            setEditingCredit(selectedCredit);
            setSelectedCredit(null);
            setShowForm(true);
          }}
          onDelete={() => {
            handleDelete(selectedCredit);
            setSelectedCredit(null);
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
                Propriedade ou Empreendimento
              </label>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">Todas as Propriedades e Empreendimentos</option>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">Todos os Status</option>
                <option value="Planejamento">Planejamento</option>
                <option value="Em Implementação">Em Implementação</option>
                <option value="Em Validação">Em Validação</option>
                <option value="Validado">Validado</option>
                <option value="Certificado">Certificado</option>
                <option value="Comercializado">Comercializado</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="projects">Projetos</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="market">Mercado</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total de Projetos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalProjects}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Créditos Estimados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.totalEstimated.toFixed(2)}</div>
                <p className="text-sm text-gray-500 mt-1">tCO2e</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Créditos Verificados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{stats.totalVerified.toFixed(2)}</div>
                <p className="text-sm text-gray-500 mt-1">tCO2e</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Disponíveis para Venda</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.totalAvailable.toFixed(2)}</div>
                <p className="text-sm text-gray-500 mt-1">tCO2e</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Créditos Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{stats.totalSold.toFixed(2)}</div>
                <p className="text-sm text-gray-500 mt-1">tCO2e</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Receita Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Projects */}
          <Card>
            <CardHeader>
              <CardTitle>Projetos Recentes</CardTitle>
              <CardDescription>Últimos projetos de crédito de carbono cadastrados</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCredits.length === 0 ? (
                <div className="text-center py-12">
                  <Leaf className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum projeto cadastrado ainda</p>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="mt-4 bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Projeto
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCredits.slice(0, 5).map(credit => {
                    const StatusIcon = statusConfig[credit.status]?.icon || Clock;
                    const property = properties.find(p => p.id === credit.property_id);
                    
                    return (
                      <div
                        key={credit.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50/50 transition-all cursor-pointer"
                        onClick={() => setSelectedCredit(credit)}
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <Leaf className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">{credit.project_name}</h3>
                            <p className="text-sm text-gray-600">{property?.property_name || 'Propriedade não encontrada'}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge className={cn('text-xs', statusConfig[credit.status]?.color)}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {credit.status}
                              </Badge>
                              <span className="text-sm text-gray-600">{credit.project_type}</span>
                              <span className="text-sm text-gray-600">{credit.area_hectares} ha</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {(credit.verified_credits || credit.estimated_credits || 0).toFixed(2)}
                          </div>
                          <p className="text-xs text-gray-500">tCO2e</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Carregando projetos...</p>
            </div>
          ) : filteredCredits.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <Leaf className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Nenhum projeto encontrado</p>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Novo Projeto
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCredits.map(credit => {
                const StatusIcon = statusConfig[credit.status]?.icon || Clock;
                const property = properties.find(p => p.id === credit.property_id);
                const completionRate = credit.verified_credits && credit.estimated_credits
                  ? (credit.verified_credits / credit.estimated_credits * 100).toFixed(1)
                  : 0;

                return (
                  <Card key={credit.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{credit.project_name}</CardTitle>
                          <CardDescription className="mt-1">
                            {property?.property_name || 'Propriedade não encontrada'}
                          </CardDescription>
                        </div>
                        <Badge className={cn('ml-2', statusConfig[credit.status]?.color)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {credit.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Tipo de Projeto</p>
                          <p className="font-medium text-gray-900">{credit.project_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Área</p>
                          <p className="font-medium text-gray-900">{credit.area_hectares} ha</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Estimado</p>
                          <p className="font-medium text-green-600">{(credit.estimated_credits || 0).toFixed(2)} tCO2e</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Verificado</p>
                          <p className="font-medium text-emerald-600">{(credit.verified_credits || 0).toFixed(2)} tCO2e</p>
                        </div>
                      </div>

                      {credit.estimated_credits > 0 && (
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progresso</span>
                            <span>{completionRate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(completionRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => setSelectedCredit(credit)}
                          variant="outline"
                          className="flex-1"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Button>
                        <Button
                          onClick={() => handleEdit(credit)}
                          variant="outline"
                          size="icon"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(credit)}
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
          <CarbonReports credits={filteredCredits} properties={properties} />
        </TabsContent>

        <TabsContent value="market">
          <CarbonMarketNews />
        </TabsContent>
      </Tabs>
    </div>
  );
}