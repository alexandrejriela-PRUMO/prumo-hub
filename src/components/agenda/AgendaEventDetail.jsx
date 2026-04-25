import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, MapPin, User, Building2, Trash2, Edit2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  'Pendente': 'bg-yellow-100 text-yellow-700',
  'Confirmado': 'bg-blue-100 text-blue-700',
  'Concluído': 'bg-green-100 text-green-700',
  'Cancelado': 'bg-red-100 text-red-700',
};

export default function AgendaEventDetail({ event, onClose, onEdit, onDelete }) {
  if (!event) return null;

  const isManual = event._source === 'agenda';
  const dateStr = event._date || event.start_datetime;
  const parsedDate = dateStr ? parseISO(dateStr.split('T')[0]) : null;

  return (
    <Dialog open={!!event} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-emerald-900 leading-snug">{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={cn('text-xs border-0',
              event._source === 'crm_task' ? 'bg-amber-100 text-amber-700' :
              event._source === 'crm_interaction' ? 'bg-emerald-100 text-emerald-700' :
              'bg-blue-100 text-blue-700'
            )}>
              {event._source === 'crm_task' ? '📋 Tarefa CRM' :
               event._source === 'crm_interaction' ? '💬 Próx. Ação CRM' :
               event.event_type || 'Evento'}
            </Badge>
            {event.status && (
              <Badge className={cn('text-xs border-0', STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-700')}>
                {event.status}
              </Badge>
            )}
            {event.priority === 'Alta' && <Badge className="bg-red-100 text-red-700 text-xs border-0">🔴 Alta</Badge>}
            {event.google_calendar_event_id && <Badge className="bg-indigo-100 text-indigo-700 text-xs border-0">📅 Google Agenda</Badge>}
          </div>

          {/* Date */}
          {parsedDate && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <CalendarDays className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{format(parsedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            </div>
          )}

          {/* Time */}
          {event.start_datetime?.includes('T') && !event.all_day && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{event.start_datetime.split('T')[1]?.slice(0, 5)}
                {event.end_datetime && ` → ${event.end_datetime.split('T')[1]?.slice(0, 5)}`}
              </span>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{event.location}</span>
            </div>
          )}

          {/* Client */}
          {event.client_name && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{event.client_name}</span>
            </div>
          )}

          {/* Assignee */}
          {event.assigned_to_name && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Responsável: <strong>{event.assigned_to_name}</strong></span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
              {event.description}
            </div>
          )}

          {/* CRM notice */}
          {!isManual && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              📋 Importado automaticamente do CRM. Edite na seção Clientes para alterações.
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          {isManual && (
            <>
              <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
                <Edit2 className="w-4 h-4 mr-1" /> Editar
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete} className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className={isManual ? '' : 'flex-1'}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}