import React from 'react';
import { FileText } from 'lucide-react';

export default function SavedReports({ user }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm py-12 text-center">
      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-semibold text-gray-900">Nenhum relatório salvo</h3>
      <p className="text-gray-500 mt-1">
        Os relatórios que você gerar e salvar aparecerão aqui
      </p>
    </div>
  );
}