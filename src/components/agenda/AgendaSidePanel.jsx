import React from 'react';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, User, Building2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const SOURCE_CONFIG = {
  agenda:          { label: 'Evento',      color: 'bg-blue-500' },
  crm_task:        { label: 'Tarefa',      color: 'bg-amber-500' },
  crm_interaction: { label: 'Follow-up',  color: 'bg-emerald-500' },
  google:          { label: 'Google',     color: 'bg-indigo-400' },
};

const PRIORITY_DOT = {
  'Alta': 'bg-red-500',
  'Média': 'bg-yellow-400',
  'Baixa': 'bg-green-400',
};

export default function AgendaSidePanel({ events = [], selectedDate, onEventClick }) {
  const upcoming = events
    .filter(ev => {
      const d = ev.start_datetime || ev._date || ev.due_date;
      if (!d) return false;
      try { return !isPast(parseISO(d.split('T')[0] + 'T23:59:59')); } catch { return false; }
    })
    .sort((a, b) => {
      const da = a.start_datetime || a._date || a.due_date || '';
      const db = b.start_datetime || b._date || b.due_date || '';
      return da.localeCompare(db);
    })
    .slice(0, 12);

  const groupedByDay = upcoming.reduce((acc, ev) => {
    const d = (ev.start_datetime || ev._date || ev.due_date || '').split('T')[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(ev);
    return acc;
  }, {});

  const dayLabel = (dateStr) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return 'Hoje';
      if (isTomorrow(d)) return 'Amanhã';
      return format(d, "dd 'de' MMM", { locale: ptBR });
    } catch { return dateStr; }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-full">
      <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
        <CalendarDays className="w-4 h-4" /> Próximos Eventos
      </h3>

      {upcoming.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum evento próximo</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByDay).map(([dateStr, dayEvs]) => (
            <div key={dateStr}>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                {dayLabel(dateStr)}
              </div>
              <div className="space-y-2">
                {dayEvs.map((ev, i) => {
                  const cfg = SOURCE_CONFIG[ev._source] || SOURCE_CONFIG.agenda;
                  const time = (ev.start_datetime || ev._date || '')?.split('T')[1]?.slice(0, 5);
                  return (
                    <div
                      key={i}
                      onClick={() => onEventClick(ev)}
                      className="flex items-start gap-2 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-all"
                    >
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{ev.title}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {time && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />{time}
                            </span>
                          )}
                          {ev.client_name && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Building2 className="w-3 h-3" />{ev.client_name}
                            </span>
                          )}
                          {ev.assigned_to_name && ev.assigned_to_name !== ev.consultor_name && (
                            <span className="flex items-center gap-1 text-xs text-purple-600">
                              <User className="w-3 h-3" />{ev.assigned_to_name}
                            </span>
                          )}
                        </div>
                      </div>
                      {ev.priority && (
                        <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", PRIORITY_DOT[ev.priority])} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}