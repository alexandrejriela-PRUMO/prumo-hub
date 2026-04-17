import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  UserPlus, Trash2, Users, Mail, Briefcase, Settings,
  CheckCircle, Shield, Info, Send
} from 'lucide-react';
import { toast } from 'sonner';

const ROLES = ['Estagiário', 'Engenheiro', 'Advogado', 'Administrador', 'Outro'];

const MODULES = [
  { key: 'office',           label: 'Escritório',         fields: ['view', 'edit'] },
  { key: 'property_center',  label: 'Central da Propriedade', fields: ['view', 'edit'] },
  { key: 'advanced_modules', label: 'Módulos Avançados',  fields: ['access'] },
  { key: 'reports',          label: 'Relatórios',         fields: ['view'] },
  { key: 'ai_chat',          label: 'Chat IA Rute',       fields: ['access'] },
  { key: 'team_management',  label: 'Gestão de Equipe',   fields: ['manage'] },
  { key: 'financial',        label: 'Financeiro',         fields: ['view'] },
];

const FIELD_LABELS = { view: 'Ver', edit: 'Editar', access: 'Acesso', manage: 'Gerenciar' };

function defaultPermissions(role) {
  const viewer = {
    office:           { view: true,  edit: false },
    property_center:  { view: true,  edit: false },
    advanced_modules: { access: false },
    reports:          { view: false },
    ai_chat:          { access: true },
    team_management:  { manage: false },
    financial:        { view: false },
  };
  const r = (role || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (r === 'engenheiro') return { ...viewer, office: { view: true, edit: true }, property_center: { view: true, edit: true }, advanced_modules: { access: true }, reports: { view: true } };
  if (r === 'advogado')   return { ...viewer, reports: { view: true } };
  if (r === 'administrador') return { office: { view: true, edit: true }, property_center: { view: true, edit: true }, advanced_modules: { access: true }, reports: { view: true }, ai_chat: { access: true }, team_management: { manage: true }, financial: { view: true } };
  return viewer;
}

export default function MyTeam() {
  const [user, setUser] = useState(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showPermDialog, setShowPermDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [linkForm, setLinkForm] = useState({ member_email: '', member_name: '', member_role: '', primary_user_email: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', member_role: '', target_user_type: 'equipe' });
  const [editPerms, setEditPerms] = useState(null);
  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'admin';
  const isConsultor = user?.user_type === 'consultor';

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Todos os membros cadastrados (admin vê tudo, consultor vê os seus)
  const { data: allMembers = [], isLoading } = useQuery({
    queryKey: ['allTeamMembers', user?.email, isAdmin],
    queryFn: () => isAdmin
      ? base44.entities.TeamMember.list('-created_date', 200)
      : base44.entities.TeamMember.filter({ primary_user_email: user.email }),
    enabled: !!user?.email,
  });

  // Vincula um usuário existente ao consultor
  const linkMutation = useMutation({
    mutationFn: async (form) => {
      const perms = defaultPermissions(form.member_role);
      return base44.entities.TeamMember.create({
        primary_user_email: form.primary_user_email || user.email,
        consultor_email: form.primary_user_email || user.email,
        member_email: form.member_email,
        member_name: form.member_name || '',
        member_role: form.member_role,
        status: 'Ativo',
        permissions: perms,
        pending_user_type: 'equipe',
        user_type_applied: true,
      });
    },
    onSuccess: () => {
      toast.success('Membro vinculado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
      setShowLinkDialog(false);
      setLinkForm({ member_email: '', member_name: '', member_role: '', primary_user_email: '' });
    },
    onError: (err) => toast.error(err?.message || 'Erro ao vincular membro.'),
  });

  // Envia convite de novo usuário
  const inviteMutation = useMutation({
    mutationFn: async (form) => {
      if (!isConsultor && !isAdmin) {
        throw new Error('Você não tem permissão para enviar convites');
      }

      // Criar registro TeamMember com status pendente
      const teamMemberData = {
        primary_user_email: user.email,
        consultor_email: user.email,
        member_email: form.email,
        member_name: form.name,
        member_role: form.member_role,
        status: 'Pendente',
        pending_user_type: form.target_user_type,
        user_type_applied: false,
        permissions: defaultPermissions(form.member_role),
        invite_token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        invited_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const teamMember = await base44.entities.TeamMember.create(teamMemberData);

      // Enviar email de convite
      const invite_link = `${window.location.origin}/AcceptInvite?token=${teamMember.invite_token}`;
      
      await base44.functions.invoke('sendTeamInvite', {
        email: form.email,
        name: form.name,
        member_role: form.member_role,
        target_user_type: form.target_user_type,
        invite_link: invite_link
      });

      return teamMember;
    },
    onSuccess: () => {
      toast.success('Convite enviado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
      setShowInviteDialog(false);
      setInviteForm({ email: '', name: '', member_role: '', target_user_type: 'equipe' });
    },
    onError: (err) => toast.error(err?.message || 'Erro ao enviar convite.'),
  });

  // Remove membro
  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamMember.delete(id),
    onSuccess: () => {
      toast.success('Membro removido.');
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
    },
    onError: () => toast.error('Erro ao remover membro.'),
  });

  // Salva permissões
  const savePermsMutation = useMutation({
    mutationFn: ({ id, permissions }) => base44.entities.TeamMember.update(id, { permissions }),
    onSuccess: () => {
      toast.success('Permissões atualizadas!');
      queryClient.invalidateQueries({ queryKey: ['allTeamMembers'] });
      setShowPermDialog(false);
    },
    onError: () => toast.error('Erro ao salvar permissões.'),
  });

  const openPermDialog = (member) => {
    setSelectedMember(member);
    setEditPerms(member.permissions || defaultPermissions(member.member_role));
    setShowPermDialog(true);
  };

  const togglePerm = (moduleKey, field) => {
    setEditPerms(prev => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], [field]: !prev[moduleKey]?.[field] }
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Minha Equipe</h1>
          <p className="text-sm text-emerald-600 mt-1">
            Convide novos membros ou gerencie os que já fazem parte da sua equipe.
          </p>
        </div>
        <div className="flex gap-2">
          {(isConsultor || isAdmin) && (
            <Button onClick={() => setShowInviteDialog(true)} className="bg-emerald-700 hover:bg-emerald-800">
              <Send className="w-4 h-4 mr-2" />
              Convidar Membro
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => setShowLinkDialog(true)} className="bg-blue-700 hover:bg-blue-800">
              <UserPlus className="w-4 h-4 mr-2" />
              Vincular Membro
            </Button>
          )}
        </div>
      </div>

      {/* Aviso informativo */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <Info className="w-5 h-5 flex-shrink-0 text-blue-500 mt-0.5" />
        <div>
          <p className="font-medium mb-1">Como funciona o acesso da equipe?</p>
          <p>Você pode <strong>convidar novos membros</strong> diretamente enviando um link de convite por email. Após aceitar, você pode definir suas funções e permissões de acesso ao sistema.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total de Membros', value: allMembers.length, Icon: Users, bg: 'bg-emerald-100', text: 'text-emerald-700' },
          { label: 'Ativos', value: allMembers.filter(m => m.status === 'Ativo').length, Icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-700' },
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
          {isLoading ? (
            <p className="text-center text-gray-500 py-10">Carregando...</p>
          ) : allMembers.length === 0 ? (
            <div className="text-center py-14">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum membro vinculado ainda.</p>
              <p className="text-sm text-gray-400 mt-1">Convide novos membros clicando no botão acima.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allMembers.map(member => (
                <div key={member.id} className="p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {(member.member_name || member.member_email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{member.member_name || '—'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <p className="text-sm text-gray-500 truncate">{member.member_email}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-100">
                            <Briefcase className="w-3 h-3 text-blue-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-blue-700">{member.member_role || '—'}</span>
                          </div>
                          <Badge className={member.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {member.status}
                          </Badge>
                          {isAdmin && member.primary_user_email && (
                            <span className="text-xs text-gray-400 hidden sm:block">
                              Consultor: {member.primary_user_email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline" size="sm"
                        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs"
                        onClick={() => openPermDialog(member)}
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Permissões
                      </Button>
                      {(isAdmin || (isConsultor && member.primary_user_email === user.email)) && (
                        <Button
                          variant="ghost" size="icon"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeMutation.mutate(member.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Convidar Novo Membro */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Novo Membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
              ✓ O convite será enviado por email. O usuário criará sua conta ao aceitar.
            </div>
            <div>
              <Label>E-mail do usuário *</Label>
              <input
                type="email"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="email@exemplo.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Nome *</Label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Nome completo"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo de Acesso *</Label>
              <Select value={inviteForm.target_user_type} onValueChange={(v) => setInviteForm({ ...inviteForm, target_user_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipe">Membro da Equipe</SelectItem>
                  <SelectItem value="client_consultor">Visualizador de Propriedade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Função *</Label>
              <Select value={inviteForm.member_role} onValueChange={(v) => setInviteForm({ ...inviteForm, member_role: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancelar</Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => inviteMutation.mutate(inviteForm)}
              disabled={inviteMutation.isPending || !inviteForm.email || !inviteForm.name || !inviteForm.member_role}
            >
              {inviteMutation.isPending ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Vincular Membro */}
      {isAdmin && (
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular Membro ao Consultor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                ⚠️ O usuário precisa já ter sido convidado e ter criado sua conta no sistema antes de ser vinculado aqui.
              </div>
              <div>
                <Label>E-mail do usuário *</Label>
                <input
                  type="email"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="email@exemplo.com"
                  value={linkForm.member_email}
                  onChange={(e) => setLinkForm({ ...linkForm, member_email: e.target.value })}
                />
              </div>
              <div>
                <Label>Nome (opcional)</Label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Nome completo"
                  value={linkForm.member_name}
                  onChange={(e) => setLinkForm({ ...linkForm, member_name: e.target.value })}
                />
              </div>
              <div>
                <Label>E-mail do consultor responsável *</Label>
                <input
                  type="email"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="consultor@exemplo.com"
                  value={linkForm.primary_user_email}
                  onChange={(e) => setLinkForm({ ...linkForm, primary_user_email: e.target.value })}
                />
              </div>
              <div>
                <Label>Função *</Label>
                <Select value={linkForm.member_role} onValueChange={(v) => setLinkForm({ ...linkForm, member_role: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Cancelar</Button>
              <Button
                className="bg-emerald-700 hover:bg-emerald-800"
                onClick={() => linkMutation.mutate(linkForm)}
                disabled={linkMutation.isPending || !linkForm.member_email || !linkForm.member_role || !linkForm.primary_user_email}
              >
                {linkMutation.isPending ? 'Vinculando...' : 'Vincular Membro'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Permissões de Layout */}
      <Dialog open={showPermDialog} onOpenChange={setShowPermDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-700" />
                Permissões de Visualização — {selectedMember?.member_name || selectedMember?.member_email}
              </div>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-2">Configure quais módulos do layout este membro pode acessar.</p>
          <div className="space-y-3 py-2 max-h-96 overflow-y-auto">
            {MODULES.map(mod => (
              <div key={mod.key} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-800 mb-2">{mod.label}</p>
                <div className="flex flex-wrap gap-4">
                  {mod.fields.map(field => (
                    <div key={field} className="flex items-center gap-2">
                      <Switch
                        checked={!!editPerms?.[mod.key]?.[field]}
                        onCheckedChange={() => togglePerm(mod.key, field)}
                      />
                      <span className="text-xs text-gray-600">{FIELD_LABELS[field]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermDialog(false)}>Cancelar</Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => savePermsMutation.mutate({ id: selectedMember.id, permissions: editPerms })}
              disabled={savePermsMutation.isPending}
            >
              {savePermsMutation.isPending ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}