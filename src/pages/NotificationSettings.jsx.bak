import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import NotificationPreferences from '../components/notifications/NotificationPreferences';

export default function NotificationSettings() {
  const [user, setUser] = useState(null);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Configurar Notificações</h1>
        <p className="text-gray-600">
          Personalize como e quando você deseja receber notificações sobre suas propriedades e solicitações
        </p>
      </div>

      {/* Conteúdo Principal */}
      {user ? (
        <NotificationPreferences userEmail={user.email} />
      ) : (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <p className="text-yellow-900">Carregando configurações...</p>
          </CardContent>
        </Card>
      )}

      {/* Dicas */}
      <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="text-lg">Dicas Úteis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>📧 Email:</strong> Ideal para notificações detalhadas que você pode ler depois
          </p>
          <p>
            <strong>🔔 Push:</strong> Notificações imediatas no aplicativo quando algo importante acontece
          </p>
          <p>
            <strong>📱 SMS:</strong> Canal em desenvolvimento — disponível em breve.
          </p>
          <p>
            <strong>⏰ Datas de Vencimento:</strong> Você receberá avisos com 30 dias de antecedência
          </p>
        </CardContent>
      </Card>
    </div>
  );
}