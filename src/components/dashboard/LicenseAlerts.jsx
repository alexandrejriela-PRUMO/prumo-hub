import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LicenseAlerts({ licenses }) {
  const today = new Date();

  const getLicenseStatus = (license) => {
    if (!license.expiry_date) return { status: 'unknown', label: 'Sem data' };
    
    const expiryDate = parseISO(license.expiry_date);
    const daysUntilExpiry = differenceInDays(expiryDate, today);

    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Vencida', color: 'bg-red-100 text-red-700 border-red-200' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'warning', label: `Vence em ${daysUntilExpiry} dias`, color: 'bg-amber-100 text-amber-700 border-amber-200' };
    } else if (daysUntilExpiry <= 90) {
      return { status: 'attention', label: `Vence em ${daysUntilExpiry} dias`, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    }
    return { status: 'ok', label: 'Vigente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  const sortedLicenses = [...licenses].sort((a, b) => {
    if (!a.expiry_date) return 1;
    if (!b.expiry_date) return -1;
    return new Date(a.expiry_date) - new Date(b.expiry_date);
  });

  const importantLicenses = sortedLicenses.slice(0, 4);

  if (licenses.length === 0) {
    return (
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Licenças Ambientais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Nenhuma licença cadastrada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-100">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-gray-900">Licenças Ambientais</CardTitle>
        <Link 
          to={createPageUrl('Licenses')} 
          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          Ver todas <ArrowRight className="w-4 h-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {importantLicenses.map((license) => {
            const statusInfo = getLicenseStatus(license);
            return (
              <div key={license.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    statusInfo.status === 'expired' ? 'bg-red-100' :
                    statusInfo.status === 'warning' ? 'bg-amber-100' :
                    'bg-emerald-100'
                  }`}>
                    {statusInfo.status === 'expired' ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : statusInfo.status === 'warning' ? (
                      <Clock className="w-5 h-5 text-amber-600" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{license.license_type}</p>
                    <p className="text-sm text-gray-500">
                      {license.expiry_date 
                        ? format(parseISO(license.expiry_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : 'Data não informada'}
                    </p>
                  </div>
                </div>
                <Badge className={`${statusInfo.color} border`}>
                  {statusInfo.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}