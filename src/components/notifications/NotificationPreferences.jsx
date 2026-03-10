import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, MessageCircle, Phone, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationPreferences({ userEmail }) {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({});
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: userPreferences = [] } = useQuery({
    queryKey: ['notificationPreferences', userEmail],
    queryFn: () => base44.entities.NotificationPreference.filter({ user_email: userEmail }),
    enabled: !!userEmail
  });

  useEffect(() => {
    if (userPreferences.length > 0) {
      const prefs = {};
      userPreferences.forEach(pref => {
        prefs[pref.event_type] = {
          email: pref.email_enabled,
          push: pref.push_enabled,
          sms: pref.sms_enabled
        };
      });
      setPreferences(prefs);
      const firstPref = userPreferences[0];
      if (firstPref.phone_number) setPhoneNumber(firstPref.phone_number);
    }
  }, [userPreferences]);

  const eventTypes = [
    { key: 'novo_alerta_ambiental', label: 'Novo Alerta Ambiental', icon: '🌍' },
    { key: 'licenca_vencendo', label: 'Licença Vencendo', icon: '📋' },
    { key: 'licenca_vencida', label: 'Licença Vencida', icon: '⚠️' },
    { key: 'documento_vencendo', label: 'Documento/Certificado Vencendo', icon: '📄' },
    { key: 'novo_processo', label: 'Novo Processo Legal', icon: '⚖️' },
    { key: 'atualizacao_processo', label: 'Atualização em Processo', icon: '⚖️' },
    { key: 'novo_requerimento', label: 'Novo Requerimento', icon: '💬' },
    { key: 'resposta_requerimento', label: 'Resposta a Requerimento', icon: '💬' },
    { key: 'nova_fatura', label: 'Nova Fatura', icon: '💳' },
    { key: 'fatura_vencendo', label: 'Fatura Vencendo', icon: '⏰' },
    { key: 'alerta_resolvido', label: 'Alerta Resolvido', icon: '✅' },
    { key: 'green_loan_status', label: 'Status de Empréstimo Verde', icon: '💚' },
    { key: 'tax_incentive_status', label: 'Status de Incentivo Fiscal', icon: '📊' },
    { key: 'certification_status', label: 'Status de Certificação', icon: '✅' },
    { key: 'outro', label: 'Outras Notificações', icon: '🔔' }
  ];

  const toggleNotification = (eventType, channel) => {
    setPreferences(prev => ({
      ...prev,
      [eventType]: {
        ...prev[eventType],
        [channel]: !prev[eventType]?.[channel]
      }
    }));
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      for (const eventType of eventTypes.map(e => e.key)) {
        const existingPref = userPreferences.find(p => p.event_type === eventType);
        const updatedPref = {
          email_enabled: preferences[eventType]?.email ?? true,
          push_enabled: preferences[eventType]?.push ?? true,
          sms_enabled: preferences[eventType]?.sms ?? false,
          phone_number: phoneNumber
        };

        if (existingPref) {
          await base44.entities.NotificationPreference.update(existingPref.id, updatedPref);
        } else {
          await base44.entities.NotificationPreference.create({
            user_email: userEmail,
            event_type: eventType,
            ...updatedPref
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Preferências salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      toast.error('Erro ao salvar preferências');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Canais de Notificação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Canais de Notificação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Email */}
            <div className="flex items-start gap-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
              <Mail className="w-5 h-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-600">Receba notificações por email</p>
              </div>
            </div>

            {/* Push */}
            <div className="flex items-start gap-3 p-4 border border-emerald-200 rounded-lg bg-emerald-50">
              <Bell className="w-5 h-5 text-emerald-600 mt-1" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Notificações Push</p>
                <p className="text-sm text-gray-600">Alertas no aplicativo</p>
              </div>
            </div>

            {/* SMS */}
            <div className="flex items-start gap-3 p-4 border border-purple-200 rounded-lg bg-purple-50">
              <Phone className="w-5 h-5 text-purple-600 mt-1" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">SMS</p>
                <p className="text-sm text-gray-600">Mensagens de texto</p>
              </div>
            </div>
          </div>

          {/* Telefone para SMS */}
          <div className="pt-4 border-t">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-900">
              Número de Telefone para SMS
            </Label>
            <Input
              id="phone"
              placeholder="(XX) 9XXXX-XXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">Opcional - necessário para receber SMS</p>
          </div>
        </CardContent>
      </Card>

      {/* Tipos de Eventos */}
      <Card>
        <CardHeader>
          <CardTitle>Selecione Quais Notificações Deseja Receber</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {eventTypes.map(event => (
            <div key={event.key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{event.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">{event.label}</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 ml-8">
                {/* Email Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Email
                  </label>
                  <Switch
                    checked={preferences[event.key]?.email ?? true}
                    onCheckedChange={() => toggleNotification(event.key, 'email')}
                  />
                </div>

                {/* Push Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <Bell className="w-4 h-4 text-emerald-600" />
                    Push
                  </label>
                  <Switch
                    checked={preferences[event.key]?.push ?? true}
                    onCheckedChange={() => toggleNotification(event.key, 'push')}
                  />
                </div>

                {/* SMS Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <Phone className="w-4 h-4 text-purple-600" />
                    SMS
                  </label>
                  <Switch
                    checked={preferences[event.key]?.sms ?? false}
                    onCheckedChange={() => toggleNotification(event.key, 'sms')}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex gap-3">
        <Button
          onClick={savePreferences}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Preferências'}
        </Button>
      </div>

      {/* Resumo */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>Dica:</strong> Configure suas preferências para receber notificações relevantes. 
            Você pode ativar ou desativar notificações específicas a qualquer momento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}