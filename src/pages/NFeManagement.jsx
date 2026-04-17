import React from 'react';
import { FileText, Wrench } from 'lucide-react';

export default function NFeManagement() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <FileText className="w-7 h-7 text-emerald-600" />
          Notas Fiscais (NF-e)
        </h1>
        <p className="text-gray-500 mt-1">Emissão e gestão de notas fiscais eletrônicas.</p>
      </div>

      <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-5">
          <Wrench className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-amber-800 mb-2">Em Construção</h2>
        <p className="text-amber-700 text-sm max-w-md">
          A integração para emissão de cobranças automatizadas está em construção. Em breve você poderá emitir e gerenciar suas notas fiscais diretamente pela plataforma.
        </p>
      </div>
    </div>
  );
}