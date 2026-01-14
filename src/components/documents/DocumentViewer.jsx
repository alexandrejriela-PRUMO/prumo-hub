import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Download, ExternalLink, FileText, Image as ImageIcon, File } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DocumentViewer({ document, onClose }) {
  const isPDF = document.file_url?.toLowerCase().endsWith('.pdf') || document.file_type?.includes('pdf');
  const isImage = document.file_type?.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|webp)$/i.test(document.file_url || '');

  const handleDownload = () => {
    window.open(document.file_url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b shrink-0">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl truncate">{document.document_name || 'Documento'}</CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline">{document.document_type}</Badge>
              {document.upload_date && (
                <span className="text-sm text-gray-600">
                  {format(new Date(document.upload_date), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              )}
              {document.file_size && (
                <span className="text-sm text-gray-500">
                  {(document.file_size / 1024).toFixed(2)} KB
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(document.file_url, '_blank')}>
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {/* Description */}
          {document.description && (
            <div className="p-4 bg-gray-50 border-b">
              <p className="text-sm text-gray-700">{document.description}</p>
            </div>
          )}

          {/* Document Preview */}
          <div className="h-full overflow-auto">
            {isPDF ? (
              <iframe
                src={document.file_url}
                className="w-full h-full min-h-[600px]"
                title="Document Preview"
              />
            ) : isImage ? (
              <div className="flex items-center justify-center p-8 bg-gray-50">
                <img
                  src={document.file_url}
                  alt={document.document_name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <File className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-600 mb-2">Visualização não disponível para este tipo de arquivo</p>
                <p className="text-sm text-gray-500 mb-4">Faça o download para abrir o arquivo</p>
                <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
                  <Download className="w-4 h-4 mr-2" />
                  Fazer Download
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}