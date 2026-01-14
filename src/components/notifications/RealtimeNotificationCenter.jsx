import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useRealtimeNotifications } from '@/components/notifications/useRealtimeNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Cloud, Trash2, Check, Bell } from 'lucide-react';
import { toast } from 'sonner';

export default function RealtimeNotificationCenter({ user, isOpen, onClose }) {
  const { notifications, unreadCount, markAsRead, deleteNotification } = useRealtimeNotifications(user?.email);

  const severityIcons = {
    baixa: '🔵',
    media: '🟡',
    alta: '🔴',
    critica: '🔴'
  };

  const typeIcons = {
    alerta_ambiental: <AlertTriangle className="w-4 h-4" />,
    alerta_climatico: <Cloud className="w-4 h-4" />,
    sistema: <Bell className="w-4 h-4" />,
    atualizado_dados: <Check className="w-4 h-4" />
  };

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end pt-20">
      <Card className="w-full max-w-md h-[calc(100vh-80px)] rounded-none border-l flex flex-col">
        <CardHeader className="border-b sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
              {unreadCount > 0 && (
                <Badge className="bg-red-500">{unreadCount}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>✕</Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6">
              <Bell className="w-12 h-12 text-gray-300 mb-3" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border transition-all ${
                    notification.read
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-blue-50 border-blue-200 shadow-sm'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {typeIcons[notification.type] || <Bell className="w-4 h-4" />}
                        <h4 className="font-semibold text-sm text-gray-900 truncate">
                          {notification.title}
                        </h4>
                        <span className="text-lg">{severityIcons[notification.severity]}</span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.created_date).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!notification.read && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleMarkAsRead(notification.id)}
                          title="Marcar como lida"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleDelete(notification.id)}
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}