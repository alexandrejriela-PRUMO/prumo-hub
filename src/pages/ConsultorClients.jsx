import React, { useState, useMemo } from 'react';
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
import ClientFinancialSummary from '../components/consultor/ClientFinancialSummary';
import ClientChargesPanel from '../components/consultor/ClientChargesPanel';
import ClientProfilePanel from '../components/consultor/ClientProfilePanel';
import ClientARTPanel from '../components/consultor/ClientARTPanel';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

export default function ConsultorClients() {
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const queryClient = useQueryClient();
  const { effectiveEmail, isEquipe, actualEmail, memberRole } = useEffectiveUser();
  const canCreate = !isEquipe || memberRole === 'Administrador';
  const canViewFinancial = !isEquipe || memberRole === 'Administrador';

  // Busca todos os clientes do consultor, independente do status
  const { data: crmClients = [], isLoading } = useQuery({
    queryKey: ['consultor-crm-clients', effectiveEmail],
    queryFn: () => base44.entities.ClientCRM.filter({ consultor_email: effectiveEmail }),
    enabled: !!effectiveEmail,
  });

  // Busca propriedades para vincular ao perfil
  const { data: properties = [] } = useQuery({
    queryKey: ['consultor-properties', effectiveEmail],
    queryFn: () => base44.entities.Property.filter({ consultor_email: effectiveEmail }),
    enabled: !!effectiveEmail,
  });

  // Busca clientes que podem estar vinculados apenas via propriedade (sem CRM direto)
  const { data: propertyBasedClients = [] } = useQuery({
    queryKey: ['property-based-clients', effectiveEmail],
    queryFn: async () => {
      const props = await base44.entities.Property.filter({ consultor_email: effectiveEmail });
      // Agrupa por client_name/owner_email para encontrar clientes únicos
      const clients = new Map();
      props.forEach(p => {
        if (p.client_name && p.owner_email) {
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
    },
    enabled: !!effectiveEmail,
  });

  // Mescla clientes do CRM com clientes vinculados via propriedade
  const allClients = React.useMemo(() => {
    const crmMap = new Map(crmClients.map(c => [c.client_email, c]));
    const combined = [...crmClients];
    
    propertyBasedClients.forEach(pClient => {
      if (!crmMap.has(pClient.client_email)) {
        combined.push(pClient);
      }
    });
    
    return combined;
  }, [crmClients, propertyBasedClients]);

  const deleteClientMutation = useMutation({
    mutationFn: (crm) => base44.entities.ClientCRM.delete(crm.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['consultor-crm-clients']);
      queryClient.invalidateQueries(['crm-board-list']);
      setClientToDelete(null);
      toast.success('Cliente removido.');
    }
  });

  // Enriquece o client com propriedades vinculadas para o perfil
  const enrichClient = (crm) => {
    const clientProps = properties.filter(p => {
      // Vinculação primária por property_id
      if (crm.property_id && p.id === crm.property_id) return true;
      // Vinculação secundária por email do cliente
      if (crm.client_email && p.owner_email === crm.client_email) return true;
      // Vinculação terciária por nome do cliente na propriedade
      if (crm.client_name && p.client_name === crm.client_name) return true;
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
            {isEquipe ? `Visualizando clientes do consultor vinculado. ` : ''}Você tem {crmClients.length} cliente(s) ativo(s).
          </p>
        </div>
        {canCreate && <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowNewClientForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>}
      </div>

      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      )}

      {!isLoading && allClients.length === 0 && (
         <Card className="border-dashed border-2 border-emerald-200">
           <CardContent className="py-16 text-center">
             <Users className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
             <h3 className="text-lg font-semibold text-gray-900">Nenhum cliente ativo</h3>
             <p className="text-gray-500 mt-2 max-w-md mx-auto">
               Cadastre seu primeiro cliente ou converta um lead no CRM.
             </p>
             {canCreate && <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowNewClientForm(true)}>
               <Plus className="w-4 h-4 mr-2" />
               Cadastrar Cliente
             </Button>}
           </CardContent>
         </Card>
       )}

       {!isLoading && allClients.length > 0 && (
         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
           {allClients.map(crm => (
            <Card key={crm.id} className="hover:shadow-lg transition-shadow flex flex-col">
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-emerald-700 text-sm">
                      {(crm.client_name || crm.client_email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{crm.client_name || crm.client_email?.split('@')[0]}</h3>
                    {crm.client_email && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        {crm.client_email}
                      </p>
                    )}
                    {crm.client_phone && (
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

                <div className="mb-3 space-y-1">
                  <Badge className="bg-emerald-100 text-emerald-800">Ativo</Badge>
                  {crm.city && <span className="text-xs text-gray-500 ml-2">{crm.city}{crm.state ? `/${crm.state}` : ''}</span>}
                  <p className="text-xs text-gray-400 font-mono break-all">{crm.consultor_email}</p>
                </div>

                {(crm.services?.length > 0) && (
                  <div className="bg-emerald-50 rounded-lg p-2 mb-3 text-xs text-emerald-700">
                    {crm.services.filter(s => s.status === 'Contratado' || s.status === 'Em Andamento').length} serviço(s) ativo(s)
                  </div>
                )}

                <Button
                  onClick={() => setSelectedClient(crm)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 mt-auto"
                  size="sm"
                >
                  <MessageCircle className="w-3 h-3 mr-2" />
                  Ver Perfil
                </Button>
              </CardContent>
            </Card>
          ))}
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
              <TabsList className={`grid w-full ${canViewFinancial ? 'grid-cols-4' : 'grid-cols-2'}`}>
                <TabsTrigger value="perfil">Perfil</TabsTrigger>
                <TabsTrigger value="crm">CRM</TabsTrigger>
                {canViewFinancial && <TabsTrigger value="financeiro">Financeiro</TabsTrigger>}
                {canViewFinancial && <TabsTrigger value="cobranças">Cobranças</TabsTrigger>}
              </TabsList>
              <TabsContent value="perfil" className="mt-4">
                <ClientProfilePanel client={enrichClient(selectedClient)} onUpdate={() => queryClient.invalidateQueries(['consultor-crm-clients'])} />
              </TabsContent>
              <TabsContent value="crm" className="mt-4">
                <ClientCRMPanel property={enrichClient(selectedClient)} onClose={() => setSelectedClient(null)} />
              </TabsContent>
              {canViewFinancial && (
                <TabsContent value="financeiro" className="mt-4">
                  <ClientFinancialSummary client={enrichClient(selectedClient)} />
                </TabsContent>
              )}
              {canViewFinancial && (
                <TabsContent value="cobranças" className="mt-4">
                  <ClientChargesPanel client={enrichClient(selectedClient)} />
                </TabsContent>
              )}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}