import React, { useState, useEffect, useCallback } from 'react';
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
import ConsultorPropertySelector from '../components/consultor/ConsultorPropertySelector';

export default function Georeferencing() {
  const [user, setUser] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [consultorPropertyId, setConsultorPropertyId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingGeoId, setViewingGeoId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Georeferencing.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['georeferencing']);
      toast.success('Atualizado com sucesso!');
    },
  });

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

  const isConsultor = user?.user_type === 'consultor' || user?.user_type === 'equipe';

  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => isConsultor
      ? base44.entities.Property.filter({ consultor_email: user.email })
      : base44.entities.Property.filter({ owner_email: user.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  // Para consultor usa consultorPropertyId, para produtor usa selectedProperty
  const effectivePropertyId = isConsultor ? consultorPropertyId : selectedProperty;

  const { data: georeferences = [], isLoading } = useQuery({
    queryKey: ['georeferencing', effectivePropertyId],
    queryFn: () => base44.entities.Georeferencing.filter({ property_id: effectivePropertyId }),
    enabled: !!effectivePropertyId,
    initialData: [],
  });

  // Sempre derivado do cache atualizado — nunca desatualizado
  const viewingGeo = viewingGeoId ? georeferences.find(g => g.id === viewingGeoId) || null : null;

  useEffect(() => {
    if (properties.length > 0 && !selectedProperty && !isConsultor) {
      setSelectedProperty(properties[0].id);
    }
  }, [properties, selectedProperty, isConsultor]);

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
      {/* Consultor Property Selector */}
      {isConsultor && (
        <ConsultorPropertySelector
          properties={properties}
          selectedPropertyId={consultorPropertyId}
          onSelect={setConsultorPropertyId}
          isLoading={propertiesLoading}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Georreferenciamento</h1>
          <p className="text-gray-500 mt-1">Gestão completa do georreferenciamento dos clientes</p>
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
              isConsultor={isConsultor}
              preselectedPropertyId={effectivePropertyId}
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
            <Label>Propriedade ou Empreendimento</Label>
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
      {isConsultor && !consultorPropertyId ? (
        <Card className="border-dashed border-2 border-amber-200">
          <CardContent className="py-16 text-center">
            <MapPin className="w-16 h-16 mx-auto text-amber-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Selecione uma propriedade</h3>
            <p className="text-gray-500 mt-2">Escolha a propriedade acima para visualizar os georreferenciamentos</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => <Skeleton key={i} className="h-96 rounded-xl" />)}
        </div>
      ) : !effectivePropertyId ? null : georeferences.length === 0 ? (
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
                    onClick={() => setViewingGeoId(geo.id)}
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
              onUpdate={(data) => updateMutation.mutate({ id: viewingGeo.id, data })}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Form Component
function GeoreferencingForm({ properties, user, isConsultor, preselectedPropertyId, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    property_id: '',
    owner_email: user.email,
    municipality: '',
    registration_number: '',
    coordinate_system: 'SIRGAS2000',
    status: 'Pendente',
    legal_risk: 'Baixo',
    notes: '',
  });

  useEffect(() => {
    // Pre-seleciona propriedade: para consultor usa a propriedade selecionada no seletor, para produtor usa a primeira
    const targetId = preselectedPropertyId || (properties.length > 0 ? properties[0].id : '');
    if (targetId && targetId !== formData.property_id) {
      const prop = properties.find(p => p.id === targetId);
      setFormData(prev => ({
        ...prev,
        property_id: targetId,
        owner_email: prop?.owner_email || user.email,
      }));
    }
  }, [properties, preselectedPropertyId]);

  const handlePropertyChange = (pid) => {
    const prop = properties.find(p => p.id === pid);
    setFormData(prev => ({ ...prev, property_id: pid, owner_email: prop?.owner_email || user.email }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.property_id) {
      toast.error('Selecione uma propriedade/cliente');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <Select value={formData.property_id} onValueChange={handlePropertyChange}>
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
function GeoreferencingDetails({ geo, onFileUpload, uploading, user, onUpdate }) {
  const [localGeo, setLocalGeo] = useState(geo);
  const [editingSection, setEditingSection] = useState(null); // 'general' | 'conflicts' | 'sigef' | 'technical' | 'envAreas' | 'envAlerts' | 'mapLayers' | 'history' | 'technician'

  useEffect(() => { setLocalGeo(geo); }, [geo]);

  const save = (field, value) => {
    const updated = { ...localGeo, [field]: value };
    setLocalGeo(updated);
    onUpdate({ [field]: value });
    setEditingSection(null);
  };

  const saveMulti = (fields) => {
    const updated = { ...localGeo, ...fields };
    setLocalGeo(updated);
    onUpdate(fields);
    setEditingSection(null);
  };

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-5 text-xs">
        <TabsTrigger value="general">Geral</TabsTrigger>
        <TabsTrigger value="technical">Técnico</TabsTrigger>
        <TabsTrigger value="environmental">Ambiental</TabsTrigger>
        <TabsTrigger value="documents">Documentos</TabsTrigger>
        <TabsTrigger value="history">Histórico</TabsTrigger>
      </TabsList>

      {/* General Tab */}
      <TabsContent value="general" className="space-y-4">
        {/* Basic Info */}
        <GeneralInfoCard localGeo={localGeo} editingSection={editingSection} setEditingSection={setEditingSection} saveMulti={saveMulti} />
        {/* Conflicts */}
        <ConflictsCard localGeo={localGeo} editingSection={editingSection} setEditingSection={setEditingSection} save={save} saveMulti={saveMulti} />
      </TabsContent>

      {/* Technical Tab */}
      <TabsContent value="technical" className="space-y-4">
        <NeighborsCard localGeo={localGeo} editingSection={editingSection} setEditingSection={setEditingSection} save={save} />
        <VerticesCard localGeo={localGeo} editingSection={editingSection} setEditingSection={setEditingSection} save={save} />
        <SigefCard localGeo={localGeo} editingSection={editingSection} setEditingSection={setEditingSection} saveMulti={saveMulti} />
      </TabsContent>

      {/* Environmental Tab */}
      <TabsContent value="environmental" className="space-y-4">
        <EnvAreasCard localGeo={localGeo} editingSection={editingSection} setEditingSection={setEditingSection} save={save} />
        <EnvAlertsCard localGeo={localGeo} editingSection={editingSection} setEditingSection={setEditingSection} save={save} />
        <MapLayersCard localGeo={localGeo} editingSection={editingSection} setEditingSection={setEditingSection} save={save} />
      </TabsContent>

      {/* Documents Tab */}
      <TabsContent value="documents" className="space-y-4">
        {['Planta Georreferenciada', 'Memorial Descritivo', 'ART/RRT', 'Shapefile/KML', 'Certificação SIGEF'].map((docType) => (
          <Card key={docType}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4" />{docType}</span>
                <label>
                  <Button variant="outline" size="sm" disabled={uploading} asChild>
                    <div><Upload className="w-4 h-4 mr-2" />{uploading ? 'Enviando...' : 'Upload'}</div>
                  </Button>
                  <input type="file" className="hidden" accept=".pdf,.kml,.kmz,.shp,.zip,.dwg,.dxf" onChange={(e) => onFileUpload(e, localGeo.id, docType)} />
                </label>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {localGeo.documents?.filter(d => d.type === docType).length > 0 ? (
                <div className="space-y-2">
                  {localGeo.documents.filter(d => d.type === docType).map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-gray-500">{format(parseISO(doc.upload_date), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">
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
        <PerimeterHistoryCard localGeo={localGeo} editingSection={editingSection} setEditingSection={setEditingSection} save={save} />
        <TechnicianCard localGeo={localGeo} editingSection={editingSection} setEditingSection={setEditingSection} saveMulti={saveMulti} />
      </TabsContent>
    </Tabs>
  );
}

function EditBtn({ label = 'Editar', onClick }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
      <Edit className="w-3.5 h-3.5 mr-1" />{label}
    </Button>
  );
}

function GeneralInfoCard({ localGeo, editingSection, setEditingSection, saveMulti }) {
  const [form, setForm] = useState({
    municipality: localGeo.municipality || '',
    registration_number: localGeo.registration_number || '',
    coordinate_system: localGeo.coordinate_system || 'SIRGAS2000',
    status: localGeo.status || 'Pendente',
    georeferenced_perimeter: localGeo.georeferenced_perimeter || '',
    legal_risk: localGeo.legal_risk || 'Baixo',
    notes: localGeo.notes || '',
  });

  useEffect(() => {
    setForm({
      municipality: localGeo.municipality || '',
      registration_number: localGeo.registration_number || '',
      coordinate_system: localGeo.coordinate_system || 'SIRGAS2000',
      status: localGeo.status || 'Pendente',
      georeferenced_perimeter: localGeo.georeferenced_perimeter || '',
      legal_risk: localGeo.legal_risk || 'Baixo',
      notes: localGeo.notes || '',
    });
  }, [localGeo]);

  const isEditing = editingSection === 'general';
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2"><Info className="w-5 h-5" />Informações Básicas</CardTitle>
        {!isEditing && <EditBtn onClick={() => setEditingSection('general')} />}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label className="text-xs">Município</Label><Input value={form.municipality} onChange={e => setForm(p => ({...p, municipality: e.target.value}))} /></div>
              <div><Label className="text-xs">Matrícula</Label><Input value={form.registration_number} onChange={e => setForm(p => ({...p, registration_number: e.target.value}))} /></div>
              <div><Label className="text-xs">Sistema de Coordenadas</Label>
                <Select value={form.coordinate_system} onValueChange={v => setForm(p => ({...p, coordinate_system: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="SIRGAS2000">SIRGAS2000</SelectItem><SelectItem value="WGS84">WGS84</SelectItem><SelectItem value="SAD69">SAD69</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({...p, status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Regular">Regular</SelectItem><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Em Atualização">Em Atualização</SelectItem><SelectItem value="Irregular">Irregular</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Perímetro (m)</Label><Input type="number" value={form.georeferenced_perimeter} onChange={e => setForm(p => ({...p, georeferenced_perimeter: e.target.value}))} /></div>
              <div><Label className="text-xs">Risco Jurídico</Label>
                <Select value={form.legal_risk} onValueChange={v => setForm(p => ({...p, legal_risk: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Baixo">Baixo</SelectItem><SelectItem value="Médio">Médio</SelectItem><SelectItem value="Alto">Alto</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2"><Label className="text-xs">Observações</Label><Textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} rows={2} /></div>
            </div>
            <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => saveMulti({
              ...form,
              georeferenced_perimeter: form.georeferenced_perimeter !== '' ? parseFloat(form.georeferenced_perimeter) : null,
            })}>Salvar</Button></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div><p className="text-sm text-gray-500">Município</p><p className="font-semibold">{localGeo.municipality || 'Não informado'}</p></div>
            <div><p className="text-sm text-gray-500">Matrícula</p><p className="font-semibold">{localGeo.registration_number || 'Não informada'}</p></div>
            <div><p className="text-sm text-gray-500">Sistema de Coordenadas</p><p className="font-semibold">{localGeo.coordinate_system}</p></div>
            <div><p className="text-sm text-gray-500">Status</p><Badge className={getStatusColor(localGeo.status)}>{localGeo.status}</Badge></div>
            <div><p className="text-sm text-gray-500">Perímetro Georreferenciado</p><p className="font-semibold">{localGeo.georeferenced_perimeter ? `${Number(localGeo.georeferenced_perimeter).toLocaleString()} m` : 'Não informado'}</p></div>
            <div><p className="text-sm text-gray-500">Risco Jurídico</p><p className={`font-semibold ${getRiskColor(localGeo.legal_risk)}`}>{localGeo.legal_risk}</p></div>
            {localGeo.notes && <div className="md:col-span-2"><p className="text-sm text-gray-500">Observações</p><p className="text-sm text-gray-700">{localGeo.notes}</p></div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConflictsCard({ localGeo, editingSection, setEditingSection, save, saveMulti }) {
  const [form, setForm] = useState({
    overlap_detected: localGeo.overlap_detected || false,
    overlap_details: localGeo.overlap_details || '',
    conflicts: { public_land_overlap: false, app_invasion: false, boundary_conflict: false, area_inconsistency: false, details: '', ...(localGeo.conflicts || {}) },
    pending_issues: (localGeo.pending_issues || []).join('\n'),
  });

  useEffect(() => {
    setForm({
      overlap_detected: localGeo.overlap_detected || false,
      overlap_details: localGeo.overlap_details || '',
      conflicts: { public_land_overlap: false, app_invasion: false, boundary_conflict: false, area_inconsistency: false, details: '', ...(localGeo.conflicts || {}) },
      pending_issues: (localGeo.pending_issues || []).join('\n'),
    });
  }, [localGeo]);

  const isEditing = editingSection === 'conflicts';

  const BoolRow = ({ label, field }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-sm">{label}</span>
      {form.conflicts[field] ? <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Sim</Badge> : <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Não</Badge>}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Conflitos e Sobreposições</CardTitle>
        {!isEditing && <EditBtn onClick={() => setEditingSection('conflicts')} />}
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <div className="space-y-3">
            {[
              { label: 'Sobreposição Detectada', key: 'overlap_detected', isTop: true },
              { label: 'Sobreposição com Terras Públicas', key: 'public_land_overlap' },
              { label: 'Invasão de APP', key: 'app_invasion' },
              { label: 'Conflito de Limites', key: 'boundary_conflict' },
              { label: 'Inconsistência de Área', key: 'area_inconsistency' },
            ].map(({ label, key, isTop }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">{label}</span>
                <Select
                  value={isTop ? String(form.overlap_detected) : String(form.conflicts[key])}
                  onValueChange={v => {
                    if (isTop) setForm(p => ({...p, overlap_detected: v === 'true'}));
                    else setForm(p => ({...p, conflicts: {...p.conflicts, [key]: v === 'true'}}));
                  }}
                >
                  <SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="true">Sim</SelectItem><SelectItem value="false">Não</SelectItem></SelectContent>
                </Select>
              </div>
            ))}
            <div><Label className="text-xs">Detalhes de Sobreposição</Label><Input value={form.overlap_details} onChange={e => setForm(p => ({...p, overlap_details: e.target.value}))} placeholder="Descreva a sobreposição..." /></div>
            <div><Label className="text-xs">Pendências (uma por linha)</Label><Textarea value={form.pending_issues} onChange={e => setForm(p => ({...p, pending_issues: e.target.value}))} rows={3} placeholder="Ex: Regularização de APP" /></div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => saveMulti({
                overlap_detected: form.overlap_detected,
                overlap_details: form.overlap_details,
                conflicts: form.conflicts,
                pending_issues: form.pending_issues.split('\n').map(s => s.trim()).filter(Boolean),
              })}>Salvar</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm">Sobreposição Detectada</span>
              {localGeo.overlap_detected ? <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Sim</Badge> : <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Não</Badge>}
            </div>
            {localGeo.conflicts && (
              <>
                {[['Sobreposição com Terras Públicas','public_land_overlap'],['Invasão de APP','app_invasion'],['Conflito de Limites','boundary_conflict'],['Inconsistência de Área','area_inconsistency']].map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm">{label}</span>
                    {localGeo.conflicts[key] ? <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Sim</Badge> : <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Não</Badge>}
                  </div>
                ))}
              </>
            )}
            {localGeo.pending_issues && localGeo.pending_issues.length > 0 && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-900 mb-2">Pendências:</p>
                <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">{localGeo.pending_issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NeighborsCard({ localGeo, editingSection, setEditingSection, save }) {
  const [neighbors, setNeighbors] = useState(localGeo.neighbors || []);
  const [newNeighbor, setNewNeighbor] = useState({ name: '', direction: 'Norte', registration: '' });
  const isEditing = editingSection === 'neighbors';

  useEffect(() => { setNeighbors(localGeo.neighbors || []); }, [localGeo]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Confrontantes (Vizinhos)</CardTitle>
        {!isEditing && <EditBtn onClick={() => setEditingSection('neighbors')} />}
      </CardHeader>
      <CardContent className="space-y-2">
        {neighbors.length > 0 ? neighbors.map((n, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div><p className="font-semibold">{n.name}</p><p className="text-sm text-gray-500">{n.direction}</p></div>
            <div className="flex items-center gap-2">
              {n.registration && <Badge variant="outline">Mat: {n.registration}</Badge>}
              {isEditing && <button onClick={() => { const updated = neighbors.filter((_, i) => i !== idx); setNeighbors(updated); }} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          </div>
        )) : <p className="text-gray-500 text-center py-6">Nenhum confrontante cadastrado</p>}
        {isEditing && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-medium text-gray-700">Adicionar Confrontante</p>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Nome" value={newNeighbor.name} onChange={e => setNewNeighbor(p => ({...p, name: e.target.value}))} />
              <Select value={newNeighbor.direction} onValueChange={v => setNewNeighbor(p => ({...p, direction: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Norte','Sul','Leste','Oeste','Nordeste','Noroeste','Sudeste','Sudoeste'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Matrícula" value={newNeighbor.registration} onChange={e => setNewNeighbor(p => ({...p, registration: e.target.value}))} />
            </div>
            <Button size="sm" variant="outline" onClick={() => { if (!newNeighbor.name) return; setNeighbors(p => [...p, newNeighbor]); setNewNeighbor({ name: '', direction: 'Norte', registration: '' }); }}><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
            <div className="flex justify-end gap-2 pt-1"><Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { save('neighbors', neighbors); }}>Salvar</Button></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VerticesCard({ localGeo, editingSection, setEditingSection, save }) {
  const [vertices, setVertices] = useState(localGeo.vertices || []);
  const [newVertex, setNewVertex] = useState({ vertex_number: '', latitude: '', longitude: '', elevation: '' });
  const isEditing = editingSection === 'vertices';

  useEffect(() => { setVertices(localGeo.vertices || []); }, [localGeo]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" />Vértices do Imóvel</CardTitle>
        {!isEditing && <EditBtn onClick={() => setEditingSection('vertices')} />}
      </CardHeader>
      <CardContent className="space-y-2">
        {vertices.length > 0 ? (
          <div className="grid gap-2">
            {vertices.map((v, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-4 gap-2 flex-1">
                    <div><p className="text-gray-500">Vértice</p><p className="font-semibold">{v.vertex_number}</p></div>
                    <div><p className="text-gray-500">Latitude</p><p className="font-mono text-xs">{Number(v.latitude)?.toFixed(6)}</p></div>
                    <div><p className="text-gray-500">Longitude</p><p className="font-mono text-xs">{Number(v.longitude)?.toFixed(6)}</p></div>
                    <div><p className="text-gray-500">Elevação</p><p className="font-semibold">{v.elevation ? `${v.elevation}m` : '-'}</p></div>
                  </div>
                  {isEditing && <button onClick={() => setVertices(p => p.filter((_, i) => i !== idx))} className="ml-2 text-red-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-gray-500 text-center py-6">Nenhum vértice cadastrado</p>}
        {isEditing && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-medium text-gray-700">Adicionar Vértice</p>
            <div className="grid grid-cols-4 gap-2">
              <Input placeholder="Nº" value={newVertex.vertex_number} onChange={e => setNewVertex(p => ({...p, vertex_number: e.target.value}))} />
              <Input placeholder="Latitude" type="number" value={newVertex.latitude} onChange={e => setNewVertex(p => ({...p, latitude: e.target.value}))} />
              <Input placeholder="Longitude" type="number" value={newVertex.longitude} onChange={e => setNewVertex(p => ({...p, longitude: e.target.value}))} />
              <Input placeholder="Elevação(m)" type="number" value={newVertex.elevation} onChange={e => setNewVertex(p => ({...p, elevation: e.target.value}))} />
            </div>
            <Button size="sm" variant="outline" onClick={() => { if (!newVertex.vertex_number) return; setVertices(p => [...p, { ...newVertex, latitude: parseFloat(newVertex.latitude), longitude: parseFloat(newVertex.longitude), elevation: newVertex.elevation ? parseFloat(newVertex.elevation) : null }]); setNewVertex({ vertex_number: '', latitude: '', longitude: '', elevation: '' }); }}><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
            <div className="flex justify-end gap-2 pt-1"><Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => save('vertices', vertices)}>Salvar</Button></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SigefCard({ localGeo, editingSection, setEditingSection, saveMulti }) {
  const [form, setForm] = useState({
    sigef_status: localGeo.sigef_status || 'Não Cadastrado',
    sigef_code: localGeo.sigef_code || '',
    sigef_date: localGeo.sigef_date || '',
    registration_integration: localGeo.registration_integration || false,
    car_compatibility: localGeo.car_compatibility || 'Não Verificado',
  });

  useEffect(() => {
    setForm({
      sigef_status: localGeo.sigef_status || 'Não Cadastrado',
      sigef_code: localGeo.sigef_code || '',
      sigef_date: localGeo.sigef_date || '',
      registration_integration: localGeo.registration_integration || false,
      car_compatibility: localGeo.car_compatibility || 'Não Verificado',
    });
  }, [localGeo]);

  const isEditing = editingSection === 'sigef';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />SIGEF e CAR</CardTitle>
        {!isEditing && <EditBtn onClick={() => setEditingSection('sigef')} />}
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label className="text-xs">Status no SIGEF</Label>
                <Select value={form.sigef_status} onValueChange={v => setForm(p => ({...p, sigef_status: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Não Cadastrado','Em Análise','Aprovado','Rejeitado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Código SIGEF</Label><Input value={form.sigef_code} onChange={e => setForm(p => ({...p, sigef_code: e.target.value}))} /></div>
              <div><Label className="text-xs">Data Certificação SIGEF</Label><Input type="date" value={form.sigef_date} onChange={e => setForm(p => ({...p, sigef_date: e.target.value}))} /></div>
              <div><Label className="text-xs">Compatibilidade CAR</Label>
                <Select value={form.car_compatibility} onValueChange={v => setForm(p => ({...p, car_compatibility: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Compatível','Parcialmente Compatível','Incompatível','Não Verificado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Integração com Matrícula</Label>
                <Select value={String(form.registration_integration)} onValueChange={v => setForm(p => ({...p, registration_integration: v === 'true'}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="true">Integrado</SelectItem><SelectItem value="false">Pendente</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => saveMulti(form)}>Salvar</Button></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Status no SIGEF</p><p className="font-semibold">{localGeo.sigef_status || 'Não cadastrado'}</p></div>
              <div><p className="text-sm text-gray-500">Código SIGEF</p><p className="font-semibold">{localGeo.sigef_code || 'Não informado'}</p></div>
              {localGeo.sigef_date && <div><p className="text-sm text-gray-500">Data Certificação SIGEF</p><p className="font-semibold">{format(parseISO(localGeo.sigef_date), 'dd/MM/yyyy')}</p></div>}
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><span className="text-sm">Integração com Matrícula</span>{localGeo.registration_integration ? <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Integrado</Badge> : <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Pendente</Badge>}</div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><span className="text-sm">Compatibilidade com CAR</span><Badge variant="outline">{localGeo.car_compatibility || 'Não verificado'}</Badge></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EnvAreasCard({ localGeo, editingSection, setEditingSection, save }) {
  const [form, setForm] = useState({ app_mapped: '', legal_reserve: '', consolidated_areas: '', regularizable_areas: '', ...(localGeo.environmental_areas || {}) });
  useEffect(() => { setForm({ app_mapped: '', legal_reserve: '', consolidated_areas: '', regularizable_areas: '', ...(localGeo.environmental_areas || {}) }); }, [localGeo]);
  const isEditing = editingSection === 'envAreas';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2"><Leaf className="w-5 h-5" />Áreas Ambientais</CardTitle>
        {!isEditing && <EditBtn onClick={() => setEditingSection('envAreas')} />}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              {[['APP Mapeada (ha)','app_mapped'],['Reserva Legal (ha)','legal_reserve'],['Áreas Consolidadas (ha)','consolidated_areas'],['Áreas Regularizáveis (ha)','regularizable_areas']].map(([label, key]) => (
                <div key={key}><Label className="text-xs">{label}</Label><Input type="number" value={form[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))} /></div>
              ))}
            </div>
            <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => save('environmental_areas', { app_mapped: parseFloat(form.app_mapped) || 0, legal_reserve: parseFloat(form.legal_reserve) || 0, consolidated_areas: parseFloat(form.consolidated_areas) || 0, regularizable_areas: parseFloat(form.regularizable_areas) || 0 })}>Salvar</Button></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {[['APP Mapeada','app_mapped','green'],['Reserva Legal','legal_reserve','emerald'],['Áreas Consolidadas','consolidated_areas','blue'],['Áreas Regularizáveis','regularizable_areas','yellow']].map(([label, key, color]) => (
              <div key={key} className={`p-4 bg-${color}-50 rounded-lg border border-${color}-200`}>
                <p className={`text-sm text-${color}-700 mb-1`}>{label}</p>
                <p className={`text-2xl font-bold text-${color}-900`}>{localGeo.environmental_areas?.[key] ? `${localGeo.environmental_areas[key]} ha` : 'Não informado'}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EnvAlertsCard({ localGeo, editingSection, setEditingSection, save }) {
  const [alerts, setAlerts] = useState(localGeo.environmental_conflict_alerts || []);
  const [newAlert, setNewAlert] = useState({ alert_type: 'Invasão de APP', description: '', severity: 'Média', status: 'Aberto' });
  const isEditing = editingSection === 'envAlerts';

  useEffect(() => { setAlerts(localGeo.environmental_conflict_alerts || []); }, [localGeo]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Alertas de Conflito Ambiental</CardTitle>
        {!isEditing && <EditBtn onClick={() => setEditingSection('envAlerts')} />}
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length > 0 ? alerts.map((alert, idx) => (
          <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start justify-between mb-1">
              <p className="font-semibold text-red-900">{alert.alert_type}</p>
              <div className="flex items-center gap-1">
                <Badge className={alert.severity === 'Alta' ? 'bg-red-600 text-white' : alert.severity === 'Média' ? 'bg-yellow-600 text-white' : 'bg-blue-600 text-white'}>{alert.severity}</Badge>
                {isEditing && <button onClick={() => setAlerts(p => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
            <p className="text-sm text-red-800">{alert.description}</p>
            <Badge variant="outline" className="mt-2">{alert.status}</Badge>
          </div>
        )) : <p className="text-gray-500 text-center py-6">Nenhum alerta de conflito ambiental</p>}
        {isEditing && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-medium">Adicionar Alerta</p>
            <div className="grid md:grid-cols-2 gap-2">
              <Select value={newAlert.alert_type} onValueChange={v => setNewAlert(p => ({...p, alert_type: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Invasão de APP','Sobreposição','Conflito de Área','Outro'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              <Select value={newAlert.severity} onValueChange={v => setNewAlert(p => ({...p, severity: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Baixa','Média','Alta'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              <Select value={newAlert.status} onValueChange={v => setNewAlert(p => ({...p, status: v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Aberto','Em Resolução','Resolvido'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              <Input placeholder="Descrição" value={newAlert.description} onChange={e => setNewAlert(p => ({...p, description: e.target.value}))} />
            </div>
            <Button size="sm" variant="outline" onClick={() => { if (!newAlert.description) return; setAlerts(p => [...p, newAlert]); setNewAlert({ alert_type: 'Invasão de APP', description: '', severity: 'Média', status: 'Aberto' }); }}><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
            <div className="flex justify-end gap-2 pt-1"><Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => save('environmental_conflict_alerts', alerts)}>Salvar</Button></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MapLayersCard({ localGeo, editingSection, setEditingSection, save }) {
  const [form, setForm] = useState({
    satellite_imagery: '',
    satellite_imagery_file: '',
    contour_lines: false,
    contour_lines_file: '',
    hydrography: false,
    hydrography_file: '',
    land_use: '',
    land_use_file: '',
    ...(localGeo.map_layers || {})
  });
  const [uploading, setUploading] = useState({});

  useEffect(() => {
    setForm({
      satellite_imagery: '',
      satellite_imagery_file: '',
      contour_lines: false,
      contour_lines_file: '',
      hydrography: false,
      hydrography_file: '',
      land_use: '',
      land_use_file: '',
      ...(localGeo.map_layers || {})
    });
  }, [localGeo]);

  const isEditing = editingSection === 'mapLayers';

  const handleLayerUpload = async (e, fieldKey) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(p => ({ ...p, [fieldKey]: true }));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, [fieldKey]: file_url }));
    setUploading(p => ({ ...p, [fieldKey]: false }));
  };

  const layers = [
    { label: 'Imagem de Satélite', urlKey: 'satellite_imagery', fileKey: 'satellite_imagery_file', boolKey: null },
    { label: 'Curvas de Nível',    urlKey: null,                 fileKey: 'contour_lines_file',     boolKey: 'contour_lines' },
    { label: 'Hidrografia',        urlKey: null,                 fileKey: 'hydrography_file',        boolKey: 'hydrography' },
    { label: 'Uso e Ocupação do Solo', urlKey: 'land_use',       fileKey: 'land_use_file',           boolKey: null },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5" />Camadas do Mapa</CardTitle>
        {!isEditing && <EditBtn onClick={() => setEditingSection('mapLayers')} />}
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <div className="space-y-4">
            {layers.map(({ label, urlKey, fileKey, boolKey }) => (
              <div key={label} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  {boolKey !== null && (
                    <Select value={String(form[boolKey])} onValueChange={v => setForm(p => ({...p, [boolKey]: v === 'true'}))}>
                      <SelectTrigger className="h-8 text-sm w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Disponível</SelectItem>
                        <SelectItem value="false">Não disponível</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {urlKey && (
                    <Input
                      className="h-8 text-sm flex-1"
                      value={form[urlKey] || ''}
                      onChange={e => setForm(p => ({...p, [urlKey]: e.target.value}))}
                      placeholder="URL ou cole link..."
                    />
                  )}
                  <label className="flex-shrink-0">
                    <Button variant="outline" size="sm" asChild disabled={uploading[fileKey]} className="h-8 cursor-pointer">
                      <div>
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        {uploading[fileKey] ? 'Enviando...' : 'Upload'}
                      </div>
                    </Button>
                    <input
                      type="file"
                      className="hidden"
                      accept=".kml,.kmz,.shp,.zip,.geojson,.tif,.tiff,.png,.jpg,.jpeg,.pdf"
                      onChange={e => handleLayerUpload(e, fileKey)}
                    />
                  </label>
                </div>
                {form[fileKey] && (
                  <a href={form[fileKey]} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                    <Download className="w-3 h-3" /> Arquivo enviado — clique para visualizar
                  </a>
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => save('map_layers', form)}>Salvar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {layers.map(({ label, urlKey, fileKey, boolKey }) => {
              const hasFile = !!localGeo.map_layers?.[fileKey];
              const hasUrl  = urlKey ? !!localGeo.map_layers?.[urlKey] : false;
              const boolVal = boolKey ? localGeo.map_layers?.[boolKey] : null;
              const available = hasFile || hasUrl || boolVal;
              return (
                <div key={label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">{label}</span>
                  <div className="flex items-center gap-2">
                    {hasFile && (
                      <a href={localGeo.map_layers[fileKey]} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                        <Download className="w-3 h-3" /> Arquivo
                      </a>
                    )}
                    {available
                      ? <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Disponível</Badge>
                      : <Badge variant="outline">Não disponível</Badge>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PerimeterHistoryCard({ localGeo, editingSection, setEditingSection, save }) {
  const [adjustments, setAdjustments] = useState(localGeo.perimeter_adjustments || []);
  const [newAdj, setNewAdj] = useState({ date: '', reason: '', technician: '', previous_perimeter: '', new_perimeter: '' });
  const isEditing = editingSection === 'history';

  useEffect(() => { setAdjustments(localGeo.perimeter_adjustments || []); }, [localGeo]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />Histórico de Ajustes de Perímetro</CardTitle>
        {!isEditing && <EditBtn onClick={() => setEditingSection('history')} />}
      </CardHeader>
      <CardContent className="space-y-3">
        {adjustments.length > 0 ? adjustments.map((a, idx) => (
          <div key={idx} className="p-4 bg-gray-50 rounded-lg border-l-4 border-emerald-500">
            <div className="flex items-start justify-between mb-2">
              <div><p className="font-semibold">{a.date ? format(parseISO(a.date), 'dd/MM/yyyy') : '-'}</p><p className="text-sm text-gray-600 mt-1">{a.reason}</p></div>
              <div className="flex items-center gap-1"><Badge variant="outline">{a.technician}</Badge>{isEditing && <button onClick={() => setAdjustments(p => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-gray-500">Anterior</p><p className="font-semibold">{a.previous_perimeter?.toLocaleString()} m</p></div><div><p className="text-gray-500">Novo</p><p className="font-semibold text-emerald-600">{a.new_perimeter?.toLocaleString()} m</p></div></div>
          </div>
        )) : <p className="text-gray-500 text-center py-6">Nenhum ajuste registrado</p>}
        {isEditing && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-medium">Adicionar Ajuste</p>
            <div className="grid md:grid-cols-2 gap-2">
              <Input type="date" value={newAdj.date} onChange={e => setNewAdj(p => ({...p, date: e.target.value}))} />
              <Input placeholder="Responsável Técnico" value={newAdj.technician} onChange={e => setNewAdj(p => ({...p, technician: e.target.value}))} />
              <Input placeholder="Motivo" value={newAdj.reason} onChange={e => setNewAdj(p => ({...p, reason: e.target.value}))} className="md:col-span-2" />
              <Input type="number" placeholder="Perímetro Anterior (m)" value={newAdj.previous_perimeter} onChange={e => setNewAdj(p => ({...p, previous_perimeter: e.target.value}))} />
              <Input type="number" placeholder="Novo Perímetro (m)" value={newAdj.new_perimeter} onChange={e => setNewAdj(p => ({...p, new_perimeter: e.target.value}))} />
            </div>
            <Button size="sm" variant="outline" onClick={() => { if (!newAdj.date || !newAdj.reason) return; setAdjustments(p => [...p, { ...newAdj, previous_perimeter: parseFloat(newAdj.previous_perimeter), new_perimeter: parseFloat(newAdj.new_perimeter) }]); setNewAdj({ date: '', reason: '', technician: '', previous_perimeter: '', new_perimeter: '' }); }}><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
            <div className="flex justify-end gap-2 pt-1"><Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => save('perimeter_adjustments', adjustments)}>Salvar</Button></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TechnicianCard({ localGeo, editingSection, setEditingSection, saveMulti }) {
  const [form, setForm] = useState({ technician_name: localGeo.technician_name || '', technician_crea: localGeo.technician_crea || '', last_survey_date: localGeo.last_survey_date || '' });
  useEffect(() => { setForm({ technician_name: localGeo.technician_name || '', technician_crea: localGeo.technician_crea || '', last_survey_date: localGeo.last_survey_date || '' }); }, [localGeo]);
  const isEditing = editingSection === 'technician';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Responsável Técnico</CardTitle>
        {!isEditing && <EditBtn onClick={() => setEditingSection('technician')} />}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label className="text-xs">Nome</Label><Input value={form.technician_name} onChange={e => setForm(p => ({...p, technician_name: e.target.value}))} /></div>
              <div><Label className="text-xs">CREA</Label><Input value={form.technician_crea} onChange={e => setForm(p => ({...p, technician_crea: e.target.value}))} /></div>
              <div className="md:col-span-2"><Label className="text-xs">Último Levantamento</Label><Input type="date" value={form.last_survey_date} onChange={e => setForm(p => ({...p, last_survey_date: e.target.value}))} /></div>
            </div>
            <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => saveMulti(form)}>Salvar</Button></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div><p className="text-sm text-gray-500">Nome</p><p className="font-semibold">{localGeo.technician_name || 'Não informado'}</p></div>
            <div><p className="text-sm text-gray-500">CREA</p><p className="font-semibold">{localGeo.technician_crea || 'Não informado'}</p></div>
            <div className="md:col-span-2"><p className="text-sm text-gray-500">Último Levantamento</p><p className="font-semibold">{localGeo.last_survey_date ? format(parseISO(localGeo.last_survey_date), 'dd/MM/yyyy') : 'Não informado'}</p></div>
          </div>
        )}
      </CardContent>
    </Card>
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