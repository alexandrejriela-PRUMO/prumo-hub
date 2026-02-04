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
    status: 'trial', // 'trial' ou 'active'
    trialStartDate: new Date(),
    trialEndDate: addDays(new Date(), 30),
    plan: null, // null ou 'campo-nobre'
    monthlyValue: 397.00,
    implementationFee: null,
    nextBillingDate: null,
    createdAt: new Date()
  });

  const daysRemaining = Math.ceil((subscription.trialEndDate - new Date()) / (1000 * 60 * 60 * 24));
  const isTrialActive = subscription.status === 'trial' && daysRemaining > 0;
  const isPremium = subscription.plan === 'campo-nobre';

  const handleUpgradeToPremium = () => {
    setSubscription({
      ...subscription,
      status: 'active',
      plan: 'campo-nobre',
      nextBillingDate: addDays(new Date(), 30)
    });
  };

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
            <Badge className={isPremium ? 'bg-emerald-600' : 'bg-blue-600'}>
              {isPremium ? 'Plano Campo Nobre' : 'Período Gratuito'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Trial or Active Status */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">
                {isTrialActive ? 'Acesso Gratuito - 30 Dias' : 'Plano Campo Nobre Ativo'}
              </h3>
              
              {isTrialActive ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <p className="text-sm text-blue-700 font-medium">Dias Restantes</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{Math.max(0, daysRemaining)} dias</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Termina em {format(subscription.trialEndDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm text-emerald-700 mb-3">
                      Aproveite o acesso completo e depois escolha seu plano favorito!
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                          <Zap className="w-4 h-4 mr-2" />
                          Upgrade para Plano Campo Nobre
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Upgrade para Plano Campo Nobre</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                            <h3 className="font-bold text-emerald-900 mb-3">Plano Campo Nobre</h3>
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm text-gray-700">Acesso ilimitado a todas as funcionalidades</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm text-gray-700">Suporte prioritário</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm text-gray-700">Monitoramento avançado</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm text-gray-700">Relatórios personalizados</span>
                              </div>
                            </div>
                            <div className="border-t border-emerald-200 pt-4">
                              <p className="text-xs text-gray-600 mb-2">VALOR MENSAL</p>
                              <p className="text-3xl font-bold text-emerald-900">R$ 397,00</p>
                              <p className="text-xs text-gray-600 mt-1">
                                Taxa de implementação: A combinar conforme seu caso
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={handleUpgradeToPremium}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
                          >
                            Aderir ao Plano Campo Nobre
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            {/* Plan Details */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Detalhes do Plano</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">VALOR MENSAL</p>
                  <p className="text-2xl font-bold text-gray-900">R$ 397,00</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Monitoramento em tempo real</span>
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

                {isPremium && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-amber-700 font-medium">Taxa de Implementação</p>
                        <p className="text-amber-600 text-xs mt-1">Será combinada conforme seu caso específico</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}