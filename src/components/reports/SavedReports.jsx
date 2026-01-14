import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function SavedReports({ user }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Nenhum relatório salvo</h3>
        <p className="text-gray-500 mt-1">
          Os relatórios que você gerar e salvar aparecerão aqui
        </p>
      </CardContent>
    </Card>
  );
}