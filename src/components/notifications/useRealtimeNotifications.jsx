import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useRealtimeNotifications(userEmail) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;

    // Carregar notificações iniciais
    const loadInitialNotifications = async () => {
      try {
        const data = await base44.entities.RealtimeNotification.filter(
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

    // Subscrever a mudanças em tempo real
    const unsubscribe = base44.entities.RealtimeNotification.subscribe((event) => {
      if (event.type === 'create') {
        // Adicionar nova notificação apenas se for para este usuário
        if (event.data.user_email === userEmail) {
          setNotifications(prev => [event.data, ...prev]);
        }
      } else if (event.type === 'update') {
        // Atualizar notificação existente
        setNotifications(prev =>
          prev.map(n => n.id === event.id ? event.data : n)
        );
      } else if (event.type === 'delete') {
        // Remover notificação
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userEmail]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await base44.entities.RealtimeNotification.update(notificationId, {
        read: true
      });
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await base44.entities.RealtimeNotification.delete(notificationId);
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    deleteNotification
  };
}