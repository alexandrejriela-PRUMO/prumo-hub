import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useRealtimeNotifications(userEmail) {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userEmail) return;

    // Iniciar subscription em tempo real para notificações
    const unsubscribe = base44.entities.InAppNotification.subscribe((event) => {
      if (event.data?.user_email === userEmail) {
        if (event.type === 'create') {
          setNotifications(prev => [event.data, ...prev]);
          // Enviar notificação push se habilitada
          sendPushNotification(event.data);
        } else if (event.type === 'update') {
          setNotifications(prev =>
            prev.map(n => n.id === event.id ? event.data : n)
          );
        } else if (event.type === 'delete') {
          setNotifications(prev => prev.filter(n => n.id !== event.id));
        }
      }
    });

    setIsConnected(true);

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [userEmail]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await base44.entities.InAppNotification.update(notificationId, { read: true });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n =>
          base44.entities.InAppNotification.update(n.id, { read: true })
        )
      );
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
    }
  }, [notifications]);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await base44.entities.InAppNotification.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  }, []);

  return {
    notifications,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
}

function sendPushNotification(notification) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: `notification-${notification.id}`
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: `notification-${notification.id}`
        });
      }
    });
  }
}