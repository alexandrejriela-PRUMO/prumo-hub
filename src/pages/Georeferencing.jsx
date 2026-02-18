import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Plus, 
  Upload,
  Trash2,
  Map,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  Users,
  Layers,
  TrendingUp,
  Shield,
  Info,
  Leaf
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import PropertyMap from '@/components/properties/PropertyMap';
import ConsultorPropertySelector from '../components/consultor/ConsultorPropertySelector';

export default function Georeferencing() {
  const [user, setUser] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingGeo, setViewingGeo] = useState(null);
  const [uploading, setUploading] = useState(false);

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

  const isConsultor = user?.user_type === 'consultor';

  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => isConsultor
      ? base44.entities.Property.filter({ consultor_email: user.email })
      : base44.entities.Property.filter({ owner_email: user.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: georeferences = [], isLoading } = useQuery({
    queryKey: ['georeferencing', selectedProperty],
    queryFn: () => base44.entities.Georeferencing.filter({ property_id: selectedProperty }),
    enabled: !!selectedProperty,
    initialData: [],
  });

  useEffect(() => {
    if (properties.length > 0 && !selectedProperty) {
      setSelectedProperty(properties[0].id);
    }
  }, [properties, selectedProperty]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Georeferencing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['georeferencing']);
      toast.success('Georreferenciamento criado!');
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Georeferencing.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['georeferencing']);
      toast.success('Georreferenciamento excluído!');
    },
  });

  const handleFileUpload = async (e, geoId, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const geo = georeferences.find(g => g.id === geoId);
      const updatedDocs = [
        ...(geo.documents || []),
        {
          type: docType,
          name: file.name,
          url: file_url,
          upload_date: new Date().toISOString(),
          uploaded_by: user.email,
        },
      ];
      await base44.entities.Georeferencing.update(geoId, {
        ...geo,
        documents: updatedDocs,
      });
      queryClient.invalidateQueries(['georeferencing']);
      toast.success('Arquivo enviado!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Regular': return 'bg-green-100 text-green-800 border-green-200';
      case 'Pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Em Atualização': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Irregular': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'Baixo': return 'text-green-600';
      case 'Médio': return 'text-yellow-600';
      case 'Alto': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center h-96"><Skeleton className="w-32 h-32 rounded-full" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Georreferenciamento</h1>
          <p className="text-gray-500 mt-1">Gestão completa do georreferenciamento das propriedades</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Georreferenciamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Georreferenciamento</DialogTitle>
            </DialogHeader>
            <GeoreferencingForm
              properties={properties}
              user={user}
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Property Selector */}
      {properties.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <Label>Selecione a Propriedade</Label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {properties.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id}>
                    {prop.property_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Georeferencing List */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => <Skeleton key={i} className="h-96 rounded-xl" />)}
        </div>
      ) : georeferences.length === 0 ? (
        <Card className="border-dashed border-2 border-emerald-200">
          <CardContent className="py-16 text-center">
            <MapPin className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Nenhum georreferenciamento cadastrado</h3>
            <p className="text-gray-500 mt-2">Clique em "Novo Georreferenciamento" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {georeferences.map((geo) => (
            <Card key={geo.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      <CardTitle className="text-lg">{geo.municipality || 'Georreferenciamento'}</CardTitle>
                    </div>
                    <CardDescription className="mt-1">
                      Matrícula: {geo.registration_number || 'Não informada'}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(geo.status)}>{geo.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Sistema de Coordenadas</p>
                    <p className="font-semibold text-gray-900">{geo.coordinate_system}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Risco Jurídico</p>
                    <p className={`font-semibold ${getRiskColor(geo.legal_risk)}`}>{geo.legal_risk || 'Não avaliado'}</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Vértices</p>
                    <p className="text-lg font-bold text-emerald-600">{geo.vertices?.length || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Confrontantes</p>
                    <p className="text-lg font-bold text-emerald-600">{geo.neighbors?.length || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Documentos</p>
                    <p className="text-lg font-bold text-emerald-600">{geo.documents?.length || 0}</p>
                  </div>
                </div>

                {/* Alerts */}
                {geo.overlap_detected && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">Sobreposição Detectada</p>
                      {geo.overlap_details && (
                        <p className="text-xs text-red-700 mt-1">{geo.overlap_details}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setViewingGeo(geo)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalhes
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => deleteMutation.mutate(geo.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail View Dialog */}
      {viewingGeo && (
        <Dialog open={!!viewingGeo} onOpenChange={() => setViewingGeo(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Detalhes do Georreferenciamento
              </DialogTitle>
            </DialogHeader>
            <GeoreferencingDetails 
              geo={viewingGeo} 
              onFileUpload={handleFileUpload}
              uploading={uploading}
              user={user}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Form Component
function GeoreferencingForm({ properties, user, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    property_id: properties[0]?.id || '',
    owner_email: user.email,
    municipality: '',
    registration_number: '',
    coordinate_system: 'SIRGAS2000',
    status: 'Pendente',
    legal_risk: 'Baixo',
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Propriedade *</Label>
          <Select value={formData.property_id} onValueChange={(v) => setFormData({ ...formData, property_id: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {properties.map((prop) => (
                <SelectItem key={prop.id} value={prop.id}>
                  {prop.property_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Município *</Label>
          <Input
            value={formData.municipality}
            onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
            placeholder="Ex: Ribeirão Preto"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Matrícula</Label>
          <Input
            value={formData.registration_number}
            onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
            placeholder="Número da matrícula"
          />
        </div>

        <div className="space-y-2">
          <Label>Sistema de Coordenadas *</Label>
          <Select value={formData.coordinate_system} onValueChange={(v) => setFormData({ ...formData, coordinate_system: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SIRGAS2000">SIRGAS2000</SelectItem>
              <SelectItem value="WGS84">WGS84</SelectItem>
              <SelectItem value="SAD69">SAD69</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status *</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Regular">Regular</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Em Atualização">Em Atualização</SelectItem>
              <SelectItem value="Irregular">Irregular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Risco Jurídico</Label>
          <Select value={formData.legal_risk} onValueChange={(v) => setFormData({ ...formData, legal_risk: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Baixo">Baixo</SelectItem>
              <SelectItem value="Médio">Médio</SelectItem>
              <SelectItem value="Alto">Alto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Observações gerais..."
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
        {isLoading ? 'Criando...' : 'Criar Georreferenciamento'}
      </Button>
    </form>
  );
}

// Details Component
function GeoreferencingDetails({ geo, onFileUpload, uploading, user }) {
  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="general">Geral</TabsTrigger>
        <TabsTrigger value="technical">Técnico</TabsTrigger>
        <TabsTrigger value="environmental">Ambiental</TabsTrigger>
        <TabsTrigger value="documents">Documentos</TabsTrigger>
        <TabsTrigger value="history">Histórico</TabsTrigger>
      </TabsList>

      {/* General Tab */}
      <TabsContent value="general" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Município</p>
              <p className="font-semibold">{geo.municipality || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Matrícula</p>
              <p className="font-semibold">{geo.registration_number || 'Não informada'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sistema de Coordenadas</p>
              <p className="font-semibold">{geo.coordinate_system}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge className={getStatusColor(geo.status)}>{geo.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Perímetro Georreferenciado</p>
              <p className="font-semibold">{geo.georeferenced_perimeter ? `${geo.georeferenced_perimeter.toLocaleString()} m` : 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Risco Jurídico</p>
              <p className={`font-semibold ${getRiskColor(geo.legal_risk)}`}>{geo.legal_risk}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Conflitos e Sobreposições
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm">Sobreposição Detectada</span>
              {geo.overlap_detected ? (
                <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Sim</Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Não</Badge>
              )}
            </div>
            {geo.conflicts && (
              <>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">Sobreposição com Terras Públicas</span>
                  {geo.conflicts.public_land_overlap ? (
                    <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Sim</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Não</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">Invasão de APP</span>
                  {geo.conflicts.app_invasion ? (
                    <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Sim</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Não</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">Conflito de Limites</span>
                  {geo.conflicts.boundary_conflict ? (
                    <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Sim</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Não</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">Inconsistência de Área</span>
                  {geo.conflicts.area_inconsistency ? (
                    <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Sim</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Não</Badge>
                  )}
                </div>
              </>
            )}
            {geo.pending_issues && geo.pending_issues.length > 0 && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-900 mb-2">Pendências Identificadas:</p>
                <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                  {geo.pending_issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Technical Tab */}
      <TabsContent value="technical" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Confrontantes (Vizinhos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geo.neighbors && geo.neighbors.length > 0 ? (
              <div className="space-y-2">
                {geo.neighbors.map((neighbor, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold">{neighbor.name}</p>
                      <p className="text-sm text-gray-500">{neighbor.direction}</p>
                    </div>
                    {neighbor.registration && (
                      <Badge variant="outline">Mat: {neighbor.registration}</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum confrontante cadastrado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Vértices do Imóvel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geo.vertices && geo.vertices.length > 0 ? (
              <div className="grid gap-2">
                {geo.vertices.slice(0, 5).map((vertex, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <p className="text-gray-500">Vértice</p>
                        <p className="font-semibold">{vertex.vertex_number}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Latitude</p>
                        <p className="font-mono text-xs">{vertex.latitude?.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Longitude</p>
                        <p className="font-mono text-xs">{vertex.longitude?.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Elevação</p>
                        <p className="font-semibold">{vertex.elevation ? `${vertex.elevation}m` : '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {geo.vertices.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">+{geo.vertices.length - 5} vértices</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum vértice cadastrado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              SIGEF e CAR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Status no SIGEF</p>
                <p className="font-semibold">{geo.sigef_status || 'Não cadastrado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Código SIGEF</p>
                <p className="font-semibold">{geo.sigef_code || 'Não informado'}</p>
              </div>
            </div>
            {geo.sigef_date && (
              <div>
                <p className="text-sm text-gray-500">Data de Certificação SIGEF</p>
                <p className="font-semibold">{format(parseISO(geo.sigef_date), 'dd/MM/yyyy')}</p>
              </div>
            )}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm">Integração com Matrícula</span>
              {geo.registration_integration ? (
                <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Integrado</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Pendente</Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm">Compatibilidade com CAR</span>
              <Badge variant="outline">{geo.car_compatibility || 'Não verificado'}</Badge>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Environmental Tab */}
      <TabsContent value="environmental" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="w-5 h-5" />
              Áreas Ambientais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geo.environmental_areas ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 mb-1">APP Mapeada</p>
                  <p className="text-2xl font-bold text-green-900">
                    {geo.environmental_areas.app_mapped ? `${geo.environmental_areas.app_mapped} ha` : 'Não informado'}
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-sm text-emerald-700 mb-1">Reserva Legal</p>
                  <p className="text-2xl font-bold text-emerald-900">
                    {geo.environmental_areas.legal_reserve ? `${geo.environmental_areas.legal_reserve} ha` : 'Não informado'}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 mb-1">Áreas Consolidadas</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {geo.environmental_areas.consolidated_areas ? `${geo.environmental_areas.consolidated_areas} ha` : 'Não informado'}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-700 mb-1">Áreas Regularizáveis</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {geo.environmental_areas.regularizable_areas ? `${geo.environmental_areas.regularizable_areas} ha` : 'Não informado'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Áreas ambientais não mapeadas</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alertas de Conflito Ambiental
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geo.environmental_conflict_alerts && geo.environmental_conflict_alerts.length > 0 ? (
              <div className="space-y-2">
                {geo.environmental_conflict_alerts.map((alert, idx) => (
                  <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-red-900">{alert.alert_type}</p>
                      <Badge className={
                        alert.severity === 'Alta' ? 'bg-red-600 text-white' :
                        alert.severity === 'Média' ? 'bg-yellow-600 text-white' :
                        'bg-blue-600 text-white'
                      }>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-red-800">{alert.description}</p>
                    <div className="mt-2">
                      <Badge variant="outline">{alert.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum alerta de conflito ambiental</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Camadas do Mapa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {geo.map_layers && (
              <>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">Imagem de Satélite</span>
                  {geo.map_layers.satellite_imagery ? (
                    <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Disponível</Badge>
                  ) : (
                    <Badge variant="outline">Não disponível</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">Curvas de Nível</span>
                  {geo.map_layers.contour_lines ? (
                    <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Disponível</Badge>
                  ) : (
                    <Badge variant="outline">Não disponível</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">Hidrografia</span>
                  {geo.map_layers.hydrography ? (
                    <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Disponível</Badge>
                  ) : (
                    <Badge variant="outline">Não disponível</Badge>
                  )}
                </div>
                {geo.map_layers.land_use && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Uso e Ocupação do Solo</p>
                    <p className="font-semibold">{geo.map_layers.land_use}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Documents Tab */}
      <TabsContent value="documents" className="space-y-4">
        {['Planta Georreferenciada', 'Memorial Descritivo', 'ART/RRT', 'Shapefile/KML', 'Certificação SIGEF'].map((docType) => (
          <Card key={docType}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {docType}
                </span>
                <label>
                  <Button variant="outline" size="sm" disabled={uploading} asChild>
                    <div>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Enviando...' : 'Upload'}
                    </div>
                  </Button>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.kml,.kmz,.shp,.zip,.dwg,.dxf"
                    onChange={(e) => onFileUpload(e, geo.id, docType)}
                  />
                </label>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {geo.documents?.filter(d => d.type === docType).length > 0 ? (
                <div className="space-y-2">
                  {geo.documents.filter(d => d.type === docType).map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-gray-500">
                            {format(parseISO(doc.upload_date), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">Nenhum arquivo deste tipo</p>
              )}
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      {/* History Tab */}
      <TabsContent value="history" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Histórico de Ajustes de Perímetro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geo.perimeter_adjustments && geo.perimeter_adjustments.length > 0 ? (
              <div className="space-y-3">
                {geo.perimeter_adjustments.map((adjustment, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border-l-4 border-emerald-500">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {format(parseISO(adjustment.date), 'dd/MM/yyyy')}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{adjustment.reason}</p>
                      </div>
                      <Badge variant="outline">{adjustment.technician}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-gray-500">Perímetro Anterior</p>
                        <p className="font-semibold">{adjustment.previous_perimeter?.toLocaleString()} m</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Novo Perímetro</p>
                        <p className="font-semibold text-emerald-600">{adjustment.new_perimeter?.toLocaleString()} m</p>
                      </div>
                    </div>
                    {adjustment.file_url && (
                      <a
                        href={adjustment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 mt-3 text-sm text-emerald-600 hover:underline"
                      >
                        <Download className="w-4 h-4" />
                        Ver arquivo desta versão
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum ajuste registrado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Responsável Técnico</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Nome</p>
              <p className="font-semibold">{geo.technician_name || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">CREA</p>
              <p className="font-semibold">{geo.technician_crea || 'Não informado'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Último Levantamento</p>
              <p className="font-semibold">
                {geo.last_survey_date ? format(parseISO(geo.last_survey_date), 'dd/MM/yyyy') : 'Não informado'}
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'Regular': return 'bg-green-100 text-green-800 border-green-200';
    case 'Pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Em Atualização': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Irregular': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getRiskColor(risk) {
  switch (risk) {
    case 'Baixo': return 'text-green-600';
    case 'Médio': return 'text-yellow-600';
    case 'Alto': return 'text-red-600';
    default: return 'text-gray-600';
  }
}