import { useEffect, useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export function useRealtimeNotifications(userEmail) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    if (!userEmail) return;
    try {
      const data = await base44.entities.InAppNotification.filter(
        { user_email: userEmail },
        '-created_date',
        100
      );
      // Remove duplicatas baseadas em title + event_type + hora (mesma hora)
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
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;

    load();

    // Subscribe a mudanças em tempo real
    const unsubscribe = base44.entities.InAppNotification.subscribe((event) => {
      if (event.type === 'create') {
        if (event.data?.user_email === userEmail) {
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
        // Atualiza o item no estado local imediatamente
        setNotifications(prev => prev.map(n => n.id === event.id ? { ...n, ...event.data } : n));
      } else if (event.type === 'delete') {
        // Remove do estado local imediatamente
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });

    // Refetch a cada 60s (era 30s, aumentado para reduzir race conditions)
    intervalRef.current = setInterval(load, 60000);

    return () => {
      unsubscribe();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userEmail, load]);

  const markAsRead = useCallback(async (id) => {
    // Atualização otimista imediata no estado local
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await base44.entities.InAppNotification.update(id, { read: true });
    } catch (error) {
      console.error('[Notif] Erro ao marcar como lido:', error);
      // Reverte em caso de erro
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
    }
  }, []);

  const markAllAsRead = useCallback(async (notifs) => {
    const unread = notifs.filter(n => !n.read);
    if (unread.length === 0) return;
    const ids = unread.map(n => n.id);
    // Atualização otimista imediata
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
    try {
      await Promise.all(unread.map(n => base44.entities.InAppNotification.update(n.id, { read: true })));
    } catch (error) {
      console.error('[Notif] Erro ao marcar todas como lidas:', error);
      // Em caso de erro, refaz o fetch para sincronizar
      load();
    }
  }, [load]);

  const deleteNotification = useCallback(async (id) => {
    // Remove imediatamente do estado local
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await base44.entities.InAppNotification.delete(id);
    } catch (error) {
      console.error('[Notif] Erro ao deletar notificação:', error);
      // Em caso de erro, refaz o fetch para sincronizar
      load();
    }
  }, [load]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification };
}