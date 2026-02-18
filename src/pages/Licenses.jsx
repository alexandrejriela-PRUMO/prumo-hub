import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileCheck, 
  Plus, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  FileText,
  Upload,
  Trash2,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import LicenseHistory from '../components/history/LicenseHistory';
import LicenseDocuments from '../components/license/LicenseDocuments';
import { toast } from 'sonner';
import ConsultorPropertySelector from '../components/consultor/ConsultorPropertySelector';

const licenseTypes = ['LP', 'LI', 'LO', 'LAU', 'Dispensa', 'Outorga', 'Outro'];

export default function Licenses() {
  const [user, setUser] = useState(null);
  const [consultorPropertyId, setConsultorPropertyId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    property_id: '',
    license_type: '',
    license_number: '',
    issue_date: '',
    expiry_date: '',
    conditions: [],
    documents: [],
  });
  const [newCondition, setNewCondition] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docType, setDocType] = useState('Licença Principal');

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
    enabled: !!user?.email
  });

  const effectiveOwnerId = isConsultor
    ? properties.find(p => p.id === consultorPropertyId)?.owner_email
    : user?.email;

  const { data: licenses, isLoading } = useQuery({
    queryKey: ['licenses', effectiveOwnerId, consultorPropertyId],
    queryFn: () => {
      if (isConsultor) {
        return base44.entities.License.filter({ property_id: consultorPropertyId });
      }
      return base44.entities.License.filter({ owner_email: user.email });
    },
    enabled: isConsultor ? !!consultorPropertyId : !!user?.email,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.License.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['licenses']);
      setDialogOpen(false);
      resetForm();
      toast.success('Licença criada com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.License.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['licenses']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.License.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['licenses']);
      toast.success('Licença removida com sucesso!');
    },
  });

  const resetForm = () => {
    setFormData({
      property_id: properties.length > 0 ? properties[0].id : '',
      license_type: '',
      license_number: '',
      issue_date: '',
      expiry_date: '',
      conditions: [],
      documents: [],
    });
    setNewCondition('');
    setDocType('Licença Principal');
  };

  const openEditDialog = (license) => {
    setSelectedLicense(license);
    setFormData({
      property_id: license.property_id || '',
      license_type: license.license_type || '',
      license_number: license.license_number || '',
      issue_date: license.issue_date || '',
      expiry_date: license.expiry_date || '',
      conditions: license.conditions || [],
      documents: license.documents || [],
    });
    setEditDialogOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newDoc = {
        name: file.name,
        url: file_url,
        type: docType,
        uploaded_by: user.email,
        uploaded_date: new Date().toISOString()
      };
      setFormData({
        ...formData,
        documents: [...formData.documents, newDoc]
      });
      toast.success('Documento adicionado!');
      // Reset file input
      e.target.value = null;
    } catch (error) {
      toast.error('Erro ao fazer upload do arquivo');
    }
    setUploadingDoc(false);
  };

  const removeDocument = (index) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index)
    });
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setFormData({
        ...formData,
        conditions: [...formData.conditions, newCondition.trim()],
      });
      setNewCondition('');
    }
  };

  const removeCondition = (index) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      owner_email: user.email,
    });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      id: selectedLicense.id,
      data: formData
    });
    setEditDialogOpen(false);
    resetForm();
    toast.success('Licença atualizada com sucesso!');
  };

  const getLicenseStatus = (license) => {
    if (!license.expiry_date) return { status: 'unknown', label: 'Sem data', color: 'bg-gray-100 text-gray-700' };
    
    const expiryDate = parseISO(license.expiry_date);
    const daysUntilExpiry = differenceInDays(expiryDate, new Date());

    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Vencida', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'warning', label: `${daysUntilExpiry}d`, color: 'bg-amber-100 text-amber-700', icon: Clock };
    } else if (daysUntilExpiry <= 90) {
      return { status: 'attention', label: `${daysUntilExpiry}d`, color: 'bg-yellow-100 text-yellow-700', icon: Clock };
    }
    return { status: 'ok', label: 'Vigente', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Licenças Ambientais</h1>
          <p className="text-gray-500 mt-1">Gerencie suas licenças e condicionantes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Licença
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Licença</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Propriedade *</Label>
                <Select
                  value={formData.property_id}
                  onValueChange={(v) => setFormData({ ...formData, property_id: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma propriedade" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(prop => (
                      <SelectItem key={prop.id} value={prop.id}>
                        {prop.property_name} - {prop.city || 'N/A'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Licença</Label>
                  <Select
                    value={formData.license_type}
                    onValueChange={(v) => setFormData({ ...formData, license_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {licenseTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número da Licença</Label>
                  <Input
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    placeholder="Ex: 001/2024"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Emissão</Label>
                  <Input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Validade</Label>
                  <Input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Condicionantes</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder="Adicionar condicionante"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                  />
                  <Button type="button" variant="outline" onClick={addCondition}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.conditions.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {formData.conditions.map((cond, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <span className="flex-1 text-sm">{cond}</span>
                        <button type="button" onClick={() => removeCondition(idx)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Documentos da Licença</Label>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">Tipo de Documento</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Licença Principal">Licença Principal</SelectItem>
                          <SelectItem value="Documento Complementar">Documento Complementar</SelectItem>
                          <SelectItem value="Comprovante">Comprovante</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Upload</Label>
                      <label 
                        htmlFor="file-upload-form"
                        className="flex items-center justify-center gap-1 h-9 px-3 border-2 border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-50 transition-colors"
                      >
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-700">
                          {uploadingDoc ? 'Enviando...' : 'Arquivo'}
                        </span>
                      </label>
                      <Input
                        id="file-upload-form"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploadingDoc}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Selecione o tipo e clique em "Arquivo" para adicionar documentos (PDF, JPG, PNG)
                  </p>
                </div>
                {formData.documents.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-sm font-medium text-gray-700">Documentos adicionados:</p>
                    {formData.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-600">{doc.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">
                            <FileText className="w-4 h-4" />
                          </a>
                          <button type="button" onClick={() => removeDocument(idx)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando...' : 'Salvar Licença'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Licenses Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : licenses.length === 0 ? (
        <Card className="border-dashed border-2 border-emerald-200">
          <CardContent className="py-16 text-center">
            <FileCheck className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Nenhuma licença cadastrada</h3>
            <p className="text-gray-500 mt-2">Clique em "Nova Licença" para adicionar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {licenses.map((license) => {
            const statusInfo = getLicenseStatus(license);
            const StatusIcon = statusInfo.icon || Clock;
            return (
              <Card key={license.id} className="hover:shadow-lg transition-shadow border-emerald-100">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        statusInfo.status === 'expired' ? 'bg-red-100' :
                        statusInfo.status === 'warning' ? 'bg-amber-100' : 'bg-emerald-100'
                      }`}>
                        <FileCheck className={`w-6 h-6 ${
                          statusInfo.status === 'expired' ? 'text-red-600' :
                          statusInfo.status === 'warning' ? 'text-amber-600' : 'text-emerald-600'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{license.license_type}</CardTitle>
                        <p className="text-sm text-gray-500">{license.license_number || 'Sem número'}</p>
                      </div>
                    </div>
                    <Badge className={statusInfo.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Validade: {license.expiry_date ? format(parseISO(license.expiry_date), "dd/MM/yyyy") : 'Não informada'}</span>
                    </div>

                    {license.conditions && license.conditions.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Condicionantes:</p>
                        <div className="space-y-1">
                          {license.conditions.slice(0, 2).map((cond, idx) => (
                            <p key={idx} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">• {cond}</p>
                          ))}
                          {license.conditions.length > 2 && (
                            <p className="text-xs text-emerald-600">+{license.conditions.length - 2} mais</p>
                          )}
                        </div>
                      </div>
                    )}

                    {license.documents && license.documents.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-2">Documentos ({license.documents.length}):</p>
                        <div className="space-y-1">
                          {license.documents.slice(0, 2).map((doc, idx) => (
                            <a
                              key={idx}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs hover:bg-gray-100 transition-colors"
                            >
                              <FileText className="w-3 h-3 text-emerald-600" />
                              <span className="flex-1 truncate">{doc.name}</span>
                            </a>
                          ))}
                          {license.documents.length > 2 && (
                            <p className="text-xs text-emerald-600 pl-2">+{license.documents.length - 2} mais</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(license)}
                        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLicense(license);
                          setShowHistory(true);
                        }}
                        className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Histórico
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (window.confirm('Deseja realmente excluir esta licença?')) {
                            deleteMutation.mutate(license.id);
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
      )}

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Licença</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Propriedade *</Label>
              <Select
                value={formData.property_id}
                onValueChange={(v) => setFormData({ ...formData, property_id: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma propriedade" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(prop => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.property_name} - {prop.city || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Licença</Label>
                <Select
                  value={formData.license_type}
                  onValueChange={(v) => setFormData({ ...formData, license_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {licenseTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Número da Licença</Label>
                <Input
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  placeholder="Ex: 001/2024"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Emissão</Label>
                <Input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Validade</Label>
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Condicionantes</Label>
              <div className="flex gap-2">
                <Input
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  placeholder="Adicionar condicionante"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                />
                <Button type="button" variant="outline" onClick={addCondition}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.conditions.length > 0 && (
                <div className="space-y-2 mt-2">
                  {formData.conditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="flex-1 text-sm">{cond}</span>
                      <button type="button" onClick={() => removeCondition(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Documentos da Licença</Label>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs">Tipo de Documento</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Licença Principal">Licença Principal</SelectItem>
                        <SelectItem value="Documento Complementar">Documento Complementar</SelectItem>
                        <SelectItem value="Comprovante">Comprovante</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Upload</Label>
                    <label 
                      htmlFor="file-upload-edit"
                      className="flex items-center justify-center gap-1 h-9 px-3 border-2 border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-50 transition-colors"
                    >
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-700">
                        {uploadingDoc ? 'Enviando...' : 'Arquivo'}
                      </span>
                    </label>
                    <Input
                      id="file-upload-edit"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingDoc}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Selecione o tipo e clique em "Arquivo" para adicionar documentos (PDF, JPG, PNG)
                </p>
              </div>
              {formData.documents.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-sm font-medium text-gray-700">Documentos adicionados:</p>
                  {formData.documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                        <p className="text-xs text-gray-600">{doc.type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">
                          <FileText className="w-4 h-4" />
                        </a>
                        <button type="button" onClick={() => removeDocument(idx)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Histórico */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              {selectedLicense?.license_type} {selectedLicense?.license_number}
            </DialogTitle>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4">
              <LicenseDocuments 
                license={selectedLicense}
                onUpdate={(updatedLicense) => {
                  updateMutation.mutate({ id: selectedLicense.id, data: updatedLicense });
                  setSelectedLicense(updatedLicense);
                }}
              />
              <LicenseHistory 
                license={selectedLicense}
                onAddUpdate={(update) => {
                  const updatedLicense = {
                    ...selectedLicense,
                    updates: [...(selectedLicense.updates || []), update]
                  };
                  updateMutation.mutate({ id: selectedLicense.id, data: updatedLicense });
                  setSelectedLicense(updatedLicense);
                }}
                onEditUpdate={(index, editedUpdate) => {
                  const newUpdates = [...(selectedLicense.updates || [])];
                  newUpdates[index] = editedUpdate;
                  const updatedLicense = {
                    ...selectedLicense,
                    updates: newUpdates
                  };
                  updateMutation.mutate({ id: selectedLicense.id, data: updatedLicense });
                  setSelectedLicense(updatedLicense);
                  toast.success('Andamento editado com sucesso!');
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}