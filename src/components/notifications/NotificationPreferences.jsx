import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, MessageCircle, Phone, Save, Clock, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { toast } from 'sonner';

const REALTIME_EVENTS = [
  { key: 'novo_alerta_ambiental', label: 'Novo Alerta Ambiental', icon: '🌍' },
  { key: 'alerta_resolvido', label: 'Alerta Ambiental Resolvido', icon: '✅' },
  { key: 'licenca_vencida', label: 'Licença Vencida / Status Alterado', icon: '❌' },
  { key: 'atualizacao_licenca', label: 'Andamento em Licença', icon: '📋' },
  { key: 'novo_processo', label: 'Novo Processo Legal', icon: '⚖️' },
  { key: 'atualizacao_processo', label: 'Atualização em Processo', icon: '⚖️' },
  { key: 'novo_requerimento', label: 'Novo Requerimento', icon: '💬' },
  { key: 'resposta_requerimento', label: 'Resposta a Requerimento', icon: '💬' },
  { key: 'nova_fatura', label: 'Nova Fatura Gerada', icon: '💳' },
  { key: 'task_overdue', label: 'Tarefa de CRM Vencida', icon: '🔴' },
  { key: 'atualizacao_cliente_crm', label: 'Interação no CRM', icon: '👥' },
  { key: 'novo_contrato', label: 'Novo Contrato', icon: '📝' },
  { key: 'outro', label: 'Outras (PRAD, Georreferenciamento)', icon: '🔔' },
];

const SCHEDULED_EVENTS = [
  {
    key: 'licenca_vencendo',
    label: 'Licença Vencendo',
    icon: '⚠️',
    availableDays: [120, 90, 60, 30, 15, 7, 3, 1],
    defaultDays: [30, 7, 1],
    hint: 'Licenças que exigem renovação precisam de protocolo com 120 dias de antecedência.',
    whatsappRecommended: true,
  },
  {
    key: 'documento_vencendo',
    label: 'Documento / Certificado Vencendo',
    icon: '📄',
    availableDays: [60, 30, 15, 7, 1],
    defaultDays: [30, 7],
    hint: null,
    whatsappRecommended: false,
  },
  {
    key: 'fatura_vencendo',
    label: 'Fatura Vencendo',
    icon: '⏰',
    availableDays: [7, 3, 1],
    defaultDays: [3, 1],
    hint: null,
    whatsappRecommended: false,
  },
  {
    key: 'atualizacao_contrato',
    label: 'Contrato Vencendo',
    icon: '📝',
    availableDays: [90, 60, 30, 15, 7],
    defaultDays: [30, 7],
    hint: null,
    whatsappRecommended: false,
  },
  {
    key: 'task_due_soon',
    label: 'Tarefa Vencendo em Breve',
    icon: '🟠',
    availableDays: [7, 3, 1],
    defaultDays: [1],
    hint: null,
    whatsappRecommended: false,
  },
];

const ALL_EVENT_KEYS = [
  ...REALTIME_EVENTS.map(e => e.key),
  ...SCHEDULED_EVENTS.map(e => e.key),
];

