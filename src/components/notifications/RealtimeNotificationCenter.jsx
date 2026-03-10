import React, { useState } from 'react';
import { useRealtimeNotifications } from '@/components/notifications/useRealtimeNotifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Bell, Trash2, Check, CheckCheck, X,
  AlertTriangle, FileCheck, Scale, Leaf, Map,
  MapPin, Users, MessageCircle, TrendingUp,
  CreditCard, Cloud, Droplets, Shield, Building2,
  ClipboardList, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EVENT_CONFIG = {
  novo_alerta_ambiental:   { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50',     label: 'Alerta Ambiental' },
  alerta_resolvido:        { icon: Check,         color: 'text-green-600',  bg: 'bg-green-50',   label: 'Resolvido' },
  licenca_vencendo:        { icon: FileCheck,     color: 'text-amber-500',  bg: 'bg-amber-50',   label: 'Licença' },
  licenca_vencida:         { icon: FileCheck,     color: 'text-red-500',    bg: 'bg-red-50',     label: 'Licença Vencida' },
  novo_processo:           { icon: Scale,         color: 'text-blue-500',   bg: 'bg-blue-50',    label: 'Processo' },
  atualizacao_processo:    { icon: Scale,         color: 'text-blue-600',   bg: 'bg-blue-50',    label: 'Processo' },
  novo_requerimento:       { icon: MessageCircle, color: 'text-purple-500', bg: 'bg-purple-50',  label: 'Requerimento' },
  resposta_requerimento:   { icon: MessageCircle, color: 'text-purple-600', bg: 'bg-purple-50',  label: 'Requerimento' },
  nova_fatura:             { icon: CreditCard,    color: 'text-emerald-600',bg: 'bg-emerald-50', label: 'Fatura' },
  fatura_vencendo:         { icon: CreditCard,    color: 'text-red-500',    bg: 'bg-red-50',     label: 'Fatura' },
  documento_vencendo:      { icon: FileText,      color: 'text-amber-500',  bg: 'bg-amber-50',   label: 'Documento' },
  outro:                   { icon: Bell,          color: 'text-gray-500',   bg: 'bg-gray-50',    label: 'Sistema' },
};

const SEVERITY_STYLE = {
  error:   'border-l-red-500',
  warning: 'border-l-amber-400',
  success: 'border-l-green-500',
  info:    'border-l-blue-400',
};

const getIconByTitle = (title) => {
  if (!title) return null;
  const t = title.toLowerCase();
  if (t.includes('prad'))            return { icon: Leaf,          color: 'text-green-600',  bg: 'bg-green-50' };
  if (t.includes('mapeamento') || t.includes('precisão')) return { icon: Map, color: 'text-teal-500', bg: 'bg-teal-50' };
  if (t.includes('georreferenci'))   return { icon: MapPin,        color: 'text-indigo-500', bg: 'bg-indigo-50' };
  if (t.includes('crm') || t.includes('interação') || t.includes('cliente')) return { icon: Users, color: 'text-violet-500', bg: 'bg-violet-50' };
  if (t.includes('carbono'))         return { icon: Leaf,          color: 'text-emerald-600',bg: 'bg-emerald-50' };
  if (t.includes('psa'))             return { icon: Droplets,      color: 'text-cyan-500',   bg: 'bg-cyan-50' };
  if (t.includes('servidão'))        return { icon: Shield,        color: 'text-blue-600',   bg: 'bg-blue-50' };
  if (t.includes('equipe') || t.includes('modificação')) return { icon: ClipboardList, color: 'text-gray-600', bg: 'bg-gray-50' };
  if (t.includes('propriedade'))     return { icon: Building2,     color: 'text-stone-600',  bg: 'bg-stone-50' };
  if (t.includes('tarefa'))          return { icon: ClipboardList, color: 'text-orange-500', bg: 'bg-orange-50' };
  if (t.includes('clima') || t.includes('climático')) return { icon: Cloud, color: 'text-sky-500', bg: 'bg-sky-50' };
  return null;
};

function NotifIcon({ notification }) {
  const byTitle = getIconByTitle(notification.title);
  const config = byTitle || EVENT_CONFIG[notification.event_type] || EVENT_CONFIG.outro;
  const Icon = config.icon;
  return (
    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', config.bg)}>
      <Icon className={cn('w-4 h-4', config.color)} />
    </div>
  );
}

export default function RealtimeNotificationCenter({ user, isOpen, onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useRealtimeNotifications(user?.email);
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  if (!isOpen) return null;

  const displayed = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const handleClick = async (notif) => {
    if (!notif.read) await markAsRead(notif.id);
    if (notif.link) {
      const pageName = notif.link.replace('/', '');
      navigate(createPageUrl(pageName));
      onClose();
    }
  };

  const timeAgo = (dateStr) => {
    const d = new Date(dateStr);
    const mins = Math.floor((Date.now() - d) / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    const days = Math.floor(hrs / 24);
    return `${days}d atrás`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="w-full max-w-sm h-screen bg-white shadow-2xl flex flex-col border-l border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-700" />
            <span className="font-bold text-gray-900">Notificações</span>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-emerald-700 h-7 px-2"
                onClick={() => markAllAsRead(notifications)}>
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Marcar todas
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b bg-gray-50">
          {['all', 'unread'].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 py-2 text-xs font-medium transition-colors',
                filter === f
                  ? 'text-emerald-700 border-b-2 border-emerald-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              )}>
              {f === 'all' ? `Todas (${notifications.length})` : `Não lidas (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Bell className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm">{filter === 'unread' ? 'Nenhuma não lida' : 'Nenhuma notificação'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayed.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    'flex gap-3 p-3 cursor-pointer border-l-4 transition-all hover:bg-gray-50',
                    SEVERITY_STYLE[notif.severity] || 'border-l-gray-200',
                    !notif.read ? 'bg-blue-50/40' : 'bg-white'
                  )}
                >
                  <NotifIcon notification={notif} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={cn('text-sm leading-tight', !notif.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700')}>
                        {notif.title}
                      </p>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(notif.created_date)}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteNotification(notif.id); }}
                    className="flex-shrink-0 p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors mt-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}