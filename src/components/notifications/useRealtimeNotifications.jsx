import { useEffect, useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export function useRealtimeNotifications(userEmail) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const refetchTimeoutRef = useRef(null);

  useEffect(() => {
    if (!userEmail) return;

    const load = async () => {
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

    load();

    const unsubscribe = base44.entities.InAppNotification.subscribe((event) => {
      if (event.type === 'create') {
        if (event.data?.user_email === userEmail) {
          setNotifications(prev => [event.data, ...prev]);
        }
      } else if (event.type === 'update') {
        setNotifications(prev => prev.map(n => n.id === event.id ? event.data : n));
      } else if (event.type === 'delete') {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });

    // Refetch a cada 30 segundos para garantir sincronização
    const refetchInterval = setInterval(load, 30000);

    return () => {
      unsubscribe();
      clearInterval(refetchInterval);
      if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current);
    };
  }, [userEmail]);

  const markAsRead = useCallback(async (id) => {
    await base44.entities.InAppNotification.update(id, { read: true });
  }, []);

  const markAllAsRead = useCallback(async (notifs) => {
    const unread = notifs.filter(n => !n.read);
    await Promise.all(unread.map(n => base44.entities.InAppNotification.update(n.id, { read: true })));
  }, []);

  const deleteNotification = useCallback(async (id) => {
    await base44.entities.InAppNotification.delete(id);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification };
}