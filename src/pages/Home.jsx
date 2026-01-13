import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PropertyCard from '../components/dashboard/PropertyCard';
import QuickActions from '../components/dashboard/QuickActions';
import LicenseAlerts from '../components/dashboard/LicenseAlerts';
import InvoicesSummary from '../components/dashboard/InvoicesSummary';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [user, setUser] = useState(null);

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
    initialData: [],
  });

  const { data: licenses, isLoading: loadingLicenses } = useQuery({
    queryKey: ['licenses', user?.email],
    queryFn: () => base44.entities.License.filter({ owner_email: user.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', user?.email],
    queryFn: () => base44.entities.Invoice.filter({ client_email: user.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const isLoading = loadingProperties || loadingLicenses || loadingInvoices;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Olá, {user?.full_name?.split(' ')[0] || 'Cliente'}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Bem-vindo à sua área do cliente Santa Rute Engenharia Rural</p>
      </div>

      {/* Property Card */}
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <PropertyCard property={properties[0]} />
      )}

      {/* Quick Actions */}
      <QuickActions />

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </>
        ) : (
          <>
            <LicenseAlerts licenses={licenses} />
            <InvoicesSummary invoices={invoices} />
          </>
        )}
      </div>
    </div>
  );
}