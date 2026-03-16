import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Users, MessageCircle, CheckSquare, Calendar, Tag,
  MoreVertical, Briefcase, TrendingUp, Clock, ChevronRight, MapPin
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NewClientForm from '../components/consultor/NewClientForm';
import ClientCRMPanel from '../components/consultor/ClientCRMPanel';
import ClientFinancialSummary from '../components/consultor/ClientFinancialSummary';
import ClientChargesPanel from '../components/consultor/ClientChargesPanel';
import ClientProfilePanel from '../components/consultor/ClientProfilePanel';

const COLUMNS = [
  { id: 'Prospect',       label: 'Prospect',        color: 'border-t-amber-400',   bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700' },
  { id: 'Em Negociação',  label: 'Em Negociação',   color: 'border-t-blue-400',    bg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700' },
  { id: 'Ativo',          label: 'Cliente',          color: 'border-t-emerald-500', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
  { id: 'Inativo',        label: 'Inativo',          color: 'border-t-gray-400',    bg: 'bg-gray-50',    badge: 'bg-gray-100 text-gray-600' },
  { id: 'Encerrado',      label: 'Encerrado',        color: 'border-t-red-400',     bg: 'bg-red-50',     badge: 'bg-red-100 text-red-700' },
];

function ClientCard({ crm, property, index, onClick }) {
  const lastInteraction = crm.interactions?.slice(-1)[0];
  const pendingTasks = (crm.tasks || []).filter(t => !t.done);
  const nextTask = pendingTasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
  const activeServices = (crm.services || []).filter(s => s.status === 'Contratado' || s.status === 'Em Andamento');

  return (
    <Draggable draggableId={crm.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`
            bg-white rounded-xl border border-gray-200 p-4 cursor-pointer
            shadow-sm hover:shadow-md transition-all duration-200
            ${snapshot.isDragging ? 'shadow-xl rotate-1 scale-105 border-emerald-300' : ''}
          `}
        >
          {/* Client Name */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {(property?.client_name || crm.client_email || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {property?.client_name || crm.client_email?.split('@')[0] || '—'}
                </p>
                {property?.property_name && (
                  <p className="text-xs text-gray-400 truncate">{property.property_name}</p>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
          </div>

          {/* Tags */}
          {crm.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {crm.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                  <Tag className="w-2.5 h-2.5" />{tag}
                </span>
              ))}
              {crm.tags.length > 3 && <span className="text-xs text-gray-400">+{crm.tags.length - 3}</span>}
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {crm.interactions?.length > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {crm.interactions.length}
              </span>
            )}
            {pendingTasks.length > 0 && (
              <span className={`flex items-center gap-1 ${pendingTasks.length > 0 ? 'text-amber-600 font-medium' : ''}`}>
                <CheckSquare className="w-3 h-3" />
                {pendingTasks.length} tarefa{pendingTasks.length > 1 ? 's' : ''}
              </span>
            )}
            {activeServices.length > 0 && (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Briefcase className="w-3 h-3" />
                {activeServices.length}
              </span>
            )}
          </div>

          {/* Next Task */}
          {nextTask && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-start gap-1.5">
                <Clock className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-600 truncate">{nextTask.title}</p>
                  {nextTask.due_date && (
                    <p className="text-xs text-amber-600 font-medium">
                      {format(parseISO(nextTask.due_date), "dd/MM", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Last Interaction */}
          {lastInteraction && !nextTask && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 truncate">
                Última: {lastInteraction.title}
              </p>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const ATIVIDADES_RURAIS = ['Agricultura','Pecuária','Silvicultura','Aquicultura','Extrativismo','Agroindústria','Turismo Rural','Outro'];

export default function CRMBoard() {
  const [user, setUser] = useState(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [selectedCRM, setSelectedCRM] = useState(null);
  const [linkPropertyModal, setLinkPropertyModal] = useState(null); // { crmId, pendingStatus }
  const [propertyData, setPropertyData] = useState({
    property_name: '', property_type: 'rural', location: '',
    city: '', state: '', total_hectares: '', app_hectares: '',
    legal_reserve_hectares: '', total_area_m2: '', built_area_m2: '',
    main_activity: '', activities: '',
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: properties = [] } = useQuery({
    queryKey: ['crm-board-properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ consultor_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: crmList = [], isLoading } = useQuery({
    queryKey: ['crm-board-list', user?.email],
    queryFn: async () => {
      const existing = await base44.entities.ClientCRM.filter({ consultor_email: user.email });
      const existingPropertyIds = new Set(existing.map(c => c.property_id));
      const props = await base44.entities.Property.filter({ consultor_email: user.email });
      // Create CRM records for properties that don't have one yet
      const toCreate = props.filter(p => !existingPropertyIds.has(p.id));
      const created = await Promise.all(
        toCreate.map(p => base44.entities.ClientCRM.create({
          property_id: p.id,
          consultor_email: user.email,
          client_email: p.owner_email || '',
          status: 'Ativo',
        }))
      );
      return [...existing, ...created];
    },
    enabled: !!user?.email,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ClientCRM.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries(['crm-board-list']);
      const previousData = queryClient.getQueryData(['crm-board-list']);
      queryClient.setQueryData(['crm-board-list'], (old = []) =>
        old.map(crm => crm.id === id ? { ...crm, status } : crm)
      );
      return { previousData };
    },
    onError: (err, vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['crm-board-list'], context.previousData);
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['crm-board-list']),
  });

  const createPropertyMutation = useMutation({
    mutationFn: (data) => base44.entities.Property.create(data),
    onSuccess: async (property) => {
      const { crmId } = linkPropertyModal;
      await base44.entities.ClientCRM.update(crmId, {
        status: 'Ativo',
        property_id: property.id,
      });
      queryClient.invalidateQueries(['crm-board-list']);
      queryClient.invalidateQueries(['crm-board-properties']);
      setLinkPropertyModal(null);
      setPropertyData({ property_name:'',property_type:'rural',location:'',city:'',state:'',total_hectares:'',app_hectares:'',legal_reserve_hectares:'',total_area_m2:'',built_area_m2:'',main_activity:'',activities:'' });
      toast.success('Lead convertido para Cliente com propriedade vinculada!');
    },
  });

  const propertyMap = useMemo(() => {
    const map = {};
    properties.forEach(p => { map[p.id] = p; });
    return map;
  }, [properties]);

  // Group CRM records by status
  const columns = useMemo(() => {
    const grouped = {};
    COLUMNS.forEach(col => { grouped[col.id] = []; });
    crmList.forEach(crm => {
      const status = crm.status || 'Ativo';
      if (grouped[status]) grouped[status].push(crm);
    });
    return grouped;
  }, [crmList]);

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    const destStatus = destination.droppableId;
    if (destStatus === 'Ativo') {
      // Check if already has a real property linked
      const crm = crmList.find(c => c.id === draggableId);
      const prop = crm ? propertyMap[crm.property_id] : null;
      if (!prop || prop.is_client_only) {
        // Need to link a property first
        setLinkPropertyModal({ crmId: draggableId });
        return;
      }
    }
    updateStatusMutation.mutate({ id: draggableId, status: destStatus });
  };

  const setProp = (field, val) => setPropertyData(prev => ({ ...prev, [field]: val }));

  const handleLinkPropertySubmit = () => {
    if (!propertyData.property_name) {
      toast.error('Informe o nome da propriedade/empreendimento.');
      return;
    }
    const crm = crmList.find(c => c.id === linkPropertyModal.crmId);
    const prop = crm ? propertyMap[crm.property_id] : null;
    createPropertyMutation.mutate({
      owner_email: crm?.client_email || '',
      property_name: propertyData.property_name,
      property_type: propertyData.property_type,
      location: propertyData.location,
      city: propertyData.city,
      state: propertyData.state,
      total_hectares: propertyData.property_type === 'rural' ? (parseFloat(propertyData.total_hectares) || 0) : undefined,
      app_hectares: propertyData.property_type === 'rural' ? (parseFloat(propertyData.app_hectares) || 0) : undefined,
      legal_reserve_hectares: propertyData.property_type === 'rural' ? (parseFloat(propertyData.legal_reserve_hectares) || 0) : undefined,
      total_area_m2: propertyData.property_type === 'urbano' ? (parseFloat(propertyData.total_area_m2) || 0) : undefined,
      built_area_m2: propertyData.property_type === 'urbano' ? (parseFloat(propertyData.built_area_m2) || 0) : undefined,
      main_activity: propertyData.main_activity,
      activities: propertyData.activities,
      consultor_email: user?.email,
      client_name: prop?.client_name || crm?.client_email?.split('@')[0] || '',
    });
  };

  // Find the selected CRM's property for modal
  const selectedProperty = selectedCRM ? propertyMap[selectedCRM.property_id] : null;
  const selectedClient = selectedCRM ? {
    ...selectedCRM,
    client_name: selectedProperty?.client_name || selectedCRM.client_email?.split('@')[0],
    properties: selectedProperty ? [selectedProperty] : [],
  } : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600" />
            CRM de Clientes
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {crmList.length} cliente{crmList.length !== 1 ? 's' : ''} · Arraste para mover entre etapas
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowNewClientForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <div key={col.id} className="w-72 flex-shrink-0 bg-gray-100 rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-6">
            {COLUMNS.map(col => {
              const cards = columns[col.id] || [];
              return (
                <div key={col.id} className="flex-shrink-0 w-72">
                  {/* Column Header */}
                  <div className={`rounded-t-xl border-t-4 ${col.color} bg-white border border-gray-200 border-b-0 px-4 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-800">{col.label}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                        {cards.length}
                      </span>
                    </div>
                  </div>

                  {/* Droppable Column */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`
                          min-h-[200px] rounded-b-xl border border-t-0 border-gray-200 p-3 space-y-3 transition-colors duration-200
                          ${snapshot.isDraggingOver ? 'bg-emerald-50 border-emerald-300' : col.bg}
                        `}
                      >
                        {cards.map((crm, index) => (
                          <ClientCard
                            key={crm.id}
                            crm={crm}
                            property={propertyMap[crm.property_id]}
                            index={index}
                            onClick={() => setSelectedCRM(crm)}
                          />
                        ))}
                        {provided.placeholder}
                        {cards.length === 0 && !snapshot.isDraggingOver && (
                          <div className="text-center py-8 text-gray-400 text-xs">
                            Nenhum cliente
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* New Client Form */}
      <NewClientForm
        isOpen={showNewClientForm}
        onClose={() => setShowNewClientForm(false)}
        consultorEmail={user?.email}
        onSuccess={async (property) => {
          setShowNewClientForm(false);
          if (property?.id) {
            await base44.entities.ClientCRM.create({
              property_id: property.id,
              consultor_email: user.email,
              client_email: property.owner_email || '',
              status: 'Prospect',
            });
          }
          queryClient.invalidateQueries(['crm-board-list']);
        }}
      />

      {/* Link Property Modal (when moving to Cliente) */}
      <Dialog open={!!linkPropertyModal} onOpenChange={() => setLinkPropertyModal(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <MapPin className="w-5 h-5" />
              Vincular Propriedade / Empreendimento
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2 mb-2">Para converter em <strong>Cliente</strong>, vincule uma propriedade ou empreendimento.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome da Propriedade / Empreendimento *</Label>
                <Input value={propertyData.property_name} onChange={e => setProp('property_name', e.target.value)} placeholder="Ex: Fazenda São João" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={propertyData.property_type} onValueChange={val => setProp('property_type', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rural">Rural</SelectItem>
                    <SelectItem value="urbano">Urbano / Empreendimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Atividade Principal</Label>
                {propertyData.property_type === 'rural' ? (
                  <Select value={propertyData.main_activity} onValueChange={val => setProp('main_activity', val)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {ATIVIDADES_RURAIS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={propertyData.main_activity} onChange={e => setProp('main_activity', e.target.value)} placeholder="Ex: Condomínio" />
                )}
              </div>
              <div className="col-span-2">
                <Label>Endereço / Localização</Label>
                <Input value={propertyData.location} onChange={e => setProp('location', e.target.value)} placeholder="Endereço completo" />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={propertyData.city} onChange={e => setProp('city', e.target.value)} placeholder="Cidade" />
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={propertyData.state} onValueChange={val => setProp('state', val)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {propertyData.property_type === 'rural' ? (
                <>
                  <div>
                    <Label>Área Total (ha)</Label>
                    <Input type="number" value={propertyData.total_hectares} onChange={e => setProp('total_hectares', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label>APP (ha)</Label>
                    <Input type="number" value={propertyData.app_hectares} onChange={e => setProp('app_hectares', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label>Reserva Legal (ha)</Label>
                    <Input type="number" value={propertyData.legal_reserve_hectares} onChange={e => setProp('legal_reserve_hectares', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label>Atividades</Label>
                    <Input value={propertyData.activities} onChange={e => setProp('activities', e.target.value)} placeholder="Ex: Soja, Milho" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Área Total (m²)</Label>
                    <Input type="number" value={propertyData.total_area_m2} onChange={e => setProp('total_area_m2', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label>Área Construída (m²)</Label>
                    <Input type="number" value={propertyData.built_area_m2} onChange={e => setProp('built_area_m2', e.target.value)} placeholder="0" />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setLinkPropertyModal(null)}>Cancelar</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleLinkPropertySubmit}
                disabled={createPropertyMutation.isPending}
              >
                {createPropertyMutation.isPending ? 'Salvando...' : 'Converter para Cliente'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Detail Modal */}
      <Dialog open={!!selectedCRM} onOpenChange={() => setSelectedCRM(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Users className="w-5 h-5" />
              {selectedClient?.client_name || selectedCRM?.client_email?.split('@')[0]}
            </DialogTitle>
          </DialogHeader>
          {selectedCRM && (
            <Tabs defaultValue="crm">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="perfil">Perfil</TabsTrigger>
                <TabsTrigger value="crm">CRM</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                <TabsTrigger value="cobranças">Cobranças</TabsTrigger>
              </TabsList>
              <TabsContent value="perfil" className="mt-4">
                <ClientProfilePanel client={selectedClient} />
              </TabsContent>
              <TabsContent value="crm" className="mt-4">
                <ClientCRMPanel property={selectedClient} onClose={() => setSelectedCRM(null)} />
              </TabsContent>
              <TabsContent value="financeiro" className="mt-4">
                <ClientFinancialSummary client={selectedClient} />
              </TabsContent>
              <TabsContent value="cobranças" className="mt-4">
                <ClientChargesPanel client={selectedClient} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}