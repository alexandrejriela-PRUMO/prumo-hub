import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Link, Unlink, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PropertyLinkManager({ client, properties, onRefresh }) {
  const queryClient = useQueryClient();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  // Propriedades vinculadas ao cliente
  const linkedProperties = useMemo(() => {
    return properties.filter(p => {
      if (client.property_id && p.id === client.property_id) return true;
      if (client.client_email && p.owner_email === client.client_email) return true;
      if (client.client_name && p.client_name === client.client_name) return true;
      return false;
    });
  }, [properties, client]);

  // Propriedades disponíveis para vincular
  const availableProperties = useMemo(() => {
    return properties.filter(p => !linkedProperties.some(lp => lp.id === p.id));
  }, [properties, linkedProperties]);

  const linkProperty = useMutation({
    mutationFn: async (propertyId) => {
      const property = properties.find(p => p.id === propertyId);
      // Atualiza propriedade com dados do cliente
      await base44.entities.Property.update(propertyId, {
        owner_email: client.client_email,
        client_name: client.client_name,
      });
      // Atualiza CRM com referência à propriedade
      if (client.id) {
        await base44.entities.ClientCRM.update(client.id, { property_id: propertyId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultor-properties'] });
      queryClient.invalidateQueries({ queryKey: ['consultor-crm-clients'] });
      toast.success('Propriedade vinculada!');
      setShowLinkDialog(false);
      setSelectedPropertyId('');
      onRefresh?.();
    },
    onError: (err) => toast.error('Erro ao vincular: ' + (err.message || 'tente novamente')),
  });

  const unlinkProperty = useMutation({
    mutationFn: async (propertyId) => {
      const property = properties.find(p => p.id === propertyId);
      // Remove cliente da propriedade
      await base44.entities.Property.update(propertyId, {
        owner_email: property.owner_email, // mantém original ou limpa
        client_name: '',
      });
      // Remove propriedade do CRM se foi a principal
      if (client.id && client.property_id === propertyId) {
        await base44.entities.ClientCRM.update(client.id, { property_id: '' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultor-properties'] });
      queryClient.invalidateQueries({ queryKey: ['consultor-crm-clients'] });
      toast.success('Propriedade desvinculada!');
      onRefresh?.();
    },
    onError: (err) => toast.error('Erro ao desvincular: ' + (err.message || 'tente novamente')),
  });

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-700">Propriedades Vinculadas ({linkedProperties.length})</p>
          </div>
          {availableProperties.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setShowLinkDialog(true)} className="gap-1 text-xs">
              <Link className="w-3 h-3" /> Vincular
            </Button>
          )}
        </div>

        {linkedProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="w-10 h-10 text-gray-200 mb-2" />
            <p className="text-xs text-gray-400">Nenhuma propriedade vinculada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {linkedProperties.map(prop => (
              <div key={prop.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{prop.property_name}</p>
                  <p className="text-xs text-gray-500">
                    {prop.city}{prop.state ? `/${prop.state}` : ''} · {prop.property_type === 'urbano' ? 'Urbano' : 'Rural'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => unlinkProperty.mutate(prop.id)}
                  disabled={unlinkProperty.isPending}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                  title="Desvincular propriedade"
                >
                  <Unlink className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Dialog de vinculação */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Vincular Propriedade
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {availableProperties.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">
                    Todas as propriedades já estão vinculadas ou nenhuma disponível.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-2">Selecione a propriedade</label>
                    <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha uma propriedade..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProperties.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.property_name} · {p.city}{p.state ? `/${p.state}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" onClick={() => {
                      setShowLinkDialog(false);
                      setSelectedPropertyId('');
                    }}>
                      Cancelar
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => linkProperty.mutate(selectedPropertyId)}
                      disabled={!selectedPropertyId || linkProperty.isPending}
                    >
                      {linkProperty.isPending ? 'Vinculando...' : 'Vincular'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}