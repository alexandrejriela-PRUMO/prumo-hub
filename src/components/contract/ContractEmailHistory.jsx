import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, ChevronDown, ChevronUp, Clock, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ContractEmailHistory({ consultorEmail, contractId = null }) {
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['contractEmailLogs', consultorEmail, contractId],
    queryFn: async () => {
      // Via backend function para funcionar também para membros de equipe (bypass RLS)
      const res = await base44.functions.invoke('listConsultorBudgets', {});
      const all = res.data?.emailLogs || [];
      return all.filter(l =>
        l.log_type === 'contract' ||
        (contractId ? l.contract_id === contractId || l.budget_id === contractId : false) ||
        (!l.log_type && !l.budget_id && l.contract_id)
      );
    },
    enabled: !!consultorEmail,
  });

  const handleDelete = async (e, logId) => {
    e.stopPropagation();
    setDeletingId(logId);
    try {
      await base44.entities.BudgetEmailLog.delete(logId);
      queryClient.invalidateQueries({ queryKey: ['contractEmailLogs', consultorEmail, contractId] });
      toast.success('Registro removido');
      if (expandedId === logId) setExpandedId(null);
    } catch (err) {
      toast.error('Erro ao remover registro');
    } finally {
      setDeletingId(null);
    }
  };

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
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {log.budget_number && (
                      <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {log.budget_number}
                      </span>
                    )}
                    <Badge className="bg-purple-100 text-purple-800 border-0 text-xs">Contrato Enviado</Badge>
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

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => handleDelete(e, log.id)}
                    disabled={deletingId === log.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Excluir registro"
                  >
                    {deletingId === log.id
                      ? <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                  <div className="text-gray-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

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