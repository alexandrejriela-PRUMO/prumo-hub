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
  FileCheck,
  AlertCircle,
  User,
  Building
} from 'lucide-react';

export default function LicenseFlowchart({ license }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeLicense = async () => {
    setLoading(true);
    
    try {
      const updatesText = (license.updates || [])
        .map((u, idx) => `${idx + 1}. Data: ${u.date}\nResponsável: ${u.responsible || 'Não informado'}\nDescrição: ${u.description}`)
        .join('\n\n');
      
      const prompt = `SISTEMA DE ANÁLISE DE LICENCIAMENTO AMBIENTAL COM FLUXOGRAMA

Você é um sistema especializado em licenciamento ambiental brasileiro.
Sua função é analisar os andamentos administrativos de um processo de licenciamento e transformá-los em um fluxograma visual claro e compreensível.

INFORMAÇÕES DA LICENÇA:
- Tipo de licença: ${license.license_type}
- Número: ${license.license_number || 'Não informado'}
- Órgão ambiental: ${license.environmental_agency || 'Não informado'}
- Atividade/Empreendimento: ${license.activity_description || 'Não informado'}
- Status atual: ${license.status}
- Data de emissão: ${license.issue_date || 'Não informada'}
- Data de validade: ${license.expiry_date || 'Não informada'}
- Condicionantes: ${(license.conditions || []).join('; ') || 'Nenhuma informada'}

ANDAMENTOS ADMINISTRATIVOS:
${updatesText || 'Nenhum andamento registrado ainda'}

INSTRUÇÕES:
1. Identifique o modelo de licenciamento aplicável (tipo de licença, ente federativo, fase do empreendimento)
2. Interprete cada andamento identificando: ato praticado, quem praticou, impacto no processo
3. Classifique a fase atual usando as etapas padrão de licenciamento
4. Mapeie as etapas já concluídas e próximas esperadas
5. Indique claramente se a próxima ação depende do empreendedor ou do órgão ambiental

ETAPAS PADRÃO:
- Protocolo do pedido
- Análise preliminar/triagem documental
- Análise técnica ambiental
- Diligência/exigência complementar (se houver)
- Manifestação do empreendedor
- Parecer técnico conclusivo
- Decisão administrativa (deferimento ou indeferimento)
- Emissão da licença

IMPORTANTE:
- Use linguagem clara e acessível
- Evite juridiquês excessivo
- Não faça promessas de deferimento
- Indique riscos ou atrasos quando identificáveis`;

      const schema = {
        type: "object",
        properties: {
          resumo_executivo: {
            type: "string",
            description: "Status da licença em até 4 linhas"
          },
          modelo_licenciamento: {
            type: "string",
            description: "Tipo de licenciamento e ente federativo"
          },
          fase_atual: {
            type: "string",
            description: "Nome da fase atual"
          },
          fase_atual_descricao: {
            type: "string",
            description: "Explicação leiga da fase atual"
          },
          proxima_acao_responsavel: {
            type: "string",
            enum: ["empreendedor", "orgao_ambiental", "aguardando_analise", "indefinido"],
            description: "De quem depende a próxima ação"
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
                  enum: ["concluida", "em_andamento", "pendente", "futura"],
                  description: "Status da etapa"
                },
                responsavel_acao: {
                  type: "string",
                  enum: ["empreendedor", "orgao_ambiental", "ambos", "nao_aplica"],
                  description: "Quem deve agir nesta etapa"
                }
              },
              required: ["nome_tecnico", "explicacao_leiga", "status"]
            },
            description: "Lista ordenada de etapas do licenciamento"
          },
          proximos_passos: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Lista objetiva de próximos passos"
          },
          riscos_atrasos: {
            type: "string",
            description: "Riscos ou atrasos identificáveis (se houver)"
          }
        },
        required: ["resumo_executivo", "modelo_licenciamento", "fase_atual", "fase_atual_descricao", "proxima_acao_responsavel", "etapas", "proximos_passos"]
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema
      });

      setAnalysis(result);
    } catch (error) {
      console.error('Erro ao analisar licença:', error);
      alert('Erro ao analisar a licença. Tente novamente.');
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
      case 'pendente':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
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
      case 'pendente':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pendente</Badge>;
      case 'futura':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Futura</Badge>;
      default:
        return null;
    }
  };

  const getResponsibleIcon = (responsible) => {
    switch (responsible) {
      case 'empreendedor':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'orgao_ambiental':
        return <Building className="w-4 h-4 text-emerald-600" />;
      default:
        return null;
    }
  };

  const getResponsibleLabel = (responsible) => {
    switch (responsible) {
      case 'empreendedor':
        return 'Empreendedor';
      case 'orgao_ambiental':
        return 'Órgão Ambiental';
      case 'ambos':
        return 'Ambos';
      case 'nao_aplica':
        return 'N/A';
      default:
        return '';
    }
  };

  if (!analysis) {
    return (
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Análise de Licenciamento Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileCheck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">
              Analise os andamentos administrativos e gere um fluxograma visual do licenciamento
            </p>
            <Button
              onClick={analyzeLicense}
              disabled={loading}
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
            {(!license.updates || license.updates.length === 0) && (
              <p className="text-sm text-amber-600 mt-2 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Adicione andamentos para uma análise mais precisa
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getProximaAcaoInfo = () => {
    switch (analysis.proxima_acao_responsavel) {
      case 'empreendedor':
        return { icon: User, label: 'Empreendedor', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'orgao_ambiental':
        return { icon: Building, label: 'Órgão Ambiental', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'aguardando_analise':
        return { icon: Clock, label: 'Aguardando Análise', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      default:
        return { icon: AlertCircle, label: 'Indefinido', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const proximaAcaoInfo = getProximaAcaoInfo();
  const ProximaAcaoIcon = proximaAcaoInfo.icon;

  return (
    <div className="space-y-6">
      {/* Resumo Executivo */}
      <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
        <CardHeader>
          <CardTitle className="text-emerald-900">Resumo do Licenciamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed mb-4">{analysis.resumo_executivo}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-emerald-200">
            <div>
              <p className="text-sm font-medium text-gray-600">Modelo de Licenciamento</p>
              <p className="text-gray-900">{analysis.modelo_licenciamento}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Fase Atual</p>
              <p className="text-gray-900">{analysis.fase_atual}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-emerald-200">
            <p className="text-sm font-medium text-gray-600 mb-2">Próxima Ação Depende de:</p>
            <Badge className={`${proximaAcaoInfo.color} border px-3 py-1`}>
              <ProximaAcaoIcon className="w-4 h-4 mr-2" />
              {proximaAcaoInfo.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Fluxograma Visual */}
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            Fluxograma do Licenciamento
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
                      : etapa.status === 'pendente'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getStatusIcon(etapa.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {etapa.nome_tecnico}
                        </h4>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(etapa.status)}
                          {etapa.responsavel_acao && etapa.responsavel_acao !== 'nao_aplica' && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              {getResponsibleIcon(etapa.responsavel_acao)}
                              <span className="text-xs">{getResponsibleLabel(etapa.responsavel_acao)}</span>
                            </Badge>
                          )}
                        </div>
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
          <CardTitle className="text-emerald-900">Próximos Passos</CardTitle>
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

      {/* Riscos e Atrasos */}
      {analysis.riscos_atrasos && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-5 h-5" />
              Riscos e Atrasos Identificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-800 text-sm leading-relaxed">
              {analysis.riscos_atrasos}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Botão para nova análise */}
      <div className="flex justify-center">
        <Button
          onClick={() => {
            setAnalysis(null);
            analyzeLicense();
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