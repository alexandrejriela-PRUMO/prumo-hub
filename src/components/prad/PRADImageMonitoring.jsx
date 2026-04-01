import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Satellite, Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PRADImageMonitoring({ prad, onUpdate }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ date: '', ndvi: '', file_url: '', report_notes: '' });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PRAD.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['prad']);
      setShowDialog(false);
      setFormData({ date: '', ndvi: '', file_url: '', report_notes: '' });
      onUpdate?.();
    },
  });

  const handleAddNDVI = () => {
    const imageMonitoring = { ...(prad.image_monitoring || {}) };
    const ndviEvolution = [...(imageMonitoring.ndvi_evolution || [])];
    
    ndviEvolution.push({
      date: formData.date,
      ndvi: parseFloat(formData.ndvi),
      file_url: formData.file_url,
      report_notes: formData.report_notes,
    });

    updateMutation.mutate({
      id: prad.id,
      data: { image_monitoring: { ...imageMonitoring, ndvi_evolution: ndviEvolution } }
    });
  };

  const handleDeleteNDVI = (index) => {
    const imageMonitoring = { ...(prad.image_monitoring || {}) };
    const ndviEvolution = (imageMonitoring.ndvi_evolution || []).filter((_, i) => i !== index);
    
    updateMutation.mutate({
      id: prad.id,
      data: { image_monitoring: { ...imageMonitoring, ndvi_evolution: ndviEvolution } }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Satellite className="w-5 h-5" />
          Monitoramento por Imagem (NDVI)
        </CardTitle>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-1" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Registro NDVI</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Data *</label>
                <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Valor NDVI (0-1) *</label>
                <Input type="number" step="0.01" min="0" max="1" value={formData.ndvi} onChange={(e) => setFormData({ ...formData, ndvi: e.target.value })} placeholder="0.45" />
              </div>
              <div>
                <label className="text-sm font-medium">URL do Arquivo/Relatório</label>
                <Input value={formData.file_url} onChange={(e) => setFormData({ ...formData, file_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">Observações do Relatório</label>
                <Textarea value={formData.report_notes} onChange={(e) => setFormData({ ...formData, report_notes: e.target.value })} placeholder="Notas sobre o monitoramento" className="h-20" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleAddNDVI}
                  disabled={!formData.date || !formData.ndvi || updateMutation.isPending}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {prad.image_monitoring?.ndvi_evolution && prad.image_monitoring.ndvi_evolution.length > 0 ? (
          <div className="space-y-3">
            {prad.image_monitoring.ndvi_evolution.slice().reverse().map((record, idx) => (
              <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-purple-900">NDVI: {record.ndvi}</p>
                    <p className="text-sm text-purple-700">{format(parseISO(record.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteNDVI((prad.image_monitoring?.ndvi_evolution?.length || 0) - 1 - idx)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                {record.report_notes && (
                  <p className="text-sm text-gray-700 mb-2">📝 {record.report_notes}</p>
                )}
                {record.file_url && (
                  <a href={record.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                    📎 Abrir arquivo
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Nenhum registro de NDVI disponível</p>
        )}
      </CardContent>
    </Card>
  );
}