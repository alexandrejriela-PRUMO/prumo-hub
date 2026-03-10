import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock, AlertCircle, FileText, Upload, CalendarDays, Leaf, Plus, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const YEARS = [
  { label: '1º Ano', year: 1, icon: '🌱', description: 'Implantação e primeiros resultados' },
  { label: '2º Ano', year: 2, icon: '🌿', description: 'Consolidação da vegetação' },
  { label: '3º Ano', year: 3, icon: '🌳', description: 'Avanço da cobertura vegetal' },
  { label: '4º Ano', year: 4, icon: '🏞️', description: 'Conclusão do monitoramento obrigatório' },
];

export default function PRADAnnualReports({ prad, onUpdate }) {
  const queryClient = useQueryClient();
  const [editingYear, setEditingYear] = useState(null);
  const [editData, setEditData] = useState({});
  const [uploading, setUploading] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PRAD.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['prad']);
      setEditingYear(null);
      onUpdate?.();
    },
  });

  const annualReports = prad.annual_reports || [];

  const getReport = (year) => annualReports.find(r => r.year === year);

  const handleSave = (year) => {
    const updated = [...annualReports];
    const idx = updated.findIndex(r => r.year === year);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], ...editData, year };
    } else {
      updated.push({ ...editData, year });
    }
    updateMutation.mutate({ id: prad.id, data: { annual_reports: updated } });
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditData(prev => ({ ...prev, file_url, file_name: file.name }));
    setUploading(false);
  };

  const getStatusConfig = (report) => {
    if (!report) return { label: 'Pendente', color: 'bg-gray-500', icon: <AlertCircle className="w-5 h-5 text-gray-400" />, bg: 'bg-gray-50 border-gray-200' };
    if (report.status === 'Entregue') return { label: 'Entregue', color: 'bg-green-600', icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, bg: 'bg-green-50 border-green-200' };
    if (report.status === 'Em Elaboração') return { label: 'Em Elaboração', color: 'bg-blue-600', icon: <Clock className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50 border-blue-200' };
    if (report.status === 'Atrasado') return { label: 'Atrasado', color: 'bg-red-600', icon: <AlertCircle className="w-5 h-5 text-red-600" />, bg: 'bg-red-50 border-red-200' };
    return { label: 'Pendente', color: 'bg-gray-500', icon: <AlertCircle className="w-5 h-5 text-gray-400" />, bg: 'bg-gray-50 border-gray-200' };
  };

  const completedCount = annualReports.filter(r => r.status === 'Entregue').length;

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-700 text-white rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-6 h-6" />
          Relatórios Anuais de Acompanhamento
        </CardTitle>
        <p className="text-teal-100 text-sm mt-1">
          4 anos obrigatórios após deferimento e início da execução — {completedCount}/4 entregues
        </p>
        <div className="w-full bg-white/20 rounded-full h-2 mt-3">
          <div
            className="bg-white h-full rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / 4) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {YEARS.map(({ label, year, icon, description }) => {
            const report = getReport(year);
            const { label: statusLabel, color, icon: statusIcon, bg } = getStatusConfig(report);

            return (
              <Dialog
                key={year}
                open={editingYear === year}
                onOpenChange={(open) => {
                  if (!open) setEditingYear(null);
                  if (open) {
                    setEditingYear(year);
                    setEditData(report || { status: 'Pendente', notes: '', survival_rate: '', vegetation_cover: '', delivery_date: '' });
                  }
                }}
              >
                <div className={`rounded-xl border-2 p-4 ${bg} transition-all`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{icon}</span>
                      <div>
                        <p className="font-bold text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500">{description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusIcon}
                      <Badge className={color + ' text-xs'}>{statusLabel}</Badge>
                    </div>
                  </div>

                  {report && (
                    <div className="space-y-1 mb-3">
                      {report.delivery_date && (
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          Entregue em {report.delivery_date}
                        </p>
                      )}
                      {report.survival_rate && (
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <Leaf className="w-3 h-3 text-green-500" />
                          Sobrevivência: <strong>{report.survival_rate}%</strong>
                        </p>
                      )}
                      {report.vegetation_cover && (
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <Leaf className="w-3 h-3 text-teal-500" />
                          Cobertura Vegetal: <strong>{report.vegetation_cover}%</strong>
                        </p>
                      )}
                      {report.file_url && (
                        <a
                          href={report.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 underline flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          {report.file_name || 'Ver Relatório'}
                        </a>
                      )}
                      {report.notes && (
                        <p className="text-xs text-gray-500 italic truncate">{report.notes}</p>
                      )}
                    </div>
                  )}

                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="w-full gap-1 text-xs">
                      {report ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      {report ? 'Editar Relatório' : 'Registrar Relatório'}
                    </Button>
                  </DialogTrigger>
                </div>

                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <span>{icon}</span> Relatório Anual — {label}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        value={editData.status || 'Pendente'}
                        onValueChange={(v) => setEditData({ ...editData, status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Em Elaboração">Em Elaboração</SelectItem>
                          <SelectItem value="Entregue">Entregue</SelectItem>
                          <SelectItem value="Atrasado">Atrasado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Data de Entrega</label>
                      <Input
                        type="date"
                        value={editData.delivery_date || ''}
                        onChange={(e) => setEditData({ ...editData, delivery_date: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">Taxa de Sobrevivência (%)</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={editData.survival_rate || ''}
                          onChange={(e) => setEditData({ ...editData, survival_rate: e.target.value })}
                          placeholder="Ex: 85"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Cobertura Vegetal (%)</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={editData.vegetation_cover || ''}
                          onChange={(e) => setEditData({ ...editData, vegetation_cover: e.target.value })}
                          placeholder="Ex: 70"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Observações</label>
                      <Textarea
                        value={editData.notes || ''}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        placeholder="Observações técnicas do relatório..."
                        className="h-20"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Anexar Relatório (PDF)</label>
                      <div className="mt-1">
                        {editData.file_url ? (
                          <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                            <FileText className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-green-700 truncate">{editData.file_name || 'Arquivo anexado'}</span>
                            <button
                              className="ml-auto text-xs text-red-500 hover:underline"
                              onClick={() => setEditData({ ...editData, file_url: '', file_name: '' })}
                            >
                              Remover
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 rounded p-3 hover:border-green-400 transition-colors">
                            <Upload className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {uploading ? 'Enviando...' : 'Clique para enviar o PDF'}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <Button variant="outline" onClick={() => setEditingYear(null)}>Cancelar</Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleSave(year)}
                        disabled={updateMutation.isPending || uploading}
                      >
                        Salvar Relatório
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>

        {completedCount === 4 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-300 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="font-bold text-emerald-700">🎉 Monitoramento Obrigatório Concluído!</p>
            <p className="text-sm text-emerald-600">Todos os 4 relatórios anuais foram entregues com sucesso.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}