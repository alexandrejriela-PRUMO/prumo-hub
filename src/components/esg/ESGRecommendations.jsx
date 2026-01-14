import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lightbulb, TrendingUp, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function ESGRecommendations({ userEmail, properties = [], greenLoans = [], taxIncentives = [], certifications = [] }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const propertyInfo = properties.length > 0 ? 
        `Propriedades: ${properties.map(p => `${p.property_name} (${p.total_hectares}ha, ${p.main_activity})`).join('; ')}` : 
        'Sem propriedades cadastradas';
      
      const loansInfo = greenLoans.length > 0 ?
        `Empréstimos verdes: ${greenLoans.length} solicitações (${greenLoans.filter(l => l.status === 'Aprovado').length} aprovadas)` :
        'Sem empréstimos verdes';

      const incentivesInfo = taxIncentives.length > 0 ?
        `Incentivos fiscais: ${taxIncentives.length} solicitações (${taxIncentives.filter(i => i.application_status === 'Ativo').length} ativos)` :
        'Sem incentivos fiscais';

      const certificationsInfo = certifications.length > 0 ?
        `Certificações: ${certifications.length} registros (${certifications.filter(c => c.status === 'Certificado').length} certificadas)` :
        'Sem certificações';

      const prompt = `Como um consultor ESG especializado em agricultura, analise o perfil de sustentabilidade deste usuário rural e forneça até 5 recomendações prioritárias e acionáveis:

Perfil do Usuário:
- ${propertyInfo}
- ${loansInfo}
- ${incentivesInfo}
- ${certificationsInfo}

Para cada recomendação, forneça:
1. Nome (máx 50 caracteres)
2. Descrição breve (máx 150 caracteres)
3. Impacto esperado (Alto/Médio/Baixo)
4. Tipo (Ambiental/Social/Financeiro)
5. Tempo de implementação (Curto/Médio/Longo prazo)

Retorne como JSON no formato:
{
  "recommendations": [
    {
      "name": "string",
      "description": "string",
      "impact": "Alto|Médio|Baixo",
      "type": "Ambiental|Social|Financeiro",
      "timeframe": "Curto|Médio|Longo",
      "actionUrl": "page_name"
    }
  ]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  impact: { type: 'string' },
                  type: { type: 'string' },
                  timeframe: { type: 'string' },
                  actionUrl: { type: 'string' }
                }
              }
            }
          }
        }
      });

      setRecommendations(result.recommendations || []);
      toast.success('Recomendações geradas com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar recomendações:', error);
      toast.error('Erro ao gerar recomendações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateRecommendations();
  }, [userEmail]);

  const getImpactColor = (impact) => {
    switch(impact) {
      case 'Alto': return 'bg-red-100 text-red-700';
      case 'Médio': return 'bg-yellow-100 text-yellow-700';
      case 'Baixo': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'Ambiental': return '🌱';
      case 'Social': return '👥';
      case 'Financeiro': return '💰';
      default: return '📌';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-blue-600" />
            <div>
              <CardTitle>Recomendações Personalizadas</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Com base no seu perfil ESG</p>
            </div>
          </div>
          <Button
            onClick={generateRecommendations}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando...
              </>
            ) : (
              'Atualizar'
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {recommendations.length > 0 ? (
          recommendations.map((rec, idx) => (
            <div key={idx} className="bg-white rounded-lg p-4 border border-blue-100 hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                <span className="text-2xl">{getTypeIcon(rec.type)}</span>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{rec.name}</h4>
                    <div className="flex gap-2">
                      <Badge className={getImpactColor(rec.impact)} variant="secondary">
                        {rec.impact}
                      </Badge>
                      <Badge className="bg-purple-100 text-purple-700" variant="secondary">
                        {rec.timeframe}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                  <div className="flex gap-2">
                    <Badge className="bg-gray-100 text-gray-700">{rec.type}</Badge>
                    {rec.actionUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-6"
                        onClick={() => window.location.href = rec.actionUrl}
                      >
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Implementar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Nenhuma recomendação disponível no momento</p>
          </div>
        )}

        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 text-sm text-blue-900">
          <p><strong>💡 Dica:</strong> Nossas recomendações são atualizadas automaticamente com base em seus dados. Implemente as sugestões para melhorar sua pontuação ESG.</p>
        </div>
      </CardContent>
    </Card>
  );
}