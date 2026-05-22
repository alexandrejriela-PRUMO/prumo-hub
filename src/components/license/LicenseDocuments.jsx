import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Trash2, ExternalLink, Plus } from 'lucide-react';
import SupabaseFileUpload from '@/components/storage/SupabaseFileUpload';
import SupabaseFileLink from '@/components/storage/SupabaseFileLink';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function LicenseDocuments({ license, onUpdate }) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [docType, setDocType] = useState('Documento Complementar');
  const [pendingFilePath, setPendingFilePath] = useState(null);
  const [pendingFileName, setPendingFileName] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!pendingFilePath) {
      toast.error('Por favor, selecione e aguarde o envio do arquivo');
      return;
    }

    try {
      const user = await base44.auth.me();
      const newDoc = {
        name: pendingFileName,
        url: pendingFilePath,
        type: docType,
        uploaded_by: user.email,
        uploaded_date: new Date().toISOString()
      };

      const updatedLicense = {
        ...license,
        documents: [...(license.documents || []), newDoc]
      };

      await onUpdate(updatedLicense);
      toast.success('Documento adicionado com sucesso!');
      setUploadDialogOpen(false);
      setPendingFilePath(null);
      setPendingFileName(null);
      setDocType('Documento Complementar');
    } catch (error) {
      toast.error('Erro ao salvar documento');
    }
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Deseja realmente remover este documento?')) return;

    const updatedLicense = {
      ...license,
      documents: license.documents.filter((_, i) => i !== index)
    };

    await onUpdate(updatedLicense);
    toast.success('Documento removido com sucesso!');
  };

  const documents = license.documents || [];

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Documentos da Licença
          </CardTitle>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Documento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <Label>Tipo de Documento</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Licença Principal">Licença Principal</SelectItem>
                      <SelectItem value="Documento Complementar">Documento Complementar</SelectItem>
                      <SelectItem value="Comprovante">Comprovante</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Selecionar Arquivo</Label>
                  <div className="mt-2">
                    <SupabaseFileUpload
                      folder="licencas"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onUploadDone={(filePath, fileName) => { setPendingFilePath(filePath); setPendingFileName(fileName); }}
                      label="Selecionar Arquivo (PDF, JPG, PNG)"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Adicionar Documento
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum documento anexado</p>
            <p className="text-sm mt-1">Adicione documentos da licença e complementares</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="w-5 h-5 text-emerald-600 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                        {doc.type}
                      </span>
                      {doc.uploaded_date && (
                        <span className="text-xs text-gray-500">
                          {format(parseISO(doc.uploaded_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    {doc.uploaded_by && (
                      <p className="text-xs text-gray-500 mt-1">
                        Por: {doc.uploaded_by}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SupabaseFileLink filePath={doc.url} label="" asLink={true} mode="view" />
                  <SupabaseFileLink filePath={doc.url} label="" asLink={false} mode="download" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}