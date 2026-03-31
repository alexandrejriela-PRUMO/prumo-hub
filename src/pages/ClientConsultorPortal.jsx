import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, FileCheck, AlertTriangle, Scale, FileText, MapPin, Eye, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ClientConsultorPortal() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  // Busca TODAS as propriedades e filtra localmente pelas que têm o email do usuário em authorized_users
  const { data: allProperties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ['client-consultor-properties', user?.email],
    queryFn: () => base44.entities.Property.list('-created_date', 500),
    enabled: !!user?.email,
  });

  // Filtra propriedades onde o email do usuário consta em authorized_users (JSON string ou array)
  const properties = allProperties.filter(prop => {
    if (!prop.authorized_users) return false;
    try {
      const au = Array.isArray(prop.authorized_users)
        ? prop.authorized_users
        : JSON.parse(prop.authorized_users);
      return Array.isArray(au) && au.some(u => u.email === user?.email);
    } catch {
      return false;
    }
  });

  const { data: licenses = [] } = useQuery({
    queryKey: ['client-licenses', properties.map(p => p.id).join(',')],
    queryFn: () => {
      if (properties.length === 0) return [];
      // Busca licenças das propriedades vinculadas
      return Promise.all(
        properties.map(p => base44.entities.License.filter({ property_id: p.id }))
      ).then(results => results.flat());
    },
    enabled: properties.length > 0,
    initialData: []
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['client-alerts', properties.map(p => p.id).join(',')],
    queryFn: () => Promise.all(
      properties.map(p => base44.entities.EnvironmentalAlert.filter({ property_id: p.id }))
    ).then(r => r.flat()),
    enabled: properties.length > 0,
    initialData: []
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['client-processes', properties.map(p => p.id).join(',')],
    queryFn: () => Promise.all(
      properties.map(p => base44.entities.Process.filter({ property_id: p.id }))
    ).then(r => r.flat()),
    enabled: properties.length > 0,
    initialData: []
  });

  const property = properties[0];
  const now = new Date();
  const expiredLicenses = licenses.filter(l => l.expiry_date && new Date(l.expiry_date) < now);
  const activeLicenses = licenses.filter(l => l.status === 'Vigente');
  const openAlerts = alerts.filter(a => a.status === 'Aberto');

  const modules = [
    { name: 'Documentos', page: 'DocumentsHub', icon: FileText, bg: 'bg-blue-50', iconColor: 'text-blue-600', desc: 'Visualizar e baixar documentos' },
    { name: 'Licenças e Projetos', page: 'Licenses', icon: FileCheck, bg: 'bg-emerald-50', iconColor: 'text-emerald-600', desc: `${activeLicenses.length} licença(s) ativa(s)` },
    { name: 'Processos', page: 'Processes', icon: Scale, bg: 'bg-purple-50', iconColor: 'text-purple-600', desc: `${processes.length} processo(s)` },
    { name: 'Alertas de Infrações', page: 'EnvironmentalAlerts', icon: AlertTriangle, bg: 'bg-amber-50', iconColor: 'text-amber-600', desc: `${openAlerts.length} alerta(s) aberto(s)` },
    { name: 'Termômetro de Regularidade', page: 'RegularityReport', icon: FileCheck, bg: 'bg-teal-50', iconColor: 'text-teal-600', desc: 'Índice de conformidade ambiental' },
    { name: 'PRAD', page: 'PRAD', icon: Leaf, bg: 'bg-green-50', iconColor: 'text-green-600', desc: 'Plano de recuperação de área' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {user?.full_name?.split(' ')[0] || 'Cliente'}! 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Portal do Cliente — acesso exclusivo à sua propriedade</p>
      </div>

      {/* Property Info */}
      {loadingProperties ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : property ? (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-white shadow-sm">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl flex-shrink-0">
              <Building2 className="w-7 h-7 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-emerald-900">{property.property_name}</h2>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {property.city && property.state ? `${property.city} / ${property.state}` : 'Localização não informada'}
              </p>
              {property.total_hectares && (
                <p className="text-xs text-emerald-700 mt-0.5 font-medium">{property.total_hectares} hectares</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 sm:items-end">
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">Sua Propriedade</Badge>
              {expiredLicenses.length > 0 && (
                <Badge className="bg-red-100 text-red-700 border border-red-200">{expiredLicenses.length} licença(s) vencida(s)</Badge>
              )}
              {openAlerts.length > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border border-amber-200">{openAlerts.length} alerta(s) em aberto</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2 border-emerald-200">
          <CardContent className="py-10 text-center">
            <Building2 className="w-12 h-12 mx-auto text-emerald-300 mb-3" />
            <p className="text-gray-600 font-medium">Nenhuma propriedade vinculada ao seu acesso.</p>
            <p className="text-sm text-gray-400 mt-1">Entre em contato com seu consultor responsável.</p>
          </CardContent>
        </Card>
      )}

      {/* Info banner somente leitura */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Eye className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Acesso somente leitura e download.</span>
          {' '}Você pode visualizar andamentos, históricos e baixar documentos. Para solicitar alterações, entre em contato com seu consultor.
        </p>
      </div>

      {/* Modules Grid */}
      {property && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Módulos disponíveis</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link key={mod.page} to={createPageUrl(mod.page)}>
                  <Card className="border border-gray-200 hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className={`inline-flex p-2 rounded-lg ${mod.bg} mb-2.5`}>
                        <Icon className={`w-4 h-4 ${mod.iconColor}`} />
                      </div>
                      <p className="font-semibold text-sm text-gray-900 leading-tight">{mod.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{mod.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}