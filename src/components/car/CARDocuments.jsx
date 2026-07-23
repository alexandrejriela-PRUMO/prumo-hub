import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText, Plus, Trash2, Upload } from 'lucide-react';
import R2FileUpload from '@/components/storage/SupabaseFileUpload';
import R2FileLink from '@/components/storage/SupabaseFileLink';
import DocumentSendButton from '@/components/shared/DocumentSendButton';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const DOC_TYPES = ['CAR PDF', 'Shapefile/KML', 'Recibo de Cadastro', 'Retificação', 'Outro'];

const typeColors = {
  'CAR PDF': 'bg-emerald-100 text-emerald-700',
  'Shapefile/KML': 'bg-blue-100 text-blue-700',
  'Recibo de Cadastro': 'bg-yellow-100 text-yellow-700',
  'Retificação': 'bg-orange-100 text-orange-700',
  'Outro': 'bg-gray-100 text-gray-600',
};

export default function CARDocuments({ carRecord, onUpdate, canEdit }) {
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // { url, name }
  const [pendingType, setPendingType] = useState('CAR PDF');
  const [showUpload, setShowUpload] = useState(false);

  const documents = carRecord?.documents || [];

  const handleAddDocument = async (fileToAdd = pendingFile) => {
    if (!fileToAdd) return;
    try {
      const newDoc = {
        name: fileToAdd.name,
        url: fileToAdd.url,
        type: pendingType,
        upload_date: new Date().toISOString(),
      };
      const updatedDocs = [...documents, newDoc];
      await onUpdate({ documents: updatedDocs });
      setPendingFile(null);
      setPendingType('CAR PDF');
      setShowUpload(false);
      toast.success('Documento adicionado!');
    } catch {
      toast.error('Erro ao salvar documento.');
    }
  };

  const handleDelete = async (index) => {
    if (!confirm('Remover este documento do CAR?')) return;
    const updated = documents.filter((_, i) => i !== index);
    await onUpdate({ documents: updated });
    toast.success('Documento removido.');
  };

  return (
    <Card className="border-emerald-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Documentos do CAR
          </CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setShowUpload(v => !v)}>
              <Upload className="w-3 h-3 mr-1" />
              Fazer Upload
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Upload panel */}
        {showUpload && canEdit && (
          <div className="border border-dashed border-emerald-300 rounded-lg p-4 bg-emerald-50 space-y-3">
            <div>
              <Label className="text-xs">Tipo de Documento</Label>
              <Select value={pendingType} onValueChange={setPendingType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Arquivo</Label>
              <div className="mt-1">
                <R2FileUpload
                  folder="car"
                  onUploadDone={(url, name) => {
                    const file = { url, name };
                    setPendingFile(file);
                    handleAddDocument(file);
                  }}
                  label="Selecionar Arquivo"
                />
              </div>
            </div>
            {pendingFile && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-white rounded p-2 border border-emerald-200">
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{pendingFile.name}</span>
                <span className="text-xs text-gray-400 shrink-0">Salvando...</span>
              </div>
            )}
          </div>
        )}

        {/* Document list */}
        {documents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum documento enviado ainda</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{doc.name}</p>
                    {doc.upload_date && (
                      <p className="text-xs text-gray-400">
                        {format(parseISO(doc.upload_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-xs ${typeColors[doc.type] || 'bg-gray-100 text-gray-600'}`}>{doc.type}</Badge>
                  <R2FileLink filePath={doc.url} label="Visualizar" mode="view" asLink={true} />
                  <R2FileLink filePath={doc.url} label="Baixar" mode="download" asLink={true} />
                  <DocumentSendButton
                    fileUrl={doc.url}
                    fileName={doc.name}
                    defaultEmail={carRecord?.owner_email}
                    defaultMessage={`Segue o documento: ${doc.name}`}
                    docType="car"
                    docId={carRecord?.id}
                    size="sm"
                    variant="outline"
                  />
                  {canEdit && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(idx); }} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}