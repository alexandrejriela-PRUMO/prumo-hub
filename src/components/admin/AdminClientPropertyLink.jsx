import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LinkIcon, Plus, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminClientPropertyLink() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkForm, setLinkForm] = useState({ client_email: '', property_id: '', consultor_email: '' });
  const queryClient = useQueryClient();

  // Fetch all clients (client_consultor users)
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const res = await base44.functions.invoke('adminGetUsers', { type: 'clients' });
      return res.data.clients || [];
    },
  });

  // Fetch all properties
  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['admin-properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 500),
  });

  // Fetch all consultors
  const { data: consultors = [], isLoading: consultorsLoading } = useQuery({
    queryKey: ['admin-consultors'],
    queryFn: async () => {
      const res = await base44.functions.invoke('adminGetUsers', { type: 'users' });
      const allUsers = res.data.users || [];
      return allUsers.filter(u => u.user_type === 'consultor');
    },
  });

  // Link client to property mutation
  const linkMutation = useMutation({
    mutationFn: async (form) => {
      if (!form.client_email || !form.property_id || !form.consultor_email) {
        throw new Error('Preencha todos os campos');
      }

      // Update property authorized_users
      const property = properties.find(p => p.id === form.property_id);
      if (!property) throw new Error('Propriedade não encontrada');

      let authorizedUsers = [];
      if (property.authorized_users) {
        try {
          authorizedUsers = typeof property.authorized_users === 'string'
            ? JSON.parse(property.authorized_users)
            : property.authorized_users;
        } catch {
          authorizedUsers = [];
        }
      }

      // Check if already linked
      if (authorizedUsers.some(u => u.email === form.client_email)) {
        throw new Error('Este cliente já está vinculado a esta propriedade');
      }

      const newUser = {
        email: form.client_email,
        name: clients.find(c => c.email === form.client_email)?.full_name || form.client_email,
        role: 'Visualizador',
        added_date: new Date().toISOString(),
        added_by: 'admin'
      };

      // Remove if exists, then add (permite atualizar)
      authorizedUsers = authorizedUsers.filter(u => u.email !== form.client_email);
      authorizedUsers.push(newUser);

      await base44.entities.Property.update(form.property_id, {
        authorized_users: JSON.stringify(authorizedUsers),
        consultor_email: form.consultor_email
      });

      // Send notification email
      try {
        await base44.functions.invoke('sendPropertyViewerInvite', {
          property_name: property.property_name,
          viewer_email: form.client_email,
          viewer_name: newUser.name,
          property_id: form.property_id
        });
      } catch (err) {
        console.error('Erro ao enviar email:', err);
      }

      return true;
    },
    onSuccess: () => {
      toast.success('Cliente vinculado à propriedade com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
      setShowLinkDialog(false);
      setLinkForm({ client_email: '', property_id: '', consultor_email: '' });
    },
    onError: (err) => toast.error(err?.message || 'Erro ao vincular cliente'),
  });

  // Get property clients
  const getPropertyClients = (property) => {
    if (!property.authorized_users) return [];
    try {
      const users = typeof property.authorized_users === 'string'
        ? JSON.parse(property.authorized_users)
        : property.authorized_users;
      return Array.isArray(users) ? users : [];
    } catch {
      return [];
    }
  };

  // Unlink client from property
  const unlinkMutation = useMutation({
    mutationFn: async ({ propertyId, clientEmail }) => {
      const property = properties.find(p => p.id === propertyId);
      if (!property) throw new Error('Propriedade não encontrada');

      let authorizedUsers = getPropertyClients(property);
      authorizedUsers = authorizedUsers.filter(u => u.email !== clientEmail);

      await base44.entities.Property.update(propertyId, {
        authorized_users: JSON.stringify(authorizedUsers)
      });
    },
    onSuccess: () => {
      toast.success('Cliente removido da propriedade');
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
    },
    onError: () => toast.error('Erro ao remover cliente'),
  });

  const filteredProperties = properties.filter(p =>
    p.property_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.owner_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = clientsLoading || propertiesLoading || consultorsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Vincular Clientes a Propriedades</h2>
          <p className="text-sm text-gray-500 mt-1">
            Associe clientes (client_consultor) a propriedades e defina o consultor responsável
          </p>
        </div>
        <Button 
          onClick={() => setShowLinkDialog(true)}
          disabled={isLoading || clients.length === 0}
          className="bg-emerald-700 hover:bg-emerald-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Vincular Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar propriedade ou proprietário..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Properties List */}
      {isLoading ? (
        <div className="text-center py-10">
          <div className="inline-block w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : filteredProperties.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            Nenhuma propriedade encontrada
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProperties.map(property => {
            const propertyClients = getPropertyClients(property);
            return (
              <Card key={property.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base text-gray-900">{property.property_name}</CardTitle>
                      <p className="text-xs text-gray-500 mt-1">Proprietário: {property.owner_email}</p>
                      {property.consultor_email && (
                        <p className="text-xs text-gray-500">Consultor: {property.consultor_email}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {propertyClients.length === 0 ? (
                    <div className="text-sm text-gray-500 py-3 px-3 bg-gray-50 rounded-lg">
                      Nenhum cliente vinculado
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {propertyClients.map((client, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{client.name}</p>
                            <p className="text-xs text-gray-500">{client.email}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => unlinkMutation.mutate({ propertyId: property.id, clientEmail: client.email })}
                            disabled={unlinkMutation.isPending}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-emerald-600" />
              Vincular Cliente à Propriedade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Cliente *</Label>
              <Select value={linkForm.client_email} onValueChange={(v) => setLinkForm({ ...linkForm, client_email: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.email} value={c.email}>
                      {c.full_name || c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Propriedade *</Label>
              <Select value={linkForm.property_id} onValueChange={(v) => setLinkForm({ ...linkForm, property_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione uma propriedade" /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Consultor Responsável *</Label>
              <Select value={linkForm.consultor_email} onValueChange={(v) => setLinkForm({ ...linkForm, consultor_email: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um consultor" /></SelectTrigger>
                <SelectContent>
                  {consultors.map(c => (
                    <SelectItem key={c.email} value={c.email}>
                      {c.full_name || c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Cancelar</Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => linkMutation.mutate(linkForm)}
              disabled={linkMutation.isPending || !linkForm.client_email || !linkForm.property_id || !linkForm.consultor_email}
            >
              {linkMutation.isPending ? 'Vinculando...' : 'Vincular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}