import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Smartphone, AlertTriangle, Cloud, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RealtimeNotificationSettings() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({});
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

  const { data: preferences = [] } = useQuery({
    queryKey: ['notificationPreferences', user?.email],
    queryFn: () => base44.entities.NotificationPreference.filter({ user_email: user?.email }),
    enabled: !!user?.email
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: async (preference) => {
      const existing = preferences.find(p => p.event_type === preference.event_type);
      if (existing) {
        return base44.entities.NotificationPreference.update(existing.id, preference);
      } else {
        return base44.entities.NotificationPreference.create({
          user_email: user.email,
          ...preference
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Preferências atualizadas!');
    }
  });

  const notificationTypes = [
    {
      id: 'alerta_ambiental',
      label: 'Alertas Ambientais',
      description: 'Notificações sobre desmatamento, mudanças de uso da terra, etc',
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />
    },
    {
      id: 'alerta_climatico',
      label: 'Alertas Climáticos',
      description: 'Chuva intensa, seca, geada, tempestades, vento forte',
      icon: <Cloud className="w-5 h-5 text-blue-600" />
    },
    {
      id: 'atualizacao_dados',
      label: 'Atualização de Dados',
      description: 'Quando novos dados climáticos ou ambientais são atualizados',
      icon: <Save className="w-5 h-5 text-green-600" />
    }
  ];

  const channels = [
    { id: 'in_app', label: 'No App', icon: <Bell className="w-4 h-4" /> },
    { id: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
    { id: 'push', label: 'Push', icon: <Smartphone className="w-4 h-4" /> }
  ];

  const handleToggleChannel = async (notificationType, channel) => {
    const key = `${notificationType}_${channel}`;
    const newValue = !settings[key];
    
    setSettings(prev => ({
      ...prev,
      [key]: newValue
    }));

    const preference = preferences.find(p => p.event_type === notificationType) || {};
    const updated = {
      event_type: notificationType,
      [channel]: newValue,
      ...preference
    };

    // Manter outros canais
    channels.forEach(ch => {
      if (ch.id !== channel && !updated[ch.id]) {
        updated[ch.id] = settings[`${notificationType}_${ch.id}`] || false;
      }
    });

    await updatePreferenceMutation.mutate(updated);
  };

  // Carregar preferências existentes
  useEffect(() => {
    const newSettings = {};
    preferences.forEach(pref => {
      channels.forEach(ch => {
        newSettings[`${pref.event_type}_${ch.id}`] = pref[ch.id] || false;
      });
    });
    setSettings(newSettings);
  }, [preferences]);

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen"><p>Carregando...</p></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-600" />
          Configurações de Notificações em Tempo Real
        </h1>
        <p className="text-gray-600">
          Escolha quais tipos de alertas e canais você deseja receber notificações
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-blue-800 text-sm">
            As notificações em tempo real são enviadas assim que alertas ambientais ou climáticos ocorrem. 
            Você pode configurar diferentes canais para cada tipo de alerta.
          </p>
        </CardContent>
      </Card>

      {/* Configurações */}
      <div className="space-y-4">
        {notificationTypes.map(notType => (
          <Card key={notType.id}>
            <CardHeader>
              <div className="flex items-start gap-3">
                {notType.icon}
                <div className="flex-1">
                  <CardTitle className="text-lg">{notType.label}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{notType.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {channels.map(channel => (
                  <label
                    key={channel.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <Switch
                      checked={settings[`${notType.id}_${channel.id}`] || false}
                      onCheckedChange={() => handleToggleChannel(notType.id, channel.id)}
                      disabled={updatePreferenceMutation.isPending}
                    />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      {channel.icon}
                      {channel.label}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status de Sincronização */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <p className="text-sm text-gray-700">
                Conectado - Você receberá notificações em tempo real
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Email: {user.email}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}