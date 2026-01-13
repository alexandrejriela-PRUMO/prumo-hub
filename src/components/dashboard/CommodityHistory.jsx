import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CommodityHistory() {
  const [period, setPeriod] = useState(7);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Busque o histórico de preços das commodities agrícolas no Rio Grande do Sul, Brasil, dos últimos ${period} dias. 
          
Use APENAS dados do CEPEA/ESALQ. Para cada commodity (Soja, Milho, Trigo em saca 60kg e Arroz em saca 50kg), retorne:
- Um array com ${period} registros de preços diários
- Cada registro deve ter a data (formato YYYY-MM-DD) e o preço em R$
- Os preços devem ser valores reais e verificados do CEPEA

Valores de referência atuais para validação:
- Soja: ~R$ 127/saca 60kg
- Milho: ~R$ 69/saca 60kg  
- Trigo: ~R$ 63-64/saca 60kg
- Arroz: até R$ 80/saca 50kg

Retorne dados históricos realistas baseados nesses valores atuais.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              soja: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    price: { type: "number" }
                  }
                }
              },
              milho: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    price: { type: "number" }
                  }
                }
              },
              trigo: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    price: { type: "number" }
                  }
                }
              },
              arroz: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    price: { type: "number" }
                  }
                }
              }
            }
          }
        });
        
        setHistoricalData(result);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        setLoading(false);
      }
    };

    fetchHistoricalData();
  }, [period]);

  const prepareChartData = () => {
    if (!historicalData) return [];
    
    const dates = historicalData.soja?.map(item => item.date) || [];
    
    return dates.map((date, index) => ({
      date: format(new Date(date), 'dd/MMM', { locale: ptBR }),
      Soja: historicalData.soja?.[index]?.price || 0,
      Milho: historicalData.milho?.[index]?.price || 0,
      Trigo: historicalData.trigo?.[index]?.price || 0,
      Arroz: historicalData.arroz?.[index]?.price || 0,
    }));
  };

  const calculateChange = (commodity) => {
    if (!historicalData?.[commodity] || historicalData[commodity].length < 2) return null;
    
    const data = historicalData[commodity];
    const oldest = data[0].price;
    const newest = data[data.length - 1].price;
    const change = ((newest - oldest) / oldest) * 100;
    
    return {
      value: change,
      isPositive: change >= 0
    };
  };

  if (loading) {
    return (
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Histórico de Preços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = prepareChartData();

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Histórico de Preços (CEPEA/ESALQ)
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={period === 7 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(7)}
              className={period === 7 ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              7 dias
            </Button>
            <Button
              variant={period === 30 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(30)}
              className={period === 30 ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              30 dias
            </Button>
            <Button
              variant={period === 90 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(90)}
              className={period === 90 ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              90 dias
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Resumo de variações */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {['soja', 'milho', 'trigo', 'arroz'].map((commodity) => {
            const change = calculateChange(commodity);
            return (
              <div key={commodity} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 capitalize mb-1">{commodity}</p>
                {change && (
                  <div className={`flex items-center gap-1 ${change.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {change.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="font-semibold text-sm">
                      {change.isPositive ? '+' : ''}{change.value.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Gráfico */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                label={{ value: 'R$ / saca', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value) => `R$ ${value.toFixed(2)}`}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Line 
                type="monotone" 
                dataKey="Soja" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line 
                type="monotone" 
                dataKey="Milho" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line 
                type="monotone" 
                dataKey="Trigo" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line 
                type="monotone" 
                dataKey="Arroz" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}