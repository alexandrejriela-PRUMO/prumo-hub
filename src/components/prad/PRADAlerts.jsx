import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bell, Trash2, Edit2, Plus } from 'lucide-react';

export default function PRADAlerts({ prad, onUpdate }) {
  const queryClient = useQueryClient();
  const [editingAlert, setEditingAlert] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddDialog, setShowAddDialog] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PRAD.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['prad']);
      setEditingAlert(null);
      setShowAddDialog(false);
      onUpdate?.();
    },
  });

  const handleSaveAlert = () => {
    const alerts = [...(prad.alerts_and_risks || [])];
    
    if (editingAlert !== null) {
      alerts[editingAlert] = { ...editData };
    } else {
      alerts.push({
        ...editData,
        date: new Date().toISOString(),
      });
    }

    updateMutation.mutate({ id: prad.id, data: { alerts_and_risks: alerts } });
  };

  const handleDeleteAlert = (index) => {
    const alerts = prad.alerts_and_risks?.filter((_, i) => i !== index) || [];
    updateMutation.mutate({ id: prad.id, data: { alerts_and_risks: alerts } });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Alertas e Riscos
        </CardTitle>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setEditingAlert(null);
                setEditData({ alert_type: '', severity: 'Média', description: '', status: 'Aberto', action_taken: '' });
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo Alerta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Alerta</DialogTitle>
            </DialogHeader>
            <AlertForm data={editData} setData={setEditData} onSave={handleSaveAlert} onCancel={() => setShowAddDialog(false)} isPending={updateMutation.isPending} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {prad.alerts_and_risks && prad.alerts_and_risks.length > 0 ? (
          <div className="space-y-3">
            {prad.alerts_and_risks.map((alert, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'Crítica' ? 'bg-red-50 border-red-500' :
                  alert.severity === 'Alta' ? 'bg-orange-50 border-orange-500' :
                  alert.severity === 'Média' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{alert.alert_type}</h4>
                    <Badge className={
                      alert.severity === 'Crítica' ? 'bg-red-600' :
                      alert.severity === 'Alta' ? 'bg-orange-600' :
                      alert.severity === 'Média' ? 'bg-yellow-600' :
                      'bg-blue-600'
                    }>
                      {alert.severity}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Dialog open={editingAlert === idx} onOpenChange={(open) => {
                      if (!open) setEditingAlert(null);
                      if (open) {
                        setEditingAlert(idx);
                        setEditData(alert);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Alerta</DialogTitle>
                        </DialogHeader>
                        <AlertForm data={editData} setData={setEditData} onSave={handleSaveAlert} onCancel={() => setEditingAlert(null)} isPending={updateMutation.isPending} />
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteAlert(idx)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <Badge variant="outline">{alert.status}</Badge>
                  {alert.action_taken && <span>✓ {alert.action_taken}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Nenhum alerta cadastrado</p>
        )}
      </CardContent>
    </Card>
  );
}

function AlertForm({ data, setData, onSave, onCancel, isPending }) {
  return (
    <div className="space-y-4 mt-4">
      <div>
        <label className="text-sm font-medium">Tipo de Alerta *</label>
        <Select value={data.alert_type || ''} onValueChange={(value) => setData({ ...data, alert_type: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Atraso de Etapa">Atraso de Etapa</SelectItem>
            <SelectItem value="Falha de Plantio">Falha de Plantio</SelectItem>
            <SelectItem value="Risco de Autuação">Risco de Autuação</SelectItem>
            <SelectItem value="Descumprimento de Condicionante">Descumprimento de Condicionante</SelectItem>
            <SelectItem value="Outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Gravidade *</label>
        <Select value={data.severity || 'Média'} onValueChange={(value) => setData({ ...data, severity: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Baixa">Baixa</SelectItem>
            <SelectItem value="Média">Média</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Crítica">Crítica</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Descrição *</label>
        <Textarea value={data.description || ''} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="Descreva o alerta" className="h-20" />
      </div>
      <div>
        <label className="text-sm font-medium">Status</label>
        <Select value={data.status || 'Aberto'} onValueChange={(value) => setData({ ...data, status: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Aberto">Aberto</SelectItem>
            <SelectItem value="Em Tratamento">Em Tratamento</SelectItem>
            <SelectItem value="Resolvido">Resolvido</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Ação Tomada</label>
        <Textarea value={data.action_taken || ''} onChange={(e) => setData({ ...data, action_taken: e.target.value })} placeholder="Descreva a ação tomada para resolver o alerta" className="h-16" />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button className="bg-green-600 hover:bg-green-700" onClick={onSave} disabled={isPending}>Salvar</Button>
      </div>
    </div>
  );
}