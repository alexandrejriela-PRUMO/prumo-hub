import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, Shield, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  { value: 'start', label: 'Consultor Start' },
  { value: 'pro', label: 'Consultor Pro' },
  { value: 'enterprise', label: 'Consultor Enterprise' },
  { value: 'unico', label: 'Produtor Único' },
];

const USER_TYPES = [
  { value: 'consultor', label: 'Consultor' },
  { value: 'produtor', label: 'Produtor Rural' },
];

export default function AdminInviteUser() {
  const [form, setForm] = useState({
    email: '',
    role: 'user',
    user_type: 'consultor',
    plano: 'start',
    subscription_status: 'active',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!form.email || !form.email.includes('@')) {
      toast.error('Informe um e-mail válido.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const currentUser = await base44.auth.me();
      
      // 1. Create a TeamMember with Pendente status (as if it's an invite)
      const inviteToken = Math.random().toString(36).substr(2, 9) + Date.now();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Create TeamMember via backend function (service role needed)
      await base44.functions.invoke('createTeamMemberInvite', {
        member_email: form.email,
        member_name: form.email.split('@')[0],
        user_type: form.user_type,
      });

      // 2. Create base44 user via platform invite (cria a conta na plataforma)
      // O Base44 envia automaticamente o e-mail de convite com o link correto de acesso.
      await base44.users.inviteUser(form.email, form.role);

      // 4. Wait a bit then update user metadata via admin function
      setTimeout(async () => {
        try {
          const res = await base44.functions.invoke('adminGetUsers', { type: 'users' });
          const users = res.data.users || [];
          const found = users.find(u => u.email === form.email);
          if (found) {
            await base44.functions.invoke('adminDeleteUser', {
              action: 'update_meta',
              user_id: found.id,
              user_type: form.user_type,
              plano: form.plano,
              subscription_status: form.subscription_status,
            });
          }
        } catch (e) {
          // metadata update is best-effort
        }
      }, 3000);

      setResult({ success: true, email: form.email });
      toast.success(`Convite enviado para ${form.email}`);
      setForm({ email: '', role: 'user', user_type: 'consultor', plano: 'start', subscription_status: 'active' });
    } catch (err) {
      setResult({ success: false, message: err?.message || 'Erro ao convidar usuário.' });
      toast.error('Erro ao enviar convite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Criação de Ecossistema Prévio (Exceção)</p>
          <p>Use esta ferramenta para criar um acesso antecipado para usuários antes da automação do checkout. O convite é enviado por e-mail e o ecossistema inicial (tipo, plano, status) é configurado automaticamente.</p>
        </div>
      </div>

      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            Convidar Novo Usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>E-mail do usuário *</Label>
            <Input
              type="email"
              placeholder="usuario@email.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de perfil</Label>
              <Select value={form.user_type} onValueChange={v => setForm(f => ({ ...f, user_type: v, plano: v === 'produtor' ? 'unico' : 'start' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plano inicial</Label>
              <Select value={form.plano} onValueChange={v => setForm(f => ({ ...f, plano: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.filter(p => form.user_type === 'produtor' ? p.value === 'unico' : p.value !== 'unico').map(p =>
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role do sistema</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário comum</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status da assinatura</Label>
              <Select value={form.subscription_status} onValueChange={v => setForm(f => ({ ...f, subscription_status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleInvite}
            disabled={loading || !form.email}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? 'Enviando convite...' : (
              <><Mail className="w-4 h-4 mr-2" /> Enviar Convite e Configurar Ecossistema</>
            )}
          </Button>

          {result && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${result.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {result.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <div>
                {result.success
                  ? <>Convite enviado para <strong>{result.email}</strong>. O ecossistema inicial será configurado automaticamente após o primeiro acesso.</>
                  : result.message}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}