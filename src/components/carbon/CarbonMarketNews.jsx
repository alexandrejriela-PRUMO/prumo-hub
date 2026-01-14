import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { TrendingUp, ExternalLink, RefreshCw, Newspaper } from 'lucide-react';
import { toast } from 'sonner';

export default function CarbonMarketNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [marketData, setMarketData] = useState(null);

  const fetchMarketInfo = async () => {
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Forneça informações atualizadas sobre o mercado de créditos de carbono no Brasil e no mundo:
        1. Preços médios atuais (R$/tCO2e)
        2. Tendências de mercado
        3. Principais notícias recentes
        4. Oportunidades de comercialização
        5. Mudanças regulatórias relevantes
        
        Formate a resposta em markdown com seções claras.`,
        add_context_from_internet: true
      });

      setMarketData(response);
      toast.success('Informações atualizadas com sucesso!');
    } catch (error) {
      toast.error('Erro ao buscar informações do mercado');
    } finally {
      setLoading(false);
    }
  };

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Liste as 5 notícias mais recentes e relevantes sobre créditos de carbono, mercado de carbono, 
        e projetos de compensação de carbono no Brasil. Para cada notícia, forneça:
        - Título
        - Resumo (2-3 linhas)
        - Data aproximada
        - Fonte`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            news: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  summary: { type: 'string' },
                  date: { type: 'string' },
                  source: { type: 'string' }
                }
              }
            }
          }
        }
      });

      setNews(response.news || []);
      toast.success('Notícias atualizadas com sucesso!');
    } catch (error) {
      toast.error('Erro ao buscar notícias');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Visão Geral do Mercado
              </CardTitle>
              <CardDescription>Informações atualizadas sobre o mercado de créditos de carbono</CardDescription>
            </div>
            <Button
              onClick={fetchMarketInfo}
              disabled={loading}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!marketData && !loading && (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Clique em "Atualizar" para ver informações do mercado</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-green-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Buscando informações atualizadas...</p>
            </div>
          )}

          {marketData && !loading && (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-700">{marketData}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent News */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-blue-600" />
                Notícias Recentes
              </CardTitle>
              <CardDescription>Últimas notícias sobre créditos de carbono</CardDescription>
            </div>
            <Button
              onClick={fetchNews}
              disabled={loading}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Buscar Notícias
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {news.length === 0 && !loading && (
            <div className="text-center py-12">
              <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Clique em "Buscar Notícias" para ver as últimas atualizações</p>
            </div>
          )}

          {loading && news.length === 0 && (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Buscando notícias...</p>
            </div>
          )}

          {news.length > 0 && (
            <div className="space-y-4">
              {news.map((item, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-700 text-sm mb-2">{item.summary}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{item.date}</span>
                    <span>•</span>
                    <span>{item.source}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos Úteis</CardTitle>
          <CardDescription>Links para plataformas e informações sobre créditos de carbono</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <a
              href="https://verra.org/programs/verified-carbon-standard/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50/50 transition-all"
            >
              <span className="font-medium text-gray-900">Verra - VCS Registry</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>

            <a
              href="https://www.goldstandard.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50/50 transition-all"
            >
              <span className="font-medium text-gray-900">Gold Standard</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>

            <a
              href="https://www.mma.gov.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50/50 transition-all"
            >
              <span className="font-medium text-gray-900">Ministério do Meio Ambiente</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>

            <a
              href="https://www.bcarbono.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50/50 transition-all"
            >
              <span className="font-medium text-gray-900">BVRio - Bolsa de Valores Ambientais</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}