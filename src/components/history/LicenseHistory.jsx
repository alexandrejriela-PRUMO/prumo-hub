import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Clock, Plus, User, FileCheck, Calendar, Building, Upload, FileText, Download, Edit2, Trash2, History } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';

export default function LicenseHistory({ license, onAddUpdate, onEditUpdate, onDeleteUpdate }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [deletingIndex, setDeletingIndex] = useState(null);
  const [newUpdate, setNewUpdate] = useState({
    date: new Date().toISOString().split('T')[0],
    responsible: '',
    description: '',
    file_url: null,
    file_name: null
  });
  const [editUpdate, setEditUpdate] = useState({
    date: '',
    responsible: '',
    description: '',
    file_url: null,
    file_name: null
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
    };
    loadUser();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewUpdate({ 
        ...newUpdate, 
        file_url,
        file_name: file.name
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updateWithAudit = {
      ...newUpdate,
      audit_trail: [{
        action: 'created',
        timestamp: new Date().toISOString(),
        user_email: currentUser?.email || 'desconhecido',
        user_role: currentUser?.role || 'user'
      }]
    };
    onAddUpdate(updateWithAudit);
    setNewUpdate({
      date: new Date().toISOString().split('T')[0],
      responsible: '',
      description: '',
      file_url: null,
      file_name: null
    });
    setDialogOpen(false);
  };

  const handleEditClick = (index) => {
    const update = updates[index];
    setEditingIndex(index);
    setEditUpdate({
      date: update.date,
      responsible: update.responsible || '',
      description: update.description || '',
      file_url: update.file_url || null,
      file_name: update.file_name || null
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const originalUpdate = updates[editingIndex];
    const editedUpdate = {
      ...editUpdate,
      audit_trail: [
        ...(originalUpdate.audit_trail || []),
        {
          action: 'edited',
          timestamp: new Date().toISOString(),
          user_email: currentUser?.email || 'desconhecido',
          user_role: currentUser?.role || 'user',
          previous_data: {
            date: originalUpdate.date,
            responsible: originalUpdate.responsible,
            description: originalUpdate.description,
            file_url: originalUpdate.file_url,
            file_name: originalUpdate.file_name
          }
        }
      ]
    };
    onEditUpdate(editingIndex, editedUpdate);
    setEditDialogOpen(false);
    setEditingIndex(null);
  };

  const handleDeleteClick = (index) => {
    setDeletingIndex(index);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    const originalUpdate = updates[deletingIndex];
    const deletedUpdate = {
      ...originalUpdate,
      _deleted: true,
      audit_trail: [
        ...(originalUpdate.audit_trail || []),
        {
          action: 'deleted',
          timestamp: new Date().toISOString(),
          user_email: currentUser?.email || 'desconhecido',
          user_role: currentUser?.role || 'user',
          previous_data: {
            date: originalUpdate.date,
            responsible: originalUpdate.responsible,
            description: originalUpdate.description,
            file_url: originalUpdate.file_url,
            file_name: originalUpdate.file_name
          }
        }
      ]
    };
    onDeleteUpdate(deletingIndex, deletedUpdate);
    setDeleteDialogOpen(false);
    setDeletingIndex(null);
  };

  const handleFileUploadEdit = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditUpdate({ 
        ...editUpdate, 
        file_url,
        file_name: file.name
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
    }
  };

  const updates = license.updates || [];

  const getUpdateIcon = (description) => {
    const lower = description.toLowerCase();
    if (lower.includes('protocolo') || lower.includes('solicitação')) return '📥';
    if (lower.includes('análise') || lower.includes('parecer')) return '🔍';
    if (lower.includes('diligência') || lower.includes('exigência')) return '⚠️';
    if (lower.includes('deferido') || lower.includes('aprovado')) return '✅';
    if (lower.includes('indeferido') || lower.includes('negado')) return '❌';
    if (lower.includes('emissão') || lower.includes('emitida')) return '📄';
    if (lower.includes('vistoria') || lower.includes('inspeção')) return '👁️';
    return '📋';
  };

  const renderAuditTrail = (update) => {
    if (!update.audit_trail || update.audit_trail.length === 0) return null;
    
    return (
      <div className="mt-2 space-y-1 text-xs text-gray-400 border-t border-gray-200 pt-2">
        {update.audit_trail.map((audit, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <History className="w-3 h-3" />
            <span>
              {audit.action === 'created' && 'Criado'}
              {audit.action === 'edited' && 'Editado'}
              {audit.action === 'deleted' && 'Excluído'}
              {' por '}
              <span className="font-medium">{audit.user_role === 'admin' ? 'Administrador' : 'Usuário'}</span>
              {' '}({audit.user_email})
              {' em '}
              {format(parseISO(audit.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        ))}
        {update.audit_trail.some(a => a.action === 'deleted') && (
          <div className="text-xs text-red-400 italic mt-1">
            ⚠️ Dados excluídos: {update.audit_trail.find(a => a.action === 'deleted')?.previous_data?.description}
          </div>
        )}
        {update.audit_trail.filter(a => a.action === 'edited').map((audit, idx) => (
          <div key={`edit-${idx}`} className="text-xs text-orange-400 italic">
            📝 Alterado de: {audit.previous_data?.description?.substring(0, 50)}...
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Histórico de Andamentos Administrativos
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Andamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={newUpdate.date}
                    onChange={(e) => setNewUpdate({ ...newUpdate, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Responsável pelo Ato</Label>
                  <Input
                    value={newUpdate.responsible}
                    onChange={(e) => setNewUpdate({ ...newUpdate, responsible: e.target.value })}
                    placeholder="Ex: Órgão Ambiental, Empreendedor, Técnico"
                    required
                  />
                </div>
                <div>
                  <Label>Descrição do Andamento</Label>
                  <Textarea
                    value={newUpdate.description}
                    onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                    placeholder="Descreva o ato praticado: protocolo, análise, diligência, parecer, decisão, etc."
                    rows={4}
                    required
                  />
                </div>
                <div>
                  <Label>Anexar Documento (opcional)</Label>
                  <div className="mt-2">
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors">
                      <Upload className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm text-emerald-700">
                        {uploading ? 'Enviando...' : newUpdate.file_name || 'Clique para selecionar arquivo'}
                      </span>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={uploading}>
                  Adicionar Andamento
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog de Edição */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Andamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={editUpdate.date}
                    onChange={(e) => setEditUpdate({ ...editUpdate, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Responsável pelo Ato</Label>
                  <Input
                    value={editUpdate.responsible}
                    onChange={(e) => setEditUpdate({ ...editUpdate, responsible: e.target.value })}
                    placeholder="Ex: Órgão Ambiental, Empreendedor, Técnico"
                    required
                  />
                </div>
                <div>
                  <Label>Descrição do Andamento</Label>
                  <Textarea
                    value={editUpdate.description}
                    onChange={(e) => setEditUpdate({ ...editUpdate, description: e.target.value })}
                    placeholder="Descreva o ato praticado"
                    rows={4}
                    required
                  />
                </div>
                <div>
                  <Label>Anexar Documento (opcional)</Label>
                  <div className="mt-2">
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-emerald-300 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors">
                      <Upload className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm text-emerald-700">
                        {uploading ? 'Enviando...' : editUpdate.file_name || 'Clique para selecionar arquivo'}
                      </span>
                      <input
                        type="file"
                        onChange={handleFileUploadEdit}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={uploading}>
                  Salvar Alterações
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog de Confirmação de Exclusão */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este andamento? Esta ação ficará registrada no histórico de auditoria.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        {updates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum andamento administrativo registrado</p>
            <p className="text-sm mt-1">Adicione andamentos para rastrear o licenciamento</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates
              .filter(update => !update._deleted)
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((update, index) => {
                const originalIndex = updates.findIndex(u => u === update);
                return (
                  <div 
                    key={index}
                    className="relative pl-8 pb-4 border-l-2 border-emerald-200 last:border-l-0 last:pb-0"
                  >
                    <div className="absolute left-0 top-0 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-emerald-600 flex items-center justify-center text-lg">
                      {getUpdateIcon(update.description)}
                    </div>
                    
                    <div className="bg-gradient-to-br from-white to-emerald-50 rounded-lg border border-emerald-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-semibold text-gray-900">
                            {format(parseISO(update.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                            Andamento {updates.filter(u => !u._deleted).length - index}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditClick(originalIndex)}
                            className="h-7 w-7 p-0 hover:bg-blue-50"
                          >
                            <Edit2 className="w-3 h-3 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(originalIndex)}
                            className="h-7 w-7 p-0 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      
                      {update.responsible && (
                        <div className="flex items-center gap-2 mb-3 bg-white rounded-md p-2 border border-emerald-100">
                          <Building className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm text-gray-700">
                            <strong>Responsável:</strong> {update.responsible}
                          </span>
                        </div>
                      )}
                      
                      <p className="text-gray-800 text-sm leading-relaxed mb-3">
                        {update.description}
                      </p>

                      {update.file_url && (
                        <a
                          href={update.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm text-emerald-700 mb-2"
                        >
                          <FileText className="w-4 h-4" />
                          <span>{update.file_name || 'Documento anexo'}</span>
                          <Download className="w-3 h-3" />
                        </a>
                      )}

                      {renderAuditTrail(update)}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}