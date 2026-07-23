import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare, MessageCircle, Mail, Search, ChevronLeft, ChevronRight,
  CheckCheck, Users, FileQuestion
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useEffectiveUser } from '../hooks/useEffectiveUser';

const DOC_TYPE_LABELS = {
  receipt: 'Recibo',
  budget: 'Orçamento',
  contract: 'Contrato',
  document: 'Documento',
  license: 'Licença',
  car: 'CAR',
  process: 'Processo',
  prad: 'PRAD',
  georeferencing: 'Georreferenciamento',
  meeting_confirmation: 'Confirmação de Reunião',
};

const STATUS_CONFIG = {
  sent: { label: 'Enviado', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  delivered: { label: 'Entregue', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  read: { label: 'Lido', className: 'bg-green-100 text-green-700 border-green-200', icon: CheckCheck },
  error: { label: 'Erro', className: 'bg-red-100 text-red-700 border-red-200' },
};

const PAGE_SIZE = 20;

function TruncatedText({ text, max = 40 }) {
  if (!text) return <span className="text-gray-300">—</span>;
  if (text.length <= max) return <span>{text}</span>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted decoration-gray-300">{text.slice(0, max)}…</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs"><p className="text-sm">{text}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StatusBadge({ status, errorMessage }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.sent;
  const Icon = cfg.icon;
  const badge = (
    <Badge className={`border gap-1 ${cfg.className}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {cfg.label}
    </Badge>
  );
  if (status === 'error' && errorMessage) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild><span className="cursor-help">{badge}</span></TooltipTrigger>
          <TooltipContent className="max-w-xs"><p className="text-sm">{errorMessage}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return badge;
}

function ChannelIcon({ channel }) {
  if (channel === 'email') {
    return (
      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Mail className="w-4 h-4 text-blue-600" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
      <MessageCircle className="w-4 h-4 text-emerald-600" />
    </div>
  );
}

function LogRow({ log }) {
  const sentDate = log.sent_at
    ? new Date(log.sent_at).toLocaleString('pt-BR')
    : log.created_date
    ? new Date(log.created_date).toLocaleString('pt-BR')
    : '—';

  return (
    <div className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <ChannelIcon channel={log.channel} />
      <div className="w-36 flex-shrink-0 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{log.client_name || 'Sem cliente'}</p>
        <p className="text-xs text-gray-400">{log.channel === 'email' ? log.to_email : log.to_phone}</p>
      </div>
      <div className="w-32 flex-shrink-0">
        <Badge variant="outline" className="text-xs">{DOC_TYPE_LABELS[log.doc_type] || log.doc_type}</Badge>
      </div>
      <div className="w-40 flex-shrink-0 min-w-0">
        <p className="text-xs text-gray-700 truncate" title={log.file_name || ''}>{log.file_name || '—'}</p>
      </div>
      <div className="flex-1 min-w-0 text-xs text-gray-600">
        <TruncatedText text={log.message} max={50} />
      </div>
      <div className="w-36 flex-shrink-0 text-xs text-gray-500">{sentDate}</div>
      <div className="w-24 flex-shrink-0 flex justify-end">
        <StatusBadge status={log.status} errorMessage={log.error_message} />
      </div>
    </div>
  );
}

const ROW_HEADER = (
  <div className="hidden lg:flex items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
    <div className="w-8 flex-shrink-0" />
    <div className="w-36 flex-shrink-0">Cliente</div>
    <div className="w-32 flex-shrink-0">Tipo</div>
    <div className="w-40 flex-shrink-0">Arquivo</div>
    <div className="flex-1">Mensagem</div>
    <div className="w-36 flex-shrink-0">Enviado em</div>
    <div className="w-24 flex-shrink-0 text-right">Status</div>
  </div>
);

export default function CommunicationCenter() {
  const { effectiveEmail } = useEffectiveUser();
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['whatsapp-send-logs', effectiveEmail],
    queryFn: async () => {
      const res = await base44.functions.invoke('listWhatsAppSendLogs', {});
      return res.data?.logs || [];
    },
    enabled: !!effectiveEmail,
    initialData: [],
  });

  const filteredLogs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
    const toTime = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;

    return logs.filter(log => {
      if (docTypeFilter !== 'all' && log.doc_type !== docTypeFilter) return false;
      if (channelFilter !== 'all' && log.channel !== channelFilter) return false;
      if (search && !(log.client_name || '').toLowerCase().includes(search)) return false;
      const sentTime = log.sent_at ? new Date(log.sent_at).getTime() : null;
      if (fromTime && (!sentTime || sentTime < fromTime)) return false;
      if (toTime && (!sentTime || sentTime > toTime)) return false;
      return true;
    });
  }, [logs, docTypeFilter, channelFilter, searchTerm, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pageLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  const byClient = useMemo(() => {
    const groups = {};
    for (const log of filteredLogs) {
      const key = log.client_name || 'Sem cliente identificado';
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredLogs]);

  const resetPageAnd = (setter) => (value) => { setter(value); setCurrentPage(1); };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link
        to={createPageUrl('Home')}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-medium"
      >
        <ChevronLeft className="w-3 h-3" />
        Voltar
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-emerald-600" />
          Central de Mensagens
        </h1>
        <p className="text-gray-500 mt-1">Histórico unificado de envios por WhatsApp e Email</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs">Tipo de Documento</Label>
            <Select value={docTypeFilter} onValueChange={resetPageAnd(setDocTypeFilter)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Canal</Label>
            <Select value={channelFilter} onValueChange={resetPageAnd(setChannelFilter)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Cliente</Label>
            <div className="relative mt-1">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                className="pl-8"
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => resetPageAnd(setSearchTerm)(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" className="mt-1" value={dateFrom} onChange={(e) => resetPageAnd(setDateFrom)(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" className="mt-1" value={dateTo} onChange={(e) => resetPageAnd(setDateTo)(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas as Mensagens</TabsTrigger>
          <TabsTrigger value="by-client">Por Cliente</TabsTrigger>
        </TabsList>

        {/* ABA 1 — Todas as Mensagens */}
        <TabsContent value="all">
          <Card className="overflow-hidden">
            {isLoading ? (
              <CardContent className="pt-6 space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </CardContent>
            ) : filteredLogs.length === 0 ? (
              <CardContent className="py-16 text-center">
                <FileQuestion className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium">Nenhuma mensagem encontrada</p>
                <p className="text-gray-400 text-sm mt-1">Ajuste os filtros ou aguarde novos envios</p>
              </CardContent>
            ) : (
              <>
                {ROW_HEADER}
                <div>
                  {pageLogs.map(log => <LogRow key={log.id} log={log} />)}
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {filteredLogs.length} mensage{filteredLogs.length !== 1 ? 'ns' : 'm'} · página {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        {/* ABA 2 — Por Cliente */}
        <TabsContent value="by-client">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : byClient.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Users className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium">Nenhuma mensagem encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Accordion type="multiple" className="px-4">
                  {byClient.map(([clientName, clientLogs]) => {
                    const counts = clientLogs.reduce((acc, l) => {
                      acc[l.status] = (acc[l.status] || 0) + 1;
                      return acc;
                    }, {});
                    return (
                      <AccordionItem key={clientName} value={clientName}>
                        <AccordionTrigger>
                          <div className="flex items-center gap-3 flex-wrap text-left">
                            <span className="font-semibold text-gray-900">{clientName}</span>
                            <Badge variant="outline" className="text-xs">{clientLogs.length} mensage{clientLogs.length !== 1 ? 'ns' : 'm'}</Badge>
                            {Object.entries(counts).map(([status, count]) => (
                              <Badge key={status} className={`border text-xs ${(STATUS_CONFIG[status] || STATUS_CONFIG.sent).className}`}>
                                {count} {(STATUS_CONFIG[status] || STATUS_CONFIG.sent).label.toLowerCase()}
                              </Badge>
                            ))}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="border border-gray-100 rounded-lg overflow-hidden">
                            {clientLogs.map(log => <LogRow key={log.id} log={log} />)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
