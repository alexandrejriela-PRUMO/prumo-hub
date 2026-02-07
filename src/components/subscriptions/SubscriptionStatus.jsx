import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Check, Zap, Calendar, AlertCircle } from 'lucide-react';
import { format, addDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SubscriptionStatus() {
  const [subscription, setSubscription] = useState({
    status: 'active',
    plan: 'campo-nobre',
    monthlyValue: 497.00,
    nextBillingDate: addDays(new Date(), 30),
    createdAt: new Date()
  });

  const isPremium = subscription.plan === 'campo-nobre';



  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <CardHeader className="border-b border-emerald-100">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-emerald-600" />
              Status da Assinatura
            </CardTitle>
            <Badge className="bg-emerald-600">
              Plano Campo Nobre
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Active Status */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Plano Campo Nobre Ativo</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm text-emerald-700 font-medium">Ativo Desde</p>
                  </div>
                  <p className="text-lg font-semibold text-emerald-900">
                    {format(subscription.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium mb-1">Próximo Faturamento</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {format(subscription.nextBillingDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>

            {/* Plan Details */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Detalhes do Plano</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">VALOR MENSAL POR PROPRIEDADE</p>
                  <p className="text-2xl font-bold text-gray-900">R$ 497,00</p>
                  <p className="text-xs text-gray-600 mt-1">Permanência mínima: 12 meses</p>
                </div>
                
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-700 font-medium mb-1">FORMAS DE PAGAMENTO</p>
                  <div className="space-y-1 text-sm text-blue-900">
                    <p>• Cartão de crédito recorrente (Stripe)</p>
                    <p>• PIX</p>
                    <p>• Boleto bancário</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Monitoramento Ambiental Contínuo</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Gerenciamento completo de propriedades</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Suporte técnico prioritário</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Relatórios e análises avançadas</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Alertas e notificações personalizadas</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-emerald-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-emerald-700 font-medium">Implantação Assistida Gratuita</p>
                      <p className="text-emerald-600 text-xs mt-1">Oferta por tempo limitado</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}