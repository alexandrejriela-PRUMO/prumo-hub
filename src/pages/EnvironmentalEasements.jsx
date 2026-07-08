import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Plus, 
  Shield,
  FileCheck,
  MapPin,
  Calendar,
  Edit,
  Trash2,
  Filter,
  Landmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import EasementForm from '../components/easement/EasementForm';
import EasementDetails from '../components/easement/EasementDetails';
import EasementReports from '../components/easement/EasementReports';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

export default function EnvironmentalEasementsPage() {
  const [user, setUser] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEasement, setEditingEasement] = useState(null);
  const [selectedEasement, setSelectedEasement] = useState(null);
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
  const isConsultor = userType === 'consultor' || userType === 'equipe_consultor' || userType === 'equipe';
  const isClientConsultor = userType === 'client_consultor' || user?.user_type === 'client_consultor';
  const canEdit = !isClientConsultor;

  const { data: allPropertiesForClient = [] } = useQuery({
    queryKey: ['all-properties-for-client-easements'],
    queryFn: () => base44.entities.Property.list('-created_date', 500),
    enabled: !!user?.email && isClientConsultor,
  });

  const clientConsultorProperties = isClientConsultor
    ? allPropertiesForClient.filter(prop => {
        if (!prop.authorized_users) return false;
        try {
          const au = Array.isArray(prop.authorized_users) ? prop.authorized_users : JSON.parse(prop.authorized_users);
          return Array.isArray(au) && au.some(u => u.email === user?.email);
        } catch { return false; }
      })
    : [];

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', effectiveEmail, userType],
    queryFn: async () => {
      if (isConsultor) {
        const res = await base44.functions.invoke('listConsultorClients', {});
        return res.data?.properties || [];
      }
      return base44.entities.Property.filter({ owner_email: effectiveEmail });
    },
    enabled: !!effectiveEmail && !isClientConsultor
  });

  const effectiveProperties = isClientConsultor ? clientConsultorProperties : properties;
  const propertyIds = new Set(effectiveProperties.map(p => p.id));

  const { data: allEasements = [], isLoading } = useQuery({
    queryKey: ['environmentalEasements', effectiveEmail, Array.from(propertyIds).join(',')],
    queryFn: async () => {
      if (isConsultor) {
        const res = await base44.functions.invoke('listConsultorPropertyRecords', { entity_name: 'EnvironmentalEasement', field_name: 'property_id' });
        return res.data?.records || [];
      }
      return base44.entities.EnvironmentalEasement.list('-created_date', 1000);
    },
    enabled: !!effectiveEmail && effectiveProperties.length > 0,
    select: (data) => data.filter(e => propertyIds.size === 0 || propertyIds.has(e.property_id)),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EnvironmentalEasement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environmentalEasements'] });
      setShowForm(false);
      setEditingEasement(null);
      toast.success('Servidão ambiental criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar servidão');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EnvironmentalEasement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environmentalEasements'] });
      setShowForm(false);
      setEditingEasement(null);
      toast.success('Servidão atualizada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar servidão');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EnvironmentalEasement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environmentalEasements'] });
      toast.success('Servidão removida com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover servidão');
    }
  });

  const handleSubmit = (data) => {
    if (editingEasement) {
      updateMutation.mutate({ id: editingEasement.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (easement) => {
    setEditingEasement(easement);
    setShowForm(true);
  };

  const handleDelete = (easement) => {
    if (window.confirm(`Tem certeza que deseja remover a servidão "${easement.easement_name}"?`)) {
      deleteMutation.mutate(easement.id);
    }
  };

  // Filter easements
  const filteredEasements = allEasements.filter(easement => {
    const propertyMatch = selectedProperty === 'all' || easement.property_id === selectedProperty;
    const statusMatch = statusFilter === 'all' || easement.status === statusFilter;
    return propertyMatch && statusMatch;
  });

  // Calculate statistics
  const stats = {
    totalEasements: filteredEasements.length,
    activeEasements: filteredEasements.filter(e => e.status === 'Ativa' || e.status === 'Registrada').length,
    totalArea: filteredEasements.reduce((sum, e) => sum + (e.area_hectares || 0), 0),
    permanentEasements: filteredEasements.filter(e => e.easement_type === 'Permanente').length,
    totalCompensation: filteredEasements.reduce((sum, e) => 
      sum + (e.compensation?.has_compensation ? (e.compensation.total_paid || 0) : 0), 0
    ),
    totalCarbonStock: filteredEasements.reduce((sum, e) => 
      sum + (e.environmental_indicators?.carbon_stock || 0), 0
    )
  };

  const statusConfig = {
    'Ativa': { color: 'bg-green-100 text-green-800', icon: FileCheck },
    'Registrada': { color: 'bg-blue-100 text-blue-800', icon: Landmark },
    'Em Aprovação': { color: 'bg-yellow-100 text-yellow-800', icon: Calendar },
    'Suspensa': { color: 'bg-orange-100 text-orange-800', icon: Shield },
    'Cancelada': { color: 'bg-red-100 text-red-800', icon: Shield },
    'Expirada': { color: 'bg-gray-100 text-gray-800', icon: Calendar }
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
      <Card className="bg-teal-50 border-teal-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-teal-900">O que é Servidão Ambiental?</h3>
            <p className="text-teal-800 text-sm">
              <strong>Servidão Ambiental:</strong> Obrigação real voluntária, registrada em cartório, que impõe restrições ao uso da terra para fins de conservação ambiental. Pode ser permanente ou temporária, beneficiando pessoa física, jurídica ou entidade pública.
            </p>
            <p className="text-teal-800 text-sm">
              <strong>Características:</strong> Ônus registrado na matrícula do imóvel que corre com o bem. Transfere-se com a propriedade para novos proprietários. Proteção legal de áreas com ecossistemas frágeis ou serviços ambientais críticos.
            </p>
            <p className="text-teal-800 text-sm">
              <strong>Benefícios Fiscais:</strong> Potencial para redução de ITR, incentivos de IPTU rural, reconhecimento ambiental e, em alguns casos, acesso a programas de PSA e créditos de carbono.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-green-600" />
            Servidão Ambiental
          </h1>
          <p className="text-gray-600 mt-1">Gerencie contratos de servidão ambiental</p>
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setEditingEasement(null);
              setShowForm(true);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Servidão
          </Button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <EasementForm
          easement={editingEasement}
          properties={properties}
          user={user}
          onSubmit={handleSubmit}
          onCancel={() => {
            if (!editingEasement) {
              const confirmed = window.confirm('Você tem alterações não salvas. Deseja fechar sem salvar?');
              if (!confirmed) return;
            }
            setShowForm(false);
            setEditingEasement(null);
          }}
        />
      )}

      {/* Details Modal */}
      {selectedEasement && (
        <EasementDetails
          easement={selectedEasement}
          property={effectiveProperties.find(p => p.id === selectedEasement.property_id)}
          onClose={() => setSelectedEasement(null)}
          onEdit={canEdit ? () => {
            setEditingEasement(selectedEasement);
            setSelectedEasement(null);
            setShowForm(true);
          } : null}
          onDelete={canEdit ? () => {
            handleDelete(selectedEasement);
            setSelectedEasement(null);
          } : null}
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
                {effectiveProperties.map(prop => (
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
                <option value="Ativa">Ativa</option>
                <option value="Registrada">Registrada</option>
                <option value="Em Aprovação">Em Aprovação</option>
                <option value="Suspensa">Suspensa</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="easements">Servidões</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total de Servidões</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalEasements}</div>
                <p className="text-sm text-green-600 mt-1">{stats.activeEasements} ativas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Área Total Protegida</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.totalArea.toFixed(2)}</div>
                <p className="text-sm text-gray-500 mt-1">hectares</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Servidões Permanentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.permanentEasements}</div>
                <p className="text-sm text-gray-500 mt-1">de {stats.totalEasements} total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Compensação Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(stats.totalCompensation)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Estoque de Carbono</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-teal-600">{stats.totalCarbonStock.toFixed(2)}</div>
                <p className="text-sm text-gray-500 mt-1">tCO2e</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Área Média</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.totalEasements > 0 ? (stats.totalArea / stats.totalEasements).toFixed(2) : '0'}
                </div>
                <p className="text-sm text-gray-500 mt-1">hectares/servidão</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Easements */}
          <Card>
            <CardHeader>
              <CardTitle>Servidões Recentes</CardTitle>
              <CardDescription>Últimas servidões ambientais cadastradas</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEasements.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma servidão cadastrada ainda</p>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="mt-4 bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeira Servidão
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEasements.slice(0, 5).map(easement => {
                    const StatusIcon = statusConfig[easement.status]?.icon || Shield;
                    const property = properties.find(p => p.id === easement.property_id);
                    
                    return (
                      <div
                        key={easement.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50/50 transition-all cursor-pointer"
                        onClick={() => setSelectedEasement(easement)}
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">{easement.easement_name}</h3>
                            <p className="text-sm text-gray-600">{property?.property_name || 'Propriedade não encontrada'}</p>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <Badge className={cn('text-xs', statusConfig[easement.status]?.color)}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {easement.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {easement.easement_type}
                              </Badge>
                              <span className="text-sm text-gray-600">{easement.area_hectares} ha</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="easements" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Carregando servidões...</p>
            </div>
          ) : filteredEasements.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Nenhuma servidão encontrada</p>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Nova Servidão
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredEasements.map(easement => {
                const StatusIcon = statusConfig[easement.status]?.icon || Shield;
                const property = properties.find(p => p.id === easement.property_id);

                return (
                  <Card key={easement.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{easement.easement_name}</CardTitle>
                          <CardDescription className="mt-1">
                            {property?.property_name || 'Propriedade não encontrada'}
                          </CardDescription>
                        </div>
                        <Badge className={cn('ml-2', statusConfig[easement.status]?.color)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {easement.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Tipo</p>
                          <p className="font-medium text-gray-900">{easement.easement_type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Área</p>
                          <p className="font-medium text-gray-900">{easement.area_hectares} ha</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Vegetação</p>
                          <p className="font-medium text-gray-900 text-sm">{easement.vegetation_type}</p>
                        </div>
                        {easement.beneficiary && (
                          <div>
                            <p className="text-xs text-gray-500">Beneficiário</p>
                            <p className="font-medium text-gray-900 text-sm truncate">{easement.beneficiary}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => setSelectedEasement(easement)}
                          variant="outline"
                          className="flex-1"
                        >
                          Ver Detalhes
                        </Button>
                        {canEdit && (
                          <Button
                            onClick={() => handleEdit(easement)}
                            variant="outline"
                            size="icon"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            onClick={() => handleDelete(easement)}
                            variant="outline"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports">
          <EasementReports easements={filteredEasements} properties={properties} />
        </TabsContent>
      </Tabs>
    </div>
  );
}