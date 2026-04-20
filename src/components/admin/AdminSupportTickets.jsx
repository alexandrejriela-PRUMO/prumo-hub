import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Clock, CheckCircle, RefreshCw, Send, ChevronDown, ChevronUp, User, Mail } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLORS = {
  'Aberto': 'bg-blue-100 text-blue-700',
  'Em Atendimento': 'bg-amber-100 text-amber-700',
  'Resolvido': 'bg-emerald-100 text-emerald-700',
  'Fechado': 'bg-gray-100 text-gray-700',
};

const STATUSES = ['Aberto', 'Em Atendimento', 'Resolvido', 'Fechado'];

function TicketCard({ ticket, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const [response, setResponse] = useState(ticket.response || '');
  const [status, setStatus] = useState(ticket.status || 'Aberto');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.SupportTicket.update(ticket.id, { response, status });

      // Send in-app notification to user
      if (response && response !== ticket.response) {
        await base44.entities.InAppNotification.create({
          user_email: ticket.client_email,
          title: `Resposta ao seu chamado: ${ticket.subject}`,
          message: response.slice(0, 200) + (response.length > 200 ? '...' : ''),
          event_type: 'outro',
          severity: 'info',
          link: '/Support',
          metadata: { ticket_id: ticket.id },
        });

        // Send email notification
        await base44.integrations.Core.SendEmail({
          to: ticket.client_email,
          subject: `[PRUMO Hub] Resposta ao chamado: ${ticket.subject}`,
          body: `Olá,\n\nSeu chamado foi respondido pela equipe PRUMO Hub.\n\n---\nResposta:\n${response}\n\n---\nStatus atual: ${status}\n\nAcesse a plataforma para visualizar: https://prumohub.com/Support`,
        });
      }

      toast.success('Ticket atualizado e usuário notificado!');
      onSave();
      setExpanded(false);
    } catch (e) {
      toast.error('Erro ao salvar resposta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-600'}`}>
              <MessageCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{ticket.subject}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <Mail className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">{ticket.client_email}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {ticket.created_date ? format(parseISO(ticket.created_date), 'dd/MM/yyyy HH:mm') : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-600'}>
              {ticket.status}
            </Badge>
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-gray-100">
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">MENSAGEM DO USUÁRIO</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.message}</p>
            </div>

            {ticket.response && (
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-600 mb-1">RESPOSTA ENVIADA ANTERIORMENTE</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.response}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">NOVA RESPOSTA / ATUALIZAÇÃO</label>
              <Textarea
                value={response}
                onChange={e => setResponse(e.target.value)}
                placeholder="Digite sua resposta para o usuário..."
                rows={4}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-600 block mb-1">STATUS</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 mt-5"
              >
                {saving ? 'Salvando...' : <><Send className="w-4 h-4 mr-2" /> Salvar e Notificar</>}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminSupportTickets() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: () => base44.entities.SupportTicket.list('-created_date', 100),
  });

  const filtered = filterStatus === 'all' ? tickets : tickets.filter(t => t.status === filterStatus);

  const counts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Abertos', key: 'Aberto', color: 'bg-blue-50 text-blue-700' },
          { label: 'Em Atendimento', key: 'Em Atendimento', color: 'bg-amber-50 text-amber-700' },
          { label: 'Resolvidos', key: 'Resolvido', color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Fechados', key: 'Fechado', color: 'bg-gray-50 text-gray-700' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(filterStatus === s.key ? 'all' : s.key)}
            className={`rounded-xl p-3 border-2 text-left transition-all ${filterStatus === s.key ? 'border-emerald-500' : 'border-transparent'} ${s.color}`}
          >
            <p className="text-2xl font-bold">{counts[s.key] || 0}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{filtered.length} chamado{filtered.length !== 1 ? 's' : ''}</p>
        <button onClick={() => refetch()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-gray-100">
          <CardContent className="text-center py-12">
            <CheckCircle className="w-12 h-12 mx-auto text-emerald-300 mb-3" />
            <p className="text-gray-500">Nenhum chamado encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} onSave={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}