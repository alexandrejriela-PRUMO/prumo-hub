import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Search, User, Calendar, Activity, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ENTITY_LABELS = {
  Property: 'Propriedade',
  Process: 'Processo',
  License: 'Licença Ambiental',
  PRAD: 'PRAD',
  ClientCRM: 'CRM',
  Document: 'Documento',
  Mapping: 'Mapeamento',
  Georeferencing: 'Georreferenciamento',
  CarbonCredit: 'Crédito de Carbono',
  Request: 'Requerimento',
  TeamMember: 'Equipe',
};

const ACTION_CONFIG = {
  create: { label: 'Criação',      color: 'bg-green-100 text-green-800',  Icon: Plus },
  update: { label: 'Atualização',  color: 'bg-blue-100 text-blue-800',    Icon: RefreshCw },
  delete: { label: 'Exclusão',     color: 'bg-red-100 text-red-800',      Icon: Trash2 },
};

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.entities.AuditLog.list('-timestamp', 300),
    refetchInterval: 60000,
  });

  const filtered = logs.filter(log => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      log.description?.toLowerCase().includes(q) ||
      log.user_email?.toLowerCase().includes(q) ||
      log.entity_label?.toLowerCase().includes(q);
    const matchEntity = filterEntity === 'all' || log.entity_name === filterEntity;
    const matchAction = filterAction === 'all' || log.action === filterAction;
    return matchSearch && matchEntity && matchAction;
  });

  const stats = {
    total:    logs.length,
    creates:  logs.filter(l => l.action === 'create').length,
    updates:  logs.filter(l => l.action === 'update').length,
    deletes:  logs.filter(l => l.action === 'delete').length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Logs de Auditoria</h1>
          <p className="text-sm text-emerald-600 mt-1">
            Histórico completo de todas as alterações realizadas no sistema.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl hover:bg-emerald-50 transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="w-5 h-5 text-emerald-700" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total de eventos', value: stats.total,   color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Criações',          value: stats.creates, color: 'bg-green-100 text-green-700' },
          { label: 'Atualizações',      value: stats.updates, color: 'bg-blue-100 text-blue-700' },
          { label: 'Exclusões',         value: stats.deletes, color: 'bg-red-100 text-red-700' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <p className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Buscar por descrição, usuário ou registro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Filtrar por entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as entidades</SelectItem>
                {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="create">Criação</SelectItem>
                <SelectItem value="update">Atualização</SelectItem>
                <SelectItem value="delete">Exclusão</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-emerald-900 text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            {filtered.length} evento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center text-gray-500 py-14">Carregando logs...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14">
              <Activity className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum log encontrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(log => {
                const actionCfg = ACTION_CONFIG[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700', Icon: Activity };
                const ActionIcon = actionCfg.Icon;
                return (
                  <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white text-xs font-bold mt-0.5">
                      {(log.user_email || 'S').charAt(0).toUpperCase()}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{log.description || '—'}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{log.user_email || 'Sistema'}</span>
                        </div>
                        {log.timestamp && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                      <Badge className="text-xs bg-gray-100 text-gray-600">
                        {ENTITY_LABELS[log.entity_name] || log.entity_name}
                      </Badge>
                      <Badge className={`text-xs flex items-center gap-1 ${actionCfg.color}`}>
                        <ActionIcon className="w-3 h-3" />
                        {actionCfg.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}