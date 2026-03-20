import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Scale,
  Plus,
  Calendar,
  FileText,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Pause,
  Archive,
  Trash2,
  MapPin,
  DollarSign,
  ChevronLeft,
  Radio,
  RefreshCw } from
'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProcessHistory from '../components/history/ProcessHistory';
import ConsultorPropertySelector from '../components/consultor/ConsultorPropertySelector';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

export default function Processes() {
  const { effectiveEmail, userType, loading: effectiveLoading } = useEffectiveUser();
  const [user, setUser] = useState(null);
  const [consultorPropertyId, setConsultorPropertyId] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [formData, setFormData] = useState({
    property_id: '',
    process_type: 'Administrativo',
    process_number: '',
    parties: '',
    subject: '',
    filing_date: '',
    status: 'Em Andamento',
    notes: '',
    updates: [],
    fine_value: '',
    location: ''
  });

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

  const isConsultorFamily = userType === 'consultor' || userType === 'equipe';

  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', effectiveEmail, userType],
    queryFn: () => isConsultorFamily
      ? base44.entities.Property.filter({ consultor_email: effectiveEmail })
      : base44.entities.Property.filter({ owner_email: effectiveEmail }),
    enabled: !!effectiveEmail
  });

  const { data: processes, isLoading } = useQuery({
    queryKey: ['processes', effectiveEmail, consultorPropertyId],
    queryFn: () => isConsultorFamily
      ? base44.entities.Process.filter({ property_id: consultorPropertyId })
      : base44.entities.Process.filter({ client_email: effectiveEmail }),
    enabled: isConsultorFamily ? !!consultorPropertyId : !!effectiveEmail,
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Process.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      setShowDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Process.update(id, data),
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      // Atualiza selectedProcess em tempo real para o histórico aparecer sem sair da aba
      setSelectedProcess((prev) => prev?.id === id ? { ...prev, ...data } : prev);
      setShowDialog(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Process.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    }
  });

  const resetForm = () => {
    setFormData({
      property_id: properties.length > 0 ? properties[0].id : '',
      process_type: 'Administrativo',
      process_number: '',
      parties: '',
      subject: '',
      filing_date: '',
      status: 'Em Andamento',
      notes: '',
      updates: [],
      fine_value: '',
      location: ''
    });
    setEditingProcess(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      client_email: user.email,
      fine_value: formData.fine_value !== '' ? parseFloat(formData.fine_value) : undefined
    };

    if (editingProcess) {
      updateMutation.mutate({ id: editingProcess.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (process) => {
    setEditingProcess(process);
    setFormData({
      property_id: process.property_id || '',
      process_type: process.process_type,
      process_number: process.process_number,
      parties: process.parties || '',
      subject: process.subject,
      filing_date: process.filing_date || '',
      status: process.status,
      notes: process.notes || '',
      updates: process.updates || [],
      fine_value: process.fine_value || '',
      location: process.location || ''
    });
    setShowDialog(true);
  };

  const statusConfig = {
    'Em Andamento': { icon: Clock, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    'Suspenso': { icon: Pause, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    'Arquivado': { icon: Archive, color: 'bg-gray-100 text-gray-700 border-gray-200' },
    'Finalizado': { icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-200' }
  };

  const typeConfig = {
    'Administrativo': { color: 'bg-purple-100 text-purple-700 border-purple-200' },
    'Civil': { color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    'Criminal': { color: 'bg-red-100 text-red-700 border-red-200' }
  };

  const [selectedProcess, setSelectedProcess] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const handleScanDOE = async () => {
    setScanLoading(true);
    setScanResult(null);
    const response = await base44.functions.invoke('checkDOEInfracoes', {});
    setScanResult(response.data);
    setScanLoading(false);
    if (response.data?.matches_found > 0) {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    }
  };

  const ProcessCard = ({ process }) => {
    const StatusIcon = statusConfig[process.status]?.icon || AlertCircle;

    return (
      <Card className="border-emerald-100 hover:shadow-lg transition-shadow">
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <Badge className={`${typeConfig[process.process_type]?.color} border font-semibold text-xs sm:text-sm`}>
                  {process.process_type}
                </Badge>
                <Badge className={`${statusConfig[process.status]?.color} border text-xs sm:text-sm`}>
                  <StatusIcon className="w-3 h-3 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">{process.status}</span>
                  <span className="sm:hidden">{process.status.substring(0, 6)}</span>
                </Badge>
              </div>
              <CardTitle className="text-base sm:text-lg text-gray-900 break-all">
                {process.process_number}
              </CardTitle>
            </div>
            <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedProcess(process);
                  setShowHistory(true);
                }}
                className="flex-1 sm:flex-none border-blue-300 text-blue-700 hover:bg-blue-50 text-xs sm:text-sm">
                
                <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1" />
                <span className="hidden sm:inline">Histórico</span>
                <span className="sm:hidden">Hist.</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(process)}
                className="flex-1 sm:flex-none border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs sm:text-sm">
                
                <span className="hidden sm:inline">Editar</span>
                <span className="sm:hidden">Ed.</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm('Deseja realmente excluir este processo?')) {
                    deleteMutation.mutate(process.id);
                  }
                }}
                className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50">
                
                <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="space-y-2 sm:space-y-3">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">Matéria</p>
              <p className="text-gray-900 text-sm">{process.subject}</p>
            </div>
            
            {process.location &&
            <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Localização</p>
                  <p className="text-sm text-gray-600">{process.location}</p>
                </div>
              </div>
            }

            {process.fine_value &&
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <DollarSign className="w-4 h-4 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-700">
                    {process.process_type === 'Civil' ? 'Valor da Indenização Ambiental' : 'Valor da Multa Arbitrada'}
                  </p>
                  <p className="text-lg font-bold text-red-800">
                    {Number(process.fine_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
            }

            {process.parties &&
            <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Partes</p>
                  <p className="text-sm text-gray-600">{process.parties}</p>
                </div>
              </div>
            }
            
            {process.filing_date &&
            <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Data de Propositura</p>
                  <p className="text-sm text-gray-600">
                    {format(parseISO(process.filing_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            }

            {process.updates && process.updates.length > 0 &&
            <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Andamentos Recentes ({process.updates.length})
                </p>
                <div className="space-y-2">
                  {process.updates.slice(-3).reverse().map((update, idx) =>
                <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">
                        {update.date && format(parseISO(update.date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-gray-700">{update.description}</p>
                    </div>
                )}
                </div>
              </div>
            }
          </div>
        </CardContent>
      </Card>);

  };

  const ProcessForm = () =>
  <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Propriedade *</Label>
        <Select
        value={formData.property_id}
        onValueChange={(value) => setFormData({ ...formData, property_id: value })}
        required>
        
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((prop) =>
          <SelectItem key={prop.id} value={prop.id}>
                {prop.property_name} - {prop.city || 'N/A'}
              </SelectItem>
          )}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Tipo de Processo *</Label>
        <Select
        value={formData.process_type}
        onValueChange={(value) => setFormData({ ...formData, process_type: value })}>
        
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Administrativo">Administrativo</SelectItem>
            <SelectItem value="Civil">Civil</SelectItem>
            <SelectItem value="Criminal">Criminal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Número do Processo *</Label>
        <Input
        value={formData.process_number}
        onChange={(e) => setFormData({ ...formData, process_number: e.target.value })}
        placeholder="Ex: 0000000-00.0000.0.00.0000"
        required />
      
      </div>

      <div>
        <Label>Matéria/Assunto *</Label>
        <Input
        value={formData.subject}
        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
        placeholder="Ex: Infração ambiental - desmatamento"
        required />
      
      </div>

      <div>
        <Label>Partes Envolvidas</Label>
        <Input
        value={formData.parties}
        onChange={(e) => setFormData({ ...formData, parties: e.target.value })}
        placeholder="Ex: Autor x Réu" />
      
      </div>

      <div>
        <Label>Data de Propositura</Label>
        <Input
        type="date"
        value={formData.filing_date}
        onChange={(e) => setFormData({ ...formData, filing_date: e.target.value })} />
      
      </div>

      <div>
        <Label>Localização / Município</Label>
        <Input
        value={formData.location}
        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        placeholder="Ex: São Paulo - SP / Zona Rural, Km 15" />
      
      </div>

      <div>
        <Label>{formData.process_type === 'Civil' ? 'Valor da Indenização Ambiental (R$)' : 'Valor da Multa Arbitrada (R$)'}</Label>
        <Input
        type="number"
        min="0"
        step="0.01"
        value={formData.fine_value}
        onChange={(e) => setFormData({ ...formData, fine_value: e.target.value })}
        placeholder="Ex: 15000.00" />
      
      </div>

      <div>
        <Label>Status</Label>
        <Select
        value={formData.status}
        onValueChange={(value) => setFormData({ ...formData, status: value })}>
        
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Em Andamento">Em Andamento</SelectItem>
            <SelectItem value="Suspenso">Suspenso</SelectItem>
            <SelectItem value="Arquivado">Arquivado</SelectItem>
            <SelectItem value="Finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Informações adicionais sobre o processo"
        rows={3} />
      
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
          {editingProcess ? 'Atualizar' : 'Cadastrar'} Processo
        </Button>
        <Button
        type="button"
        variant="outline"
        onClick={() => {
          setShowDialog(false);
          resetForm();
        }}>
        
          Cancelar
        </Button>
      </div>
    </form>;


  const filteredProcesses = (type) =>
  processes.filter((p) => p.process_type === type);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <Link
        to={createPageUrl('PropertyCentral')}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-medium">
        
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>

      {/* Consultor/Equipe Selector */}
      {isConsultorFamily &&
      <ConsultorPropertySelector
        properties={properties}
        selectedPropertyId={consultorPropertyId}
        onSelect={setConsultorPropertyId}
        isLoading={propertiesLoading} />

      }

      {/* Produtor Property Selector */}
      {!isConsultorFamily && properties.length > 1 &&
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
          <span className="text-gray-700 font-medium text-sm sm:text-base sm:whitespace-nowrap">Propriedade:</span>
          <Select value={formData.property_id} onValueChange={(v) => setFormData({ ...formData, property_id: v })}>
            <SelectTrigger className="w-full sm:w-96 bg-emerald-50 border-emerald-200">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((prop) =>
            <SelectItem key={prop.id} value={prop.id}>
                  {prop.property_name} - {prop.city || 'N/A'}
                </SelectItem>
            )}
            </SelectContent>
          </Select>
        </div>
      }

      {/* Monitoramento DOE-RS */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Monitoramento DOE-RS / FEPAM</p>
              <p className="text-xs text-amber-700">Verificação automática diária de novos Processos Administrativos.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleScanDOE}
            disabled={scanLoading}
            className="border-amber-400 text-amber-800 hover:bg-amber-100 whitespace-nowrap">
            
            <RefreshCw className={`w-4 h-4 mr-2 ${scanLoading ? 'animate-spin' : ''}`} />
            {scanLoading ? 'Verificando...' : 'Verificar Agora'}
          </Button>
        </div>
        {scanResult &&
        <div className={`text-sm p-3 rounded-lg ${scanResult.matches_found > 0 ? 'bg-red-100 border border-red-300 text-red-800' : 'bg-green-100 border border-green-300 text-green-800'}`}>
            {scanResult.error ?
          <p>❌ Erro: {scanResult.error}</p> :
          scanResult.matches_found > 0 ?
          <div>
                <p className="font-semibold">⚠️ {scanResult.matches_found} correspondência(s) encontrada(s)!</p>
                {scanResult.new_processes?.map((r, i) =>
            <p key={i} className="text-xs mt-1">• {r.client} — {r.matchType} — {r.title?.substring(0, 80)}...</p>
            )}
                <p className="text-xs mt-1 opacity-70">Novos processos criados automaticamente. Verifique a aba Administrativos.</p>
              </div> :

          <p>✅ Nenhuma infração encontrada. {scanResult.scanned_items} publicações da FEPAM verificadas para {scanResult.clients_checked} clientes.</p>
          }
          </div>
        }
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 flex-wrap">
            <Scale className="w-6 sm:w-8 h-6 sm:h-8 text-emerald-600 flex-shrink-0" />
            <span>Tríplice Resp. Ambiental</span>
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Acompanhamento de processos administrativos, civis e criminais
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto whitespace-nowrap"
              onClick={() => resetForm()}>
              
              <Plus className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Novo Processo</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProcess ? 'Editar Processo' : 'Cadastrar Novo Processo'}
              </DialogTitle>
            </DialogHeader>
            {ProcessForm()}
          </DialogContent>
        </Dialog>
      </div>

      {isConsultorFamily && !consultorPropertyId ?
      <Card className="border-dashed border-2 border-amber-200">
          <CardContent className="py-16 text-center">
            <Scale className="w-16 h-16 mx-auto text-amber-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Selecione uma propriedade</h3>
            <p className="text-gray-500 mt-2">Escolha a propriedade acima para visualizar os processos</p>
          </CardContent>
        </Card> :
      null}

      <Tabs defaultValue="Administrativo" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6 gap-1 sm:gap-0">
          <TabsTrigger value="Administrativo" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <FileText className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span className="hidden sm:inline">Administrativos</span>
            <span className="sm:hidden">Admin</span> ({filteredProcesses('Administrativo').length})
          </TabsTrigger>
          <TabsTrigger value="Civil" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Scale className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span className="hidden sm:inline">Civis</span>
            <span className="sm:hidden">Civil</span> ({filteredProcesses('Civil').length})
          </TabsTrigger>
          <TabsTrigger value="Criminal" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <AlertCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span className="hidden sm:inline">Criminais</span>
            <span className="sm:hidden">Crim</span> ({filteredProcesses('Criminal').length})
          </TabsTrigger>
        </TabsList>

        {['Administrativo', 'Civil', 'Criminal'].map((type) =>
        <TabsContent key={type} value={type}>
            {isLoading ?
          <div className="text-center py-12 text-gray-500">Carregando...</div> :
          filteredProcesses(type).length === 0 ?
          <Card className="border-emerald-100">
                <CardContent className="text-center py-12">
                  <Scale className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">
                    Nenhum processo {type.toLowerCase()} cadastrado
                  </p>
                </CardContent>
              </Card> :

          <div className="grid gap-4">
                {filteredProcesses(type).map((process) =>
            <ProcessCard key={process.id} process={process} />
            )}
              </div>
          }
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog de Histórico */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Histórico - {selectedProcess?.process_number}
            </DialogTitle>
          </DialogHeader>
          {selectedProcess &&
          <ProcessHistory
            process={selectedProcess}
            onAddUpdate={(update) => {
              const updatedProcess = {
                ...selectedProcess,
                updates: [...(selectedProcess.updates || []), update]
              };
              updateMutation.mutate({ id: selectedProcess.id, data: updatedProcess });
            }}
            onEditUpdate={(index, editedUpdate) => {
              const updatedUpdates = [...(selectedProcess.updates || [])];
              updatedUpdates[index] = editedUpdate;
              const updatedProcess = {
                ...selectedProcess,
                updates: updatedUpdates
              };
              updateMutation.mutate({ id: selectedProcess.id, data: updatedProcess });
            }} />

          }
        </DialogContent>
      </Dialog>


    </div>);

}