import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Clock, MessageCircle } from 'lucide-react';
import NotificationPreferences from '../components/notifications/NotificationPreferences';

export default function NotificationSettings() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Bell className="w-8 h-8 text-emerald-600" />Configurar Notificacoes
        </h1>
        <p className="text-gray-600">Personalize quais alertas receber, por qual canal e com quanto tempo de antecedencia.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border border-blue-200 bg-blue-50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 text-sm">Tempo Real</p>
                <p className="text-xs text-blue-700 mt-1">Eventos como novos contratos e atualizacoes chegam assim que ocorrem.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-amber-200 bg-amber-50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">Prazos Configuraveis</p>
                <p className="text-xs text-amber-700 mt-1">Para vencimentos, voce escolhe com quantos dias de antecedencia ser avisado — de 1 a 120 dias.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-green-200 bg-green-50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900 text-sm">Multi-canal</p>
                <p className="text-xs text-green-700 mt-1">Receba por Push, Email ou WhatsApp. Configure o numero abaixo.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {user ? <NotificationPreferences userEmail={user.email} /> : <Card className="bg-yellow-50 border-yellow-200"><CardContent className="pt-6"><p className="text-yellow-900">Carregando...</p></CardContent></Card>}
    </div>
  );
}
