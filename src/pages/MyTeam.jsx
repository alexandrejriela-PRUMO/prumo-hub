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
import { UserPlus, Trash2, Users, Mail, Briefcase, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ROLES = ['Estagiário', 'Engenheiro', 'Advogado', 'Administrador', 'Outro'];

const STATUS_CONFIG = {
  'Ativo':    { color: 'bg-green-100 text-green-800',  icon: CheckCircle },
  'Pendente': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  'Inativo':  { color: 'bg-gray-100 text-gray-600',   icon: AlertCircle },
};

export default function MyTeam() {
  const [user, setUser] = useState(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ member_email: '', member_name: '', member_role: '' });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['teamMembers', user?.email],
    queryFn: () => base44.entities.TeamMember.filter({ primary_user_email: user.email }),
    enabled: !!user?.email,
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
    const res = await base44.functions.invoke('manageTeamMembers', {
      action: 'invite',
      ...inviteForm,
    });
    setIsInviting(false);
    if (res.data?.error) {
      setInviteError(res.data.error);
    } else {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setShowInviteDialog(false);
      setInviteForm({ member_email: '', member_name: '', member_role: '' });
    }
  };

  const stats = {
    total: members.length,
    ativos: members.filter(m => m.status === 'Ativo').length,
    pendentes: members.filter(m => m.status === 'Pendente').length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Minha Equipe</h1>
          <p className="text-sm text-emerald-600 mt-1">
            Gerencie os membros da sua equipe e acompanhe os acessos.
          </p>
        </div>
        <Button
          onClick={() => { setShowInviteDialog(true); setInviteError(''); }}
          className="bg-emerald-700 hover:bg-emerald-800"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Convidar Membro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total de membros', value: stats.total, Icon: Users, bg: 'bg-emerald-100', text: 'text-emerald-700' },
          { label: 'Ativos', value: stats.ativos, Icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-700' },
          { label: 'Convites pendentes', value: stats.pendentes, Icon: Clock, bg: 'bg-yellow-100', text: 'text-yellow-700' },
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

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-emerald-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Membros da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-700 border-green-200 hover:bg-green-50 text-xs"
                          onClick={() => activateMutation.mutate(member.id)}
                        >
                          Ativar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeMutation.mutate(member.id)}
                      >
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

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro da Equipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>E-mail *</Label>
              <Input
                placeholder="email@exemplo.com"
                value={inviteForm.member_email}
                onChange={(e) => setInviteForm({ ...inviteForm, member_email: e.target.value })}
              />
            </div>
            <div>
              <Label>Nome (opcional)</Label>
              <Input
                placeholder="Nome completo"
                value={inviteForm.member_name}
                onChange={(e) => setInviteForm({ ...inviteForm, member_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Função *</Label>
              <Select
                value={inviteForm.member_role}
                onValueChange={(v) => setInviteForm({ ...inviteForm, member_role: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {inviteError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{inviteError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancelar</Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={handleInvite}
              disabled={isInviting || !inviteForm.member_email || !inviteForm.member_role}
            >
              {isInviting ? 'Enviando convite...' : 'Enviar Convite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}