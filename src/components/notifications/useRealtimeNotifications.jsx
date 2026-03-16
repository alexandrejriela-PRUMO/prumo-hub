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
        // Remove duplicatas baseadas em title + event_type + created_date (mesma hora)
        const unique = [];
        const seen = new Set();
        for (const n of data) {
          const key = `${n.title}|${n.event_type}|${new Date(n.created_date).toISOString().slice(0, 13)}`;
          if (!seen.has(key)) {
            unique.push(n);
            seen.add(key);
          }
        }
        setNotifications(unique);
      } catch (error) {
        console.error('[Notif] Erro ao carregar notificações:', error);
      } finally {
        setLoading(false);
      }
    };

    load();

    const unsubscribe = base44.entities.InAppNotification.subscribe((event) => {
      if (event.type === 'create') {
        if (event.data?.user_email === userEmail) {
          // Evita duplicata: só adiciona se não existe com mesmo title + event_type nos últimos 5 minutos
          setNotifications(prev => {
            const isDuplicate = prev.some(n => 
              n.title === event.data.title && 
              n.event_type === event.data.event_type &&
              (Date.now() - new Date(n.created_date).getTime()) < 300000
            );
            return isDuplicate ? prev : [event.data, ...prev];
          });
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
    try {
      await base44.entities.InAppNotification.update(id, { read: true });
    } catch (error) {
      console.error('[Notif] Erro ao marcar como lido:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async (notifs) => {
    try {
      const unread = notifs.filter(n => !n.read);
      if (unread.length === 0) return;
      await Promise.all(unread.map(n => base44.entities.InAppNotification.update(n.id, { read: true })));
    } catch (error) {
      console.error('[Notif] Erro ao marcar todas como lidas:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      await base44.entities.InAppNotification.delete(id);
    } catch (error) {
      console.error('[Notif] Erro ao deletar notificação:', error);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification };
}