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
import R2FileUpload from '@/components/storage/SupabaseFileUpload';
import R2FileLink from '@/components/storage/SupabaseFileLink';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PRADDocuments({ prad, userEmail, onUpdate }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: '', observations: '', file_url: null, file_name: null });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PRAD.update(id, data),
    onSuccess: () => {
    queryClient.invalidateQueries(['prad']);
    setShowAddDialog(false);
    setFormData({ name: '', type: '', observations: '', file_url: null, file_name: null });
    onUpdate?.();
    },
  });

  const handleAddDocument = () => {
    if (!formData.file_url) return;
    
    const documents = [...(prad.documents || []), {
      name: formData.name,
      type: formData.type,
      observations: formData.observations,
      url: formData.file_url,
      upload_date: new Date().toISOString(),
      uploaded_by: userEmail,
    }];
    updateMutation.mutate({ id: prad.id, data: { documents } });
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
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
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
                <div className="mt-1">
                  <R2FileUpload
                    folder="prad"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onUploadDone={(filePath, fileName) => setFormData(f => ({ ...f, file_url: filePath, file_name: fileName }))}
                    label="Selecionar Arquivo"
                  />
                </div>
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
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleAddDocument}
                  disabled={!formData.name || !formData.type || !formData.file_url || updateMutation.isPending}
                >
                  Adicionar
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
                    <R2FileLink filePath={doc.url} label="Abrir" asLink={true} />
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