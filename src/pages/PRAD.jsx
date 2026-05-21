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
  TrendingUp,
  ChevronLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import PRADForm from '../components/prad/PRADForm';
import PRADDetails from '../components/prad/PRADDetails';
import PRADReportGenerator from '../components/prad/PRADReportGenerator';
import ConsultorPropertySelector from '../components/consultor/ConsultorPropertySelector';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

export default function PRAD() {
  const { effectiveEmail, userType, isEquipeProdutor, memberRole } = useEffectiveUser();
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

  // equipe de produtor busca como produtor (owner_email)
  const isConsultorFamily = (userType === 'consultor' || (userType === 'equipe' && !isEquipeProdutor));
  const isClientConsultor = userType === 'client_consultor' || user?.user_type === 'client_consultor';
  const canCreatePRAD = !isConsultorFamily && !isClientConsultor || (isConsultorFamily && memberRole !== 'Advogado');

  const { data: allPropertiesForClient = [] } = useQuery({
    queryKey: ['all-properties-for-client-prad'],
    queryFn: () => base44.entities.Property.list('-created_date', 500),
    enabled: !!user?.email && isClientConsultor,
  });

  const clientConsultorProperties = isClientConsultor
    ? allPropertiesForClient.filter(prop => {
        if (!prop.authorized_users) return false;
        try {
          const au = Array.isArray(prop.authorized_users)
            ? prop.authorized_users
            : JSON.parse(prop.authorized_users);
          return Array.isArray(au) && au.some(u => u.email === user?.email);
        } catch { return false; }
      })
    : [];

  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', effectiveEmail, userType],
    queryFn: () => isConsultorFamily
      ? base44.entities.Property.filter({ consultor_email: effectiveEmail })
      : base44.entities.Property.filter({ owner_email: effectiveEmail }),
    enabled: !!effectiveEmail && !isClientConsultor,
  });

  const effectiveProperties = isClientConsultor ? clientConsultorProperties : properties;

  const { data: prads = [] } = useQuery({
    queryKey: ['prad', selectedProperty?.id],
    queryFn: () => base44.entities.PRAD.filter({ property_id: selectedProperty.id }, '-created_date'),
    enabled: !!selectedProperty?.id,
  });

  // Mantém currentPRAD sincronizado com dados frescos após qualquer mutation
  useEffect(() => {
    if (currentPRAD && prads.length > 0) {
      const updated = prads.find(p => p.id === currentPRAD.id);
      if (updated) setCurrentPRAD(updated);
    }
  }, [prads]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PRAD.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['prad']);
      toast.success('PRAD excluído com sucesso!');
    },
  });

  useEffect(() => {
    if (effectiveProperties.length > 0 && !selectedProperty && !isConsultorFamily) {
      setSelectedProperty(effectiveProperties[0]);
    }
  }, [effectiveProperties, selectedProperty, isConsultorFamily]);

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <Link
          to={createPageUrl('PropertyCentral')}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-medium mb-4"
        >
          <ChevronLeft className="w-3 h-3" />
          Voltar
        </Link>
        {/* Consultor/Equipe Selector */}
        {isConsultorFamily && (
          <div className="mb-4 sm:mb-6">
            <ConsultorPropertySelector
              properties={effectiveProperties}
              selectedPropertyId={selectedProperty?.id || null}
              onSelect={(id) => setSelectedProperty(effectiveProperties.find(p => p.id === id) || null)}
              isLoading={propertiesLoading}
            />
          </div>
        )}

        {/* Client Consultor Property Selector */}
        {isClientConsultor && clientConsultorProperties.length > 1 && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-white rounded-xl border border-emerald-100 shadow-sm">
            <span className="text-gray-700 font-medium text-sm">Propriedade:</span>
            <select
              value={selectedProperty?.id || ''}
              onChange={(e) => setSelectedProperty(clientConsultorProperties.find(p => p.id === e.target.value) || null)}
              className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              {clientConsultorProperties.map(prop => (
                <option key={prop.id} value={prop.id}>{prop.property_name} - {prop.city || 'N/A'}</option>
              ))}
            </select>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-green-900 flex items-center gap-2 sm:gap-3">
              <Sprout className="w-7 sm:w-9 h-7 sm:h-9 flex-shrink-0" />
              <span>PRAD - Recuperação de Área Degradada</span>
            </h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
              Gerencie os PRADs da propriedade - da identificação ao monitoramento
            </p>
          </div>
          {canCreatePRAD && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if (!open && !currentPRAD) {
                const confirmed = window.confirm('Você tem alterações não salvas. Deseja fechar sem salvar?');
                if (!confirmed) return;
              }
              setDialogOpen(open);
              if (!open) setCurrentPRAD(null);
            }}>
             <DialogTrigger asChild>
               <Button
                 onClick={() => setCurrentPRAD(null)}
                 className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 w-full sm:w-auto"
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
              )}
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
        {!isConsultorFamily && !isClientConsultor && effectiveProperties.length > 1 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Propriedade ou Empreendimento</label>
              <select
                value={selectedProperty?.id || ''}
                onChange={(e) => {
                  const prop = effectiveProperties.find(p => p.id === e.target.value);
                  setSelectedProperty(prop);
                }}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                {effectiveProperties.map(prop => (
                   <option key={prop.id} value={prop.id}>
                     {prop.property_name}
                   </option>
                 ))}
              </select>
            </CardContent>
          </Card>
        )}

        {(isConsultorFamily || isClientConsultor) && !selectedProperty && (
          <Card className="text-center py-12 border-dashed border-2 border-amber-200">
            <CardContent>
              <Sprout className="w-16 h-16 mx-auto text-amber-300 mb-4" />
              <p className="text-gray-600 mb-2">Selecione uma propriedade para visualizar os PRADs.</p>
            </CardContent>
          </Card>
        )}

        {/* PRADs Grid */}
        {selectedProperty && <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                      {canCreatePRAD && (
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
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        }

        {selectedProperty && prads.length === 0 && (
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
          <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-lg pr-6 leading-tight line-clamp-2">{currentPRAD?.project_name}</DialogTitle>
            </DialogHeader>
            {currentPRAD && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-start sm:justify-end">
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