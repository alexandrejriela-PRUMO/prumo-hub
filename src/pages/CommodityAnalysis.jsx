import React from 'react';
import CommodityHistory from '../components/dashboard/CommodityHistory';
import CommodityPrices from '../components/dashboard/CommodityPrices';
import { BarChart3 } from 'lucide-react';

export default function CommodityAnalysis() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-lg">
          <BarChart3 className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Análise de Commodities</h1>
          <p className="text-gray-500 mt-1">Acompanhe preços e histórico das principais commodities agrícolas</p>
        </div>
      </div>

      {/* Preços Atuais */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Preços Atuais</h2>
        <CommodityPrices />
      </div>

      {/* Histórico de Preços */}
      <CommodityHistory />
    </div>
  );
}