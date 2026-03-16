import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, isToday, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TYPE_COLORS = {
  'Reunião': 'bg-blue-500',
  'Tarefa': 'bg-amber-500',
  'Prazo': 'bg-red-500',
  'Follow-up': 'bg-purple-500',
  'Visita': 'bg-green-500',
  'Outro': 'bg-gray-400',
  'crm_task': 'bg-amber-400',
  'crm_interaction': 'bg-emerald-500',
  'google': 'bg-indigo-400',
};

export default function AgendaCalendarView({ events = [], onDayClick, onEventClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start
  const startPad = (getDay(monthStart) + 6) % 7; // Monday = 0
  const paddedDays = [...Array(startPad).fill(null), ...days];

  const getEventsForDay = (day) => {
    if (!day) return [];
    return events.filter(ev => {
      const evDate = ev.start_datetime || ev._date || ev.due_date;
      if (!evDate) return false;
      try {
        return isSameDay(parseISO(evDate.split('T')[0] + 'T00:00:00'), day);
      } catch { return false; }
    });
  };

  const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-800 to-emerald-700">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-emerald-600 transition text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-white capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-emerald-600 transition text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button onClick={() => setCurrentMonth(new Date())} className="text-xs text-emerald-200 hover:text-white transition">
          Hoje
        </button>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEK_DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {paddedDays.map((day, i) => {
          const dayEvents = day ? getEventsForDay(day) : [];
          const isCurrentMonth = day && isSameMonth(day, currentMonth);
          const _isToday = day && isToday(day);
          return (
            <div
              key={i}
              onClick={() => day && onDayClick(day)}
              className={cn(
                "min-h-[90px] p-1.5 border-b border-r border-gray-50 cursor-pointer transition-colors",
                !day && "bg-gray-50/50",
                day && "hover:bg-emerald-50/60",
                !isCurrentMonth && day && "opacity-40",
                _isToday && "bg-emerald-50"
              )}
            >
              {day && (
                <>
                  <div className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mx-auto mb-1",
                    _isToday ? "bg-emerald-700 text-white" : "text-gray-700"
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev, idx) => (
                      <div
                        key={idx}
                        onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                        className={cn(
                          "text-xs text-white rounded px-1.5 py-0.5 truncate cursor-pointer hover:opacity-80 transition",
                          TYPE_COLORS[ev.event_type] || TYPE_COLORS[ev._source] || 'bg-gray-400'
                        )}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-400 pl-1">+{dayEvents.length - 3} mais</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}