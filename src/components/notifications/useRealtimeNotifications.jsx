import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useRealtimeNotifications(userEmail) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;

    const loadInitialNotifications = async () => {
      try {
        const data = await base44.entities.InAppNotification.filter(
          { user_email: userEmail },
          '-created_date',
          100
        );
        setNotifications(data);
      } catch (error) {
        console.error('Erro ao carregar notificações:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialNotifications();

    const unsubscribe = base44.entities.InAppNotification.subscribe((event) => {
      if (event.type === 'create' && event.data?.user_email === userEmail) {
        setNotifications(prev => [event.data, ...prev]);
      } else if (event.type === 'update') {
        setNotifications(prev => prev.map(n => n.id === event.id ? event.data : n));
      } else if (event.type === 'delete') {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });

    return () => unsubscribe();
  }, [userEmail]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await base44.entities.InAppNotification.update(notificationId, { read: true });
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      try {
        await base44.entities.InAppNotification.update(n.id, { read: true });
      } catch (e) {
        console.error(e);
      }
    }
  }, [notifications]);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await base44.entities.InAppNotification.delete(notificationId);
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification };
}