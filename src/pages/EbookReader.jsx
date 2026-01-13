import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, BookOpen, Lock, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function EbookReader() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Por favor, selecione um arquivo PDF válido.');
      return;
    }

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setPdfUrl(result.file_url);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao enviar o arquivo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-emerald-600" />
          E-book - Guia Completo do Produtor Rural
        </h1>
        <p className="text-gray-600 mt-2">
          Evite Multas Ambientais - Material Exclusivo para Assinantes
        </p>
      </div>

      {!pdfUrl ? (
        <Card className="border-emerald-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Upload className="w-5 h-5 text-emerald-600" />
              Upload do E-book (Administrador)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-emerald-600 opacity-50" />
              <p className="text-gray-600 mb-6">
                Faça upload do arquivo PDF do e-book para disponibilizar aos clientes
              </p>
              <div className="max-w-md mx-auto">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                {uploading && (
                  <p className="text-sm text-emerald-600 mt-2">Enviando arquivo...</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-100 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Lock className="w-5 h-5 text-emerald-700" />
                Visualização Protegida
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPdfUrl(null)}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                Trocar PDF
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              ⚠️ Este conteúdo é exclusivo e protegido. Download e cópia não permitidos.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div 
              className="relative w-full"
              style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0"
                title="E-book Guia do Produtor Rural"
                style={{
                  pointerEvents: 'auto',
                  userSelect: 'none'
                }}
              />
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  background: 'transparent',
                  zIndex: 1
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">
              Proteção de Conteúdo
            </h3>
            <p className="text-sm text-amber-800">
              Este e-book é protegido contra download e cópia. O conteúdo pode ser visualizado apenas dentro desta plataforma.
              Qualquer tentativa de compartilhamento não autorizado viola os termos de uso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}