export default function NotificationPreferences({ userEmail }) {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({});
  const [daysBefore,  setDaysBefore]  = useState({});
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaving,    setIsSaving]    = useState(false);
  const [expanded,    setExpanded]    = useState({});

  const { data: userPreferences = [] } = useQuery({
    queryKey: ['notificationPreferences', userEmail],
    queryFn:  () => base44.entities.NotificationPreference.filter({ user_email: userEmail }),
    enabled:  !!userEmail,
  });

  useEffect(() => {
    if (userPreferences.length === 0) return;
    const prefs = {};
    const days  = {};
    userPreferences.forEach(pref => {
      prefs[pref.event_type] = {
        email:    pref.email_enabled,
        push:     pref.push_enabled,
        whatsapp: pref.sms_enabled,
      };
      if (pref.days_before) {
        try { days[pref.event_type] = JSON.parse(pref.days_before); }
        catch { days[pref.event_type] = []; }
      }
    });
    setPreferences(prefs);
    setDaysBefore(days);
    if (userPreferences[0]?.phone_number) setPhoneNumber(userPreferences[0].phone_number);
  }, [userPreferences]);

  const toggleChannel = (eventKey, channel) => {
    setPreferences(prev => ({
      ...prev,
      [eventKey]: { ...prev[eventKey], [channel]: !prev[eventKey]?.[channel] },
    }));
  };

  const toggleDay = (eventKey, day) => {
    setDaysBefore(prev => {
      const current = prev[eventKey] || [];
      const updated = current.includes(day)
        ? current.filter(d => d !== day)
        : [...current, day].sort((a, b) => b - a);
      return { ...prev, [eventKey]: updated };
    });
  };

  const toggleExpand = (eventKey) =>
    setExpanded(prev => ({ ...prev, [eventKey]: !prev[eventKey] }));

  const savePreferences = async () => {
    if (!userEmail) return;
    setIsSaving(true);
    try {
      for (const eventKey of ALL_EVENT_KEYS) {
        const existing      = userPreferences.find(p => p.event_type === eventKey);
        const scheduledConf = SCHEDULED_EVENTS.find(e => e.key === eventKey);
        const currentDays   = daysBefore[eventKey] ?? (scheduledConf?.defaultDays ?? []);
        const payload = {
          email_enabled: preferences[eventKey]?.email    ?? true,
          push_enabled:  preferences[eventKey]?.push     ?? true,
          sms_enabled:   preferences[eventKey]?.whatsapp ?? false,
          phone_number:  phoneNumber,
          days_before:   scheduledConf ? JSON.stringify(currentDays) : null,
        };
        if (existing) {
          await base44.entities.NotificationPreference.update(existing.id, payload);
        } else {
          await base44.entities.NotificationPreference.create({ user_email: userEmail, event_type: eventKey, ...payload });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Preferências salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar preferências');
    } finally {
      setIsSaving(false);
    }
  };

  const whatsappActive = phoneNumber.replace(/\D/g, '').length >= 10;

  const ChannelToggles = ({ eventKey }) => (
    <div className="grid grid-cols-3 gap-3">
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <Mail className="w-4 h-4 text-blue-600" />Email
        </label>
        <Switch checked={preferences[eventKey]?.email ?? true} onCheckedChange={() => toggleChannel(eventKey, 'email')} />
      </div>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <Bell className="w-4 h-4 text-emerald-600" />Push
        </label>
        <Switch checked={preferences[eventKey]?.push ?? true} onCheckedChange={() => toggleChannel(eventKey, 'push')} />
      </div>
      <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${whatsappActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-50'}`}>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <MessageCircle className={`w-4 h-4 ${whatsappActive ? 'text-green-600' : 'text-gray-400'}`} />
          <span className={whatsappActive ? 'text-gray-700' : 'text-gray-400'}>WhatsApp</span>
          {!whatsappActive && <Badge variant="outline" className="text-[9px] border-orange-300 text-orange-500 bg-orange-50 py-0">configure o numero</Badge>}
        </label>
        <Switch checked={preferences[eventKey]?.whatsapp ?? false} onCheckedChange={() => toggleChannel(eventKey, 'whatsapp')} disabled={!whatsappActive} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-900">
            <MessageCircle className="w-5 h-5" />Numero para WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-green-800">
            Informe seu numero para receber alertas criticos pelo WhatsApp. <strong>Formato: 55 + DDD + numero</strong> (ex: 5554999990000)
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <Phone className="w-5 h-5 text-green-700 flex-shrink-0" />
            <Input type="tel" placeholder="5554999990000" value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              className="w-56 bg-white border-green-300 focus:border-green-500" />
            {whatsappActive
              ? <Badge className="bg-green-100 text-green-800 border border-green-300">Ativo</Badge>
              : <span className="text-xs text-green-700">Informe o numero para habilitar o WhatsApp</span>}
          </div>
        </CardContent>
      </Card>
      <Card className="border-2 border-amber-200">
        <CardHeader className="bg-amber-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Clock className="w-5 h-5" />Alertas de Vencimento — Configure os Prazos
          </CardTitle>
          <p className="text-sm text-amber-700 mt-1">
            Para cada tipo, escolha com quantos dias de antecedencia quer ser avisado e por qual canal. Clique para expandir.
          </p>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {SCHEDULED_EVENTS.map(event => {
            const isOpen      = expanded[event.key];
            const currentDays = daysBefore[event.key] ?? event.defaultDays;
            return (
              <div key={event.key} className="border border-gray-200 rounded-lg overflow-hidden">
                <button type="button" className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left" onClick={() => toggleExpand(event.key)}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{event.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{event.label}</p>
                      <p className="text-xs text-gray-500">
                        {currentDays.length > 0
                          ? `Alertas em: ${currentDays.map(d => d === 1 ? '1 dia' : `${d} dias`).join(', ')} antes`
                          : 'Nenhum prazo configurado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.whatsappRecommended && <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">WhatsApp recomendado</Badge>}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-5">
                    {event.hint && (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-800">{event.hint}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-3 block">Alertar com antecedencia de:</Label>
                      <div className="flex flex-wrap gap-2">
                        {event.availableDays.map(day => {
                          const active = currentDays.includes(day);
                          return (
                            <button key={day} type="button" onClick={() => toggleDay(event.key, day)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'}`}>
                              {day === 1 ? '1 dia' : `${day} dias`}
                            </button>
                          );
                        })}
                      </div>
                      {currentDays.length === 0 && <p className="text-xs text-red-500 mt-2">Nenhum prazo selecionado</p>}
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-3 block">Canais de notificacao:</Label>
                      <ChannelToggles eventKey={event.key} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />Notificacoes em Tempo Real
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">Disparadas imediatamente quando o evento ocorre.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {REALTIME_EVENTS.map(event => (
            <div key={event.key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{event.icon}</span>
                <p className="font-medium text-gray-900">{event.label}</p>
              </div>
              <ChannelToggles eventKey={event.key} />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="sticky bottom-4 flex">
        <Button onClick={savePreferences} disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 shadow-lg" size="lg">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Preferencias'}
        </Button>
      </div>
    </div>
  );
}
