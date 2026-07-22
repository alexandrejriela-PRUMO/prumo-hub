import { useEffect, useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useRealtimeNotifications(userEmail) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  // Rastreia IDs deletados e lidos localmente para sobreviver ao reload periódico
  const deletedIds = useRef(new Set());
  const readIds = useRef(new Set());

  const load = useCallback(async () => {
    if (!userEmail) return;
    try {
      const data = await base44.entities.InAppNotification.filter(
        { user_email: userEmail },
        '-created_date',
        100
      );
      setNotifications(prev => {
        // Remove duplicatas por title + event_type + hora
        const unique = [];
        const seen = new Set();
        for (const n of data) {
          // Pula IDs que foram deletados localmente (ainda não propagados)
          if (deletedIds.current.has(n.id)) continue;
          const key = `${n.title}|${n.event_type}|${new Date(n.created_date).toISOString().slice(0, 13)}`;
          if (!seen.has(key)) {
            // Aplica estado de lido local se já foi marcado localmente
            const isRead = readIds.current.has(n.id) ? true : n.read;
            unique.push({ ...n, read: isRead });
            seen.add(key);
          }
        }
        return unique;
      });
    } catch (error) {
      console.error('[Notif] Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;

    load();

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
        setNotifications(prev => prev.map(n => n.id === event.id ? { ...n, ...event.data } : n));
      } else if (event.type === 'delete') {
        deletedIds.current.add(event.id);
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });

    // Refetch a cada 90s
    intervalRef.current = setInterval(load, 90000);

    return () => {
      unsubscribe();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userEmail, load]);

  const markAsRead = useCallback(async (id) => {
    readIds.current.add(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await base44.entities.InAppNotification.update(id, { read: true });
    } catch (error) {
      console.error('[Notif] Erro ao marcar como lido:', error);
      readIds.current.delete(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
    }
  }, []);

  const markAllAsRead = useCallback(async (notifs) => {
    const unread = notifs.filter(n => !n.read);
    if (unread.length === 0) return;
    const ids = unread.map(n => n.id);
    ids.forEach(id => readIds.current.add(id));
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
    try {
      await Promise.all(unread.map(n => base44.entities.InAppNotification.update(n.id, { read: true })));
    } catch (error) {
      console.error('[Notif] Erro ao marcar todas como lidas:', error);
      load();
    }
  }, [load]);

  const deleteNotification = useCallback(async (id) => {
    console.log('[Notif] Tentando excluir:', {
      id,
      notifUserEmail: notifications.find(n => n.id === id)?.user_email,
      loggedInEmail: userEmail,
    });
    deletedIds.current.add(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await base44.entities.InAppNotification.delete(id);
    } catch (error) {
      console.error('[Notif] Erro ao deletar notificação:', error);
      toast.error(`Erro ao excluir notificação: ${error.message || 'erro desconhecido'}`);
      deletedIds.current.delete(id);
      load();
    }
  }, [load, notifications, userEmail]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification };
}