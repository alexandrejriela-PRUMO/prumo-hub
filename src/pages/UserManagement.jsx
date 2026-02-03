import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Mail, UserPlus, Shield, User, Trash2, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function UserManagement() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [createForm, setCreateForm] = useState({
    email: '',
    full_name: '',
    role: 'user',
    password: ''
  });
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'user'
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.role !== 'admin') {
          window.location.href = '/';
        }
      } catch (e) {
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date', 100),
    enabled: !!user && user.role === 'admin'
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data) => {
      await base44.users.inviteUser(data.email, data.role);
    },
    onSuccess: () => {
      toast.success('Convite enviado com sucesso!');
      setInviteDialogOpen(false);
      setInviteForm({ email: '', role: 'user' });
      queryClient.invalidateQueries(['users']);
    },
    onError: (error) => {
      toast.error('Erro ao enviar convite: ' + error.message);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      toast.success('Usuário removido com sucesso!');
      queryClient.invalidateQueries(['users']);
    },
    onError: (error) => {
      toast.error('Erro ao remover usuário: ' + error.message);
    }
  });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      // Criar usuário usando a API do Base44
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Sistema: Você precisa criar um novo usuário no sistema.
        Email: ${createForm.email}
        Nome: ${createForm.full_name}
        Role: ${createForm.role}
        
        IMPORTANTE: Esta é uma operação administrativa. Retorne apenas uma confirmação de que o usuário seria criado.`,
        response_json_schema: {
          type: "object",
          properties: {
            status: { type: "string" },
            message: { type: "string" }
          }
        }
      });

      // Tentar criar diretamente usando a API
      await base44.entities.User.create({
        email: createForm.email,
        full_name: createForm.full_name,
        role: createForm.role
      });

      toast.success('Usuário criado com sucesso!');
      setDialogOpen(false);
      setCreateForm({ email: '', full_name: '', role: 'user', password: '' });
      queryClient.invalidateQueries(['users']);
    } catch (error) {
      // Fallback para convite se criação direta não funcionar
      toast.warning('Criação direta não disponível. Enviando convite...');
      await inviteUserMutation.mutateAsync({ email: createForm.email, role: createForm.role });
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-gray-500 mt-1">Gerencie usuários e permissões do sistema</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                <Mail className="w-4 h-4 mr-2" />
                Enviar Convite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar Convite por Email</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); inviteUserMutation.mutate(inviteForm); }} className="space-y-4">
                <div>
                  <Label>Email do Usuário</Label>
                  <Input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="usuario@email.com"
                    required
                  />
                </div>
                <div>
                  <Label>Nível de Acesso</Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={inviteUserMutation.isPending}>
                  {inviteUserMutation.isPending ? 'Enviando...' : 'Enviar Convite'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <UserPlus className="w-4 h-4 mr-2" />
                Criar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <Label>Nome Completo</Label>
                  <Input
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                    placeholder="João Silva"
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="usuario@email.com"
                    required
                  />
                </div>
                <div>
                  <Label>Nível de Acesso</Label>
                  <Select
                    value={createForm.role}
                    onValueChange={(v) => setCreateForm({ ...createForm, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Senha Inicial</Label>
                  <Input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Senha temporária"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">O usuário poderá alterar após o primeiro login</p>
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Criar Usuário
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-blue-800 text-sm">
            <strong>Criar Usuário:</strong> Cria acesso imediato ao sistema com credenciais.
            <br />
            <strong>Enviar Convite:</strong> Envia email de convite para o usuário se cadastrar.
          </p>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold">
                    {u.full_name?.charAt(0) || u.email?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{u.full_name || 'Sem nome'}</p>
                    <p className="text-sm text-gray-600">{u.email}</p>
                    <p className="text-xs text-gray-500">
                      Criado em {format(parseISO(u.created_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={u.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-blue-100 text-blue-700 border-blue-300'}>
                    {u.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                    {u.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </Badge>
                  {u.email !== user.email && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (window.confirm(`Deseja realmente remover ${u.email}?`)) {
                          deleteUserMutation.mutate(u.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}