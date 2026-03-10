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
  DollarSign
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProcessHistory from '../components/history/ProcessHistory';
import ConsultorPropertySelector from '../components/consultor/ConsultorPropertySelector';

export default function Processes() {
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

  const isConsultor = user?.user_type === 'consultor';

  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => isConsultor
      ? base44.entities.Property.filter({ consultor_email: user.email })
      : base44.entities.Property.filter({ owner_email: user.email }),
    enabled: !!user?.email
  });

  const { data: processes, isLoading } = useQuery({
    queryKey: ['processes', user?.email, consultorPropertyId],
    queryFn: () => isConsultor
      ? base44.entities.Process.filter({ property_id: consultorPropertyId })
      : base44.entities.Process.filter({ client_email: user.email }),
    enabled: isConsultor ? !!consultorPropertyId : !!user?.email,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
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
    const data = { ...formData, client_email: user.email };
    
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
      updates: process.updates || []
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

  const ProcessCard = ({ process }) => {
    const StatusIcon = statusConfig[process.status]?.icon || AlertCircle;
    
    return (
      <Card className="border-emerald-100 hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${typeConfig[process.process_type]?.color} border font-semibold`}>
                  {process.process_type}
                </Badge>
                <Badge className={`${statusConfig[process.status]?.color} border`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {process.status}
                </Badge>
              </div>
              <CardTitle className="text-lg text-gray-900">
                {process.process_number}
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedProcess(process);
                  setShowHistory(true);
                }}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Clock className="w-4 h-4 mr-1" />
                Histórico
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(process)}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm('Deseja realmente excluir este processo?')) {
                    deleteMutation.mutate(process.id);
                  }
                }}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Matéria</p>
              <p className="text-gray-900">{process.subject}</p>
            </div>
            
            {process.parties && (
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Partes</p>
                  <p className="text-sm text-gray-600">{process.parties}</p>
                </div>
              </div>
            )}
            
            {process.filing_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Data de Propositura</p>
                  <p className="text-sm text-gray-600">
                    {format(parseISO(process.filing_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}

            {process.updates && process.updates.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Andamentos Recentes ({process.updates.length})
                </p>
                <div className="space-y-2">
                  {process.updates.slice(-3).reverse().map((update, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">
                        {update.date && format(parseISO(update.date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-gray-700">{update.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const ProcessForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Propriedade *</Label>
        <Select
          value={formData.property_id}
          onValueChange={(value) => setFormData({ ...formData, property_id: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
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

      <div>
        <Label>Tipo de Processo *</Label>
        <Select
          value={formData.process_type}
          onValueChange={(value) => setFormData({ ...formData, process_type: value })}
        >
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
          required
        />
      </div>

      <div>
        <Label>Matéria/Assunto *</Label>
        <Input
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Ex: Infração ambiental - desmatamento"
          required
        />
      </div>

      <div>
        <Label>Partes Envolvidas</Label>
        <Input
          value={formData.parties}
          onChange={(e) => setFormData({ ...formData, parties: e.target.value })}
          placeholder="Ex: Autor x Réu"
        />
      </div>

      <div>
        <Label>Data de Propositura</Label>
        <Input
          type="date"
          value={formData.filing_date}
          onChange={(e) => setFormData({ ...formData, filing_date: e.target.value })}
        />
      </div>

      <div>
        <Label>Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
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
          rows={3}
        />
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
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );

  const filteredProcesses = (type) => 
    processes.filter(p => p.process_type === type);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Consultor Selector */}
      {isConsultor && (
        <ConsultorPropertySelector
          properties={properties}
          selectedPropertyId={consultorPropertyId}
          onSelect={setConsultorPropertyId}
          isLoading={propertiesLoading}
        />
      )}

      {/* Produtor Property Selector */}
      {!isConsultor && properties.length > 1 && (
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
          <span className="text-gray-700 font-medium whitespace-nowrap">Propriedade ou Empreendimento:</span>
          <Select value={formData.property_id} onValueChange={(v) => setFormData({ ...formData, property_id: v })}>
            <SelectTrigger className="w-full sm:w-96 bg-emerald-50 border-emerald-200">
              <SelectValue placeholder="Selecione" />
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
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Scale className="w-8 h-8 text-emerald-600" />
            Tríplice Responsabilidade Ambiental
          </h1>
          <p className="text-gray-600 mt-1">
            Acompanhamento de processos administrativos, civis e criminais
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => resetForm()}
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Processo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProcess ? 'Editar Processo' : 'Cadastrar Novo Processo'}
              </DialogTitle>
            </DialogHeader>
            <ProcessForm />
          </DialogContent>
        </Dialog>
      </div>

      {isConsultor && !consultorPropertyId ? (
        <Card className="border-dashed border-2 border-amber-200">
          <CardContent className="py-16 text-center">
            <Scale className="w-16 h-16 mx-auto text-amber-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Selecione uma propriedade</h3>
            <p className="text-gray-500 mt-2">Escolha a propriedade acima para visualizar os processos</p>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="Administrativo" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="Administrativo" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Administrativos ({filteredProcesses('Administrativo').length})
          </TabsTrigger>
          <TabsTrigger value="Civil" className="flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Civis ({filteredProcesses('Civil').length})
          </TabsTrigger>
          <TabsTrigger value="Criminal" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Criminais ({filteredProcesses('Criminal').length})
          </TabsTrigger>
        </TabsList>

        {['Administrativo', 'Civil', 'Criminal'].map((type) => (
          <TabsContent key={type} value={type}>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Carregando...</div>
            ) : filteredProcesses(type).length === 0 ? (
              <Card className="border-emerald-100">
                <CardContent className="text-center py-12">
                  <Scale className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">
                    Nenhum processo {type.toLowerCase()} cadastrado
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredProcesses(type).map((process) => (
                  <ProcessCard key={process.id} process={process} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
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
          {selectedProcess && (
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
              }}
            />
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}