import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_COLORS = {
  error: 'text-red-600 bg-red-50',
  warning: 'text-amber-600 bg-amber-50',
  success: 'text-green-600 bg-green-50',
  info: 'text-blue-600 bg-blue-50',
};

export default function NotificationStats({ userEmail }) {
  const { data: notifications = [] } = useQuery({
    queryKey: ['notificationStats', userEmail],
    queryFn: () => base44.entities.InAppNotification.filter(
      { user_email: userEmail },
      '-created_date',
      50
    ),
    enabled: !!userEmail,
    refetchInterval: 30000, // Refresh a cada 30s
  });

  const unread = notifications.filter(n => !n.read).length;
  const critical = notifications.filter(n => n.severity === 'error').length;
  const warnings = notifications.filter(n => n.severity === 'warning').length;

  const severityStats = {
    error: critical,
    warning: warnings,
    info: notifications.filter(n => n.severity === 'info').length,
    success: notifications.filter(n => n.severity === 'success').length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Não Lidas */}
      <Card className={cn('border-l-4', unread > 0 ? 'border-l-blue-500 bg-blue-50' : 'border-l-gray-200')}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-600 font-medium">Não Lidas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{unread}</p>
            </div>
            <Bell className={cn('w-5 h-5', unread > 0 ? 'text-blue-600' : 'text-gray-400')} />
          </div>
        </CardContent>
      </Card>

      {/* Críticas */}
      <Card className={cn('border-l-4', critical > 0 ? 'border-l-red-500 bg-red-50' : 'border-l-gray-200')}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-600 font-medium">Críticas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{critical}</p>
            </div>
            <AlertTriangle className={cn('w-5 h-5', critical > 0 ? 'text-red-600' : 'text-gray-400')} />
          </div>
        </CardContent>
      </Card>

      {/* Avisos */}
      <Card className={cn('border-l-4', warnings > 0 ? 'border-l-amber-500 bg-amber-50' : 'border-l-gray-200')}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-600 font-medium">Avisos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{warnings}</p>
            </div>
            <Clock className={cn('w-5 h-5', warnings > 0 ? 'text-amber-600' : 'text-gray-400')} />
          </div>
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="border-l-4 border-l-emerald-500 bg-emerald-50">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-600 font-medium">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{notifications.length}</p>
            </div>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}