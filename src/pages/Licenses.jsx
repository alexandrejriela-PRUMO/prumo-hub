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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFormDirtyAlert, useDialogDirtyAlert } from '@/hooks/useFormDirtyAlert';
import { 
  FileCheck, 
  Plus, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  FileText,
  Trash2,
  ChevronLeft,
  ClipboardList
} from 'lucide-react';
import R2FileUpload from '../components/storage/SupabaseFileUpload';
import R2FileLink from '../components/storage/SupabaseFileLink';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import LicenseHistory from '../components/history/LicenseHistory';
import LicenseDocuments from '../components/license/LicenseDocuments';
import LicenseChecklistPanel from '../components/license/LicenseChecklistPanel';
import { toast } from 'sonner';
import ConsultorPropertySelector from '../components/consultor/ConsultorPropertySelector';
import { useEffectiveUser } from '../hooks/useEffectiveUser';
import LicenseStatusInfographic from '../components/license/LicenseStatusInfographic';


const licenseTypes = [
  // Licenças Ambientais
  'LP - Licença Prévia',
  'LI - Licença de Instalação',
  'LO - Licença de Operação',
  'LAU - Licença de Autorização de Uso',
  'LAS - Licença Ambiental Simplificada',
  'LAC - Licença Ambiental Corretiva',
  'Dispensa de Licenciamento',
  'Outorga de Uso de Recursos Hídricos',
  'Autorização de Supressão Vegetal (ASV)',
  'Autorização de Intervenção em APP',
  'Autorização de Uso do Solo',
  'Licença de Pesca / Aquicultura',
  'Licença Sanitária',
  'Licença de Funcionamento',
  // Responsabilidade Técnica
  'ART - Anotação de Responsabilidade Técnica',
  'TRT - Termo de Responsabilidade Técnica',
  'RRT - Registro de Responsabilidade Técnica',
  // Laudos
  'Laudo Técnico Ambiental',
  'Laudo de Vistoria',
  'Laudo de Avaliação de Imóvel Rural',
  'Laudo Agronômico',
  'Laudo Fitossanitário',
  'Laudo de Conformidade de Estrutura',
  'Laudo Geológico',
  'Laudo Hidrológico',
  'Laudo Zootécnico',
  'Laudo Veterinário',
  'Laudo de Inspeção Elétrica',
  'Laudo de Inspeção Mecânica',
  'Laudo Biológico',
  'Laudo de Estabilidade Estrutural',
  // Pareceres e Relatórios
  'Parecer Técnico',
  'Relatório de Conformidade Ambiental',
  'Relatório de Monitoramento',
  'Relatório de Impacto Ambiental (RIMA)',
  'Relatório Hidrológico',
  'Relatório Geológico',
  // Certificados
  'Certificado de Conformidade',
  'Certificado Fitossanitário',
  // Projetos de Engenharia e Técnicos
  'Projeto Técnico de Engenharia',
  'Projeto Agronômico',
  'Projeto Geológico / Geotécnico',
  'Projeto Hidrológico / Hidrográfico',
  'Projeto Elétrico',
  'Projeto Estrutural',
  'Projeto Mecânico',
  'Projeto de Drenagem',
  'Projeto de Irrigação',
  'Projeto de Saneamento',
  'Projeto Biológico / Ecológico',
  'Projeto Zootécnico',
  'Projeto Veterinário',
  'Projeto de Recuperação de Área Degradada (PRAD)',
  'Projeto de Manejo Florestal',
  'Projeto de Arborização / Paisagismo',
  'Projeto Arquitetônico Rural',
  'Projeto de Topografia / Georreferenciamento',
  'Projeto de Barragem / Reservatório',
  'Projeto de Estrada / Infraestrutura Rural',
  'Projeto de Energia Solar / Renovável',
  'Outro',
];

