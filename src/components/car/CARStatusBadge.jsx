import React from 'react';
import { Badge } from '@/components/ui/badge';

const statusConfig = {
  'Validado': { emoji: '🟢', color: 'bg-green-100 text-green-800 border-green-300', label: 'Validado' },
  'Em análise pelo órgão ambiental': { emoji: '🟡', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Em análise' },
  'Pendente de análise': { emoji: '🟡', color: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Pendente' },
  'Com inconsistências': { emoji: '🔴', color: 'bg-red-100 text-red-800 border-red-300', label: 'Com inconsistências' },
  'Cancelado': { emoji: '🔴', color: 'bg-red-200 text-red-900 border-red-400', label: 'Cancelado' },
  'Necessita retificação': { emoji: '🔴', color: 'bg-orange-100 text-orange-800 border-orange-300', label: 'Necessita retificação' },
};

export default function CARStatusBadge({ status, large = false }) {
  const cfg = statusConfig[status] || { emoji: '⚪', color: 'bg-gray-100 text-gray-700 border-gray-300', label: status || 'Não definido' };
  return (
    <Badge className={`${cfg.color} border font-semibold ${large ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1'}`}>
      <span className="mr-1.5">{cfg.emoji}</span>{cfg.label}
    </Badge>
  );
}

export { statusConfig };