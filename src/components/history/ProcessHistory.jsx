import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Plus, User, FileText, Calendar, Edit2, History, AlertCircle, Building } from 'lucide-react';
import SupabaseFileUpload from '@/components/storage/SupabaseFileUpload';
import SupabaseFileLink from '@/components/storage/SupabaseFileLink';
import DocumentSendButton from '@/components/shared/DocumentSendButton';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';

export default function ProcessHistory({ process, onAddUpdate, onEditUpdate }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [newUpdate, setNewUpdate] = useState({
    date: new Date().toISOString().split('T')[0],
    responsible: '',
    description: '',
    file_url: null,
    file_name: null,
    deadline: null,
    deadline_responsible: null
  });
  const [editUpdate, setEditUpdate] = useState({
    date: '',
    responsible: '',
    description: '',
    file_url: null,
    file_name: null,
    deadline: null,
    deadline_responsible: null,
    edit_reason: ''
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
      file_name: null,
      deadline: null,
      deadline_responsible: null
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
      file_name: update.file_name || null,
      deadline: update.deadline || null,
      deadline_responsible: update.deadline_responsible || null,
      edit_reason: ''
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const originalUpdate = updates[editingIndex];
    const { edit_reason, ...updateData } = editUpdate;
    const editedUpdate = {
      ...updateData,
      audit_trail: [
        ...(originalUpdate.audit_trail || []),
        {
          action: 'edited',
          timestamp: new Date().toISOString(),
          user_email: currentUser?.email || 'desconhecido',
          user_role: currentUser?.role || 'user',
          edit_reason: edit_reason || 'Sem observação',
          previous_data: {
            date: originalUpdate.date,
            responsible: originalUpdate.responsible,
            description: originalUpdate.description,
            file_url: originalUpdate.file_url,
            file_name: originalUpdate.file_name,
            deadline: originalUpdate.deadline,
            deadline_responsible: originalUpdate.deadline_responsible
          }
        }
      ]
    };
    onEditUpdate(editingIndex, editedUpdate);
    setEditDialogOpen(false);
    setEditingIndex(null);
  };



  const getDeadlineStatus = (deadline) => {
    if (!deadline) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'vencido', color: 'bg-red-100 text-red-700 border-red-300', days: Math.abs(diffDays) };
    } else if (diffDays <= 7) {
      return { status: 'urgente', color: 'bg-orange-100 text-orange-700 border-orange-300', days: diffDays };
    } else if (diffDays <= 30) {
      return { status: 'atencao', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', days: diffDays };
    }
    return { status: 'ok', color: 'bg-blue-100 text-blue-700 border-blue-300', days: diffDays };
  };

  const renderAuditTrail = (update) => {
    if (!update.audit_trail || update.audit_trail.length === 0) return null;
    
    return (
      <div className="mt-2 space-y-2 text-xs text-gray-400 border-t border-gray-200 pt-2">
        {update.audit_trail.map((audit, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-2">
              <History className="w-3 h-3" />
              <span>
                {audit.action === 'created' && 'Criado'}
                {audit.action === 'edited' && 'Editado'}
                {' por '}
                <span className="font-medium">{audit.user_role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                {' '}({audit.user_email})
                {' em '}
                {format(parseISO(audit.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            {audit.action === 'edited' && audit.edit_reason && (
              <div className="ml-5 text-xs text-blue-400 italic">
                💬 Motivo da alteração: {audit.edit_reason}
              </div>
            )}
            {audit.action === 'edited' && audit.previous_data && (
              <div className="ml-5 text-xs text-orange-400 italic">
                📝 Descrição anterior: {audit.previous_data?.description?.substring(0, 80)}
                {audit.previous_data?.description?.length > 80 ? '...' : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const updates = process.updates || [];

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Histórico de Andamentos
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
                  <Label>Responsável</Label>
                  <Input
                    value={newUpdate.responsible}
                    onChange={(e) => setNewUpdate({ ...newUpdate, responsible: e.target.value })}
                    placeholder="Ex: Órgão Ambiental, Advogado, etc."
                    required
                  />
                </div>
                <div>
                  <Label>Descrição do Andamento</Label>
                  <Textarea
                    value={newUpdate.description}
                    onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                    placeholder="Descreva o que aconteceu nesta movimentação"
                    rows={4}
                    required
                  />
                </div>
                <div>
                  <Label>Anexar Documento (opcional)</Label>
                  <div className="mt-2">
                    <SupabaseFileUpload
                      folder="processos"
                      onUploadDone={(filePath, fileName) => setNewUpdate(u => ({ ...u, file_url: filePath, file_name: fileName }))}
                      label="Selecionar Arquivo"
                    />
                  </div>
                </div>
                <div>
                  <Label>Prazo para Cumprimento (opcional)</Label>
                  <Input
                    type="date"
                    value={newUpdate.deadline || ''}
                    onChange={(e) => setNewUpdate({ ...newUpdate, deadline: e.target.value })}
                    placeholder="Data limite para obrigação/condicionante"
                  />
                  <p className="text-xs text-gray-500 mt-1">Se houver prazo para cumprimento de obrigação ou condicionante</p>
                </div>
                {newUpdate.deadline && (
                  <div>
                    <Label>Responsável pelo Cumprimento do Prazo</Label>
                    <Select
                      value={newUpdate.deadline_responsible || ''}
                      onValueChange={(value) => setNewUpdate({ ...newUpdate, deadline_responsible: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Órgão Licenciador">Órgão Licenciador</SelectItem>
                        <SelectItem value="Técnico">Técnico</SelectItem>
                        <SelectItem value="Advogado">Advogado</SelectItem>
                        <SelectItem value="Empreendedor">Empreendedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
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
                  <Label>Responsável</Label>
                  <Input
                    value={editUpdate.responsible}
                    onChange={(e) => setEditUpdate({ ...editUpdate, responsible: e.target.value })}
                    placeholder="Ex: Órgão Ambiental, Advogado, etc."
                    required
                  />
                </div>
                <div>
                  <Label>Descrição do Andamento</Label>
                  <Textarea
                    value={editUpdate.description}
                    onChange={(e) => setEditUpdate({ ...editUpdate, description: e.target.value })}
                    placeholder="Descreva o que aconteceu"
                    rows={4}
                    required
                  />
                </div>
                <div>
                  <Label>Anexar Documento (opcional)</Label>
                  <div className="mt-2">
                    <SupabaseFileUpload
                      folder="processos"
                      onUploadDone={(filePath, fileName) => setEditUpdate(u => ({ ...u, file_url: filePath, file_name: fileName }))}
                      label="Selecionar Arquivo"
                    />
                  </div>
                </div>
                <div>
                  <Label>Prazo para Cumprimento (opcional)</Label>
                  <Input
                    type="date"
                    value={editUpdate.deadline || ''}
                    onChange={(e) => setEditUpdate({ ...editUpdate, deadline: e.target.value })}
                    placeholder="Data limite para obrigação/condicionante"
                  />
                  <p className="text-xs text-gray-500 mt-1">Se houver prazo para cumprimento de obrigação ou condicionante</p>
                </div>
                {editUpdate.deadline && (
                  <div>
                    <Label>Responsável pelo Cumprimento do Prazo</Label>
                    <Select
                      value={editUpdate.deadline_responsible || ''}
                      onValueChange={(value) => setEditUpdate({ ...editUpdate, deadline_responsible: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Órgão Licenciador">Órgão Licenciador</SelectItem>
                        <SelectItem value="Técnico">Técnico</SelectItem>
                        <SelectItem value="Advogado">Advogado</SelectItem>
                        <SelectItem value="Empreendedor">Empreendedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Motivo da Alteração *</Label>
                  <Textarea
                    value={editUpdate.edit_reason}
                    onChange={(e) => setEditUpdate({ ...editUpdate, edit_reason: e.target.value })}
                    placeholder="Descreva o motivo desta alteração..."
                    rows={2}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                  Salvar Alterações
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {updates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum andamento registrado</p>
            <p className="text-sm mt-1">Adicione movimentações para acompanhar o processo</p>
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
                    <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-emerald-600 border-4 border-white" />
                    
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
                            {updates.filter(u => !u._deleted).length - index}º movimento
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditClick(originalIndex)}
                            className="h-7 w-7 p-0 hover:bg-blue-50"
                            title="Editar andamento"
                          >
                            <Edit2 className="w-3 h-3 text-blue-600" />
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
                        <div className="mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm text-emerald-700">{update.file_name || 'Documento anexo'}</span>
                          <SupabaseFileLink filePath={update.file_url} label="Baixar" asLink={true} />
                          <DocumentSendButton
                            fileUrl={update.file_url}
                            fileName={update.file_name || 'Documento anexo'}
                            defaultEmail={process.client_email}
                            defaultMessage={`Segue o documento: ${update.file_name || 'anexo do processo'}`}
                            size="sm"
                            variant="outline"
                          />
                        </div>
                      )}

                      {update.deadline && (
                        <div className="mt-2">
                          {(() => {
                            const deadlineInfo = getDeadlineStatus(update.deadline);
                            return (
                              <div className="flex flex-col gap-1">
                                <Badge className={`${deadlineInfo.color} flex items-center gap-1 w-fit`}>
                                  <AlertCircle className="w-3 h-3" />
                                  <span className="font-medium">Prazo: {format(parseISO(update.deadline), "dd/MM/yyyy", { locale: ptBR })}</span>
                                  {deadlineInfo.status === 'vencido' && <span className="ml-1">• Vencido há {deadlineInfo.days} {deadlineInfo.days === 1 ? 'dia' : 'dias'}</span>}
                                  {deadlineInfo.status === 'urgente' && <span className="ml-1">• Vence em {deadlineInfo.days} {deadlineInfo.days === 1 ? 'dia' : 'dias'}!</span>}
                                  {deadlineInfo.status === 'atencao' && <span className="ml-1">• Vence em {deadlineInfo.days} dias</span>}
                                  {deadlineInfo.status === 'ok' && <span className="ml-1">• {deadlineInfo.days} dias restantes</span>}
                                </Badge>
                                {update.deadline_responsible && (
                                  <span className="text-xs text-gray-600">
                                    Responsável: <span className="font-medium">{update.deadline_responsible}</span>
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
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