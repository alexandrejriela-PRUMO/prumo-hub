import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  X, 
  Check, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  XCircle,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useRealtimeNotifications } from './useRealtimeNotifications';

const severityConfig = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
};

export default function NotificationCenter({ user, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const { notifications, markAsRead, markAllAsRead, deleteNotification } = useRealtimeNotifications(user?.email);

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inAppNotifications'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) => deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inAppNotifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inAppNotifications'] });
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 z-50 lg:hidden" onClick={onClose}>
      <div 
        className="absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-emerald-600 to-emerald-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-white" />
                <h2 className="text-lg font-semibold text-white">Notificações</h2>
                {unreadCount > 0 && (
                  <Badge className="bg-amber-500 text-white">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-emerald-800"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="text-white hover:bg-emerald-800 text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <ScrollArea className="flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Bell className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Nenhuma notificação</p>
                <p className="text-sm text-gray-400 mt-1">
                  Você está em dia com tudo!
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => {
                  const config = severityConfig[notification.severity] || severityConfig.info;
                  const Icon = config.icon;

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`font-semibold text-sm ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </h4>
                            <Button
                               variant="ghost"
                               size="icon"
                               className="h-6 w-6 text-gray-400 hover:text-red-600"
                               onClick={() => deleteNotificationMutation.mutate(notification.id)}
                               disabled={deleteNotificationMutation.isPending}
                             >
                               <Trash2 className="w-3 h-3" />
                             </Button>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>
                              {format(new Date(notification.created_date), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                            </span>
                            {!notification.read && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Nova
                              </Badge>
                            )}
                          </div>

                          {notification.link && (
                            <Link 
                              to={notification.link}
                              onClick={() => {
                                if (!notification.read) {
                                  markAsReadMutation.mutate(notification.id);
                                }
                                onClose();
                              }}
                            >
                              <Button 
                                variant="link" 
                                className="h-auto p-0 text-xs text-emerald-600 hover:text-emerald-700 mt-2"
                              >
                                Ver detalhes →
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}