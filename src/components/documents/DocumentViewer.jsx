import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Download, ExternalLink, File, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function isLegacyUrl(url) {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
}

export default function DocumentViewer({ document, onClose }) {
  const [resolvedUrl, setResolvedUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const rawUrl = document.file_url;
  const isPDF = rawUrl?.toLowerCase().endsWith('.pdf') || document.file_type?.includes('pdf');
  const isImage = document.file_type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(rawUrl || '');

  useEffect(() => {
    if (!rawUrl) { setLoading(false); return; }

    if (isLegacyUrl(rawUrl)) {
      // URL base44 ou externa: usa diretamente
      setResolvedUrl(rawUrl);
      setLoading(false);
    } else {
      // Path de arquivo: usa getFileSignedUrl (tenta R2 primeiro, depois Supabase)
      base44.functions.invoke('getFileSignedUrl', { filePath: rawUrl, expiresIn: 3600 })
        .then(res => {
          setResolvedUrl(res.data?.signedUrl || null);
        })
        .catch(() => setResolvedUrl(null))
        .finally(() => setLoading(false));
    }
  }, [rawUrl]);

  const handleDownload = () => {
    if (resolvedUrl) window.open(resolvedUrl, '_blank');
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
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading || !resolvedUrl}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading || !resolvedUrl}>
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {document.description && (
            <div className="p-4 bg-gray-50 border-b">
              <p className="text-sm text-gray-700">{document.description}</p>
            </div>
          )}

          <div className="h-full overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : !resolvedUrl ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <File className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-600">Arquivo não disponível</p>
              </div>
            ) : isPDF ? (
              <iframe
                src={resolvedUrl}
                className="w-full h-full min-h-[600px]"
                title="Document Preview"
              />
            ) : isImage ? (
              <div className="flex items-center justify-center p-8 bg-gray-50">
                <img
                  src={resolvedUrl}
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