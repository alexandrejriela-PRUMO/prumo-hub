import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Trash2, Download, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SupabaseFileUpload from '@/components/storage/SupabaseFileUpload';
import SupabaseFileLink from '@/components/storage/SupabaseFileLink';
import { toast } from 'sonner';

export default function MappingFilesModal({ mapping, isOpen, onClose, onFilesUpdate }) {
  const [files, setFiles] = useState(mapping?.files || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddFile = (filePath, fileName) => {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.') + 1);
    const newFile = { name: fileName, url: filePath, type: ext || 'geoespacial', upload_date: new Date().toISOString() };
    setFiles([...files, newFile]);
    toast.success('Arquivo adicionado!');
  };

  const handleRemoveFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleReplaceFile = (index, filePath, fileName) => {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.') + 1);
    const updatedFiles = [...files];
    updatedFiles[index] = { name: fileName, url: filePath, type: ext || 'geoespacial', upload_date: new Date().toISOString() };
    setFiles(updatedFiles);
    toast.success('Arquivo substituído!');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onFilesUpdate(files);
      toast.success('Arquivos atualizados com sucesso!');
      onClose();
    } catch (error) {
      toast.error('Erro ao atualizar arquivos');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Arquivos - {mapping?.title}</DialogTitle>
          <DialogDescription>Adicione, substitua ou remova arquivos geoespaciais</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lista de Arquivos */}
          {files.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Arquivos ({files.length}):</p>
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group hover:bg-gray-100 transition-colors"
                >
                  <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {file.upload_date ? format(new Date(file.upload_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Data desconhecida'}
                    </p>
                  </div>
                  {file.type && (
                    <Badge variant="outline" className="text-xs px-2 py-1 flex-shrink-0">
                      {file.type.toUpperCase()}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <SupabaseFileLink filePath={file.url} label="" asLink={false} />
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="p-1.5 hover:bg-red-100 rounded transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Nenhum arquivo anexado ainda</p>
            </div>
          )}

          {/* Upload novo arquivo */}
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-gray-700 mb-3">Adicionar novo arquivo:</p>
            <SupabaseFileUpload
              folder="mapeamentos"
              accept=".kml,.tif,.tiff,.tfw,.json,.png,.zip"
              label="Selecionar arquivo"
              onUploadDone={handleAddFile}
            />
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}