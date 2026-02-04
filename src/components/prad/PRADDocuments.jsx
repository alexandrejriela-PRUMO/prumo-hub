import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PRADDocuments({ prad, userEmail, onUpdate }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: '', observations: '', file: null });
  const [uploading, setUploading] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PRAD.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['prad']);
      setShowAddDialog(false);
      setFormData({ name: '', type: '', observations: '', file: null });
      onUpdate?.();
    },
  });

  const handleAddDocument = async () => {
    if (!formData.file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: formData.file });
      
      const documents = [...(prad.documents || []), {
        name: formData.name,
        type: formData.type,
        observations: formData.observations,
        url: file_url,
        upload_date: new Date().toISOString(),
        uploaded_by: userEmail,
      }];
      updateMutation.mutate({ id: prad.id, data: { documents } });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = (index) => {
    const documents = prad.documents?.filter((_, i) => i !== index) || [];
    updateMutation.mutate({ id: prad.id, data: { documents } });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documentos e Relatórios
        </CardTitle>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={uploading}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Nome do Documento *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: PRAD - Diagnóstico Completo"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo *</label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRAD Completo">PRAD Completo</SelectItem>
                    <SelectItem value="Relatório de Acompanhamento">Relatório de Acompanhamento</SelectItem>
                    <SelectItem value="ART/RRT">ART/RRT</SelectItem>
                    <SelectItem value="Protocolo Ambiental">Protocolo Ambiental</SelectItem>
                    <SelectItem value="Comprovante de Execução">Comprovante de Execução</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Fazer Upload do Arquivo *</label>
                <Input
                  type="file"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-gray-500 mt-1">PDF, DOC, XLS, JPG e PNG</p>
              </div>
              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Adicione observações específicas sobre este documento"
                  className="h-20"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={uploading}>Cancelar</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleAddDocument}
                  disabled={!formData.name || !formData.type || !formData.file || uploading || updateMutation.isPending}
                >
                  {uploading ? 'Enviando...' : 'Adicionar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {prad.documents && prad.documents.length > 0 ? (
          <div className="space-y-3">
            {prad.documents.map((doc, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg border hover:border-gray-400 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-gray-900">{doc.name}</p>
                      <Badge variant="outline">{doc.type}</Badge>
                    </div>
                    {doc.observations && (
                      <p className="text-sm text-gray-700 mb-2">📝 {doc.observations}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{doc.upload_date && format(new Date(doc.upload_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      {doc.uploaded_by && <span>por {doc.uploaded_by}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-200 rounded transition-colors"
                      title="Abrir documento"
                    >
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                    </a>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteDocument(idx)}
                      className="w-9 h-9 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Nenhum documento cadastrado</p>
        )}
      </CardContent>
    </Card>
  );
}