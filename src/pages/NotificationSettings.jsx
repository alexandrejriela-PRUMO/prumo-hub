import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Mail, Smartphone, MessageSquare, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const eventTypes = [
  { value: 'novo_alerta_ambiental', label: 'Novo Alerta Ambiental', description: 'Quando um novo alerta ambiental é detectado' },
  { value: 'alerta_resolvido', label: 'Alerta Resolvido', description: 'Quando um alerta é marcado como resolvido' },
  { value: 'licenca_vencendo', label: 'Licença Vencendo', description: '30 dias antes do vencimento de licenças' },
  { value: 'licenca_vencida', label: 'Licença Vencida', description: 'Quando uma licença vence' },
  { value: 'documento_vencendo', label: 'Documento Vencendo', description: 'Quando documentos estão próximos ao vencimento' },
  { value: 'nova_fatura', label: 'Nova Fatura', description: 'Quando uma nova fatura é gerada' },
  { value: 'fatura_vencendo', label: 'Fatura Vencendo', description: '7 dias antes do vencimento de faturas' },
  { value: 'novo_processo', label: 'Novo Processo', description: 'Quando um novo processo é cadastrado' },
  { value: 'atualizacao_processo', label: 'Atualização de Processo', description: 'Quando há andamento em processos' },
  { value: 'novo_requerimento', label: 'Novo Requerimento', description: 'Quando você faz um novo requerimento' },
  { value: 'resposta_requerimento', label: 'Resposta de Requerimento', description: 'Quando sua solicitação é respondida' },
];

export default function NotificationSettings() {
  const [user, setUser] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['notificationPreferences', user?.email],
    queryFn: () => base44.entities.NotificationPreference.filter({ user_email: user.email }),
    enabled: !!user?.email
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.NotificationPreference.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificationPreferences']);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.NotificationPreference.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['notificationPreferences']);
    }
  });

  const getPreference = (eventType) => {
    return preferences.find(p => p.event_type === eventType) || {
      email_enabled: true,
      push_enabled: true,
      sms_enabled: false,
      phone_number: ''
    };
  };

  const updatePreference = async (eventType, field, value) => {
    const existing = preferences.find(p => p.event_type === eventType);
    
    const data = {
      user_email: user.email,
      event_type: eventType,
      ...getPreference(eventType),
      [field]: value
    };

    if (existing) {
      await updateMutation.mutateAsync({ id: existing.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const savePhoneNumber = async () => {
    const updates = preferences
      .filter(p => p.sms_enabled)
      .map(p => updateMutation.mutateAsync({
        id: p.id,
        data: { ...p, phone_number: phoneNumber }
      }));
    
    await Promise.all(updates);
    toast.success('Número de telefone salvo!');
  };

  useEffect(() => {
    const pref = preferences.find(p => p.phone_number);
    if (pref?.phone_number) {
      setPhoneNumber(pref.phone_number);
    }
  }, [preferences]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações de Notificações</h1>
        <p className="text-gray-500 mt-1">Escolha como e quando deseja ser notificado</p>
      </div>

      {/* Phone Number */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-600" />
            Número de Telefone para SMS
          </CardTitle>
          <CardDescription>
            Necessário para receber notificações por SMS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="max-w-xs"
            />
            <Button onClick={savePhoneNumber} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            Preferências de Notificação
          </CardTitle>
          <CardDescription>
            Configure individualmente cada tipo de notificação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {eventTypes.map((event) => {
              const pref = getPreference(event.value);
              return (
                <div key={event.value} className="border-b pb-6 last:border-b-0">
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900">{event.label}</h3>
                    <p className="text-sm text-gray-500">{event.description}</p>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-600" />
                        <Label className="text-sm font-medium">Email</Label>
                      </div>
                      <Switch
                        checked={pref.email_enabled}
                        onCheckedChange={(checked) => 
                          updatePreference(event.value, 'email_enabled', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-gray-600" />
                        <Label className="text-sm font-medium">Push</Label>
                      </div>
                      <Switch
                        checked={pref.push_enabled}
                        onCheckedChange={(checked) => 
                          updatePreference(event.value, 'push_enabled', checked)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-600" />
                        <Label className="text-sm font-medium">SMS</Label>
                      </div>
                      <Switch
                        checked={pref.sms_enabled}
                        onCheckedChange={(checked) => 
                          updatePreference(event.value, 'sms_enabled', checked)
                        }
                        disabled={!phoneNumber}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Ações Rápidas</h3>
              <p className="text-sm text-gray-600">Configure todas as notificações de uma vez</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  for (const event of eventTypes) {
                    await updatePreference(event.value, 'email_enabled', true);
                    await updatePreference(event.value, 'push_enabled', true);
                  }
                  toast.success('Todas as notificações ativadas!');
                }}
              >
                Ativar Tudo
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  for (const event of eventTypes) {
                    await updatePreference(event.value, 'email_enabled', false);
                    await updatePreference(event.value, 'push_enabled', false);
                    await updatePreference(event.value, 'sms_enabled', false);
                  }
                  toast.success('Todas as notificações desativadas!');
                }}
              >
                Desativar Tudo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}