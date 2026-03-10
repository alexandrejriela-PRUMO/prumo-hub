import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function NotificationSetupGuide() {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          Sistema de Notificações Ativado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-gray-700">
          O sistema de notificações está configurado e operacional com as seguintes funcionalidades:
        </p>

        <div className="space-y-2 pl-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Alertas Automáticos Diários</p>
              <p className="text-gray-600 text-xs">Verifica licenças, PRADs, certificados e documentos vencendo (8 AM)</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Notificações em Tempo Real</p>
              <p className="text-gray-600 text-xs">Receba alertas instantâneos quando entidades são criadas/atualizadas</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Alertas Manuais do Consultor</p>
              <p className="text-gray-600 text-xs">Consultores podem enviar alertas personalizados aos visualizadores</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">E-mail e Push Integrados</p>
              <p className="text-gray-600 text-xs">Notificações são enviadas via e-mail e push automaticamente</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Preferências Personalizadas</p>
              <p className="text-gray-600 text-xs">Configure quais notificações deseja receber em Configurar Notificações</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded p-3 border border-blue-100 text-xs text-gray-600">
          <p className="font-medium text-gray-900 mb-1">💡 Dica:</p>
          <p>
            Visite <strong>Configurar Notificações</strong> para personalizar os canais (Email, Push, SMS) e tipos de eventos que deseja acompanhar.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}