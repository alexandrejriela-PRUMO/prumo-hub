import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, ChevronDown, ChevronUp, Clock, Phone } from 'lucide-react';

/**
 * WhatsAppSendHistory — histórico de envios via WhatsApp (Recibo, Orçamento, Contrato).
 * Análogo ao BudgetEmailHistory, mas lendo de WhatsAppSendLog.
 *
 * Props:
 * - consultorEmail: dono dos registros (RLS já restringe a leitura a este email)
 * - docType: 'receipt' | 'budget' | 'contract'
 * - docId: se informado, mostra apenas os envios deste documento específico
 */
export default function WhatsAppSendHistory({ consultorEmail, docType, docId = null }) {
  const [expandedId, setExpandedId] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['whatsappSendLogs', consultorEmail, docType, docId],
    queryFn: async () => {
      const all = await base44.entities.WhatsAppSendLog.filter({ consultor_email: consultorEmail, doc_type: docType });
      const filtered = docId ? all.filter(l => l.doc_id === docId) : all;
      return filtered.sort((a, b) => new Date(b.sent_at || b.created_date) - new Date(a.sent_at || a.created_date));
    },
    enabled: !!consultorEmail && !!docType,
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
        <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Nenhum WhatsApp enviado ainda</p>
        <p className="text-gray-400 text-sm mt-1">Os envios por WhatsApp aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-emerald-600" />
        <h3 className="font-bold text-gray-900">{logs.length} WhatsApp{logs.length !== 1 ? 's' : ''} enviado{logs.length !== 1 ? 's' : ''}</h3>
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
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {log.doc_number && (
                      <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {log.doc_number}
                      </span>
                    )}
                    <Badge className={`border-0 text-xs ${log.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {log.status === 'error' ? 'Erro' : 'Enviado'}
                    </Badge>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mt-1 truncate">{log.client_name || 'Cliente'}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {log.to_phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {sentDate}
                    </span>
                  </div>
                </div>

                <div className="text-gray-400 flex-shrink-0">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Telefone</p>
                      <p className="text-sm text-gray-800">{log.to_phone}</p>
                    </div>
                    {log.message && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Mensagem</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded p-3">{log.message}</p>
                      </div>
                    )}
                    {log.file_name && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Arquivo</p>
                        <p className="text-sm text-gray-800">{log.file_name}</p>
                      </div>
                    )}
                    {log.status === 'error' && log.error_message && (
                      <div>
                        <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Erro</p>
                        <p className="text-sm text-red-700">{log.error_message}</p>
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
