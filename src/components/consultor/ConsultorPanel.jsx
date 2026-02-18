import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, AlertTriangle, FileX, TrendingUp, ArrowRight, Plus, Building2, Users, MessageCircle } from 'lucide-react';
import NewClientForm from './NewClientForm';
import ClientCRMPanel from './ClientCRMPanel';

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

export default function ConsultorPanel({ user, onEnterProperty }) {
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [crmProperty, setCrmProperty] = useState(null);

  const { data: properties, isLoading: loadingProperties } = useQuery({
    queryKey: ['consultor-properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ consultor_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: allLicenses } = useQuery({
    queryKey: ['all-licenses-consultor'],
    queryFn: () => base44.entities.License.list(),
    initialData: []
  });

  const { data: allAlerts } = useQuery({
    queryKey: ['all-alerts-consultor'],
    queryFn: () => base44.entities.EnvironmentalAlert.filter({ status: 'Aberto' }),
    initialData: []
  });

  // Separar clientes-apenas de propriedades reais
  const clientOnlyRecords = useMemo(() => properties.filter(p => p.is_client_only), [properties]);
  const realProperties = useMemo(() => properties.filter(p => !p.is_client_only), [properties]);

  const propertiesWithMetrics = useMemo(() => {
    return realProperties.map(property => {
      const propLicenses = allLicenses.filter(l => l.property_id === property.id);
      const propAlerts = allAlerts.filter(a => a.property_id === property.id);
      const now = new Date();
      const expiredLicenses = propLicenses.filter(l => l.expiry_date && new Date(l.expiry_date) <= now);
      const regularityScore = calcRegularity(propLicenses);
      const status = getPropertyStatus(regularityScore, expiredLicenses.length, propAlerts.length);
      return { ...property, regularityScore, expiredLicensesCount: expiredLicenses.length, activeAlertsCount: propAlerts.length, status };
    });
  }, [properties, allLicenses, allAlerts]);

  const criticalCount = propertiesWithMetrics.filter(p => p.status.label === 'Crítico').length;
  const attentionCount = propertiesWithMetrics.filter(p => p.status.label === 'Atenção').length;
  const avgRegularity = propertiesWithMetrics.length > 0
    ? Math.round(propertiesWithMetrics.reduce((acc, p) => acc + p.regularityScore, 0) / propertiesWithMetrics.length)
    : 0;
  const totalClients = properties.length;

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
            Olá, {user?.full_name?.split(' ')[0]}! Você tem {properties.length} cliente(s) vinculado(s).
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowNewClientForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Summary Cards */}
      {propertiesWithMetrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-emerald-900">{properties.length}</p>
              <p className="text-sm text-emerald-700 mt-1">Propriedades e Empreendimentos</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-900">{criticalCount}</p>
              <p className="text-sm text-red-700 mt-1">Críticas</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-900">{attentionCount}</p>
              <p className="text-sm text-amber-700 mt-1">Em Atenção</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-900">{avgRegularity}%</p>
              <p className="text-sm text-blue-700 mt-1">Regularidade Média</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Properties Grid */}
      {loadingProperties ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : propertiesWithMetrics.length === 0 ? (
        <Card className="border-dashed border-2 border-emerald-200">
          <CardContent className="py-16 text-center">
            <Building2 className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Nenhuma propriedade vinculada</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Cadastre suas propriedades. Ao criar uma nova propriedade,
              seu email será automaticamente vinculado como consultor responsável.
            </p>
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowNewClientForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Primeiro Cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {propertiesWithMetrics.map(property => (
            <Card
              key={property.id}
              className={`hover:shadow-lg transition-shadow ${property.status.borderLeft}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{property.property_name}</h3>
                    {property.client_name && (
                      <p className="text-xs text-gray-500 mt-0.5">Cliente: {property.client_name}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {property.city || '—'}/{property.state || '—'}
                      </span>
                    </div>
                  </div>
                  <Badge className={`${property.status.badgeColor} border ml-2 flex-shrink-0 text-xs`}>
                    {property.status.label}
                  </Badge>
                </div>

                {/* Regularity Bar */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Regularidade
                    </span>
                    <span className={`text-sm font-bold ${
                      property.regularityScore >= 80 ? 'text-green-600' :
                      property.regularityScore >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {property.regularityScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        property.regularityScore >= 80 ? 'bg-green-500' :
                        property.regularityScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${property.regularityScore}%` }}
                    />
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex gap-4 mb-4">
                  <div className="flex items-center gap-1">
                    <FileX className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-gray-600">{property.expiredLicensesCount} lic. vencida(s)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span className="text-xs text-gray-600">{property.activeAlertsCount} alerta(s)</span>
                  </div>
                </div>

                <Button
                  onClick={() => onEnterProperty(property)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  size="sm"
                >
                  Acessar Dashboard
                  <ArrowRight className="w-3 h-3 ml-1" />
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
    </div>
  );
}