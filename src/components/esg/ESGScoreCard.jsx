import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle } from 'lucide-react';

export default function ESGScoreCard({ score = 0, greenLoans = 0, taxIncentives = 0, certifications = 0 }) {
  const getScoreColor = (score) => {
    if (score >= 75) return 'from-green-500 to-emerald-600';
    if (score >= 50) return 'from-yellow-500 to-amber-600';
    return 'from-orange-500 to-red-600';
  };

  const getScoreLabel = (score) => {
    if (score >= 75) return 'Excelente';
    if (score >= 50) return 'Bom';
    return 'Em Progresso';
  };

  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  const metrics = [
    { label: 'Empréstimos Verdes', value: greenLoans, color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Incentivos Fiscais', value: taxIncentives, color: 'bg-yellow-100 text-yellow-700' },
    { label: 'Certificações', value: certifications, color: 'bg-blue-100 text-blue-700' }
  ];

  return (
    <Card className="overflow-hidden border-0 shadow-xl">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-3 gap-0">
          {/* Pontuação Principal */}
          <div className={`bg-gradient-to-br ${scoreColor} p-8 text-white relative overflow-hidden`}>
            {/* Decoração de fundo */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />
            
            <div className="relative z-10">
              <p className="text-white/80 text-sm font-medium mb-2">Pontuação ESG Geral</p>
              
              {/* Score Circular */}
              <div className="flex items-center gap-6 mb-6">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="8"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth="8"
                      strokeDasharray={`${(score / 100) * 282.7} 282.7`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-white">{score}</span>
                    <span className="text-xs text-white/80">%</span>
                  </div>
                </div>

                <div>
                  <p className="text-2xl font-bold text-white mb-1">{scoreLabel}</p>
                  <p className="text-white/80 text-sm mb-4">
                    {score >= 75 ? '✨ Parabéns!' : score >= 50 ? '📈 Bom progresso' : '🚀 Continue melhorando'}
                  </p>
                  <div className="flex items-center gap-2 text-white/90 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>Acompanhamento ativo</span>
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/80 mb-1">
                  <span>Progresso</span>
                  <span>{score} / 100</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-500"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Métricas */}
          <div className="md:col-span-2 p-8 bg-white">
            <div className="space-y-4">
              {metrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">{metric.label}</p>
                    <Badge className={metric.color}>{metric.value}</Badge>
                  </div>
                  
                  {/* Mini progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(metric.value / Math.max(greenLoans, taxIncentives, certifications, 1)) * 100}%`,
                        backgroundColor:
                          metric.label === 'Empréstimos Verdes' ? '#10b981' :
                          metric.label === 'Incentivos Fiscais' ? '#f59e0b' : '#3b82f6'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Próximos Passos */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Próximos Passos</p>
              <ul className="space-y-2 text-sm text-gray-600">
                {greenLoans === 0 && <li className="flex items-start gap-2"><span className="text-green-600">→</span> Solicitar um empréstimo verde</li>}
                {taxIncentives === 0 && <li className="flex items-start gap-2"><span className="text-yellow-600">→</span> Explorar incentivos fiscais</li>}
                {certifications === 0 && <li className="flex items-start gap-2"><span className="text-blue-600">→</span> Iniciar processo de certificação</li>}
                {greenLoans > 0 && taxIncentives > 0 && certifications > 0 && (
                  <li className="flex items-start gap-2"><span className="text-purple-600">✓</span> Parabéns! Continue mantendo suas iniciativas</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}