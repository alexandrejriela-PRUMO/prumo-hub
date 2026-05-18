import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Map,
  Plus,
  Upload,
  Eye,
  Trash2,
  FileText,
  Mountain,
  AlertTriangle,
  Leaf,
  Trees,
  Activity
} from 'lucide-react';
import SupabaseFileUpload from '../components/storage/SupabaseFileUpload';
import ConsultorPropertySelector from '../components/consultor/ConsultorPropertySelector';
import { useEffectiveUser } from '../hooks/useEffectiveUser';
import { toast } from 'sonner';

export default function Mappings() {
  const [user, setUser] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentMapping, setCurrentMapping] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { effectiveEmail, userType, isEquipe, memberRole } = useEffectiveUser();
  const isConsultor = userType === 'consultor' || userType === 'equipe';
  const isClientConsultor = userType === 'client_consultor' || user?.user_type === 'client_consultor';
  const canEdit = !isEquipe && !isClientConsultor || (isEquipe && (memberRole === 'Administrador' || memberRole === 'Engenheiro'));

  const { data: allPropertiesForClient = [] } = useQuery({
    queryKey: ['all-properties-for-client-mappings'],
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
    queryFn: () => isConsultor
      ? base44.entities.Property.filter({ consultor_email: effectiveEmail })
      : base44.entities.Property.filter({ owner_email: effectiveEmail }),
    enabled: !!effectiveEmail && !isClientConsultor,
  });

  const effectiveProperties = isClientConsultor ? clientConsultorProperties : properties;

  const { data: mappings = [] } = useQuery({
    queryKey: ['mappings', selectedProperty?.id],
    queryFn: () => base44.entities.Mapping.filter({ property_id: selectedProperty.id }, '-created_date'),
    enabled: !!selectedProperty?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Mapping.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['mappings']);
      toast.success('Mapeamento criado com sucesso!');
      setDialogOpen(false);
      setCurrentMapping(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Mapping.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['mappings']);
      toast.success('Mapeamento atualizado!');
      setDialogOpen(false);
      setCurrentMapping(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Mapping.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['mappings']);
      toast.success('Mapeamento excluído!');
    },
  });

  const handleSupabaseUpload = async (filePath, fileName, mapping) => {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    let fileType = 'geoespacial';
    if (ext === '.kml') fileType = 'kml';
    else if (ext === '.tif' || ext === '.tiff') fileType = 'tif';
    else if (ext === '.tfw') fileType = 'tfw';

    const newFile = { name: fileName, url: filePath, type: fileType, upload_date: new Date().toISOString() };
    const updatedFiles = [...(mapping.files || []), newFile];
    await updateMutation.mutateAsync({ id: mapping.id, data: { ...mapping, files: updatedFiles } });
    toast.success('Arquivo geoespacial enviado!');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedProperty) return;
    const formData = new FormData(e.target);
    const data = {
      property_id: selectedProperty.id,
      user_email: user.email,
      mapping_type: formData.get('mapping_type'),
      title: formData.get('title'),
      description: formData.get('description'),
      mapping_date: formData.get('mapping_date'),
      area_hectares: parseFloat(formData.get('area_hectares')) || 0,
      coordinates: formData.get('coordinates'),
      status: formData.get('status') || 'Em Processamento',
      notes: formData.get('notes'),
    };

    const mappingType = data.mapping_type;
    if (mappingType === 'Multiespectral') {
      data.multispectral_data = {
        ndvi: parseFloat(formData.get('ndvi')) || 0,
        gndvi: parseFloat(formData.get('gndvi')) || 0,
        ndre: parseFloat(formData.get('ndre')) || 0,
        osavi: parseFloat(formData.get('osavi')) || 0,
        lci: parseFloat(formData.get('lci')) || 0,
      };
    } else if (mappingType === 'Obstáculos') {
      data.obstacles_data = {
        obstacle_count: parseInt(formData.get('obstacle_count')) || 0,
        obstacle_types: formData.get('obstacle_types')?.split(',').map(t => t.trim()) || [],
      };
    } else if (mappingType === 'Relevo e Alturas') {
      data.terrain_data = {
        min_elevation: parseFloat(formData.get('min_elevation')) || 0,
        max_elevation: parseFloat(formData.get('max_elevation')) || 0,
        avg_slope: parseFloat(formData.get('avg_slope')) || 0,
      };
    } else if (mappingType === 'Frutíferas') {
      data.fruit_cultivation_data = {
        plant_count: parseInt(formData.get('plant_count')) || 0,
        plants_per_meter: parseFloat(formData.get('plants_per_meter')) || 0,
        plants_per_area: parseFloat(formData.get('plants_per_area')) || 0,
        fruit_type: formData.get('fruit_type'),
      };
    } else if (mappingType === 'Pastagem') {
      data.pasture_data = {
        green_mass: parseFloat(formData.get('green_mass')) || 0,
        biomass_index: parseFloat(formData.get('biomass_index')) || 0,
        grazing_capacity: parseFloat(formData.get('grazing_capacity')) || 0,
      };
    }

    if (currentMapping) {
      updateMutation.mutate({ id: currentMapping.id, data: { ...currentMapping, ...data } });
    } else {
      createMutation.mutate(data);
    }
  };

  const typeIcons = {
    Multiespectral: Activity,
    Obstáculos: AlertTriangle,
    'Relevo e Alturas': Mountain,
    Frutíferas: Trees,
    Pastagem: Leaf,
  };

  const typeColors = {
    Multiespectral: 'from-purple-500 to-purple-600',
    Obstáculos: 'from-red-500 to-red-600',
    'Relevo e Alturas': 'from-blue-500 to-blue-600',
    Frutíferas: 'from-green-500 to-green-600',
    Pastagem: 'from-emerald-500 to-emerald-600',
  };

  useEffect(() => {
    if (effectiveProperties.length > 0 && !selectedProperty && !isConsultor && !isClientConsultor && effectiveEmail) {
      setSelectedProperty(effectiveProperties[0]);
    }
    if (isClientConsultor && clientConsultorProperties.length > 0 && !selectedProperty) {
      setSelectedProperty(clientConsultorProperties[0]);
    }
  }, [effectiveProperties, selectedProperty, isConsultor, isClientConsultor, effectiveEmail]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Consultor Property Selector */}
        {isConsultor && (
          <div className="mb-6">
            <ConsultorPropertySelector
              properties={effectiveProperties}
              selectedPropertyId={selectedProperty?.id}
              onSelect={(id) => setSelectedProperty(effectiveProperties.find(p => p.id === id) || null)}
              isLoading={propertiesLoading}
            />
          </div>
        )}

        {/* Client Consultor Property Selector */}
        {isClientConsultor && clientConsultorProperties.length > 1 && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-white rounded-xl border border-emerald-100 shadow-sm">
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
            <h1 className="text-2xl sm:text-4xl font-bold text-emerald-900 flex items-center gap-2 sm:gap-3">
              <Map className="w-7 sm:w-10 h-7 sm:h-10 flex-shrink-0" />
              Mapeamentos
            </h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
              Gerencie mapeamentos multiespectrais, obstáculos, relevo, frutíferas e pastagens
            </p>
          </div>
          {canEdit && <Dialog open={dialogOpen} onOpenChange={(open) => {
              if (!open && !currentMapping) {
                const confirmed = window.confirm('Você tem alterações não salvas. Deseja fechar sem salvar?');
                if (!confirmed) return;
              }
              setDialogOpen(open);
              if (!open) setCurrentMapping(null);
            }}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setCurrentMapping(null)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 w-full sm:w-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Mapeamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{currentMapping ? 'Editar' : 'Novo'} Mapeamento</DialogTitle>
                <DialogDescription>Preencha os dados do mapeamento</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Mapeamento</Label>
                    <Select name="mapping_type" defaultValue={currentMapping?.mapping_type} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Multiespectral">Multiespectral</SelectItem>
                        <SelectItem value="Obstáculos">Obstáculos</SelectItem>
                        <SelectItem value="Relevo e Alturas">Relevo e Alturas</SelectItem>
                        <SelectItem value="Frutíferas">Frutíferas</SelectItem>
                        <SelectItem value="Pastagem">Pastagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select name="status" defaultValue={currentMapping?.status || 'Em Processamento'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Em Processamento">Em Processamento</SelectItem>
                        <SelectItem value="Concluído">Concluído</SelectItem>
                        <SelectItem value="Arquivado">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Título</Label>
                  <Input name="title" defaultValue={currentMapping?.title} required />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea name="description" defaultValue={currentMapping?.description} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Data do Mapeamento</Label>
                    <Input type="date" name="mapping_date" defaultValue={currentMapping?.mapping_date} required />
                  </div>
                  <div>
                    <Label>Área (ha)</Label>
                    <Input type="number" step="0.01" name="area_hectares" defaultValue={currentMapping?.area_hectares} />
                  </div>
                  <div>
                    <Label>Coordenadas</Label>
                    <Input name="coordinates" defaultValue={currentMapping?.coordinates} placeholder="-23.5,-46.6" />
                  </div>
                </div>

                {/* Campos específicos por tipo */}
                <div id="type-specific-fields">
                  <Label className="text-lg font-semibold">Dados Específicos</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {/* Multiespectral */}
                    <div>
                      <Label>NDVI</Label>
                      <Input type="number" step="0.01" name="ndvi" defaultValue={currentMapping?.multispectral_data?.ndvi} />
                    </div>
                    <div>
                      <Label>GNDVI</Label>
                      <Input type="number" step="0.01" name="gndvi" defaultValue={currentMapping?.multispectral_data?.gndvi} />
                    </div>
                    <div>
                      <Label>NDRE</Label>
                      <Input type="number" step="0.01" name="ndre" defaultValue={currentMapping?.multispectral_data?.ndre} />
                    </div>
                    <div>
                      <Label>OSAVI</Label>
                      <Input type="number" step="0.01" name="osavi" defaultValue={currentMapping?.multispectral_data?.osavi} />
                    </div>
                    <div>
                      <Label>LCI</Label>
                      <Input type="number" step="0.01" name="lci" defaultValue={currentMapping?.multispectral_data?.lci} />
                    </div>

                    {/* Obstáculos */}
                    <div>
                      <Label>Quantidade de Obstáculos</Label>
                      <Input type="number" name="obstacle_count" defaultValue={currentMapping?.obstacles_data?.obstacle_count} />
                    </div>
                    <div>
                      <Label>Tipos de Obstáculos (separados por vírgula)</Label>
                      <Input name="obstacle_types" defaultValue={currentMapping?.obstacles_data?.obstacle_types?.join(', ')} />
                    </div>

                    {/* Relevo */}
                    <div>
                      <Label>Elevação Mínima (m)</Label>
                      <Input type="number" step="0.1" name="min_elevation" defaultValue={currentMapping?.terrain_data?.min_elevation} />
                    </div>
                    <div>
                      <Label>Elevação Máxima (m)</Label>
                      <Input type="number" step="0.1" name="max_elevation" defaultValue={currentMapping?.terrain_data?.max_elevation} />
                    </div>
                    <div>
                      <Label>Inclinação Média (%)</Label>
                      <Input type="number" step="0.1" name="avg_slope" defaultValue={currentMapping?.terrain_data?.avg_slope} />
                    </div>

                    {/* Frutíferas */}
                    <div>
                      <Label>Tipo de Frutífera</Label>
                      <Input name="fruit_type" defaultValue={currentMapping?.fruit_cultivation_data?.fruit_type} />
                    </div>
                    <div>
                      <Label>Contagem de Plantas</Label>
                      <Input type="number" name="plant_count" defaultValue={currentMapping?.fruit_cultivation_data?.plant_count} />
                    </div>
                    <div>
                      <Label>Plantas por Metro</Label>
                      <Input type="number" step="0.1" name="plants_per_meter" defaultValue={currentMapping?.fruit_cultivation_data?.plants_per_meter} />
                    </div>
                    <div>
                      <Label>Plantas por Área</Label>
                      <Input type="number" step="0.1" name="plants_per_area" defaultValue={currentMapping?.fruit_cultivation_data?.plants_per_area} />
                    </div>

                    {/* Pastagem */}
                    <div>
                      <Label>Massa Verde (kg/ha)</Label>
                      <Input type="number" step="0.1" name="green_mass" defaultValue={currentMapping?.pasture_data?.green_mass} />
                    </div>
                    <div>
                      <Label>Índice de Biomassa</Label>
                      <Input type="number" step="0.01" name="biomass_index" defaultValue={currentMapping?.pasture_data?.biomass_index} />
                    </div>
                    <div>
                      <Label>Capacidade de Pastejo (UA/ha)</Label>
                      <Input type="number" step="0.1" name="grazing_capacity" defaultValue={currentMapping?.pasture_data?.grazing_capacity} />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea name="notes" defaultValue={currentMapping?.notes} />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    {currentMapping ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>}
        </div>

        {/* Property Selector */}
        {!isClientConsultor && (effectiveProperties.length > 1 || isConsultor) && (
          <div className="mb-6">
            <Label>Propriedade ou Empreendimento</Label>
            <Select
              value={selectedProperty?.id}
              onValueChange={(id) => setSelectedProperty(effectiveProperties.find((p) => p.id === id))}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {effectiveProperties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.property_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Mappings Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mappings.map((mapping) => {
            const Icon = typeIcons[mapping.mapping_type] || Map;
            const colorClass = typeColors[mapping.mapping_type] || 'from-gray-500 to-gray-600';

            return (
              <Card key={mapping.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className={`bg-gradient-to-r ${colorClass} text-white rounded-t-xl`}>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    {mapping.title}
                  </CardTitle>
                  <CardDescription className="text-white/90">{mapping.mapping_type}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Data:</span>
                      <span className="font-medium">{new Date(mapping.mapping_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {mapping.area_hectares > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Área:</span>
                        <span className="font-medium">{mapping.area_hectares} ha</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <Badge
                        variant={
                          mapping.status === 'Concluído'
                            ? 'default'
                            : mapping.status === 'Arquivado'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {mapping.status}
                      </Badge>
                    </div>

                    {/* Specific Data Preview */}
                    {mapping.multispectral_data && (
                      <div className="text-xs bg-purple-50 p-2 rounded">
                        <p><strong>NDVI:</strong> {mapping.multispectral_data.ndvi}</p>
                        <p><strong>GNDVI:</strong> {mapping.multispectral_data.gndvi}</p>
                      </div>
                    )}
                    {mapping.pasture_data && (
                      <div className="text-xs bg-emerald-50 p-2 rounded">
                        <p><strong>Massa Verde:</strong> {mapping.pasture_data.green_mass} kg/ha</p>
                      </div>
                    )}
                    {mapping.fruit_cultivation_data && (
                      <div className="text-xs bg-green-50 p-2 rounded">
                        <p><strong>Plantas:</strong> {mapping.fruit_cultivation_data.plant_count}</p>
                        <p><strong>Tipo:</strong> {mapping.fruit_cultivation_data.fruit_type}</p>
                      </div>
                    )}

                    {/* Files */}
                    {mapping.files?.length > 0 && (
                      <div className="text-xs">
                        <p className="text-gray-600 mb-1">Arquivos Geoespaciais ({mapping.files.length}):</p>
                        <div className="space-y-1">
                          {mapping.files.slice(0, 3).map((file, idx) => (
                            <a
                              key={idx}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-emerald-600 hover:underline"
                            >
                              <FileText className="w-3 h-3" />
                              <span className="truncate">{file.name}</span>
                              {file.type && (
                                <Badge variant="outline" className="ml-auto text-[10px] px-1 py-0 h-4">
                                  {file.type.toUpperCase()}
                                </Badge>
                              )}
                            </a>
                          ))}
                          {mapping.files.length > 3 && (
                            <p className="text-gray-500 text-[10px]">+{mapping.files.length - 3} mais</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setCurrentMapping(mapping);
                          if (canEdit) setDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      {canEdit && (
                        <div className="flex-1">
                          <SupabaseFileUpload
                            folder="mapeamentos"
                            accept=".kml,.tif,.tiff,.tfw"
                            label="KML/TIF"
                            onUploadDone={(filePath, fileName) => handleSupabaseUpload(filePath, fileName, mapping)}
                          />
                        </div>
                      )}
                      {canEdit && <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Excluir este mapeamento?')) {
                            deleteMutation.mutate(mapping.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {mappings.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Map className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Nenhum mapeamento cadastrado ainda.</p>
              <p className="text-sm text-gray-500 mt-2">Clique em "Novo Mapeamento" para começar.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}