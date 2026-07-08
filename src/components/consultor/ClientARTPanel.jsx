import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, FileText, Trash2, Download, File } from 'lucide-react';

export default function ClientARTPanel({ client }) {
  const [showForm, setShowForm] = useState(false);
  const [artToDelete, setArtToDelete] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    art_number: '',
    art_type: '',
    professional_name: '',
    professional_registration: '',
    issue_date: '',
    expiry_date: '',
    description: '',
    document_url: '',
    document_name: '',
    notes: ''
  });
  const queryClient = useQueryClient();

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingFile(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        document_url: response.file_url,
        document_name: file.name
      }));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload do arquivo');
    } finally {
      setUploadingFile(false);
    }
  };

  const { data: arts = [] } = useQuery({
    queryKey: ['client-arts', client?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('listConsultorPropertyRecords', {
        entity_name: 'ART', field_name: 'property_id', email_field: 'consultor_email'
      });
      const all = res.data?.records || [];
      return all.filter(a => a.client_email === client?.client_email);
    },
    enabled: !!client?.client_email
  });

  const createARTMutation = useMutation({
    mutationFn: (artData) => base44.entities.ART.create({
      ...artData,
      client_email: client.client_email,
      property_id: client.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-arts'] });
      setShowForm(false);
      setFormData({
        art_number: '',
        art_type: '',
        professional_name: '',
        professional_registration: '',
        issue_date: '',
        expiry_date: '',
        description: '',
        document_url: '',
        document_name: '',
        notes: ''
      });
    }
  });

  const deleteARTMutation = useMutation({
    mutationFn: (artId) => base44.entities.ART.delete(artId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-arts'] });
      setArtToDelete(null);
    }
  });

  const handleSubmit = () => {
    if (!formData.art_number || !formData.art_type) {
      alert('Preencha os campos obrigatórios');
      return;
    }
    createARTMutation.mutate(formData);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ativa':
        return 'bg-green-100 text-green-800';
      case 'Vencida':
        return 'bg-red-100 text-red-800';
      case 'Cancelada':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      'PRAD': 'bg-blue-100 text-blue-800',
      'Laudo': 'bg-purple-100 text-purple-800',
      'Licença': 'bg-yellow-100 text-yellow-800',
      'Relatório': 'bg-indigo-100 text-indigo-800',
      'Georreferenciamento': 'bg-cyan-100 text-cyan-800',
      'Mapeamento': 'bg-emerald-100 text-emerald-800',
      'Outro': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={() => setShowForm(true)}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Adicionar ART
      </Button>

      {arts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Nenhuma ART vinculada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {arts.map(art => (
            <Card key={art.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-semibold text-gray-900">ART {art.art_number}</span>
                      <Badge className={getTypeColor(art.art_type)}>{art.art_type}</Badge>
                      <Badge className={getStatusColor(art.status)}>{art.status}</Badge>
                    </div>
                    {art.professional_name && (
                      <p className="text-xs text-gray-600 mb-1">
                        <strong>Profissional:</strong> {art.professional_name}
                      </p>
                    )}
                    {art.professional_registration && (
                      <p className="text-xs text-gray-600 mb-1">
                        <strong>Registro:</strong> {art.professional_registration}
                      </p>
                    )}
                    {art.issue_date && (
                      <p className="text-xs text-gray-600 mb-1">
                        <strong>Emissão:</strong> {new Date(art.issue_date).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {art.description && (
                      <p className="text-xs text-gray-600">{art.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {art.document_url && (
                      <a
                        href={art.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => setArtToDelete(art)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar ART</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Número da ART *</Label>
              <Input
                value={formData.art_number}
                onChange={(e) => setFormData({ ...formData, art_number: e.target.value })}
                placeholder="Ex: 2024001"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Tipo/Finalidade *</Label>
              <Select value={formData.art_type} onValueChange={(value) => setFormData({ ...formData, art_type: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRAD">PRAD</SelectItem>
                  <SelectItem value="Laudo">Laudo</SelectItem>
                  <SelectItem value="Licença">Licença</SelectItem>
                  <SelectItem value="Relatório">Relatório</SelectItem>
                  <SelectItem value="Georreferenciamento">Georreferenciamento</SelectItem>
                  <SelectItem value="Mapeamento">Mapeamento</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Nome do Profissional</Label>
              <Input
                value={formData.professional_name}
                onChange={(e) => setFormData({ ...formData, professional_name: e.target.value })}
                placeholder="Ex: João Silva"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Registro Profissional</Label>
              <Input
                value={formData.professional_registration}
                onChange={(e) => setFormData({ ...formData, professional_registration: e.target.value })}
                placeholder="Ex: CREA 123456"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Data de Emissão</Label>
              <Input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Data de Vencimento</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição dos trabalhos"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Documento</Label>
              {formData.document_name ? (
                <div className="mt-1 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800 truncate">{formData.document_name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, document_url: '', document_name: '' }))}
                    className="text-xs text-green-600 hover:text-green-800 font-medium"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex items-center justify-center gap-2 p-3 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Clique para selecionar arquivo</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="hidden"
                  />
                </label>
              )}
              {uploadingFile && <p className="text-xs text-gray-500 mt-2">Enviando arquivo...</p>}
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={createARTMutation.isPending}
              >
                {createARTMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!artToDelete} onOpenChange={() => setArtToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ART?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a ART {artToDelete?.art_number}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteARTMutation.mutate(artToDelete.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}