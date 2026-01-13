import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function CommodityPrices() {
  const [commodities, setCommodities] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Busque os preços atuais das seguintes commodities agrícolas no Brasil em Reais por saca de 60kg: soja, milho, arroz e trigo. Use fontes oficiais como CEPEA/ESALQ, B3 ou Conab. Retorne os valores atualizados com a data de referência.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              commodities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    price: { type: "number" },
                    unit: { type: "string" },
                    trend: { type: "string" },
                    change_percent: { type: "number" }
                  }
                }
              },
              date: { type: "string" }
            }
          }
        });
        
        setCommodities(result.commodities || []);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar preços:', error);
        setLoading(false);
      }
    };

    fetchPrices();
    // Atualizar a cada 30 minutos
    const interval = setInterval(fetchPrices, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (commodities.length === 0) return;
    
    // Alternar entre commodities a cada 4 segundos
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % commodities.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [commodities]);

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 border-0 shadow-lg">
        <div className="px-4 py-2 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-white animate-spin" />
          <span className="text-white text-sm font-medium">Carregando preços...</span>
        </div>
      </Card>
    );
  }

  if (commodities.length === 0) return null;

  const current = commodities[currentIndex];
  const TrendIcon = current.trend === 'up' ? TrendingUp : 
                     current.trend === 'down' ? TrendingDown : Minus;
  const trendColor = current.trend === 'up' ? 'text-green-300' : 
                      current.trend === 'down' ? 'text-red-300' : 'text-yellow-300';

  return (
    <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 border-0 shadow-lg overflow-hidden">
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-white font-semibold text-sm">{current.name}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">
            R$ {current.price.toFixed(2)}
          </span>
          <span className="text-emerald-100 text-xs">/{current.unit}</span>
          
          {current.change_percent !== undefined && (
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-xs font-medium">{Math.abs(current.change_percent).toFixed(1)}%</span>
            </div>
          )}
        </div>
        
        {/* Indicadores de navegação */}
        <div className="flex gap-1">
          {commodities.map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === currentIndex ? 'bg-white w-4' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}