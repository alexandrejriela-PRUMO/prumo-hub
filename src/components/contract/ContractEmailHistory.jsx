import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, ChevronDown, ChevronUp, Clock, User } from 'lucide-react';

export default function ContractEmailHistory({ consultorEmail, contractId = null }) {
  const [expandedId, setExpandedId] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['contractEmailLogs', consultorEmail, contractId],
    queryFn: () => {
      const filter = contractId
        ? { consultor_email: consultorEmail, contract_id: contractId }
        : { consultor_email: consultorEmail };
      return base44.entities.BudgetEmailLog.filter(filter, '-sent_at', 100);
    },
    enabled: !!consultorEmail,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
        <Mail className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Nenhum e-mail enviado ainda</p>
        <p className="text-gray-400 text-sm mt-1">Os e-mails enviados de contratos aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-emerald-600" />
        <h3 className="font-bold text-gray-900">{logs.length} e-mail{logs.length !== 1 ? 's' : ''} enviado{logs.length !== 1 ? 's' : ''}</h3>
      </div>

      {logs.map((log) => {
        const isExpanded = expandedId === log.id;
        const sentDate = log.sent_at
          ? new Date(log.sent_at).toLocaleString('pt-BR')
          : log.created_date
          ? new Date(log.created_date).toLocaleString('pt-BR')
          : '—';

        return (
          <Card key={log.id} className="border-gray-100 hover:shadow-sm transition-shadow">
            <CardContent className="p-0">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
              >
                {/* Ícone */}
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-emerald-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {log.budget_number && (
                      <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {log.budget_number}
                      </span>
                    )}
                    <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">Enviado</Badge>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mt-1 truncate">{log.subject}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {log.to}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {sentDate}
                    </span>
                  </div>
                </div>

                {/* Expandir */}
                <div className="text-gray-400 flex-shrink-0">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Detalhes expandidos */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Destinatário</p>
                      <p className="text-sm text-gray-800">{log.to}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Assunto</p>
                      <p className="text-sm text-gray-800">{log.subject}</p>
                    </div>
                    {log.message && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Mensagem</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded p-3">{log.message}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Enviado em</p>
                      <p className="text-sm text-gray-800">{sentDate}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}