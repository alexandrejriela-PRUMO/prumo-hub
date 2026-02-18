import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { Upload, X, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentUpload({ 
  entityType, 
  entityId, 
  onSuccess, 
  onCancel,
  allowedTypes = ['CAR', 'CCIR', 'Georreferenciamento', 'Licença', 'Contrato', 'Relatório', 'Laudo', 'Outro'],
  properties = []
}) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(entityId || '');
  const [metadata, setMetadata] = useState({
    document_type: '',
    document_name: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!metadata.document_name) {
        setMetadata({ ...metadata, document_name: selectedFile.name });
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Selecione um arquivo');
      return;
    }

    if (!metadata.document_type) {
      toast.error('Selecione o tipo de documento');
      return;
    }

    setUploading(true);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Prepare document data
      const documentData = {
        entity_type: selectedPropertyId ? 'Property' : entityType,
        entity_id: selectedPropertyId || entityId,
        document_type: metadata.document_type,
        document_name: metadata.document_name,
        description: metadata.description,
        file_url,
        file_size: file.size,
        file_type: file.type,
        upload_date: metadata.date
      };

      onSuccess(documentData);
      toast.success('Documento enviado com sucesso!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upload de Documento</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel} disabled={uploading}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            {/* File Input */}
            <div>
              <Label>Arquivo *</Label>
              <div className="mt-2">
                <input
                  type="file"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    disabled:opacity-50"
                />
              </div>
              {file && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="w-4 h-4" />
                  <span>{file.name}</span>
                  <span className="text-gray-400">({(file.size / 1024).toFixed(2)} KB)</span>
                </div>
              )}
            </div>

            {/* Property Selector */}
            {properties.length > 0 && (
              <div>
                <Label>Propriedade Vinculada</Label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                >
                  <option value="">Nenhuma (Documento Geral)</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.property_name} {p.city ? `— ${p.city}/${p.state}` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Document Type */}
            <div>
              <Label>Tipo de Documento *</Label>
              <select
                required
                value={metadata.document_type}
                onChange={(e) => setMetadata({ ...metadata, document_type: e.target.value })}
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione o tipo</option>
                {allowedTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Document Name */}
            <div>
              <Label>Nome do Documento *</Label>
              <Input
                required
                value={metadata.document_name}
                onChange={(e) => setMetadata({ ...metadata, document_name: e.target.value })}
                placeholder="Ex: CAR - Propriedade São José"
                disabled={uploading}
              />
            </div>

            {/* Date */}
            <div>
              <Label>Data do Documento</Label>
              <Input
                type="date"
                value={metadata.date}
                onChange={(e) => setMetadata({ ...metadata, date: e.target.value })}
                disabled={uploading}
              />
            </div>

            {/* Description */}
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={metadata.description}
                onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                placeholder="Informações adicionais sobre o documento..."
                rows={3}
                disabled={uploading}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Documento
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}