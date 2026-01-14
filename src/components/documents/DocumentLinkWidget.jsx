import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link, FileUp, FileCheck } from 'lucide-react';

const CATEGORY_PRIORITIES = {
  soil_analysis: ['soil_analysis', 'production_records'],
  tax_incentive: ['environmental_policies', 'certifications', 'legal_docs', 'property_docs'],
  certification: ['certifications', 'environmental_policies', 'audit_reports'],
  loan: ['property_docs', 'financial_records', 'production_records', 'certifications']
};

export default function DocumentLinkWidget({ userEmail, documentType = 'general', onDocumentsSelected, isOpen, onClose }) {
  const [selectedDocs, setSelectedDocs] = useState([]);

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', userEmail, documentType],
    queryFn: () => base44.entities.UnifiedDocument.filter(
      { uploaded_by: userEmail },
      '-upload_date'
    ),
    enabled: !!userEmail && isOpen
  });

  const handleToggleDoc = (docId) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleConfirm = () => {
    const selectedDocuments = documents.filter(d => selectedDocs.includes(d.id));
    onDocumentsSelected?.(selectedDocuments);
    setSelectedDocs([]);
    onClose?.();
  };

  // Sugerir documentos relevantes
  const suggestedCategories = CATEGORY_PRIORITIES[documentType] || [];
  const suggestedDocs = documents.filter(d =>
    suggestedCategories.includes(d.document_type)
  );

  const otherDocs = documents.filter(d =>
    !suggestedCategories.includes(d.document_type)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Vincular Documentos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Documentos Sugeridos */}
          {suggestedDocs.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-green-600" />
                Documentos Recomendados
              </h3>
              <div className="space-y-2 bg-green-50 border border-green-200 rounded-lg p-4">
                {suggestedDocs.map(doc => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-3 p-3 hover:bg-green-100 rounded cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedDocs.includes(doc.id)}
                      onCheckedChange={() => handleToggleDoc(doc.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{doc.document_name}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(doc.upload_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Outros Documentos */}
          {otherDocs.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Outros Documentos</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto border rounded-lg p-4">
                {otherDocs.map(doc => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedDocs.includes(doc.id)}
                      onCheckedChange={() => handleToggleDoc(doc.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{doc.document_name}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(doc.upload_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {documents.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <FileUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Nenhum documento disponível</p>
            </div>
          )}

          {/* Resumo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>{selectedDocs.length} documento(s) selecionado(s)</strong>
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedDocs.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Vincular Documentos ({selectedDocs.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}