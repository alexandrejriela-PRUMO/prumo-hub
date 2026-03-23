import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList, Plus, Calendar, DollarSign, Users, FileText, AlertTriangle,
  CheckCircle, Clock, XCircle, Edit3, Trash2, Upload, Download, Eye, Building2,
  ChevronLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import ConsultorPropertySelector from '../components/consultor/ConsultorPropertySelector';
import ClicksignContractButton from '../components/contracts/ClicksignContractButton';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

const STATUS_CONFIG = {
  'Proposta':     { color: 'bg-blue-100 text-blue-700 border-blue-200',   icon: Clock },
  'Ativo':        { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  'Em Renovação': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  'Encerrado':    { color: 'bg-gray-100 text-gray-600 border-gray-200',    icon: CheckCircle },
  'Cancelado':    { color: 'bg-red-100 text-red-700 border-red-200',       icon: XCircle },
};

const EMPTY_FORM = {
  property_id: '',
  client_email: '',
  client_name: '',
  contract_number: '',
  contract_type: 'Prestação de Serviços Ambientais',
  object: '',
  start_date: '',
  end_date: '',
  status: 'Proposta',
  total_value: '',
  payment_terms: '',
  alert_days_before_expiry: 30,
  parties: [],
  services_linked: [],
  documents: [],
  notes: '',
};

export default function Contracts() {
  const { user, effectiveEmail, isEquipe, isConsultor: isConsultorHook, isLoading: effectiveLoading } = useEffectiveUser();
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [viewingContract, setViewingContract] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [newParty, setNewParty] = useState({ name: '', role: 'Contratante', document: '', address: '' });
  const [newService, setNewService] = useState({ name: '', value: '', status: 'Em Andamento' });
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const isConsultor = isConsultorHook || isEquipe;

  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', effectiveEmail, isConsultor],
    queryFn: () => isConsultor
      ? base44.entities.Property.filter({ consultor_email: effectiveEmail })
      : base44.entities.Property.filter({ owner_email: effectiveEmail }),
    enabled: !!effectiveEmail && !effectiveLoading,
  });

  // For CRM data to auto-fill client info
  const { data: crmList = [] } = useQuery({
    queryKey: ['crm-all', user?.email],
    queryFn: async () => {
      if (!properties.length) return [];
      const results = await Promise.all(
        properties.map(p => base44.entities.ClientCRM.filter({ property_id: p.id }))
      );
      return results.flat();
    },
    enabled: !!user?.email && properties.length > 0,
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', effectiveEmail, selectedPropertyId],
    queryFn: () => isConsultor
      ? selectedPropertyId
        ? base44.entities.ClientContract.filter({ consultor_email: effectiveEmail, property_id: selectedPropertyId })
        : base44.entities.ClientContract.filter({ consultor_email: effectiveEmail })
      : base44.entities.ClientContract.filter({ client_email: effectiveEmail }),
    enabled: !!effectiveEmail && !effectiveLoading,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientContract.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
      setDialogOpen(false);
      toast.success('Contrato criado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientContract.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
      setDialogOpen(false);
      toast.success('Contrato atualizado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientContract.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
      toast.success('Contrato removido.');
    },
  });

  const openCreate = (propId = null) => {
    const pid = propId || selectedPropertyId || properties[0]?.id || '';
    const prop = properties.find(p => p.id === pid);
    const crm = crmList.find(c => c.property_id === pid);
    setEditingContract(null);
    setFormData({
      ...EMPTY_FORM,
      property_id: pid,
      client_email: prop?.owner_email || crm?.client_email || '',
      client_name: prop?.client_name || prop?.owner_names || '',
      consultor_email: user?.email || '',
    });
    setDialogOpen(true);
  };

  const openEdit = (contract) => {
    setEditingContract(contract);
    setFormData({
      ...contract,
      total_value: contract.total_value?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handlePropertyChange = (pid) => {
    const prop = properties.find(p => p.id === pid);
    setFormData(prev => ({
      ...prev,
      property_id: pid,
      client_email: prop?.owner_email || '',
      client_name: prop?.client_name || prop?.owner_names || '',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      consultor_email: effectiveEmail,
      total_value: formData.total_value ? parseFloat(formData.total_value) : undefined,
    };
    if (editingContract) {
      updateMutation.mutate({ id: editingContract.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const addParty = () => {
    if (!newParty.name) return;
    setFormData(prev => ({ ...prev, parties: [...(prev.parties || []), { ...newParty }] }));
    setNewParty({ name: '', role: 'Contratante', document: '', address: '' });
  };

  const removeParty = (idx) => {
    setFormData(prev => ({ ...prev, parties: prev.parties.filter((_, i) => i !== idx) }));
  };

  const addService = () => {
    if (!newService.name) return;
    setFormData(prev => ({
      ...prev,
      services_linked: [...(prev.services_linked || []), { ...newService, value: parseFloat(newService.value) || 0 }]
    }));
    setNewService({ name: '', value: '', status: 'Em Andamento' });
  };

  const removeService = (idx) => {
    setFormData(prev => ({ ...prev, services_linked: prev.services_linked.filter((_, i) => i !== idx) }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({
      ...prev,
      documents: [...(prev.documents || []), {
        name: file.name, url: file_url, type: 'Contrato Assinado',
        upload_date: new Date().toISOString()
      }]
    }));
    setUploading(false);
    e.target.value = null;
    toast.success('Arquivo enviado!');
  };

  const getExpiryInfo = (contract) => {
    if (!contract.end_date) return null;
    const days = differenceInDays(parseISO(contract.end_date), new Date());
    const alertDays = contract.alert_days_before_expiry || 30;
    if (days < 0) return { label: `Vencido há ${Math.abs(days)}d`, color: 'bg-red-100 text-red-700' };
    if (days <= alertDays) return { label: `Vence em ${days}d`, color: 'bg-amber-100 text-amber-700' };
    return { label: `Válido por ${days}d`, color: 'bg-green-100 text-green-700' };
  };

  const filteredContracts = selectedPropertyId
    ? contracts.filter(c => c.property_id === selectedPropertyId)
    : contracts;

  const totalValue = filteredContracts.reduce((sum, c) => sum + (c.total_value || 0), 0);
  const activeCount = filteredContracts.filter(c => c.status === 'Ativo').length;
  const expiringCount = filteredContracts.filter(c => {
    if (!c.end_date) return false;
    const days = differenceInDays(parseISO(c.end_date), new Date());
    return days >= 0 && days <= (c.alert_days_before_expiry || 30);
  }).length;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <Link
        to={createPageUrl('PropertyCentral')}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-medium"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>

      {/* Consultor Selector */}
      {isConsultor && (
        <ConsultorPropertySelector
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onSelect={setSelectedPropertyId}
          isLoading={propertiesLoading}
          optional={true}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-900 to-emerald-700 bg-clip-text text-transparent flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-emerald-600" />
            Meus Contratos
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Gestão completa de contratos de prestação de serviços</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto" onClick={() => openCreate()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-emerald-600 font-medium">Contratos Ativos</p>
            <p className="text-2xl font-bold text-emerald-800">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-amber-600 font-medium">A Vencer</p>
            <p className="text-2xl font-bold text-amber-800">{expiringCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-blue-600 font-medium">Valor Total</p>
            <p className="text-lg font-bold text-blue-800">
              {totalValue > 0 ? `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contracts List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Carregando contratos...</div>
      ) : filteredContracts.length === 0 ? (
        <Card className="border-dashed border-2 border-emerald-200">
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-14 h-14 mx-auto text-emerald-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-700">Nenhum contrato cadastrado</h3>
            <p className="text-gray-500 mt-1 text-sm">Clique em "Novo Contrato" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContracts.map(contract => {
            const statusCfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG['Proposta'];
            const StatusIcon = statusCfg.icon;
            const expiryInfo = getExpiryInfo(contract);
            const prop = properties.find(p => p.id === contract.property_id);
            return (
              <Card key={contract.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 truncate">{contract.contract_type}</p>
                      <CardTitle className="text-base leading-snug mt-0.5 line-clamp-2">{contract.object}</CardTitle>
                    </div>
                    <Badge className={`${statusCfg.color} border flex-shrink-0 text-xs`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {contract.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {contract.client_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate font-medium">{contract.client_name}</span>
                    </div>
                  )}
                  {prop && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{prop.property_name}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {contract.start_date && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(contract.start_date), 'dd/MM/yy')}
                        {contract.end_date && ` → ${format(parseISO(contract.end_date), 'dd/MM/yy')}`}
                      </span>
                    )}
                  </div>
                  {expiryInfo && (
                    <Badge className={`${expiryInfo.color} text-xs w-fit`}>
                      <Clock className="w-3 h-3 mr-1" />
                      {expiryInfo.label}
                    </Badge>
                  )}
                  {contract.total_value > 0 && (
                    <p className="text-sm font-bold text-emerald-700">
                      R$ {contract.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setViewingContract(contract)}>
                      <Eye className="w-3 h-3 mr-1" />Ver
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs border-emerald-300 text-emerald-700" onClick={() => openEdit(contract)}>
                      <Edit3 className="w-3 h-3 mr-1" />Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 px-2" onClick={() => {
                      if (confirm('Excluir este contrato?')) deleteMutation.mutate(contract.id);
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {isConsultor && (
                    <div className="pt-1">
                      <ClicksignContractButton contract={contract} user={user} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <Tabs defaultValue="basic">
              <TabsList className="grid grid-cols-4 w-full text-xs">
                <TabsTrigger value="basic">Dados</TabsTrigger>
                <TabsTrigger value="parties">Partes</TabsTrigger>
                <TabsTrigger value="services">Serviços</TabsTrigger>
                <TabsTrigger value="docs">Documentos</TabsTrigger>
              </TabsList>

              {/* Basic */}
              <TabsContent value="basic" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Cliente (Propriedade) *</Label>
                    <Select value={formData.property_id} onValueChange={handlePropertyChange}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                      <SelectContent>
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.client_name || p.owner_names || p.property_name} — {p.property_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.client_name && (
                    <div className="col-span-2 flex items-center gap-2 p-2 bg-emerald-50 rounded-lg text-sm">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-800 font-medium">Contratante: {formData.client_name}</span>
                      {formData.client_email && <span className="text-emerald-600 text-xs">({formData.client_email})</span>}
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Tipo de Contrato *</Label>
                    <Select value={formData.contract_type} onValueChange={v => setFormData(p => ({ ...p, contract_type: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[
                          'Prestação de Serviços Ambientais','Assessoria Ambiental','Licenciamento Ambiental',
                          'PRAD - Recuperação de Área Degradada','Georreferenciamento','Mapeamento de Agricultura de Precisão',
                          'CAR / Regularização Fundiária','Consultoria Técnica Rural','Consultoria Agronômica',
                          'Assistência Técnica e Extensão Rural (ATER)','Contrato de Arrendamento Rural',
                          'Contrato de Parceria Agrícola','Contrato de Parceria Pecuária','Contrato de Comodato Rural',
                          'Contrato de Compra e Venda de Imóvel Rural','Contrato de Compra e Venda de Soja',
                          'Contrato de Compra e Venda de Milho','Contrato de Compra e Venda de Boi / Pecuária',
                          'Contrato de Compra e Venda de Algodão','Contrato de Compra de Sementes',
                          'Contrato de Compra de Insumos / Defensivos','Contrato de Compra de Máquinas e Equipamentos',
                          'CPR - Cédula de Produto Rural',
                          'Contrato de Prestação de Serviços de Terraplanagem','Contrato de Prestação de Serviços de Irrigação',
                          'Contrato de Prestação de Serviços de Colheita','Contrato de Prestação de Serviços de Pulverização',
                          'Contrato de Prestação de Serviços de Transporte de Grãos','Contrato de Terceirização de Serviços Rurais',
                          'Contrato de Trabalho Rural (CLT)','Contrato de Trabalho Rural (Temporário)',
                          'Contrato de Honorários Advocatícios','Contrato de Honorários Contábeis',
                          'Contrato de Gestão Financeira','Contrato de Seguro Rural','Contrato de Seguro de Máquinas',
                          'Contrato de Compra e Venda de Arroz','Contrato de Compra e Venda de Trigo',
                          'Contrato de Compra e Venda de Canola',
                          'Contrato de Armazenagem de Grãos','Contrato de Rastreabilidade / Certificação','Outro'
                        ].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Nº do Contrato</Label>
                    <Input className="mt-1 h-9 text-sm" value={formData.contract_number}
                      onChange={e => setFormData(p => ({ ...p, contract_number: e.target.value }))}
                      placeholder="Ex: 001/2025" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Objeto do Contrato *</Label>
                    <Textarea className="mt-1 text-sm" value={formData.object}
                      onChange={e => setFormData(p => ({ ...p, object: e.target.value }))}
                      placeholder="Descreva o objeto e finalidade do contrato..."
                      rows={3} required />
                  </div>
                  <div>
                    <Label className="text-xs">Data de Início *</Label>
                    <Input type="date" className="mt-1 h-9 text-sm" value={formData.start_date}
                      onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} required />
                  </div>
                  <div>
                    <Label className="text-xs">Data de Término</Label>
                    <Input type="date" className="mt-1 h-9 text-sm" value={formData.end_date}
                      onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Valor Total (R$)</Label>
                    <Input type="number" step="0.01" className="mt-1 h-9 text-sm" value={formData.total_value}
                      onChange={e => setFormData(p => ({ ...p, total_value: e.target.value }))}
                      placeholder="0,00" />
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Proposta','Ativo','Em Renovação','Encerrado','Cancelado'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Alertar X dias antes do vencimento</Label>
                    <Input type="number" min="1" className="mt-1 h-9 text-sm" value={formData.alert_days_before_expiry}
                      onChange={e => setFormData(p => ({ ...p, alert_days_before_expiry: parseInt(e.target.value) || 30 }))} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Condições de Pagamento</Label>
                    <Input className="mt-1 h-9 text-sm" value={formData.payment_terms}
                      onChange={e => setFormData(p => ({ ...p, payment_terms: e.target.value }))}
                      placeholder="Ex: 50% na assinatura, 50% na entrega" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Observações</Label>
                    <Textarea className="mt-1 text-sm" value={formData.notes}
                      onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} />
                  </div>
                </div>
              </TabsContent>

              {/* Parties */}
              <TabsContent value="parties" className="space-y-3 mt-4">
                <p className="text-sm font-medium text-gray-700">Partes do Contrato</p>
                {(formData.parties || []).length > 0 && (
                  <div className="space-y-2">
                    {(formData.parties || []).map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="text-sm font-semibold">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.role}{p.document && ` · ${p.document}`}</p>
                          {p.address && <p className="text-xs text-gray-400">{p.address}</p>}
                        </div>
                        <button type="button" onClick={() => removeParty(i)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-3 border border-dashed border-emerald-300 rounded-lg bg-emerald-50/30 space-y-2">
                  <p className="text-xs font-medium text-emerald-700">Adicionar parte</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input className="h-8 text-sm" placeholder="Nome completo *" value={newParty.name}
                      onChange={e => setNewParty(p => ({ ...p, name: e.target.value }))} />
                    <Select value={newParty.role} onValueChange={v => setNewParty(p => ({ ...p, role: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Contratante','Contratado','Testemunha','Fiador','Interveniente'].map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input className="h-8 text-sm" placeholder="CPF/CNPJ" value={newParty.document}
                      onChange={e => setNewParty(p => ({ ...p, document: e.target.value }))} />
                    <Input className="h-8 text-sm" placeholder="Endereço" value={newParty.address}
                      onChange={e => setNewParty(p => ({ ...p, address: e.target.value }))} />
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addParty}
                    className="border-emerald-500 text-emerald-700 hover:bg-emerald-50">
                    <Plus className="w-3 h-3 mr-1" /> Adicionar Parte
                  </Button>
                </div>
              </TabsContent>

              {/* Services */}
              <TabsContent value="services" className="space-y-3 mt-4">
                <p className="text-sm font-medium text-gray-700">Serviços Vinculados ao Contrato</p>
                {(formData.services_linked || []).length > 0 && (
                  <div className="space-y-2">
                    {(formData.services_linked || []).map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="text-sm font-semibold">{s.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {s.value > 0 && <span className="text-xs font-bold text-emerald-700">R$ {Number(s.value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>}
                            <Badge variant="outline" className="text-xs">{s.status}</Badge>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeService(i)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-3 border border-dashed border-emerald-300 rounded-lg bg-emerald-50/30 space-y-2">
                  <p className="text-xs font-medium text-emerald-700">Adicionar serviço</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Input className="h-8 text-sm col-span-2" placeholder="Nome do serviço *" value={newService.name}
                      onChange={e => setNewService(p => ({ ...p, name: e.target.value }))} />
                    <Input type="number" className="h-8 text-sm" placeholder="Valor R$" value={newService.value}
                      onChange={e => setNewService(p => ({ ...p, value: e.target.value }))} />
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addService}
                    className="border-emerald-500 text-emerald-700 hover:bg-emerald-50">
                    <Plus className="w-3 h-3 mr-1" /> Adicionar Serviço
                  </Button>
                </div>
              </TabsContent>

              {/* Documents */}
              <TabsContent value="docs" className="space-y-3 mt-4">
                <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700">{uploading ? 'Enviando...' : 'Clique para anexar documento'}</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                </label>
                {(formData.documents || []).length > 0 && (
                  <div className="space-y-2">
                    {(formData.documents || []).map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <p className="text-sm font-medium">{doc.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">
                            <Download className="w-4 h-4" />
                          </a>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, documents: prev.documents.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 justify-end pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingContract ? 'Salvar Alterações' : 'Criar Contrato'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewingContract && (
        <Dialog open={!!viewingContract} onOpenChange={() => setViewingContract(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-600" />
                {viewingContract.contract_type}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={`${STATUS_CONFIG[viewingContract.status]?.color} border`}>{viewingContract.status}</Badge>
                {viewingContract.contract_number && <span className="text-sm text-gray-500">Nº {viewingContract.contract_number}</span>}
                {getExpiryInfo(viewingContract) && (
                  <Badge className={`${getExpiryInfo(viewingContract).color} text-xs`}>
                    {getExpiryInfo(viewingContract).label}
                  </Badge>
                )}
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Objeto</p>
                <p className="text-sm text-gray-800">{viewingContract.object}</p>
              </div>
              {viewingContract.client_name && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">{viewingContract.client_name}</p>
                    {viewingContract.client_email && <p className="text-xs text-emerald-600">{viewingContract.client_email}</p>}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {viewingContract.start_date && (
                  <div><p className="text-xs text-gray-500">Início</p><p className="font-semibold">{format(parseISO(viewingContract.start_date), 'dd/MM/yyyy')}</p></div>
                )}
                {viewingContract.end_date && (
                  <div><p className="text-xs text-gray-500">Término</p><p className="font-semibold">{format(parseISO(viewingContract.end_date), 'dd/MM/yyyy')}</p></div>
                )}
                {viewingContract.total_value > 0 && (
                  <div><p className="text-xs text-gray-500">Valor Total</p><p className="font-bold text-emerald-700">R$ {viewingContract.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                )}
                {viewingContract.payment_terms && (
                  <div><p className="text-xs text-gray-500">Pagamento</p><p className="font-semibold">{viewingContract.payment_terms}</p></div>
                )}
              </div>
              {(viewingContract.parties || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1"><Users className="w-3.5 h-3.5" />Partes</p>
                  <div className="space-y-2">
                    {viewingContract.parties.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm">
                        <Badge variant="outline" className="text-xs flex-shrink-0">{p.role}</Badge>
                        <span className="font-medium">{p.name}</span>
                        {p.document && <span className="text-gray-500">{p.document}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(viewingContract.services_linked || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Serviços Vinculados</p>
                  <div className="space-y-1">
                    {viewingContract.services_linked.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <span>{s.name}</span>
                        {s.value > 0 && <span className="font-bold text-emerald-700">R$ {Number(s.value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(viewingContract.documents || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Documentos</p>
                  <div className="space-y-2">
                    {viewingContract.documents.map((doc, i) => (
                      <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm text-emerald-700">
                        <FileText className="w-4 h-4" />
                        <span className="flex-1">{doc.name}</span>
                        <Download className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {viewingContract.notes && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Observações</p>
                  <p className="text-sm text-gray-700">{viewingContract.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t flex-wrap">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => { openEdit(viewingContract); setViewingContract(null); }}>
                  <Edit3 className="w-4 h-4 mr-2" />Editar
                </Button>
                {isConsultor && (
                  <ClicksignContractButton contract={viewingContract} user={user} />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}