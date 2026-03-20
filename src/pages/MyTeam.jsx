import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Trash2, Users, Mail, Briefcase, Clock, CheckCircle, AlertCircle, ClipboardList, Search, Activity, Plus, RefreshCw, Calendar, User, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RoleCard, RolePermissionsInline } from '../components/equipe/RolePermissionsPreview';

const ROLES = ['Estagiário', 'Engenheiro', 'Advogado', 'Administrador', 'Outro'];

const STATUS_CONFIG = {
  'Ativo':    { color: 'bg-green-100 text-green-800',  icon: CheckCircle },
  'Pendente': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  'Inativo':  { color: 'bg-gray-100 text-gray-600',    icon: AlertCircle },
};

const ENTITY_LABELS = {
  Property: 'Propriedade', Process: 'Processo', License: 'Licença Ambiental',
  PRAD: 'PRAD', ClientCRM: 'CRM', Document: 'Documento',
  Mapping: 'Mapeamento', Georeferencing: 'Georreferenciamento',
  CarbonCredit: 'Crédito de Carbono', Request: 'Requerimento', TeamMember: 'Equipe',
};

const ACTION_CONFIG = {
  create: { label: 'Criação',     color: 'bg-green-100 text-green-800', Icon: Plus },
  update: { label: 'Atualização', color: 'bg-blue-100 text-blue-800',   Icon: RefreshCw },
  delete: { label: 'Exclusão',    color: 'bg-red-100 text-red-800',     Icon: Trash2 },
};

