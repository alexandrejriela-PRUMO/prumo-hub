import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Mail, Bell, Users, Settings } from 'lucide-react';

export default function NotificationSystemInfo() {
  return (
    <Card className="bg-gradient-to-br from-emerald-50 via-blue-50 to-cyan-50 border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-600" />
          Sistema de Notificações - Status Operacional
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Alertas Automáticos */}
          <div className="border border-emerald-200 rounded-lg p-3 bg-white/50">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">Verificação de Prazos</p>
                <p className="text-gray-600 text-xs">Licenças, PRADs, certificados</p>
                <Badge className="mt-1 bg-emerald-100 text-emerald-700 text-xs">Diariamente às 8 AM</Badge>
              </div>
            </div>
          </div>

          {/* Notificações em Tempo Real */}
          <div className="border border-blue-200 rounded-lg p-3 bg-white/50">
            <div className="flex items-start gap-2">
              <Bell className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">Tempo Real</p>
                <p className="text-gray-600 text-xs">Criações e atualizações</p>
                <Badge className="mt-1 bg-blue-100 text-blue-700 text-xs">Instantâneo</Badge>
              </div>
            </div>
          </div>

          {/* Alertas Manuais */}
          <div className="border border-purple-200 rounded-lg p-3 bg-white/50">
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">Alertas do Consultor</p>
                <p className="text-gray-600 text-xs">Envio para visualizadores</p>
                <Badge className="mt-1 bg-purple-100 text-purple-700 text-xs">Manual</Badge>
              </div>
            </div>
          </div>

          {/* E-mail Integrado */}
          <div className="border border-orange-200 rounded-lg p-3 bg-white/50">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">E-mail Automático</p>
                <p className="text-gray-600 text-xs">Alertas críticos e avisos</p>
                <Badge className="mt-1 bg-orange-100 text-orange-700 text-xs">Ativo</Badge>
              </div>
            </div>
          </div>

          {/* Centro de Notificações */}
          <div className="border border-cyan-200 rounded-lg p-3 bg-white/50">
            <div className="flex items-start gap-2">
              <Bell className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">Centro de Notificações</p>
                <p className="text-gray-600 text-xs">Painel em tempo real</p>
                <Badge className="mt-1 bg-cyan-100 text-cyan-700 text-xs">Sempre Disponível</Badge>
              </div>
            </div>
          </div>

          {/* Preferências Personalizadas */}
          <div className="border border-teal-200 rounded-lg p-3 bg-white/50">
            <div className="flex items-start gap-2">
              <Settings className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">Preferências</p>
                <p className="text-gray-600 text-xs">Email, Push, SMS</p>
                <Badge className="mt-1 bg-teal-100 text-teal-700 text-xs">Customizável</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="border-t pt-4">
          <p className="font-medium text-gray-900 mb-3">✅ Sistema Completo</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              Alertas automáticos configurados
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              Notificações em tempo real ativas
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              E-mails integrados e funcionais
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              Centro de notificações operacional
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              Alertas manuais para consultores
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              Preferências customizáveis por usuário
            </div>
          </div>
        </div>

        {/* Dica */}
        <div className="bg-emerald-100/50 border border-emerald-200 rounded p-3">
          <p className="text-xs text-emerald-900">
            <strong>💡 Dica:</strong> Acesse <strong>Configurar Notificações</strong> para personalizar quais alertas deseja receber e por quais canais (Email, Push, SMS).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}