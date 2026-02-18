import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, AlertTriangle, TrendingUp, ArrowRight, Plus, Building2, Users, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NewClientForm from '../components/consultor/NewClientForm';
import ClientCRMPanel from '../components/consultor/ClientCRMPanel';
import ClientFinancialSummary from '../components/consultor/ClientFinancialSummary';

function calcRegularity(licenses) {
  if (!licenses || licenses.length === 0) return 30;
  const now = new Date();
  const expired = licenses.filter(l => l.expiry_date && new Date(l.expiry_date) <= now);
  const soonExpiring = licenses.filter(l => {
    if (!l.expiry_date) return false;
    const days = Math.floor((new Date(l.expiry_date) - now) / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 30;
  });
  if (expired.length === 0 && soonExpiring.length === 0) return 90;
  if (expired.length === 0) return 70;
  return 40;
}

function getPropertyStatus(regularityScore, expiredCount, alertsCount) {
  if (expiredCount > 0 || regularityScore < 50) return {
    label: 'Crítico',
    badgeColor: 'bg-red-100 text-red-700 border-red-200',
    borderLeft: 'border-l-4 border-l-red-500'
  };
  if (alertsCount > 0 || regularityScore < 80) return {
    label: 'Atenção',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    borderLeft: 'border-l-4 border-l-amber-500'
  };
  return {
    label: 'Normal',
    badgeColor: 'bg-green-100 text-green-700 border-green-200',
    borderLeft: 'border-l-4 border-l-green-500'
  };
}

export default function ConsultorClients() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [crmProperty, setCrmProperty] = useState(null);

  React.useEffect(() => {
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

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['consultor-clients', user?.email],
    queryFn: () => base44.entities.ClientCRM.filter({ consultor_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: clientProperties = [] } = useQuery({
    queryKey: ['client-properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ consultor_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  // Conta propriedades por cliente
  const clientPropertiesCount = useMemo(() => {
    return clients.map(client => ({
      ...client,
      propertyCount: clientProperties.filter(p => p.owner_email === client.client_email).length
    }));
  }, [clients, clientProperties]);



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
            Olá, {user?.full_name?.split(' ')[0]}! Você tem {clients.length} cliente(s) vinculado(s).
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowNewClientForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          + Novo Cliente
        </Button>
      </div>

      {/* Loading State */}
      {loadingClients && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      )}

      {/* Empty State */}
      {!loadingClients && clients.length === 0 && (
        <Card className="border-dashed border-2 border-emerald-200">
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Nenhum cliente cadastrado</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Cadastre seus primeiro cliente para começar a gerenciar seu relacionamento.
            </p>
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowNewClientForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Primeiro Cliente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Clients Grid */}
      {!loadingClients && clients.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientPropertiesCount.map(client => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow flex flex-col">
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{client.client_email?.split('@')[0]}</h3>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {client.client_email}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  <Badge className={`
                    ${client.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' :
                      client.status === 'Em Negociação' ? 'bg-blue-100 text-blue-800' :
                      client.status === 'Prospect' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-800'}
                  `}>
                    {client.status}
                  </Badge>
                </div>

                {/* Properties Count */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Propriedades vinculadas</span>
                    <span className="text-lg font-bold text-emerald-700">{client.propertyCount}</span>
                  </div>
                </div>

                {/* Financial Summary */}
                {client.services && client.services.length > 0 && (
                  <div className="bg-emerald-50 rounded-lg p-3 mb-4 text-sm">
                    <div className="font-semibold text-emerald-900 mb-2">Serviços Ativos</div>
                    <div className="text-xs text-emerald-700">
                      {client.services.filter(s => s.status === 'Contratado' || s.status === 'Em Andamento').length} de {client.services.length}
                    </div>
                  </div>
                )}

                {/* CRM Button */}
                <Button
                  onClick={() => setCrmProperty(client)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 mt-auto"
                  size="sm"
                >
                  <MessageCircle className="w-3 h-3 mr-2" />
                  Ver CRM & Financeiro
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <NewClientForm
        isOpen={showNewClientForm}
        onClose={() => setShowNewClientForm(false)}
        consultorEmail={user?.email}
        onSuccess={() => setShowNewClientForm(false)}
      />

      {/* CRM Modal */}
      <Dialog open={!!crmProperty} onOpenChange={() => setCrmProperty(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <MessageCircle className="w-5 h-5" />
              CRM — {crmProperty?.client_name || crmProperty?.property_name}
            </DialogTitle>
          </DialogHeader>
          {crmProperty && <ClientCRMPanel property={crmProperty} onClose={() => setCrmProperty(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}