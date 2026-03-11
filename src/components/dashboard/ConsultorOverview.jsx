import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, TrendingUp, Building2, BarChart3, Eye } from 'lucide-react';

export default function ConsultorOverview({ user, properties, isLoading }) {
  const navigate = useNavigate();


  const propertyIds = properties.map(p => p.id);

  const { data: licenses = [] } = useQuery({
    queryKey: ['licenses', user?.email],
    queryFn: () => base44.entities.License.filter({ owner_email: { $in: properties.map(p => p.owner_email) } }),
    enabled: !!user?.email && properties.length > 0,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', user?.email],
    queryFn: () => base44.entities.EnvironmentalAlert.filter({ property_id: { $in: propertyIds } }),
    enabled: properties.length > 0,
  });

  const { data: allDocuments = [] } = useQuery({
    queryKey: ['documents-overview', user?.email],
    queryFn: async () => {
      const results = await Promise.all(
        propertyIds.map(pid => Promise.all([
          base44.entities.Document.filter({ property_id: pid }),
          base44.entities.UnifiedDocument.filter({ entity_id: pid })
        ]))
      );
      return results.flat(2);
    },
    enabled: properties.length > 0,
  });

  const { data: allGeo = [] } = useQuery({
    queryKey: ['geo-overview', user?.email],
    queryFn: async () => {
      const results = await Promise.all(
        propertyIds.map(pid => base44.entities.Georeferencing.filter({ property_id: pid }))
      );
      return results.flat();
    },
    enabled: properties.length > 0,
  });

  const { data: allProcesses = [] } = useQuery({
    queryKey: ['processes-overview', user?.email],
    queryFn: async () => {
      const results = await Promise.all(
        propertyIds.map(pid => base44.entities.Process.filter({ property_id: pid }))
      );
      return results.flat();
    },
    enabled: properties.length > 0,
  });

  // Calcula regularidade usando a mesma lógica do termômetro
  const calcRegularity = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    let score = 0;

    // Licenças (35 pts)
    const propLicenses = licenses.filter(l => l.property_id === propertyId);
    if (propLicenses.length === 0) {
      score += 0;
    } else {
      const now = new Date();
      const expired = propLicenses.filter(l => !l.expiry_date || new Date(l.expiry_date) <= now);
      const expiringSoon = propLicenses.filter(l => {
        if (!l.expiry_date) return false;
        const days = Math.floor((new Date(l.expiry_date) - now) / (1000 * 60 * 60 * 24));
        return days > 0 && days <= 30;
      });
      if (expired.length === 0 && expiringSoon.length === 0) score += 35;
      else if (expired.length === 0) score += 22;
      else score += 10;
    }

    // Documentos (25 pts)
    const propDocs = allDocuments.filter(d => d.property_id === propertyId || d.entity_id === propertyId);
    const hasCAR = propDocs.some(d => d.document_type === 'CAR');
    const hasCCIR = propDocs.some(d => d.document_type === 'CCIR');
    const hasGeoDoc = propDocs.some(d => d.document_type === 'Georreferenciamento');
    if (hasCAR) score += 10;
    if (hasCCIR) score += 8;
    if (hasGeoDoc) score += 7;

    // Georreferenciamento (15 pts)
    const propGeo = allGeo.filter(g => g.property_id === propertyId);
    const regularGeo = propGeo.find(g => g.status === 'Regular');
    if (regularGeo) score += 15;
    else if (propGeo.length > 0) score += 10;
    else if (property?.coordinates) score += 15;

    // Processos (10 pts)
    const propProcesses = allProcesses.filter(p => p.property_id === propertyId);
    const activeProcesses = propProcesses.filter(p => p.status === 'Em Andamento');
    if (activeProcesses.length === 0) score += 10;
    else score += 4;

    // Alertas de Infrações (15 pts)
    const propAlerts = alerts.filter(a => a.property_id === propertyId && (a.status === 'Aberto' || a.status === 'Em Análise'));
    const criticalAlerts2 = propAlerts.filter(a => a.severity === 'Crítica' || a.severity === 'Alta');
    if (propAlerts.length === 0) score += 15;
    else if (criticalAlerts2.length > 0) score += 0;
    else score += 8;

    return score;
  };

  // Conta alertas por propriedade
  const countAlertsByProperty = (propertyId, severity) => {
    return alerts.filter(a => a.property_id === propertyId && (severity ? a.severity === severity : true)).length;
  };

  // Categoriza propriedades por status
  const getPropertyStatus = (propertyId) => {
    const regularity = calcRegularity(propertyId);
    const criticalAlerts = countAlertsByProperty(propertyId, 'Crítica');
    const highAlerts = countAlertsByProperty(propertyId, 'Alta');

    if (criticalAlerts > 0 || regularity < 30) return 'critical';
    if (highAlerts > 0 || regularity < 60) return 'attention';
    return 'normal';
  };

  // Filter out client-only records without properties
  const propertiesWithClients = properties.filter(p => !p.is_client_only);

  const criticalCount = propertiesWithClients.filter(p => getPropertyStatus(p.id) === 'critical').length;
  const attentionCount = propertiesWithClients.filter(p => getPropertyStatus(p.id) === 'attention').length;
  const avgRegularity = Math.round(propertiesWithClients.reduce((acc, p) => acc + calcRegularity(p.id), 0) / (propertiesWithClients.length || 1));

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-64 rounded-xl" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Olá, {user?.full_name?.split(' ')[0]}! 👋</h1>
          <p className="text-gray-500 mt-1">Resumo da carteira de clientes</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Propriedades e Empreendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold">{propertiesWithClients.length}</div>
              <Building2 className="w-8 h-8 text-emerald-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Alerta Crítico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-red-700">{criticalCount}</div>
              <AlertTriangle className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Em Atenção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-yellow-700">{attentionCount}</div>
              <TrendingUp className="w-8 h-8 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Regularidade Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-emerald-700">{avgRegularity}%</div>
              <BarChart3 className="w-8 h-8 text-emerald-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Properties Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Propriedades e Empreendimentos</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {propertiesWithClients.map((property) => {
            const status = getPropertyStatus(property.id);
            const regularity = calcRegularity(property.id);
            const totalAlerts = countAlertsByProperty(property.id);
            
            const statusConfig = {
              critical: { color: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-800', icon: 'text-red-600' },
              attention: { color: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-800', icon: 'text-yellow-600' },
              normal: { color: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-800', icon: 'text-emerald-600' }
            };

            const config = statusConfig[status];

            return (
              <Card key={property.id} className={`${config.color} border-2`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{property.property_name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{property.city}/{property.state}</p>
                      {property.client_name && <p className="text-xs text-gray-500 mt-1">Cliente: {property.client_name}</p>}
                    </div>
                    <Badge className={config.badge}>
                      {status === 'critical' ? 'Crítica' : status === 'attention' ? 'Atenção' : 'Normal'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Regularidade</span>
                      <span className="font-semibold">{regularity}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          regularity >= 70 ? 'bg-emerald-600' : regularity >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${regularity}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white/50 rounded p-2">
                      <p className="text-gray-600">Alertas Ativos</p>
                      <p className="text-xl font-semibold">{totalAlerts}</p>
                    </div>
                    <div className="bg-white/50 rounded p-2">
                      <p className="text-gray-600">Tipo</p>
                      <p className="text-sm font-semibold">{property.property_type === 'urbano' ? 'Urbano' : 'Rural'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`${createPageUrl('Home')}?property_id=${property.id}`)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>


    </div>
  );
}