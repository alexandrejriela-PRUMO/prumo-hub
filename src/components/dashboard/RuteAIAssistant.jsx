import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, AlertTriangle, Loader, Leaf, Shield, TrendingUp } from 'lucide-react';

const RuteIcon = () => (
  <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="#10b981" opacity="0.1" stroke="#10b981" strokeWidth="2"/>
    <path d="M50 20C35 20 25 30 25 50C25 70 50 85 50 85C50 85 75 70 75 50C75 30 65 20 50 20Z" fill="#10b981"/>
    <circle cx="50" cy="50" r="8" fill="white"/>
  </svg>
);

export default function RuteAIAssistant({ user, property, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState(null);

  const analyzePropertyMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('analyzeEnvironmentalProperty', {
        property_id: property?.id,
        owner_email: user?.email
      });
      return response.data;
    },
    onSuccess: (data) => {
      setReport(data);
    }
  });

  useEffect(() => {
    if (isOpen && property && !report) {
      analyzePropertyMutation.mutate();
    }
  }, [isOpen, property]);

  const getRegularityColor = (status) => {
    const colors = {
      regular: { bg: 'bg-green-100', text: 'text-green-900', badge: 'bg-green-200 text-green-800' },
      atencao: { bg: 'bg-yellow-100', text: 'text-yellow-900', badge: 'bg-yellow-200 text-yellow-800' },
      irregular: { bg: 'bg-red-100', text: 'text-red-900', badge: 'bg-red-200 text-red-800' }
    };
    return colors[status] || colors.atencao;
  };

  const regularityStatus = report?.regularity_status || 'regular';
  const colors = getRegularityColor(regularityStatus);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 group"
        title="Análise ambiental com IA Rute"
      >
        <RuteIcon />
        <span className="text-sm font-semibold hidden sm:inline">IA Rute</span>
        <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse group-hover:scale-125 transition-transform" />
      </button>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <RuteIcon />
              <span>Diagnóstico Ambiental - IA Rute</span>
            </DialogTitle>
            <DialogDescription>
              Análise completa conforme Código Florestal Brasileiro para {property?.property_name}
            </DialogDescription>
          </DialogHeader>

          {analyzePropertyMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader className="w-12 h-12 text-emerald-600 animate-spin" />
              <p className="text-gray-600 font-medium">Analisando dados ambientais da propriedade...</p>
              <p className="text-sm text-gray-500">Verificando CAR, Reserva Legal, APPs, alertas geoespaciais...</p>
            </div>
          ) : report ? (
            <Tabs defaultValue="resumo" className="w-full space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="car">CAR</TabsTrigger>
                <TabsTrigger value="reserva">Reserva</TabsTrigger>
                <TabsTrigger value="app">APPs</TabsTrigger>
                <TabsTrigger value="recomendacoes">Ações</TabsTrigger>
              </TabsList>

              {/* Resumo Tab */}
              <TabsContent value="resumo" className="space-y-4">
                {/* Termômetro de Regularidade */}
                <div className={`p-6 rounded-xl border-2 ${colors.bg}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Regularidade Ambiental</h3>
                    <Badge className={colors.badge}>
                      {regularityStatus === 'regular' ? '✓ Regular' : regularityStatus === 'atencao' ? '⚠ Atenção' : '✗ Irregular'}
                    </Badge>
                  </div>
                  <div className="w-full bg-white rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full ${regularityStatus === 'regular' ? 'bg-green-500' : regularityStatus === 'atencao' ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${report?.compliance_percentage || 60}%` }}
                    />
                  </div>
                  <p className="text-sm mt-2 font-semibold">{report?.compliance_percentage || 60}% em conformidade</p>
                </div>

                {/* Resumo Executivo */}
                <Card>
                  <CardContent className="p-6 space-y-3">
                    <h4 className="font-bold text-gray-900">Resumo Executivo</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{report?.executive_summary}</p>
                  </CardContent>
                </Card>

                {/* Indicadores Principais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'CAR', status: report?.car_status, icon: Shield },
                    { label: 'Reserva Legal', status: report?.legal_reserve_status, icon: Leaf },
                    { label: 'APPs', status: report?.app_status, icon: AlertTriangle },
                    { label: 'Passivos', status: report?.liabilities_status, icon: AlertCircle }
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    const isOk = item.status === 'ok' || item.status === 'regular';
                    return (
                      <div key={idx} className={`p-3 rounded-lg border ${isOk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <Icon className={`w-5 h-5 mb-2 ${isOk ? 'text-green-600' : 'text-red-600'}`} />
                        <p className="text-xs font-semibold text-gray-900">{item.label}</p>
                        <p className={`text-xs font-bold mt-1 ${isOk ? 'text-green-700' : 'text-red-700'}`}>
                          {item.status === 'ok' || item.status === 'regular' ? '✓' : '✗'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* CAR Tab */}
              <TabsContent value="car" className="space-y-4">
                <Card>
                  <CardContent className="p-6 space-y-3">
                    <h4 className="font-bold text-gray-900">Situação do CAR</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><strong>Status:</strong> {report?.car_status}</p>
                      <p className="text-sm text-gray-700">{report?.car_details}</p>
                      {report?.car_inconsistencies && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-xs font-semibold text-yellow-900">Inconsistências:</p>
                          <p className="text-xs text-yellow-800 mt-1">{report.car_inconsistencies}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reserva Legal Tab */}
              <TabsContent value="reserva" className="space-y-4">
                <Card>
                  <CardContent className="p-6 space-y-3">
                    <h4 className="font-bold text-gray-900">Análise de Reserva Legal</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><strong>Status:</strong> {report?.legal_reserve_status}</p>
                      <p className="text-sm"><strong>Exigida:</strong> {report?.legal_reserve_required} ha</p>
                      <p className="text-sm"><strong>Existente:</strong> {report?.legal_reserve_existing} ha</p>
                      {report?.legal_reserve_deficit && report.legal_reserve_deficit > 0 && (
                        <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                          <p className="text-xs font-semibold text-red-900">Déficit:</p>
                          <p className="text-xs text-red-800 mt-1">{report.legal_reserve_deficit} ha</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* APPs Tab */}
              <TabsContent value="app" className="space-y-4">
                <Card>
                  <CardContent className="p-6 space-y-3">
                    <h4 className="font-bold text-gray-900">Análise de Áreas de Preservação Permanente</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><strong>Status:</strong> {report?.app_status}</p>
                      <p className="text-sm"><strong>Total de APPs:</strong> {report?.app_total_area} ha</p>
                      <p className="text-sm"><strong>APPs Intactas:</strong> {report?.app_intact_area} ha</p>
                      {report?.app_issues && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-xs font-semibold text-yellow-900">Problemas Detectados:</p>
                          <p className="text-xs text-yellow-800 mt-1">{report.app_issues}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Recomendações Tab */}
              <TabsContent value="recomendacoes" className="space-y-4">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h4 className="font-bold text-gray-900">Recomendações de Regularização</h4>
                    {report?.recommendations && report.recommendations.length > 0 ? (
                      <div className="space-y-3">
                        {report.recommendations.map((rec, idx) => (
                          <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-sm font-semibold text-blue-900 mb-1">
                              {idx + 1}. {rec.title}
                            </p>
                            <p className="text-xs text-blue-800">{rec.description}</p>
                            {rec.priority && (
                              <Badge className="mt-2 bg-blue-100 text-blue-800 text-xs">
                                Prioridade: {rec.priority}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">Propriedade em conformidade total.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Riscos Ambientais */}
                {report?.environmental_risks && report.environmental_risks.length > 0 && (
                  <Card>
                    <CardContent className="p-6 space-y-3">
                      <h4 className="font-bold text-gray-900">Riscos Ambientais Detectados</h4>
                      <div className="space-y-2">
                        {report.environmental_risks.map((risk, idx) => (
                          <div key={idx} className="p-2 bg-red-50 rounded text-xs text-red-800">
                            • {risk}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
              <p className="text-gray-600">Erro ao analisar propriedade. Tente novamente.</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Fechar
            </Button>
            {report && (
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Gerar Relatório PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}