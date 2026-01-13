import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PropertyCard from '../components/dashboard/PropertyCard';
import QuickActions from '../components/dashboard/QuickActions';
import LicenseAlerts from '../components/dashboard/LicenseAlerts';
import InvoicesSummary from '../components/dashboard/InvoicesSummary';
import CommodityPrices from '../components/dashboard/CommodityPrices';
import CommodityHistory from '../components/dashboard/CommodityHistory';
import BlogPreview from '../components/dashboard/BlogPreview';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MapPin, Newspaper } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

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

  const { data: properties, isLoading: loadingProperties } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ owner_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: licenses, isLoading: loadingLicenses } = useQuery({
    queryKey: ['licenses', user?.email],
    queryFn: () => base44.entities.License.filter({ owner_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', user?.email],
    queryFn: () => base44.entities.Invoice.filter({ client_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const isLoading = loadingProperties || loadingLicenses || loadingInvoices;

  // Auto-select first property when properties load
  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) || properties[0];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header with Commodity Prices */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Olá, {user?.full_name?.split(' ')[0] || 'Cliente'}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Bem-vindo à sua área do cliente Santa Rute - Engenharia Rural</p>
        </div>
        <div className="flex flex-col gap-2 lg:min-w-[320px]">
          <CommodityPrices />
          <Link to={createPageUrl('Blog')} className="flex items-center justify-center gap-2 group">
            <div className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-all hover:scale-105 shadow-md">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-gray-600 group-hover:text-emerald-700 font-medium">
              Acesse o Santa Blog AQUI
            </span>
          </Link>
        </div>
      </div>

      {/* Property Selector */}
      {!isLoading && properties.length > 1 &&
      <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
          <MapPin className="w-5 h-5 text-emerald-600" />
          <span className="text-gray-700 font-medium">Selecionar Propriedade:</span>
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-72 bg-emerald-50 border-emerald-200">
              <SelectValue placeholder="Selecione uma propriedade" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((prop) =>
            <SelectItem key={prop.id} value={prop.id}>
                  {prop.property_name} - {prop.city}/{prop.state}
                </SelectItem>
            )}
            </SelectContent>
          </Select>
        </div>
      }

      {/* Property Card */}
      {isLoading ?
      <Skeleton className="h-64 w-full rounded-2xl" /> :

      <PropertyCard property={selectedProperty} />
      }

      {/* Quick Actions */}
      <QuickActions />

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {isLoading ?
        <>
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </> :

        <>
            <LicenseAlerts licenses={licenses} />
            <InvoicesSummary invoices={invoices} />
          </>
        }
      </div>

      {/* Commodity History */}
      <CommodityHistory />

      {/* Blog Preview */}
      <BlogPreview />
      </div>);

      }