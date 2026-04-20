import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, ChevronDown, ChevronUp, Send, RefreshCw, Mail, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLORS = {
  'Aberto': 'bg-amber-100 text-amber-700',
  'Em Análise': 'bg-blue-100 text-blue-700',
  'Respondido': 'bg-emerald-100 text-emerald-700',
  'Fechado': 'bg-gray-100 text-gray-700',
};

function RequestCard({ req, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState(req.response || '');
  const [status, setStatus] = useState(req.status || 'Aberto');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Request.update(req.id, {
        response: reply,
        status,
        // Add a conversation message from team
        conversation: [
          ...(req.conversation || []),
          {
            sender: 'equipe@prumohub.com',
            sender_name: 'Equipe PRUMO Hub',
            sender_type: 'team',
            message: reply,
            timestamp: new Date().toISOString(),
          }
        ],
      });

      // In-app notification
      const userEmail = req.client_email || req.created_by;
      if (userEmail && reply && reply !== req.response) {
        await base44.entities.InAppNotification.create({
          user_email: userEmail,
          title: `Resposta ao seu requerimento: ${req.title || req.subject || 'Requerimento'}`,
          message: reply.slice(0, 200) + (reply.length > 200 ? '...' : ''),
          event_type: 'resposta_requerimento',
          severity: 'success',
          link: '/Requests',
          metadata: { request_id: req.id },
        });

        await base44.integrations.Core.SendEmail({
          to: userEmail,
          subject: `[PRUMO Hub] Resposta ao requerimento: ${req.title || req.subject || ''}`,
          body: `Olá,\n\nSeu requerimento foi respondido pela equipe PRUMO Hub.\n\n---\nResposta:\n${reply}\n\n---\nStatus: ${status}\n\nAcesse a plataforma para mais detalhes: https://prumohub.com/Requests`,
        });
      }

      toast.success('Resposta enviada ao produtor!');
      onSave();
      setExpanded(false);
    } catch (e) {
      toast.error('Erro ao salvar resposta.');
    } finally {
      setSaving(false);
    }
  };

  const userEmail = req.client_email || req.created_by;

  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${STATUS_COLORS[req.status] || 'bg-gray-100'}`}>
              <ClipboardList className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{req.title || req.subject || 'Requerimento'}</h4>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Mail className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">{userEmail || '—'}</span>
                {req.request_type && (
                  <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{req.request_type}</span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">
                  {req.created_date ? format(parseISO(req.created_date), 'dd/MM/yyyy HH:mm') : '—'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-600'}>
              {req.status || 'Pendente'}
            </Badge>
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-gray-100">
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            {req.description && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">DETALHES DO REQUERIMENTO</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{req.description}</p>
              </div>
            )}

            {req.response && (
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-600 mb-1">RESPOSTA ANTERIOR</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{req.response}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">RESPOSTA AO PRODUTOR</label>
              <Textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Digite sua resposta para o produtor..."
                rows={4}
              />
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-600 block mb-1">STATUS</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Aberto', 'Em Análise', 'Respondido', 'Fechado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? 'Salvando...' : <><Send className="w-4 h-4 mr-2" /> Responder e Notificar</>}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminRequestsPanel() {
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: () => base44.entities.Request.list('-created_date', 100),
  });

  const filtered = filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus);

  const counts = requests.reduce((acc, r) => {
    const s = r.status || 'Pendente';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Abertos', key: 'Aberto', color: 'bg-amber-50 text-amber-700' },
          { label: 'Em Análise', key: 'Em Análise', color: 'bg-blue-50 text-blue-700' },
          { label: 'Respondidos', key: 'Respondido', color: 'bg-emerald-50 text-emerald-700' },
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
        <p className="text-sm text-gray-500">{filtered.length} requerimento{filtered.length !== 1 ? 's' : ''}</p>
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
            <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum requerimento encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <RequestCard key={req.id} req={req} onSave={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}