export default function MyTeam() {
  const [user, setUser] = useState(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ member_email: '', member_name: '', member_role: '' });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logFilterEntity, setLogFilterEntity] = useState('all');
  const [logFilterAction, setLogFilterAction] = useState('all');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['teamMembers', user?.email],
    queryFn: () => base44.entities.TeamMember.filter({ primary_user_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.entities.AuditLog.list('-timestamp', 300),
    refetchInterval: 60000,
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamMember.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamMembers'] }),
  });

  const activateMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('manageTeamMembers', { action: 'activate', member_id: id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamMembers'] }),
  });

  const handleInvite = async () => {
    if (!inviteForm.member_email || !inviteForm.member_role) return;
    setIsInviting(true);
    setInviteError('');
    try {
      const res = await base44.functions.invoke('manageTeamMembers', { action: 'invite', ...inviteForm });
      if (res.data?.error) {
        setInviteError(res.data.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
        setShowInviteDialog(false);
        setInviteForm({ member_email: '', member_name: '', member_role: '' });
      }
    } catch (err) {
      setInviteError(err?.message || 'Erro ao enviar convite. Tente novamente.');
    } finally {
      setIsInviting(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const q = logSearch.toLowerCase();
    const matchSearch = !logSearch ||
      log.description?.toLowerCase().includes(q) ||
      log.user_email?.toLowerCase().includes(q) ||
      log.entity_label?.toLowerCase().includes(q);
    const matchEntity = logFilterEntity === 'all' || log.entity_name === logFilterEntity;
    const matchAction = logFilterAction === 'all' || log.action === logFilterAction;
    return matchSearch && matchEntity && matchAction;
  });

  const stats = {
    total: members.length,
    ativos: members.filter(m => m.status === 'Ativo').length,
    pendentes: members.filter(m => m.status === 'Pendente').length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Minha Equipe</h1>
          <p className="text-sm text-emerald-600 mt-1">Gerencie os membros da sua equipe e acompanhe as alterações.</p>
        </div>
        <Button onClick={() => { setShowInviteDialog(true); setInviteError(''); }} className="bg-emerald-700 hover:bg-emerald-800">
          <UserPlus className="w-4 h-4 mr-2" />
          Convidar Membro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de membros', value: stats.total,    Icon: Users,        bg: 'bg-emerald-100', text: 'text-emerald-700' },
          { label: 'Ativos',           value: stats.ativos,   Icon: CheckCircle,  bg: 'bg-green-100',   text: 'text-green-700' },
          { label: 'Pendentes',        value: stats.pendentes, Icon: Clock,        bg: 'bg-yellow-100',  text: 'text-yellow-700' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${s.bg} flex items-center justify-center`}>
                  <s.Icon className={`w-5 h-5 ${s.text}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="team">
        <TabsList className="w-full">
          <TabsTrigger value="team" className="flex-1 flex items-center gap-2">
            <Users className="w-4 h-4" /> Membros da Equipe
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex-1 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Logs de Auditoria
          </TabsTrigger>
        </TabsList>

        {/* ---- EQUIPE ---- */}
        <TabsContent value="team">
          <Card>
            <CardContent className="pt-4">
              {isLoading ? (
                <p className="text-center text-gray-500 py-10">Carregando...</p>
              ) : members.length === 0 ? (
                <div className="text-center py-14">
                  <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Nenhum membro na equipe ainda.</p>
                  <p className="text-sm text-gray-400 mt-1">Convide pessoas para colaborar com você.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map(member => {
                    const statusCfg = STATUS_CONFIG[member.status] || STATUS_CONFIG['Inativo'];
                    const StatusIcon = statusCfg.icon;
                    return (
                      <div key={member.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white font-semibold text-sm">
                            {(member.member_name || member.member_email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{member.member_name || '—'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <p className="text-sm text-gray-500">{member.member_email}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                            {member.member_role}
                          </div>
                          <Badge className={`${statusCfg.color} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {member.status}
                          </Badge>
                          {member.invited_at && (
                            <span className="text-xs text-gray-400 hidden sm:block">
                              {format(new Date(member.invited_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          )}
                          {member.status === 'Pendente' && (
                            <Button variant="outline" size="sm" className="text-green-700 border-green-200 hover:bg-green-50 text-xs" onClick={() => activateMutation.mutate(member.id)}>
                              Ativar
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeMutation.mutate(member.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- AUDITORIA ---- */}
        <TabsContent value="audit" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input className="pl-9" placeholder="Buscar..." value={logSearch} onChange={(e) => setLogSearch(e.target.value)} />
                </div>
                <Select value={logFilterEntity} onValueChange={setLogFilterEntity}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Entidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as entidades</SelectItem>
                    {Object.entries(ENTITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={logFilterAction} onValueChange={setLogFilterAction}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ações</SelectItem>
                    <SelectItem value="create">Criação</SelectItem>
                    <SelectItem value="update">Atualização</SelectItem>
                    <SelectItem value="delete">Exclusão</SelectItem>
                  </SelectContent>
                </Select>
                <button onClick={() => refetchLogs()} className="p-2 rounded-xl hover:bg-emerald-50 transition-colors" title="Atualizar">
                  <RefreshCw className="w-4 h-4 text-emerald-700" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Log list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-emerald-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                {filteredLogs.length} evento{filteredLogs.length !== 1 ? 's' : ''} encontrado{filteredLogs.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {logsLoading ? (
                <p className="text-center text-gray-500 py-10">Carregando logs...</p>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-14">
                  <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nenhum log encontrado.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredLogs.map(log => {
                    const actionCfg = ACTION_CONFIG[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700', Icon: Activity };
                    const ActionIcon = actionCfg.Icon;
                    return (
                      <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white text-xs font-bold mt-0.5">
                          {(log.user_email || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{log.description || '—'}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1">
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
                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                          <Badge className="text-xs bg-gray-100 text-gray-600">{ENTITY_LABELS[log.entity_name] || log.entity_name}</Badge>
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
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro da Equipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>E-mail *</Label>
              <Input placeholder="email@exemplo.com" value={inviteForm.member_email} onChange={(e) => setInviteForm({ ...inviteForm, member_email: e.target.value })} />
            </div>
            <div>
              <Label>Nome (opcional)</Label>
              <Input placeholder="Nome completo" value={inviteForm.member_name} onChange={(e) => setInviteForm({ ...inviteForm, member_name: e.target.value })} />
            </div>
            <div>
              <Label>Função *</Label>
              <Select value={inviteForm.member_role} onValueChange={(v) => setInviteForm({ ...inviteForm, member_role: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {inviteError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{inviteError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancelar</Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={handleInvite} disabled={isInviting || !inviteForm.member_email || !inviteForm.member_role}>
              {isInviting ? 'Enviando convite...' : 'Enviar Convite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}