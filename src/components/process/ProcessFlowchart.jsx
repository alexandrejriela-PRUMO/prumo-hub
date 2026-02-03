import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  ChevronRight, 
  CheckCircle, 
  Circle, 
  Clock,
  Loader2,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function ProcessFlowchart({ process }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeProcess = async () => {
    setLoading(true);
    
    try {
      // Preparar dados dos andamentos
      const updatesText = (process.updates || [])
        .map((u, idx) => `${idx + 1}. Data: ${u.date}\nDescrição: ${u.description}`)
        .join('\n\n');
      
      const prompt = `SISTEMA DE ANÁLISE PROCESSUAL COM FLUXOGRAMA

Você é um sistema jurídico inteligente especializado em Direito Processual brasileiro.
Sua função é analisar automaticamente os andamentos processuais de um processo e transformá-los em um fluxograma visual, claro e compreensível para clientes leigos.

INFORMAÇÕES DO PROCESSO:
- Tipo: ${process.process_type}
- Número: ${process.process_number}
- Matéria: ${process.subject}
- Partes: ${process.parties || 'Não informado'}
- Status atual: ${process.status}
- Data de propositura: ${process.filing_date || 'Não informada'}

ANDAMENTOS PROCESSUAIS:
${updatesText || 'Nenhum andamento registrado ainda'}

INSTRUÇÕES:
1. Classifique o processo por tipo e rito aplicável
2. Interprete cada andamento identificando: ato praticado, quem praticou, fundamento legal implícito, impacto no andamento
3. Determine a fase processual atual
4. Mapeie as etapas já cumpridas e as próximas possíveis
5. Gere a resposta no formato JSON especificado

IMPORTANTE: 
- Use linguagem simples e educativa
- Evite juridiquês desnecessário
- Não faça promessas de resultado
- Indique incertezas quando existirem`;

      const schema = {
        type: "object",
        properties: {
          resumo_executivo: {
            type: "string",
            description: "Resumo para o cliente em até 5 linhas"
          },
          tipo_rito: {
            type: "string",
            description: "Tipo de processo e rito aplicável"
          },
          fase_atual: {
            type: "string",
            description: "Nome da fase processual atual"
          },
          fase_atual_descricao: {
            type: "string",
            description: "Explicação leiga da fase atual"
          },
          etapas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nome_tecnico: {
                  type: "string",
                  description: "Nome técnico da etapa"
                },
                explicacao_leiga: {
                  type: "string",
                  description: "Explicação simples em até 2 linhas"
                },
                status: {
                  type: "string",
                  enum: ["concluida", "em_andamento", "futura"],
                  description: "Status da etapa"
                }
              },
              required: ["nome_tecnico", "explicacao_leiga", "status"]
            },
            description: "Lista ordenada de etapas do processo"
          },
          proximos_passos: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Lista de próximos passos práticos"
          },
          observacoes: {
            type: "string",
            description: "Observações importantes ou incertezas"
          }
        },
        required: ["resumo_executivo", "tipo_rito", "fase_atual", "fase_atual_descricao", "etapas", "proximos_passos"]
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema
      });

      setAnalysis(result);
    } catch (error) {
      console.error('Erro ao analisar processo:', error);
      alert('Erro ao analisar o processo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'concluida':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'em_andamento':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'futura':
        return <Circle className="w-5 h-5 text-gray-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'concluida':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Concluída</Badge>;
      case 'em_andamento':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Em Andamento</Badge>;
      case 'futura':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Futura</Badge>;
      default:
        return null;
    }
  };

  if (!analysis) {
    return (
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Análise Processual Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">
              Analise os andamentos processuais e gere um fluxograma visual do processo
            </p>
            <Button
              onClick={analyzeProcess}
              disabled={loading || !process.updates || process.updates.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Análise e Fluxograma
                </>
              )}
            </Button>
            {(!process.updates || process.updates.length === 0) && (
              <p className="text-sm text-amber-600 mt-2 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Adicione andamentos processuais para gerar a análise
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Executivo */}
      <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
        <CardHeader>
          <CardTitle className="text-emerald-900">Resumo Executivo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">{analysis.resumo_executivo}</p>
          <div className="mt-4 pt-4 border-t border-emerald-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Tipo e Rito</p>
                <p className="text-gray-900">{analysis.tipo_rito}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Fase Atual</p>
                <p className="text-gray-900">{analysis.fase_atual}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fluxograma Visual */}
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Fluxograma Processual
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            {analysis.fase_atual_descricao}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analysis.etapas.map((etapa, index) => (
              <div key={index}>
                <div 
                  className={`p-4 rounded-lg border-2 transition-all ${
                    etapa.status === 'em_andamento' 
                      ? 'border-blue-300 bg-blue-50 shadow-md' 
                      : etapa.status === 'concluida'
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getStatusIcon(etapa.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {etapa.nome_tecnico}
                        </h4>
                        {getStatusBadge(etapa.status)}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {etapa.explicacao_leiga}
                      </p>
                    </div>
                  </div>
                </div>
                
                {index < analysis.etapas.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Próximos Passos */}
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="text-emerald-900">Próximos Passos Práticos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.proximos_passos.map((passo, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed pt-0.5">
                  {passo}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      {analysis.observacoes && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-5 h-5" />
              Observações Importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-800 text-sm leading-relaxed">
              {analysis.observacoes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Botão para nova análise */}
      <div className="flex justify-center">
        <Button
          onClick={() => {
            setAnalysis(null);
            analyzeProcess();
          }}
          variant="outline"
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Atualizar Análise
            </>
          )}
        </Button>
      </div>
    </div>
  );
}