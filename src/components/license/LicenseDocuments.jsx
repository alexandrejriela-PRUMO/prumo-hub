import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Upload, Trash2, ExternalLink, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function LicenseDocuments({ license, onUpdate }) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('Documento Complementar');
  const [selectedFile, setSelectedFile] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Por favor, selecione um arquivo');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      const user = await base44.auth.me();
      const newDoc = {
        name: selectedFile.name,
        url: file_url,
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
      setSelectedFile(null);
      setDocType('Documento Complementar');
    } catch (error) {
      toast.error('Erro ao fazer upload do documento');
    }
    setUploading(false);
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
                  <Label htmlFor="file-upload">Selecionar Arquivo do Computador</Label>
                  <div className="mt-2">
                    <label 
                      htmlFor="file-upload"
                      className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-50 transition-colors"
                    >
                      <Upload className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">
                        {selectedFile ? selectedFile.name : 'Clique aqui para buscar arquivo (PDF, JPG, PNG)'}
                      </span>
                    </label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="hidden"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Formatos aceitos: PDF, JPG, PNG (máx. 10MB)
                  </p>
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={uploading}>
                  {uploading ? 'Enviando...' : 'Fazer Upload'}
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
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
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