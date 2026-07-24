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
  ClipboardList, FileText, Calendar, Settings, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Categorias de filtro ────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',        label: 'Todas',      emoji: '🔔' },
  { key: 'urgente',    label: 'Urgente',    emoji: '🔴' },
  { key: 'licencas',   label: 'Licenças',   emoji: '📋' },
  { key: 'processos',  label: 'Processos',  emoji: '⚖️' },
  { key: 'tarefas',    label: 'Tarefas',    emoji: '✅' },
  { key: 'crm',        label: 'CRM',        emoji: '👥' },
  { key: 'contratos',  label: 'Contratos',  emoji: '📝' },
  { key: 'agenda',     label: 'Agenda',     emoji: '📅' },
  { key: 'financeiro', label: 'Financeiro', emoji: '💳' },
  { key: 'sistema',    label: 'Sistema',    emoji: '⚙️' },
];

// Mapeamento event_type → categoria
const EVENT_TO_CATEGORY = {
  nova_licenca:            'licencas',
  atualizacao_licenca:     'licencas',
  licenca_vencendo:        'licencas',
  licenca_vencida:         'licencas',
  documento_vencendo:      'licencas',
  novo_processo:           'processos',
  atualizacao_processo:    'processos',
  task_overdue:            'tarefas',
  task_due_soon:           'tarefas',
  atualizacao_cliente_crm: 'crm',
  novo_cliente_crm:        'crm',
  novo_requerimento:       'crm',
  resposta_requerimento:   'crm',
  novo_contrato:           'contratos',
  atualizacao_contrato:    'contratos',
  nova_fatura:             'financeiro',
  fatura_vencendo:         'financeiro',
  novo_alerta_ambiental:   'sistema',
  alerta_resolvido:        'sistema',
  outro:                   'sistema',
};

// Eventos de alta prioridade (error ou warning + vencimento crítico)
const HIGH_PRIORITY_EVENTS = new Set([
  'licenca_vencida', 'licenca_vencendo', 'task_overdue', 'fatura_vencendo', 'novo_alerta_ambiental'
]);

function getCategory(notif) {
  if (notif.severity === 'error' && HIGH_PRIORITY_EVENTS.has(notif.event_type)) return 'urgente';
  return EVENT_TO_CATEGORY[notif.event_type] || 'sistema';
}

