import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  UserPlus, Trash2, Users, Mail, Briefcase, Clock,
  CheckCircle, AlertCircle, RefreshCw, Calendar, User,
  Link2, Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { RolePermissionsInline } from '../components/equipe/RolePermissionsPreview';
import InviteExpirationInfo from '../components/equipe/InviteExpirationInfo';

const ROLES = ['Estagiário', 'Engenheiro', 'Advogado', 'Administrador', 'Outro'];

const STATUS_CONFIG = {
  'Ativo':    { color: 'bg-green-100 text-green-800',  icon: CheckCircle },
  'Pendente': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  'Inativo':  { color: 'bg-gray-100 text-gray-600',    icon: AlertCircle },
};

export default function MyTeam() {
  const [user, setUser] = useState(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ member_email: '', member_name: '', member_role: '' });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [loadingLinkId, setLoadingLinkId] = useState(null);
  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Busca membros vinculados ao consultor atual
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['teamMembers', user?.email],
    queryFn: () => base44.entities.TeamMember.filter({ primary_user_email: user.email }),
    enabled: !!user?.email,
  });

  // Para admin: busca todos os membros
  const { data: allMembers = [], isLoading: allLoading } = useQuery({
    queryKey: ['allTeamMembers'],
    queryFn: () => base44.entities.TeamMember.list('-created_date', 200),
    enabled: isAdmin,
  });

  const displayMembers = isAdmin ? allMembers : members;
  const loading = isAdmin ? allLoading : isLoading;

  const removeMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('manageTeamMembers', { action: 'remove', member_id: id }),
    onSuccess: (_, memberId) => {
      const member = displayMembers.find(m => m.id === memberId);
      toast.success(`👋 ${member?.member_name || member?.member_email} removido da equipe`);
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
    },
    onError: (err) => toast.error('Erro ao remover membro'),
  });

  const activateMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('manageTeamMembers', { action: 'activate', member_id: id }),
    onSuccess: (_, memberId) => {
      const member = displayMembers.find(m => m.id === memberId);
      toast.success(`✅ ${member?.member_name || member?.member_email} ativado(a)!`);
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('manageTeamMembers', { action: 'resend_invite', member_id: id }),
    onSuccess: (_, memberId) => {
      const member = displayMembers.find(m => m.id === memberId);
      toast.success(`✉️ Convite reenviado para ${member?.member_email}!`);
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
    },
    onError: (err) => toast.error(err?.message || 'Erro ao reenviar convite'),
  });

  const handleCopyInviteLink = async (memberId) => {
    setLoadingLinkId(memberId);
    try {
      const res = await base44.functions.invoke('generateInviteLink', { action: 'generate', member_id: memberId });
      const link = res.data?.invite_link;
      if (link) {
        await navigator.clipboard.writeText(link);
        toast.success('🔗 Link de convite copiado!');
      } else {
        toast.error('Erro ao gerar link.');
      }
    } catch {
      toast.error('Erro ao gerar link de convite.');
    } finally {
      setLoadingLinkId(null);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.member_email || !inviteForm.member_role) return;
    if (isAdmin && !inviteForm.primary_user_email) {
      setInviteError('Informe o email do consultor responsável.');
      return;
    }
    setIsInviting(true);
    setInviteError('');
    try {
      const payload = { action: 'invite', ...inviteForm };
      if (!isAdmin) delete payload.primary_user_email; // não-admin não pode sobrescrever
      const res = await base44.functions.invoke('manageTeamMembers', payload);
      if (res.data?.error) {
        setInviteError(res.data.error);
        toast.error(res.data.error);
      } else {
        toast.success(`✅ Convite enviado para ${inviteForm.member_email}!`);
        queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
        setShowInviteDialog(false);
        setInviteForm({ member_email: '', member_name: '', member_role: '' });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao enviar convite.';
      setInviteError(msg);
      toast.error(msg);
    } finally {
      setIsInviting(false);
    }
  };

  const stats = {
    total: displayMembers.length,
    ativos: displayMembers.filter(m => m.status === 'Ativo').length,
    pendentes: displayMembers.filter(m => m.status === 'Pendente').length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Minha Equipe</h1>
          <p className="text-sm text-emerald-600 mt-1">
            {isAdmin ? 'Gerencie todos os membros da equipe.' : 'Visualize os membros vinculados à sua equipe.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setShowInviteDialog(true); setInviteError(''); }} className="bg-emerald-700 hover:bg-emerald-800">
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar Membro
          </Button>
        )}
      </div>

      {/* Aviso para não-admin */}
      {!isAdmin && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <Shield className="w-5 h-5 flex-shrink-0 text-blue-500" />
          <span>O gerenciamento de convites é realizado pelo administrador do aplicativo. Aqui você pode visualizar os membros da equipe.</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: stats.total,    Icon: Users,       bg: 'bg-emerald-100', text: 'text-emerald-700' },
          { label: 'Ativos',  value: stats.ativos,   Icon: CheckCircle, bg: 'bg-green-100',   text: 'text-green-700' },
          { label: 'Pendentes', value: stats.pendentes, Icon: Clock,    bg: 'bg-yellow-100',  text: 'text-yellow-700' },
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

      {/* Lista de membros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-emerald-900 flex items-center gap-2">
            <Users className="w-4 h-4" /> Membros da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-10">Carregando...</p>
          ) : displayMembers.length === 0 ? (
            <div className="text-center py-14">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum membro na equipe ainda.</p>
              {isAdmin && <p className="text-sm text-gray-400 mt-1">Convide pessoas para colaborar.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {displayMembers.map(member => {
                const statusCfg = STATUS_CONFIG[member.status] || STATUS_CONFIG['Inativo'];
                const StatusIcon = statusCfg.icon;
                return (
                  <div key={member.id} className="p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {(member.member_name || member.member_email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{member.member_name || '—'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <p className="text-sm text-gray-500 truncate">{member.member_email}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-100">
                              <Briefcase className="w-3 h-3 text-blue-600 flex-shrink-0" />
                              <span className="text-xs font-medium text-blue-700">{member.member_role}</span>
                            </div>
                            <Badge className={`${statusCfg.color} flex items-center gap-1 text-xs`}>
                              <StatusIcon className="w-3 h-3" />
                              {member.status}
                            </Badge>
                            {isAdmin && member.primary_user_email && (
                              <span className="text-xs text-gray-400 hidden sm:block">
                                Consultor: {member.primary_user_email}
                              </span>
                            )}
                          </div>
                          {member.status === 'Pendente' && (
                            <div className="mt-2">
                              <InviteExpirationInfo member={member} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ações — apenas admin */}
                      {isAdmin && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {member.invited_at && (
                            <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:block">
                              {format(new Date(member.invited_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          )}
                          {member.status === 'Pendente' && (
                            <>
                              <Button
                                variant="outline" size="sm"
                                className="text-purple-700 border-purple-200 hover:bg-purple-50 text-xs"
                                onClick={() => handleCopyInviteLink(member.id)}
                                disabled={loadingLinkId === member.id}
                              >
                                {loadingLinkId === member.id
                                  ? <RefreshCw className="w-3 h-3 animate-spin" />
                                  : <><Link2 className="w-3 h-3 mr-1" />Link</>
                                }
                              </Button>
                              <Button variant="outline" size="sm" className="text-blue-700 border-blue-200 hover:bg-blue-50 text-xs" onClick={() => resendInviteMutation.mutate(member.id)}>
                                Reenviar
                              </Button>
                              <Button variant="outline" size="sm" className="text-green-700 border-green-200 hover:bg-green-50 text-xs" onClick={() => activateMutation.mutate(member.id)}>
                                Ativar
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeMutation.mutate(member.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog — apenas admin */}
      {isAdmin && (
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
                <Label>Consultor (email) *</Label>
                <Input placeholder="email do consultor responsável" value={inviteForm.primary_user_email || ''} onChange={(e) => setInviteForm({ ...inviteForm, primary_user_email: e.target.value })} />
              </div>
              <div>
                <Label>Função *</Label>
                <Select value={inviteForm.member_role} onValueChange={(v) => setInviteForm({ ...inviteForm, member_role: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                {inviteForm.member_role && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs font-semibold text-blue-900 mb-2">📌 Permissões para <strong>{inviteForm.member_role}</strong>:</p>
                    <RolePermissionsInline role={inviteForm.member_role} />
                  </div>
                )}
              </div>
              {inviteError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{inviteError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancelar</Button>
              <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={handleInvite} disabled={isInviting || !inviteForm.member_email || !inviteForm.member_role}>
                {isInviting ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}