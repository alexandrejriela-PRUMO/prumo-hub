import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MODULES, DOCUMENT_TYPES } from './documentConstants';
import SupabaseFileUpload from '@/components/storage/SupabaseFileUpload';

export default function DocumentUpload({ 
  entityType, 
  entityId, 
  onSuccess, 
  onCancel,
  allowedTypes = DOCUMENT_TYPES,
  properties = []
}) {
  const [file_url, setFileUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(entityId || '');
  const [metadata, setMetadata] = useState({
    document_type: '',
    other_description: '',
    document_name: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    module: ''
  });



  const handleUpload = (e) => {
    e.preventDefault();
    
    if (!file_url) {
      toast.error('Selecione e aguarde o envio do arquivo');
      return;
    }

    if (!metadata.document_type) {
      toast.error('Selecione o tipo de documento');
      return;
    }

    const documentData = {
      entity_type: selectedPropertyId ? 'Property' : entityType,
      entity_id: selectedPropertyId || entityId,
      module: metadata.module || undefined,
      document_type: metadata.document_type === 'Outro' && metadata.other_description
        ? `Outro: ${metadata.other_description}`
        : metadata.document_type,
      document_name: metadata.document_name,
      description: metadata.description,
      file_url,
      file_size: file?.size,
      file_type: file?.type,
      upload_date: metadata.date
    };

    onSuccess(documentData);
    toast.success('Documento enviado com sucesso!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upload de Documento</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            {/* File Input */}
            <div>
              <Label>Arquivo *</Label>
              <div className="mt-2">
                <SupabaseFileUpload
                  folder="documentos"
                  onUploadDone={(filePath, fileName) => {
                    setFileUrl(filePath);
                    if (!metadata.document_name) setMetadata(m => ({ ...m, document_name: fileName }));
                  }}
                  label="Selecionar Arquivo"
                />
              </div>
            </div>

            {/* Property Selector */}
            {properties.length > 0 && (
              <div>
                <Label>Propriedade Vinculada</Label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                >
                  <option value="">Nenhuma (Documento Geral)</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.property_name} {p.city ? `— ${p.city}/${p.state}` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Module */}
            <div>
              <Label>Módulo *</Label>
              <select
                required
                value={metadata.module}
                onChange={(e) => setMetadata({ ...metadata, module: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
              >
                <option value="">Selecione o módulo</option>
                {MODULES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Document Type */}
            <div>
              <Label>Tipo de Documento *</Label>
              <select
                required
                value={metadata.document_type}
                onChange={(e) => setMetadata({ ...metadata, document_type: e.target.value, other_description: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione o tipo</option>
                {allowedTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Other description */}
            {metadata.document_type === 'Outro' && (
              <div>
                <Label>Descrição do tipo "Outro" *</Label>
                <Input
                  required
                  value={metadata.other_description}
                  onChange={(e) => setMetadata({ ...metadata, other_description: e.target.value })}
                  placeholder="Ex: Contrato de Compra e Venda, Laudo de Avaliação..."
                />
              </div>
            )}

            {/* Document Name */}
            <div>
              <Label>Nome do Documento *</Label>
              <Input
                required
                value={metadata.document_name}
                onChange={(e) => setMetadata({ ...metadata, document_name: e.target.value })}
                placeholder="Ex: CAR - Propriedade São José"
              />
            </div>

            {/* Date */}
            <div>
              <Label>Data do Documento</Label>
              <Input
                type="date"
                value={metadata.date}
                onChange={(e) => setMetadata({ ...metadata, date: e.target.value })}
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
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Enviar Documento
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}