// ─── Config de ícones/cores por event_type ────────────────────────────────────
const EVENT_CONFIG = {
  novo_alerta_ambiental:   { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50',      label: 'Alerta Ambiental' },
  alerta_resolvido:        { icon: Check,         color: 'text-green-600',  bg: 'bg-green-50',    label: 'Resolvido' },
  nova_licenca:            { icon: FileCheck,     color: 'text-emerald-600',bg: 'bg-emerald-50',  label: 'Nova Licença' },
  atualizacao_licenca:     { icon: FileCheck,     color: 'text-blue-500',   bg: 'bg-blue-50',     label: 'Licença' },
  licenca_vencendo:        { icon: FileCheck,     color: 'text-amber-500',  bg: 'bg-amber-50',    label: 'Licença Vencendo' },
  licenca_vencida:         { icon: FileCheck,     color: 'text-red-500',    bg: 'bg-red-50',      label: 'Licença Vencida' },
  novo_processo:           { icon: Scale,         color: 'text-blue-500',   bg: 'bg-blue-50',     label: 'Processo' },
  atualizacao_processo:    { icon: Scale,         color: 'text-blue-600',   bg: 'bg-blue-50',     label: 'Processo' },
  novo_requerimento:       { icon: MessageCircle, color: 'text-purple-500', bg: 'bg-purple-50',   label: 'Requerimento' },
  resposta_requerimento:   { icon: MessageCircle, color: 'text-purple-600', bg: 'bg-purple-50',   label: 'Requerimento' },
  nova_fatura:             { icon: CreditCard,    color: 'text-emerald-600',bg: 'bg-emerald-50',  label: 'Fatura' },
  fatura_vencendo:         { icon: CreditCard,    color: 'text-red-500',    bg: 'bg-red-50',      label: 'Fatura' },
  documento_vencendo:      { icon: FileText,      color: 'text-amber-500',  bg: 'bg-amber-50',    label: 'Documento' },
  task_overdue:            { icon: ClipboardList, color: 'text-red-600',    bg: 'bg-red-50',      label: 'Tarefa Vencida' },
  task_due_soon:           { icon: ClipboardList, color: 'text-orange-500', bg: 'bg-orange-50',   label: 'Tarefa' },
  atualizacao_cliente_crm: { icon: Users,         color: 'text-violet-500', bg: 'bg-violet-50',   label: 'CRM' },
  novo_cliente_crm:        { icon: Users,         color: 'text-violet-600', bg: 'bg-violet-50',   label: 'CRM' },
  novo_contrato:           { icon: FileText,      color: 'text-teal-600',   bg: 'bg-teal-50',     label: 'Contrato' },
  atualizacao_contrato:    { icon: FileText,      color: 'text-teal-500',   bg: 'bg-teal-50',     label: 'Contrato' },
  outro:                   { icon: Bell,          color: 'text-gray-500',   bg: 'bg-gray-50',     label: 'Sistema' },
};

const SEVERITY_BORDER = {
  error:   'border-l-red-500',
  warning: 'border-l-amber-400',
  success: 'border-l-green-500',
  info:    'border-l-blue-400',
};

const SEVERITY_BADGE = {
  error:   'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  success: 'bg-green-100 text-green-700',
  info:    'bg-blue-50 text-blue-600',
};

const PRIORITY_LABEL = {
  error:   '🔴 Alta',
  warning: '🟡 Média',
  success: '🟢 OK',
  info:    '⚪ Info',
};

function getIconByTitle(title) {
  if (!title) return null;
  const t = title.toLowerCase();
  if (t.includes('prad'))                   return { icon: Leaf,          color: 'text-green-600',  bg: 'bg-green-50' };
  if (t.includes('mapeamento') || t.includes('precisão')) return { icon: Map, color: 'text-teal-500', bg: 'bg-teal-50' };
  if (t.includes('georreferenci'))           return { icon: MapPin,        color: 'text-indigo-500', bg: 'bg-indigo-50' };
  if (t.includes('carbono'))                return { icon: Leaf,          color: 'text-emerald-600',bg: 'bg-emerald-50' };
  if (t.includes('psa'))                    return { icon: Droplets,      color: 'text-cyan-500',   bg: 'bg-cyan-50' };
  if (t.includes('servidão'))               return { icon: Shield,        color: 'text-blue-600',   bg: 'bg-blue-50' };
  if (t.includes('propriedade'))            return { icon: Building2,     color: 'text-stone-600',  bg: 'bg-stone-50' };
  if (t.includes('clima') || t.includes('climático')) return { icon: Cloud, color: 'text-sky-500', bg: 'bg-sky-50' };
  if (t.includes('agenda') || t.includes('agendamento')) return { icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-50' };
  return null;
}

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

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d atrás`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function RealtimeNotificationCenter({ user, isOpen, onClose, notifications: propNotifications, unreadCount: propUnreadCount, markAsRead: propMarkAsRead, markAllAsRead: propMarkAllAsRead, deleteNotification: propDeleteNotification }) {
  // Usa props do layout (instância compartilhada) se disponíveis, senão cria instância própria
  const hook = useRealtimeNotifications(propNotifications !== undefined ? null : user?.email);
  const notifications = propNotifications !== undefined ? propNotifications : (hook?.notifications || []);
  const unreadCount = propUnreadCount !== undefined ? propUnreadCount : (hook?.unreadCount || 0);
  const markAsRead = propMarkAsRead || hook?.markAsRead;
  const markAllAsRead = propMarkAllAsRead || hook?.markAllAsRead;
  const deleteNotification = propDeleteNotification || hook?.deleteNotification;
  const navigate = useNavigate();
  const [readFilter, setReadFilter] = useState('all'); // 'all' | 'unread'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCategories, setShowCategories] = useState(false);

  if (!isOpen) return null;

  const safeNotifs = Array.isArray(notifications) ? notifications : [];

  // Contagens por categoria
  const categoryCount = {};
  for (const n of safeNotifs) {
    const cat = getCategory(n);
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  }
  const unreadByCategory = {};
  for (const n of safeNotifs.filter(n => !n.read)) {
    const cat = getCategory(n);
    unreadByCategory[cat] = (unreadByCategory[cat] || 0) + 1;
  }

  // Filtro combinado
  const displayed = safeNotifs.filter(n => {
    if (readFilter === 'unread' && n.read) return false;
    if (categoryFilter !== 'all' && getCategory(n) !== categoryFilter) return false;
    return true;
  });

  const handleClick = async (notif) => {
    try {
      if (!notif.read) await markAsRead(notif.id);
      if (notif.link) {
        const raw = notif.link.replace(/^\//, '');
        if (raw) {
          const [pageName, queryString] = raw.split('?');
          const baseUrl = createPageUrl(pageName);
          const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
          navigate(finalUrl);
          onClose();
        }
      }
    } catch (error) {
      console.error('[Notif] Erro ao processar clique:', error);
    }
  };

  const activeCategory = CATEGORIES.find(c => c.key === categoryFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="w-full max-w-sm h-screen bg-white shadow-2xl flex flex-col border-l border-gray-100 pointer-events-auto safe-top"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
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
                onClick={() => markAllAsRead(safeNotifs)}>
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Marcar todas
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigate(createPageUrl('NotificationSettings')); onClose(); }}>
              <Settings className="w-4 h-4 text-gray-400" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Filtro lidas/não lidas ── */}
        <div className="flex border-b bg-gray-50">
          {[
            { key: 'all',    label: `Todas (${safeNotifs.length})` },
            { key: 'unread', label: `Não lidas (${unreadCount})` },
          ].map(f => (
            <button key={f.key}
              onClick={() => setReadFilter(f.key)}
              className={cn(
                'flex-1 py-2 text-xs font-medium transition-colors',
                readFilter === f.key
                  ? 'text-emerald-700 border-b-2 border-emerald-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              )}>
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Filtro por categoria (dropdown compacto) ── */}
        <div className="border-b bg-white">
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-gray-700 font-medium">
              <span>{activeCategory?.emoji}</span>
              <span>{activeCategory?.label}</span>
              {categoryFilter !== 'all' && categoryCount[categoryFilter] ? (
                <Badge className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0 border-0">
                  {categoryCount[categoryFilter]}
                </Badge>
              ) : null}
            </span>
            <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', showCategories && 'rotate-180')} />
          </button>

          {showCategories && (
            <div className="border-t border-gray-100 grid grid-cols-2 gap-0.5 p-2 bg-gray-50">
              {CATEGORIES.map(cat => {
                const count = cat.key === 'all' ? safeNotifs.length : (categoryCount[cat.key] || 0);
                const unread = cat.key === 'all' ? unreadCount : (unreadByCategory[cat.key] || 0);
                return (
                  <button
                    key={cat.key}
                    onClick={() => { setCategoryFilter(cat.key); setShowCategories(false); }}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                      categoryFilter === cat.key
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-600 hover:bg-white hover:shadow-sm'
                    )}
                  >
                    <span>{cat.emoji}</span>
                    <span className="truncate">{cat.label}</span>
                    {count > 0 && (
                      <span className={cn(
                        'ml-auto text-[10px] font-bold px-1 rounded',
                        categoryFilter === cat.key ? 'bg-white/20 text-white' : unread > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Lista de notificações ── */}
        <div className="flex-1 overflow-y-auto">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Bell className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm">
                {readFilter === 'unread' ? 'Nenhuma não lida' :
                 categoryFilter !== 'all' ? `Nenhuma em "${activeCategory?.label}"` :
                 'Nenhuma notificação'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayed.map(notif => {
                const isHighPriority = notif.severity === 'error';
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={cn(
                      'flex gap-3 p-3 cursor-pointer border-l-4 transition-all hover:bg-gray-50',
                      SEVERITY_BORDER[notif.severity] || 'border-l-gray-200',
                      !notif.read ? 'bg-blue-50/40' : 'bg-white'
                    )}
                  >
                    <NotifIcon notification={notif} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <p className={cn('text-sm leading-tight', !notif.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700')}>
                          {notif.title}
                        </p>
                        {!notif.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-3">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-400">{timeAgo(notif.created_date)}</span>
                        {notif.severity && notif.severity !== 'info' && (
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', SEVERITY_BADGE[notif.severity])}>
                            {PRIORITY_LABEL[notif.severity]}
                          </span>
                        )}
                        {isHighPriority && (
                          <span className="text-[10px] font-bold text-red-600 animate-pulse">● URGENTE</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteNotification(notif.id); }}
                      className="flex-shrink-0 p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors mt-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {safeNotifs.length > 0 && (
          <div className="border-t bg-gray-50 px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-400">{safeNotifs.length} notificação{safeNotifs.length !== 1 ? 'ões' : ''} · últimos 90 dias</span>
            <button
              onClick={() => { navigate(createPageUrl('NotificationAudit')); onClose(); }}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
            >
              Ver auditoria →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}