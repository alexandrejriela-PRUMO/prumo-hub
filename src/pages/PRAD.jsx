import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sprout,
  Plus,
  Eye,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import PRADForm from '../components/prad/PRADForm';
import PRADDetails from '../components/prad/PRADDetails';
import PRADReportGenerator from '../components/prad/PRADReportGenerator';

export default function PRAD() {
  const [user, setUser] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentPRAD, setCurrentPRAD] = useState(null);
  const [selectedPrad, setSelectedPrad] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ owner_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: prads = [] } = useQuery({
    queryKey: ['prad', selectedProperty?.id],
    queryFn: () => base44.entities.PRAD.filter({ property_id: selectedProperty.id }, '-created_date'),
    enabled: !!selectedProperty?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PRAD.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['prad']);
      toast.success('PRAD excluído com sucesso!');
    },
  });

  useEffect(() => {
    if (properties.length > 0 && !selectedProperty) {
      setSelectedProperty(properties[0]);
    }
  }, [properties, selectedProperty]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Concluído': return 'bg-green-600';
      case 'Em Execução': return 'bg-blue-600';
      case 'Planejamento': return 'bg-yellow-600';
      case 'Suspenso': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Concluído': return CheckCircle2;
      case 'Em Execução': return TrendingUp;
      case 'Planejamento': return Clock;
      case 'Suspenso': return AlertTriangle;
      default: return Clock;
    }
  };

  const countActiveAlerts = (prad) => {
    return prad.alerts_and_risks?.filter(a => a.status !== 'Resolvido').length || 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-green-900 flex items-center gap-3">
              <Sprout className="w-10 h-10" />
              Projetos de Recuperação de Área Degradada (PRAD)
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie os PRADs da propriedade - da identificação ao monitoramento
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setCurrentPRAD(null)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo PRAD
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Projeto de Recuperação de Área Degradada</DialogTitle>
              </DialogHeader>
              <PRADForm
                prad={currentPRAD}
                propertyId={selectedProperty?.id}
                userEmail={user?.email}
                onClose={() => setDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-600 rounded-lg">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900 mb-2">Por que o PRAD é importante?</h3>
                <p className="text-green-800 text-sm">
                  O Projeto de Recuperação de Área Degradada (PRAD) é essencial para <strong>regularização ambiental</strong>, 
                  atendimento a <strong>autos de infração</strong>, cumprimento de <strong>condicionantes de licenças</strong>, 
                  e <strong>compensação ambiental</strong>. Aqui você controla todo o processo: desde o diagnóstico até a 
                  comprovação da recuperação com imagens e relatórios técnicos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Selector */}
        {properties.length > 1 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Propriedade</label>
              <select
                value={selectedProperty?.id || ''}
                onChange={(e) => {
                  const prop = properties.find(p => p.id === e.target.value);
                  setSelectedProperty(prop);
                }}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                {properties.map(prop => (
                  <option key={prop.id} value={prop.id}>
                    {prop.property_name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {/* PRADs Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {prads.map((prad) => {
            const StatusIcon = getStatusIcon(prad.status);
            const activeAlerts = countActiveAlerts(prad);

            return (
              <Card key={prad.id} className="hover:shadow-lg transition-shadow relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-2 ${getStatusColor(prad.status)}`} />
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{prad.project_name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(prad.status)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {prad.status}
                        </Badge>
                        {activeAlerts > 0 && (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {activeAlerts} alerta(s)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* Área */}
                    {prad.area_identification && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">
                          {prad.area_identification.total_area_ha} ha - {prad.area_identification.degradation_type}
                        </span>
                      </div>
                    )}

                    {/* Objetivo */}
                    {prad.recovery_objective?.main_objective && (
                      <div className="flex items-start gap-2 text-sm">
                        <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                        <span className="text-gray-600">{prad.recovery_objective.main_objective}</span>
                      </div>
                    )}

                    {/* Monitoramento */}
                    {prad.monitoring && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex justify-between text-xs">
                          <span className="text-green-700">Sobrevivência</span>
                          <span className="font-bold text-green-900">{prad.monitoring.survival_rate || 0}%</span>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-green-700">Cobertura Vegetal</span>
                          <span className="font-bold text-green-900">{prad.monitoring.vegetation_cover || 0}%</span>
                        </div>
                      </div>
                    )}

                    {/* Documentos */}
                    {prad.documents && prad.documents.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4" />
                        <span>{prad.documents.length} documento(s)</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setCurrentPRAD(prad);
                          setDetailsOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Excluir este PRAD?')) {
                            deleteMutation.mutate(prad.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {prads.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Sprout className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">Nenhum PRAD cadastrado ainda.</p>
              <p className="text-sm text-gray-500">Clique em "Novo PRAD" para começar um projeto de recuperação.</p>
            </CardContent>
          </Card>
        )}

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{currentPRAD?.project_name}</DialogTitle>
            </DialogHeader>
            {currentPRAD && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <PRADReportGenerator prad={currentPRAD} />
                </div>
                <PRADDetails prad={currentPRAD} />
              </div>
            )}
            </DialogContent>
            </Dialog>
            </div>
            </div>
            );
            }