export default function Licenses() {
  const { effectiveEmail, isEquipe, isConsultor: isConsultorHook, isEquipeProdutor: isEquipeProdutorFromHook, userType, memberRole, loading: effectiveLoading } = useEffectiveUser();
  // equipe de produtor pode criar (mesmas permissões do produtor); equipe de consultor requer role específica
  const canCreate = !isEquipe || isEquipeProdutorFromHook || memberRole === 'Administrador' || memberRole === 'Engenheiro';
  const [user, setUser] = useState(null);
  const [consultorPropertyId, setConsultorPropertyId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    property_id: '',
    license_type: '',
    other_license_description: '',
    license_number: '',
    elaboration_stage: 'Em Elaboração',
    issue_date: '',
    expiry_date: '',
    renewal_required: false,
    renewal_days_before: 120,
    conditions: [],
    documents: [],
  });
  const [initialFormData, setInitialFormData] = useState(null);
  const [newCondition, setNewCondition] = useState('');
  const [newConditionDueDate, setNewConditionDueDate] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docType, setDocType] = useState('Licença Principal');
  const [statusFilter, setStatusFilter] = useState(null);

  // Detectar mudanças no formulário
  const isFormDirty = initialFormData && JSON.stringify(formData) !== JSON.stringify(initialFormData);
  
  // Alertar ao fechar dialog
  const handleCloseDialog = useDialogDirtyAlert(
    isFormDirty,
    () => { setDialogOpen(false); resetForm(); },
    'Você tem alterações não salvas. Deseja fechar sem salvar?'
  );

  const handleCloseEditDialog = useDialogDirtyAlert(
    isFormDirty,
    () => { setEditDialogOpen(false); resetForm(); },
    'Você tem alterações não salvas. Deseja fechar sem salvar?'
  );

  // Proteger navegação
  useFormDirtyAlert(isFormDirty);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  // isConsultor: apenas consultor ou equipe de CONSULTOR (não equipe de produtor)
  const isEquipeProdutor = isEquipeProdutorFromHook;
  const isEquipeConsultor = isEquipe && !isEquipeProdutor;
  const isConsultor = (isConsultorHook || isEquipeConsultor || userType === 'consultor' || user?.user_type === 'consultor') && !isEquipeProdutor;
  const isClientConsultor = userType === 'client_consultor' || user?.user_type === 'client_consultor';
  const canEdit = !isClientConsultor && canCreate;
  const queryEmail = effectiveEmail || user?.email;

  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', queryEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('listConsultorClients', {});
      return res.data?.properties || [];
    },
    enabled: !!queryEmail && isConsultor && !isEquipeProdutor,
  });

  const { data: ownerProperties = [] } = useQuery({
    queryKey: ['properties-owner', queryEmail],
    // equipe de produtor: busca por owner_email usando effectiveEmail (email do Denison)
    queryFn: () => base44.entities.Property.filter({ owner_email: queryEmail }),
    enabled: !!queryEmail && (!isConsultor || isEquipeProdutor) && !isClientConsultor,
  });

  const { data: allPropsForClient = [] } = useQuery({
    queryKey: ['all-properties-client', user?.email],
    queryFn: () => base44.entities.Property.list('-created_date', 500),
    enabled: !!user?.email && isClientConsultor,
  });

  const clientConsultorProperties = isClientConsultor
    ? allPropsForClient.filter(prop => {
        if (!prop.authorized_users) return false;
        try {
          const au = Array.isArray(prop.authorized_users) ? prop.authorized_users : JSON.parse(prop.authorized_users);
          return Array.isArray(au) && au.some(u => u.email === user?.email);
        } catch { return false; }
      })
    : [];

  const allProperties = isClientConsultor
    ? clientConsultorProperties
    : isConsultor ? properties : ownerProperties;

  // Garante que property_id seja preenchido quando properties são carregadas
  useEffect(() => {
    if (allProperties.length > 0 && !formData.property_id) {
      setFormData(prev => ({ ...prev, property_id: allProperties[0].id }));
    }
  }, [allProperties]);

  // Todas as licenças do consultor (buscadas via backend para bypass de RLS para equipe)
  const { data: allConsultorLicenses = [], isLoading: allLicensesLoading } = useQuery({
    queryKey: ['licenses-all-consultor', queryEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('listConsultorPropertyRecords', {
        entity_name: 'License', field_name: 'property_id'
      });
      return res.data?.records || [];
    },
    enabled: !!queryEmail && isConsultor && !isEquipeProdutor,
  });

  // Licenças filtradas por propriedade selecionada (derivadas de allConsultorLicenses)
  const consultorLicenses = isConsultor && !isEquipeProdutor
    ? (consultorPropertyId
        ? allConsultorLicenses.filter(l => l.property_id === consultorPropertyId)
        : allConsultorLicenses)
    : [];

  const { data: clientLicenses = [], isLoading: clientLicensesLoading } = useQuery({
    queryKey: ['licenses', consultorPropertyId, queryEmail, isClientConsultor],
    queryFn: () => {
      if (isClientConsultor) {
        return Promise.all(
          clientConsultorProperties.map(p => base44.entities.License.filter({ property_id: p.id }))
        ).then(r => r.flat());
      }
      // Para produtor/equipe de produtor: usa effectiveEmail (email do dono principal)
      return base44.entities.License.filter({ owner_email: queryEmail });
    },
    enabled: !isConsultor || isEquipeProdutor ? !!queryEmail : false,
    initialData: [],
  });

  const isLoading = isConsultor && !isEquipeProdutor ? allLicensesLoading : clientLicensesLoading;
  const licenses = isConsultor && !isEquipeProdutor ? consultorLicenses : clientLicenses;

  const useBackend = isConsultor && !isEquipeProdutor;
  const createMutation = useMutation({
    mutationFn: (data) => useBackend
      ? base44.functions.invoke('managePropertyRecord', { action: 'create', entity_name: 'License', data, email_field: 'owner_email' }).then(r => r.data)
      : base44.entities.License.create(data),
    onSuccess: (createdLicense) => {
      queryClient.invalidateQueries(['licenses']);
      queryClient.invalidateQueries(['licenses-all-consultor']);
      setDialogOpen(false);
      resetForm();
      toast.success('Licença criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro na criação de licença:', error);
      toast.error('Erro ao criar licença: ' + (error?.message || ''));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => useBackend
      ? base44.functions.invoke('managePropertyRecord', { action: 'update', entity_name: 'License', id, data, email_field: 'owner_email' }).then(r => r.data)
      : base44.entities.License.update(id, data),
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries(['licenses']);
      queryClient.invalidateQueries(['licenses-all-consultor']);
      setSelectedLicense(prev => prev?.id === id ? { ...prev, ...data } : prev);
    },
    onError: (error) => {
      console.error('Erro na mutação de atualização:', error);
      toast.error('Erro ao atualizar licença: ' + (error?.message || ''));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (license) => {
      const licenseId = typeof license === 'string' ? license : license.id;
      const payload = {
        license_id: licenseId,
        property_id: typeof license === 'object' ? license.property_id : undefined,
        consultor_email: effectiveEmail || user?.email,
        owner_email: typeof license === 'object' ? license.owner_email : undefined,
        license_label: typeof license === 'object'
          ? `${license.license_type}${license.license_number ? ' Nº ' + license.license_number : ''}`
          : undefined,
      };
      return base44.functions.invoke('deleteLicenseCascade', payload).then(r => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['licenses']);
      queryClient.invalidateQueries(['licenses-all-consultor']);
      queryClient.invalidateQueries(['licenseChecklist']);
      toast.success('Licença removida com sucesso! Checklist e interações do CRM também foram limpos.');
    },
    onError: (error) => {
      toast.error('Erro ao remover licença: ' + (error?.message || ''));
    },
  });

  const resetForm = () => {
    const defaultPropertyId = allProperties.length > 0 ? allProperties[0].id : '';
    const freshFormData = {
      property_id: defaultPropertyId,
      license_type: '',
      other_license_description: '',
      license_number: '',
      elaboration_stage: 'Em Elaboração',
      issue_date: '',
      expiry_date: '',
      renewal_required: false,
      renewal_days_before: 120,
      conditions: [],
      documents: [],
    };
    setFormData(freshFormData);
    setInitialFormData(freshFormData);
    setNewCondition('');
    setDocType('Licença Principal');
  };

  const openEditDialog = (license) => {
    setSelectedLicense(license);
    const editFormData = {
      property_id: license.property_id || '',
      license_type: license.license_type || '',
      other_license_description: license.other_license_description || '',
      license_number: license.license_number || '',
      elaboration_stage: license.elaboration_stage || 'Em Elaboração',
      issue_date: license.issue_date || '',
      expiry_date: license.expiry_date || '',
      renewal_required: license.renewal_required || false,
      renewal_days_before: license.renewal_days_before || 120,
      conditions: license.conditions || [],
      documents: license.documents || [],
    };
    setFormData(editFormData);
    setInitialFormData(editFormData);
    setNewCondition('');
    setNewConditionDueDate('');
    setDocType('Licença Principal');
    setEditDialogOpen(true);
  };

  const handleSupabaseUpload = (filePath, fileName) => {
    const newDoc = {
      name: fileName,
      url: filePath,
      type: docType,
      uploaded_by: user.email,
      uploaded_date: new Date().toISOString()
    };
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, newDoc]
    }));
    toast.success('Documento adicionado!');
  };

  const removeDocument = (index) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index)
    });
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      const conditionObj = {
        text: newCondition.trim(),
        due_date: newConditionDueDate || null
      };
      setFormData({
        ...formData,
        conditions: [...formData.conditions, conditionObj],
      });
      setNewCondition('');
      setNewConditionDueDate('');
    }
  };

  const removeCondition = (index) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  // Simplificado: conditions são apenas strings
  const getCondText = (cond) => typeof cond === 'string' ? cond : (cond?.text || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validação
    if (!formData.property_id) {
      toast.error('Selecione uma propriedade');
      return;
    }
    if (!formData.license_type) {
      toast.error('Selecione o tipo de licença');
      return;
    }
    
    const submitData = {
      property_id: formData.property_id,
      license_type: formData.license_type,
      other_license_description: formData.other_license_description,
      license_number: formData.license_number,
      elaboration_stage: formData.elaboration_stage,
      issue_date: formData.issue_date,
      expiry_date: formData.expiry_date,
      renewal_required: formData.renewal_required,
      renewal_days_before: formData.renewal_days_before,
      conditions: formData.conditions && formData.conditions.length > 0 ? formData.conditions : [],
      documents: formData.documents && formData.documents.length > 0 ? formData.documents : [],
      owner_email: effectiveEmail || user?.email,
    };
    
    console.log('Enviando licença com condicionantes:', submitData);
    createMutation.mutate(submitData, {
      onError: (error) => {
        toast.error('Erro ao criar licença: ' + error.message);
      }
    });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const updateData = {
      property_id: formData.property_id,
      license_type: formData.license_type,
      other_license_description: formData.other_license_description,
      license_number: formData.license_number,
      elaboration_stage: formData.elaboration_stage,
      issue_date: formData.issue_date,
      expiry_date: formData.expiry_date,
      renewal_required: formData.renewal_required,
      renewal_days_before: formData.renewal_days_before,
      conditions: formData.conditions && formData.conditions.length > 0 ? formData.conditions : [],
      documents: formData.documents && formData.documents.length > 0 ? formData.documents : [],
    };
    
    console.log('Atualizando licença com condicionantes:', updateData);
    
    updateMutation.mutate(
      { id: selectedLicense.id, data: updateData },
      {
        onSuccess: () => {
          setEditDialogOpen(false);
          resetForm();
          toast.success('Licença atualizada com sucesso!');
        },
        onError: (error) => {
          toast.error('Erro ao atualizar licença: ' + error.message);
        }
      }
    );
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
      <Link
        to={createPageUrl('PropertyCentral')}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-medium"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>

      {/* Consultor Selector */}
      {isConsultor && !isClientConsultor && (
        <ConsultorPropertySelector
          properties={allProperties}
          selectedPropertyId={consultorPropertyId}
          onSelect={setConsultorPropertyId}
          isLoading={propertiesLoading}
        />
      )}

      {/* Infográfico geral de licenças — visível para consultor/equipe consultor */}
      {isConsultor && !isClientConsultor && allConsultorLicenses.length > 0 && (
        <LicenseStatusInfographic
          allLicenses={allConsultorLicenses}
          allProperties={allProperties}
          activeFilter={statusFilter}
          onFilterSelect={(key) => setStatusFilter(key)}
          onSelectProperty={(propId) => {
            setConsultorPropertyId(propId);
            setStatusFilter(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Produtor Property Selector */}
      {!isConsultor && allProperties.length > 1 && (
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
          <span className="text-gray-700 font-medium whitespace-nowrap">Propriedade ou Empreendimento:</span>
          <Select value={formData.property_id} onValueChange={(v) => setFormData({ ...formData, property_id: v })}>
            <SelectTrigger className="w-full sm:w-96 bg-emerald-50 border-emerald-200">
              <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
              {allProperties.map(prop => (
              <SelectItem key={prop.id} value={prop.id}>
                {prop.property_name} - {prop.city}/{prop.state}
              </SelectItem>
              ))}
              </SelectContent>
              </Select>
              </div>
              )}

      {/* Back Link */}
      <Link
        to={createPageUrl('PropertyCentral')}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-medium"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 bg-clip-text text-transparent">Licenças e Documentos Técnicos</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Gerencie licenças, ARTs, laudos e documentos técnicos</p>
        </div>
        <div className="flex gap-2">
          {isConsultor && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(createPageUrl('ChecklistTemplates'))}
              className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <ClipboardList className="w-4 h-4" /> Modelos de Checklist
            </Button>
          )}
        {canEdit && <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!open && isFormDirty) {
            const confirmed = window.confirm('Você tem alterações não salvas. Deseja fechar sem salvar?');
            if (!confirmed) return;
          }
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Licença ou Projeto</DialogTitle>
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
                    {allProperties.map(prop => (
                      <SelectItem key={prop.id} value={prop.id}>
                        {prop.property_name} - {prop.city || 'N/A'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fase *</Label>
                <Select
                  value={formData.elaboration_stage}
                  onValueChange={(v) => setFormData({ ...formData, elaboration_stage: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em Elaboração">Em Elaboração</SelectItem>
                    <SelectItem value="Emitida">Emitida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Licença ou Projeto</Label>
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
                  <Label>Número</Label>
                  <Input
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    placeholder="Ex: 001/2024"
                  />
                </div>
              </div>

              {formData.license_type === 'Outro' && (
                <div className="space-y-2">
                  <Label>Descrição da Natureza da Licença *</Label>
                  <Input
                    value={formData.other_license_description}
                    onChange={(e) => setFormData({ ...formData, other_license_description: e.target.value })}
                    placeholder="Ex: Licença de Pesca, Autorização de Supressão Vegetal..."
                    required
                  />
                </div>
              )}

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


              {formData.expiry_date && (
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900 text-sm">Esta licenca exige renovacao?</p>
                      <p className="text-xs text-blue-700 mt-0.5">LP, LO, LAS e Outorgas geralmente precisam de protocolo antecipado</p>
                    </div>
                    <Switch checked={formData.renewal_required || false} onCheckedChange={(v) => setFormData({ ...formData, renewal_required: v })} />
                  </div>
                  {formData.renewal_required && (
                    <div className="space-y-2 pt-1">
                      <p className="text-sm font-medium text-blue-900">Alertar para protocolar com quantos dias de antecedencia?</p>
                      <div className="flex flex-wrap gap-2">
                        {[180, 120, 90, 60, 30].map(days => (
                          <button key={days} type="button"
                            onClick={() => setFormData({ ...formData, renewal_days_before: days })}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${(formData.renewal_days_before || 120) === days ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                            {days} dias
                          </button>
                        ))}
                      </div>
                      {(() => {
                        const d = new Date(formData.expiry_date);
                        d.setDate(d.getDate() - (formData.renewal_days_before || 120));
                        return <p className="text-xs text-blue-700">Alerta de renovacao previsto para: <strong>{d.toLocaleDateString("pt-BR")}</strong></p>;
                      })()}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Condicionantes</Label>
                <div className="space-y-2">
                  <Input
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder="Descrição da condicionante"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                  />
                  <div className="space-y-2">
                    <Label className="text-xs">Data de Cumprimento (opcional)</Label>
                    <Input
                      type="date"
                      value={newConditionDueDate}
                      onChange={(e) => setNewConditionDueDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="button" variant="outline" onClick={addCondition} className="flex-1">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
                {formData.conditions.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {formData.conditions.map((cond, idx) => {
                      const condText = typeof cond === 'string' ? cond : (cond?.text || '');
                      const condDueDate = typeof cond === 'string' ? null : (cond?.due_date || null);
                      return (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm">{condText}</p>
                            {condDueDate && (
                              <p className="text-xs text-gray-500">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {format(parseISO(condDueDate), "dd/MM/yyyy")}
                              </p>
                            )}
                          </div>
                          <button type="button" onClick={() => removeCondition(idx)} className="text-red-500 hover:text-red-700 flex-shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Documentos</Label>
                <div className="space-y-2">
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
                  <R2FileUpload
                   folder="licencas"
                   accept=".pdf,.jpg,.jpeg,.png"
                   label="Selecionar Arquivo (PDF, JPG, PNG)"
                   onUploadDone={handleSupabaseUpload}
                  />
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
                        <button type="button" onClick={() => removeDocument(idx)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>}
        </div>
      </div>

      {/* Licenses Grid */}
      {isConsultor && !isClientConsultor && !consultorPropertyId ? (
        <Card className="border-dashed border-2 border-amber-200">
          <CardContent className="py-16 text-center">
            <FileCheck className="w-16 h-16 mx-auto text-amber-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Selecione uma propriedade</h3>
            <p className="text-gray-500 mt-2">Escolha a propriedade acima para visualizar as licenças</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {(licenses || []).filter(license => {
            if (!statusFilter) return true;
            if (!license.expiry_date) return statusFilter === 'vigente';
            const days = differenceInDays(parseISO(license.expiry_date), new Date());
            if (statusFilter === 'vencida') return days < 0;
            if (statusFilter === 'a_vencer') return days >= 0 && days <= (license.renewal_days_before || 90);
            if (statusFilter === 'vigente') return days > 90;
            return true;
          }).map((license) => {
            const statusInfo = getLicenseStatus(license);
            const StatusIcon = statusInfo.icon || Clock;
            return (
              <Card key={license.id} className="hover:shadow-lg transition-all duration-300 border-emerald-100 hover:border-emerald-200">
                <CardHeader className="pb-2 sm:pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                        statusInfo.status === 'expired' ? 'bg-red-100' :
                        statusInfo.status === 'warning' ? 'bg-amber-100' : 'bg-emerald-100'
                      }`}>
                        <FileCheck className={`w-5 h-5 sm:w-6 sm:h-6 ${
                          statusInfo.status === 'expired' ? 'text-red-600' :
                          statusInfo.status === 'warning' ? 'text-amber-600' : 'text-emerald-600'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{license.license_type}</CardTitle>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{license.license_number || 'Sem número'}</p>
                        <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${license.elaboration_stage === 'Emitida' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {license.elaboration_stage || 'Em Elaboração'}
                        </span>
                      </div>
                    </div>
                    <Badge className={`${statusInfo.color} flex-shrink-0 border-2 border-current whitespace-nowrap`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      <span className="text-xs sm:text-sm font-semibold">{statusInfo.label}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Validade: {license.expiry_date ? format(parseISO(license.expiry_date), "dd/MM/yyyy") : 'Não informada'}</span>
                    </div>

                    {license.conditions && license.conditions.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5 font-medium">Condicionantes:</p>
                        <div className="space-y-1">
                          {license.conditions.slice(0, 2).map((cond, idx) => {
                            const text = typeof cond === 'string' ? cond : (cond?.text || '');
                            const dueDate = typeof cond === 'string' ? null : (cond?.due_date || null);
                            return (
                              <div key={idx} className="text-xs text-gray-600 bg-gray-50 p-1.5 sm:p-2 rounded">
                                <p className="line-clamp-2">• {text}</p>
                                {dueDate && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    <Calendar className="w-2.5 h-2.5 inline mr-1" />
                                    {format(parseISO(dueDate), "dd/MM/yyyy")}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                          {license.conditions.length > 2 && (
                            <p className="text-xs text-emerald-600 font-medium">+{license.conditions.length - 2} mais</p>
                          )}
                        </div>
                      </div>
                    )}

                    {license.documents && license.documents.length > 0 && (
                      <div className="mb-2 sm:mb-3">
                        <p className="text-xs text-gray-500 mb-1.5 font-medium">Documentos ({license.documents.length}):</p>
                        <div className="space-y-1">
                          {license.documents.slice(0, 2).map((doc, idx) => (
                            <div key={idx} className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-gray-50 rounded text-xs hover:bg-gray-100 transition-colors group">
                              <FileText className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                              <span className="flex-1 truncate">{doc.name}</span>
                              <R2FileLink filePath={doc.url} label="Ver" mode="view" asLink={true} />
                            </div>
                          ))}
                          {license.documents.length > 2 && (
                            <p className="text-xs text-emerald-600 font-medium pl-0 sm:pl-2">+{license.documents.length - 2} mais</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-1 sm:gap-2 pt-2 sm:pt-3">
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(license)}
                          className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
                        >
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          <span className="hidden sm:inline">Editar</span>
                          <span className="sm:hidden">Edit</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLicense(license);
                          setShowHistory(true);
                        }}
                        className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 text-xs sm:text-sm"
                      >
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden sm:inline">Histórico</span>
                        <span className="sm:hidden">Hist</span>
                      </Button>
                      {isConsultor && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLicense(license);
                            setShowChecklist(true);
                          }}
                          className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs sm:text-sm"
                        >
                          <ClipboardList className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          <span className="hidden sm:inline">Checklist</span>
                          <span className="sm:hidden">Check</span>
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 sm:px-3"
                          onClick={() => {
                            if (window.confirm('Deseja realmente excluir esta licença? O checklist associado e as interações do CRM geradas por ele também serão removidas.')) {
                              deleteMutation.mutate(license);
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
      )}

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        if (!open && isFormDirty) {
          const confirmed = window.confirm('Você tem alterações não salvas. Deseja fechar sem salvar?');
          if (!confirmed) return;
        }
        setEditDialogOpen(open);
        if (!open) resetForm();
      }}>
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
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                   {allProperties.map(prop => (
                     <SelectItem key={prop.id} value={prop.id}>
                       {prop.property_name} - {prop.city || 'N/A'}
                     </SelectItem>
                   ))}
                 </SelectContent>
                </Select>
                </div>

                <div className="space-y-2">
                <Label>Fase *</Label>
                <Select
                 value={formData.elaboration_stage}
                onValueChange={(v) => setFormData({ ...formData, elaboration_stage: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em Elaboração">Em Elaboração</SelectItem>
                  <SelectItem value="Emitida">Emitida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Licença ou Projeto</Label>
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
                <Label>Número</Label>
                <Input
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  placeholder="Ex: 001/2024"
                />
              </div>
            </div>

            {formData.license_type === 'Outro' && (
              <div className="space-y-2">
                <Label>Descrição da Natureza da Licença *</Label>
                <Input
                  value={formData.other_license_description}
                  onChange={(e) => setFormData({ ...formData, other_license_description: e.target.value })}
                  placeholder="Ex: Licença de Pesca, Autorização de Supressão Vegetal..."
                  required
                />
              </div>
            )}

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
              <div className="space-y-2">
                <Input
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  placeholder="Descrição da condicionante"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                />
                <div className="space-y-2">
                  <Label className="text-xs">Data de Cumprimento (opcional)</Label>
                  <Input
                    type="date"
                    value={newConditionDueDate}
                    onChange={(e) => setNewConditionDueDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button type="button" variant="outline" onClick={addCondition} className="flex-1">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>
              {formData.conditions.length > 0 && (
                <div className="space-y-2 mt-2">
                  {formData.conditions.map((cond, idx) => {
                    const condText = typeof cond === 'string' ? cond : (cond?.text || '');
                    const condDueDate = typeof cond === 'string' ? null : (cond?.due_date || null);
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm">{condText}</p>
                          {condDueDate && (
                            <p className="text-xs text-gray-500">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {format(parseISO(condDueDate), "dd/MM/yyyy")}
                            </p>
                          )}
                        </div>
                        <button type="button" onClick={() => removeCondition(idx)} className="text-red-500 hover:text-red-700 flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Documentos</Label>
              <div className="space-y-2">
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
                <R2FileUpload
                  folder="licencas"
                  accept=".pdf,.jpg,.jpeg,.png"
                  label="Selecionar Arquivo (PDF, JPG, PNG)"
                  onUploadDone={handleSupabaseUpload}
                />
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
                      <button type="button" onClick={() => removeDocument(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
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

      {/* Dialog de Checklist */}
      <Dialog open={showChecklist} onOpenChange={setShowChecklist}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              Checklist — {selectedLicense?.license_type} {selectedLicense?.license_number}
            </DialogTitle>
          </DialogHeader>
          {selectedLicense && (
            <LicenseChecklistPanel license={selectedLicense} user={user} />
          )}
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
                onDeleteUpdate={(index, deletedUpdate) => {
                 const newUpdates = [...(selectedLicense.updates || [])];
                 newUpdates[index] = deletedUpdate;
                 const updatedLicense = {
                   ...selectedLicense,
                   updates: newUpdates
                 };
                 updateMutation.mutate({ id: selectedLicense.id, data: updatedLicense });
                 setSelectedLicense(updatedLicense);
                 toast.success('Andamento excluído e registrado na auditoria.');
                }}
                />
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}