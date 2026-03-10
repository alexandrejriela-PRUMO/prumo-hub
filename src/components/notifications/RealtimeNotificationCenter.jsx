import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useRealtimeNotifications } from '@/components/notifications/useRealtimeNotifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bell, Trash2, Check, CheckCheck, X,
  FileCheck, Scale, AlertTriangle, MapPin,
  Leaf, Map, TrendingUp, FileText,
  MessageCircle, Users, Briefcase, BarChart3, Building2, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EVENT_CONFIG = {
  nova_licenca:               { icon: FileCheck,    color: 'text-blue-600',   bg: 'bg-blue-50' },
  licenca_status:             { icon: FileCheck,    color: 'text-blue-600',   bg: 'bg-blue-50' },
  licenca_vencendo:           { icon: FileCheck,    color: 'text-amber-600',  bg: 'bg-amber-50' },
  licenca_vencida:            { icon: FileCheck,    color: 'text-red-600',    bg: 'bg-red-50' },
  novo_andamento_licenca:     { icon: FileCheck,    color: 'text-blue-600',   bg: 'bg-blue-50' },
  novo_processo:              { icon: Scale,        color: 'text-purple-600', bg: 'bg-purple-50' },
  atualizacao_processo:       { icon: Scale,        color: 'text-purple-600', bg: 'bg-purple-50' },
  novo_andamento_processo:    { icon: Scale,        color: 'text-purple-600', bg: 'bg-purple-50' },
  novo_alerta_ambiental:      { icon: AlertTriangle,color: 'text-red-600',    bg: 'bg-red-50' },
  alerta_resolvido:           { icon: AlertTriangle,color: 'text-green-600',  bg: 'bg-green-50' },
  novo_georreferenciamento:   { icon: MapPin,       color: 'text-teal-600',   bg: 'bg-teal-50' },
  atualizacao_georreferenciamento: { icon: MapPin,  color: 'text-teal-600',   bg: 'bg-teal-50' },
  novo_prad:                  { icon: Leaf,         color: 'text-green-600',  bg: 'bg-green-50' },
  atualizacao_prad:           { icon: Leaf,         color: 'text-green-600',  bg: 'bg-green-50' },
  novo_mapeamento:            { icon: Map,          color: 'text-indigo-600', bg: 'bg-indigo-50' },
  atualizacao_mapeamento:     { icon: Map,          color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ativo_ambiental:            { icon: TrendingUp,   color: 'text-emerald-600',bg: 'bg-emerald-50' },
  ativo_ambiental_vencendo:   { icon: TrendingUp,   color: 'text-amber-600',  bg: 'bg-amber-50' },
  novo_documento:             { icon: FileText,     color: 'text-gray-600',   bg: 'bg-gray-50' },
  novo_requerimento:          { icon: MessageCircle,color: 'text-sky-600',    bg: 'bg-sky-50' },
  resposta_requerimento:      { icon: MessageCircle,color: 'text-sky-600',    bg: 'bg-sky-50' },
  atualizacao_requerimento:   { icon: MessageCircle,color: 'text-sky-600',    bg: 'bg-sky-50' },
  equipe_alterada:            { icon: Users,        color: 'text-violet-600', bg: 'bg-violet-50' },
  crm_interacao:              { icon: Briefcase,    color: 'text-orange-600', bg: 'bg-orange-50' },
  crm_servico:                { icon: BarChart3,    color: 'text-orange-600', bg: 'bg-orange-50' },
  crm_tarefa:                 { icon: Briefcase,    color: 'text-orange-600', bg: 'bg-orange-50' },
  termometro_regularidade:    { icon: Building2,    color: 'text-cyan-600',   bg: 'bg-cyan-50' },
  outro:                      { icon: Info,         color: 'text-gray-500',   bg: 'bg-gray-50' },
};

const SEVERITY_BORDER = {
  info:    'border-l-blue-400',
  warning: 'border-l-amber-400',
  error:   'border-l-red-400',
  success: 'border-l-green-400',
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

export default function RealtimeNotificationCenter({ user, isOpen, onClose }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useRealtimeNotifications(user?.email);

  if (!isOpen) return null;

  const handleClick = async (notif) => {
    if (!notif.read) await markAsRead(notif.id);
    if (notif.link) {
      navigate(createPageUrl(notif.link));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 lg:pt-16">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-sm h-[calc(100vh-64px)] bg-white shadow-2xl flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-900 to-emerald-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-white" />
            <h2 className="text-base font-semibold text-white">Notificações</h2>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-2 py-0">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-emerald-200 hover:text-white text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-emerald-700 transition-colors"
                title="Marcar todas como lidas"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Ler todas
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-emerald-700 transition-colors">
              <X className="w-4 h-4 text-emerald-200" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <Bell className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm font-medium">Nenhuma notificação</p>
              <p className="text-xs mt-1 text-center text-gray-400">Você será notificado sobre atualizações importantes aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map(notif => {
                const config = EVENT_CONFIG[notif.event_type] || EVENT_CONFIG.outro;
                const IconComp = config.icon;
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'flex gap-3 px-4 py-3 border-l-4 transition-all cursor-pointer group',
                      SEVERITY_BORDER[notif.severity] || 'border-l-blue-400',
                      notif.read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/60 hover:bg-blue-50'
                    )}
                    onClick={() => handleClick(notif)}
                  >
                    {/* Icon */}
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', config.bg)}>
                      <IconComp className={cn('w-4 h-4', config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm leading-snug', notif.read ? 'font-normal text-gray-700' : 'font-semibold text-gray-900')}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(notif.created_date)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                          className="p-1 rounded hover:bg-green-100 text-green-600"
                          title="Marcar como lida"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                        className="p-1 rounded hover:bg-red-100 text-red-500"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}