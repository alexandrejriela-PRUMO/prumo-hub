import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Plus, User, FileCheck, Calendar, Building, Upload, FileText, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';

export default function LicenseHistory({ license, onAddUpdate }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    date: new Date().toISOString().split('T')[0],
    responsible: '',
    description: '',
    file_url: null,
    file_name: null
  });

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
    onAddUpdate(newUpdate);
    setNewUpdate({
      date: new Date().toISOString().split('T')[0],
      responsible: '',
      description: '',
      file_url: null,
      file_name: null
    });
    setDialogOpen(false);
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
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((update, index) => (
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
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                        Andamento {updates.length - index}
                      </Badge>
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
                        className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-sm text-emerald-700"
                      >
                        <FileText className="w-4 h-4" />
                        <span>{update.file_name || 'Documento anexo'}</span>
                        <Download className="w-3 h-3" />
                      </a>
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