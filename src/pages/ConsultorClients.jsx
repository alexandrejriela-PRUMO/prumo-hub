import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Mail, Phone, Plus, Users, MessageCircle, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import NewClientForm from '../components/consultor/NewClientForm';
import ClientCRMPanel from '../components/consultor/ClientCRMPanel';
import ClientProfilePanel from '../components/consultor/ClientProfilePanel';
import ClientARTPanel from '../components/consultor/ClientARTPanel';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

// Status considerados "Lead" (em negociação/prospecção)
const LEAD_STATUSES = ['Prospect', 'NovoProspect', 'Em Negociação'];
// Status considerados "Cliente" (contratado/ativo)
const CLIENT_STATUSES = ['Ativo', 'Inativo', 'Encerrado'];

const isLead = (status) => LEAD_STATUSES.includes(status) || !status;
const isClient = (status) => CLIENT_STATUSES.includes(status);

const STATUS_BADGE = {
  'NovoProspect': { label: 'Lead', className: 'bg-amber-100 text-amber-800 border border-amber-300' },
  'Prospect': { label: 'Lead', className: 'bg-amber-100 text-amber-800 border border-amber-300' },
  'Em Negociação': { label: 'Em Negociação', className: 'bg-orange-100 text-orange-800 border border-orange-300' },
  'Ativo': { label: 'Cliente Ativo', className: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
  'Inativo': { label: 'Inativo', className: 'bg-gray-100 text-gray-700 border border-gray-300' },
  'Encerrado': { label: 'Encerrado', className: 'bg-red-100 text-red-800 border border-red-300' },
};

export default function ConsultorClients() {
  const [showNewClientForm, setShowNewClientForm] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [clientToDelete, setClientToDelete] = React.useState(null);
  const [filterType, setFilterType] = React.useState('todos'); // 'todos' | 'leads' | 'clientes'
  const queryClient = useQueryClient();
  const { effectiveEmail, isEquipe, actualEmail, memberRole } = useEffectiveUser();
  const canCreate = !isEquipe || memberRole === 'Administrador';


  // Busca todos os clientes do consultor, independente do status
  const { data: crmClients = [], isLoading } = useQuery({
    queryKey: ['consultor-crm-clients', effectiveEmail],
    queryFn: () => base44.entities.ClientCRM.filter({ consultor_email: effectiveEmail }) || [],
    enabled: !!effectiveEmail,
    initialData: [],
  });

  // Busca propriedades para vincular ao perfil
  const { data: properties = [] } = useQuery({
    queryKey: ['consultor-properties', effectiveEmail],
    queryFn: () => base44.entities.Property.filter({ consultor_email: effectiveEmail }) || [],
    enabled: !!effectiveEmail,
    initialData: [],
  });

  // Busca clientes que podem estar vinculados apenas via propriedade (sem CRM direto)
  const { data: propertyBasedClients = [] } = useQuery({
    queryKey: ['property-based-clients', effectiveEmail],
    queryFn: async () => {
      try {
        const props = (await base44.entities.Property.filter({ consultor_email: effectiveEmail })) || [];
        // Agrupa por client_name/owner_email para encontrar clientes únicos
        const clients = new Map();
        (props || []).forEach(p => {
          if (p?.client_name && p?.owner_email) {
            const key = `${p.owner_email}`;
            if (!clients.has(key)) {
              clients.set(key, {
                property_id: p.id,
                consultor_email: effectiveEmail,
                client_email: p.owner_email,
                client_name: p.client_name,
                status: 'Ativo',
              });
            }
          }
        });
        return Array.from(clients.values());
      } catch (e) {
        console.error('Erro ao buscar clientes via propriedade:', e);
        return [];
      }
    },
    enabled: !!effectiveEmail,
    initialData: [],
  });

  // Mescla clientes do CRM com clientes vinculados via propriedade
  const allClients = React.useMemo(() => {
    const safe_crmClients = crmClients || [];
    const safe_propertyBasedClients = propertyBasedClients || [];
    const crmMap = new Map((safe_crmClients || []).map(c => [c?.client_email, c]));
    const combined = [...safe_crmClients];
    
    (safe_propertyBasedClients || []).forEach(pClient => {
      if (pClient?.client_email && !crmMap.has(pClient.client_email)) {
        combined.push(pClient);
      }
    });
    
    return combined || [];
  }, [crmClients, propertyBasedClients]);

  const deleteClientMutation = useMutation({
    mutationFn: (client) => base44.entities.ClientCRM.delete(client.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultor-crm-clients'] });
      queryClient.invalidateQueries({ queryKey: ['property-based-clients'] });
      queryClient.invalidateQueries({ queryKey: ['consultor-properties'] });
      setClientToDelete(null);
      toast.success('Cliente removido.');
    }
  });

  // Filtra clientes conforme seleção
  const filteredClients = useMemo(() => {
    const safe_allClients = allClients || [];
    if (filterType === 'leads') return safe_allClients.filter(c => isLead(c?.status));
    if (filterType === 'clientes') return safe_allClients.filter(c => isClient(c?.status));
    return safe_allClients;
  }, [allClients, filterType]);

  const leadsCount = useMemo(() => (allClients || []).filter(c => isLead(c?.status)).length, [allClients]);
  const clientesCount = useMemo(() => (allClients || []).filter(c => isClient(c?.status)).length, [allClients]);

  // Enriquece o client com propriedades vinculadas para o perfil
  const enrichClient = (crm) => {
    if (!crm) return {};
    const safe_properties = properties || [];
    const clientProps = safe_properties.filter(p => {
      if (!p) return false;
      // Vinculação primária por property_id
      if (crm?.property_id && p?.id === crm.property_id) return true;
      // Vinculação secundária por email do cliente
      if (crm?.client_email && p?.owner_email === crm.client_email) return true;
      // Vinculação terciária por nome do cliente na propriedade
      if (crm?.client_name && p?.client_name === crm.client_name) return true;
      return false;
    });
    return { ...crm, properties: clientProps };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-600" />
            Meus Clientes
          </h1>
          <p className="text-gray-500 mt-1">
            {isEquipe ? `Visualizando clientes do consultor vinculado. ` : ''}
            {allClients.length} registro(s) — {clientesCount} cliente(s), {leadsCount} lead(s).
          </p>
        </div>
        {canCreate && <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowNewClientForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>}
      </div>

      {/* Filtro Lead / Cliente */}
      <div className="flex gap-2">
        {[
          { key: 'todos', label: `Todos (${allClients.length})` },
          { key: 'leads', label: `Leads (${leadsCount})` },
          { key: 'clientes', label: `Clientes (${clientesCount})` },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilterType(opt.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filterType === opt.key
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      )}

      {!isLoading && filteredClients.length === 0 && (
         <Card className="border-dashed border-2 border-emerald-200">
           <CardContent className="py-16 text-center">
             <Users className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
             <h3 className="text-lg font-semibold text-gray-900">
               {filterType === 'leads' ? 'Nenhum lead encontrado' : filterType === 'clientes' ? 'Nenhum cliente encontrado' : 'Nenhum registro encontrado'}
             </h3>
             <p className="text-gray-500 mt-2 max-w-md mx-auto">
               {filterType === 'todos' ? 'Cadastre seu primeiro cliente ou converta um lead no CRM.' : `Altere o filtro para ver outros registros.`}
             </p>
             {canCreate && filterType !== 'leads' && <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowNewClientForm(true)}>
               <Plus className="w-4 h-4 mr-2" />
               Cadastrar Cliente
             </Button>}
           </CardContent>
         </Card>
       )}

       {!isLoading && filteredClients?.length > 0 && (
         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
           {(filteredClients || []).map(crm => {
            if (!crm?.id) return null;
            const statusInfo = STATUS_BADGE[crm?.status] || STATUS_BADGE['Ativo'];
            const clientIsLead = isLead(crm?.status);
            return (
            <Card key={crm?.id} className={`hover:shadow-lg transition-shadow flex flex-col ${clientIsLead ? 'border-amber-200' : ''}`}>
              {clientIsLead && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 rounded-t-xl flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">🎯 Lead</span>
                  <span className="text-xs text-amber-600">{crm?.status === 'Em Negociação' ? '— Em Negociação' : '— Prospecção'}</span>
                </div>
              )}
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${clientIsLead ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                    <span className={`font-bold text-sm ${clientIsLead ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {((crm?.client_name || crm?.client_email || '?')[0] || '?').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{crm?.client_name || crm?.client_email?.split('@')?.[0] || 'Cliente'}</h3>
                    {crm?.client_email && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        {crm.client_email}
                      </p>
                    )}
                    {crm?.client_phone && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        {crm.client_phone}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setClientToDelete(crm)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge className={statusInfo?.className || 'bg-gray-100 text-gray-800'}>{statusInfo?.label || 'Ativo'}</Badge>
                  {crm?.city && <span className="text-xs text-gray-500">{crm.city}{crm?.state ? `/${crm.state}` : ''}</span>}
                </div>

                {(crm?.services?.length > 0) && (
                  <div className="bg-emerald-50 rounded-lg p-2 mb-3 text-xs text-emerald-700">
                    {(crm?.services || []).filter(s => s?.status === 'Contratado' || s?.status === 'Em Andamento').length} serviço(s) ativo(s)
                  </div>
                )}

                <Button
                  onClick={() => setSelectedClient(crm)}
                  className={`w-full mt-auto ${clientIsLead ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  size="sm"
                >
                  <MessageCircle className="w-3 h-3 mr-2" />
                  Ver Perfil
                </Button>
              </CardContent>
            </Card>
           )})}
        </div>
      )}

      <NewClientForm
         isOpen={showNewClientForm}
         onClose={() => setShowNewClientForm(false)}
         consultorEmail={effectiveEmail}
         initialStatus="Ativo"
         onSuccess={() => setShowNewClientForm(false)}
       />

      <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá <strong>{clientToDelete?.client_name}</strong> da lista de clientes. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteClientMutation.mutate(clientToDelete)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Client Detail Modal */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Users className="w-5 h-5" />
              {selectedClient?.client_name || selectedClient?.client_email?.split('@')[0]}
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <Tabs defaultValue="perfil">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="perfil">Perfil</TabsTrigger>
                <TabsTrigger value="crm">CRM</TabsTrigger>
              </TabsList>
              <TabsContent value="perfil" className="mt-4">
                <ClientProfilePanel client={enrichClient(selectedClient) || {}} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['consultor-crm-clients'] })} />
              </TabsContent>
              <TabsContent value="crm" className="mt-4">
                <ClientCRMPanel property={enrichClient(selectedClient) || {}} onClose={() => setSelectedClient(null)} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}