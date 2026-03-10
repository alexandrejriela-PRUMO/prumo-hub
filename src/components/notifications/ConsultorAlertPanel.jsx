import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Send, AlertTriangle, FileCheck, Leaf, FileText, Loader } from 'lucide-react';
import { toast } from 'sonner';

const ALERT_TYPES = [
  { value: 'license', label: 'Licença Ambiental', icon: FileCheck, color: 'text-blue-600' },
  { value: 'prad', label: 'PRAD - Recuperação', icon: Leaf, color: 'text-green-600' },
  { value: 'document', label: 'Documento', icon: FileText, color: 'text-amber-600' },
  { value: 'custom', label: 'Alerta Personalizado', icon: AlertTriangle, color: 'text-red-600' },
];

const SEVERITY_LEVELS = [
  { value: 'info', label: 'Informação' },
  { value: 'warning', label: 'Aviso' },
  { value: 'error', label: 'Urgente' },
];

export default function ConsultorAlertPanel({ propertyId, viewers = [] }) {
  const [open, setOpen] = useState(false);
  const [selectedViewers, setSelectedViewers] = useState([]);
  const [formData, setFormData] = useState({
    alert_type: 'custom',
    title: '',
    message: '',
    severity: 'info',
    link: '',
    send_email: true,
  });

  const queryClient = useQueryClient();

  const { data: authorizedUsers = [] } = useQuery({
    queryKey: ['authorized_users', propertyId],
    queryFn: async () => {
      const props = await base44.entities.Property.filter({ id: propertyId });
      if (props.length === 0) return [];
      const au = props[0].authorized_users;
      if (!au) return [];
      if (Array.isArray(au)) return au;
      try { return JSON.parse(au); } catch { return []; }
    },
  });

  const sendAlertMutation = useMutation({
    mutationFn: async (viewerEmail) => {
      return await base44.functions.invoke('sendConsultorAlert', {
        property_id: propertyId,
        viewer_email: viewerEmail,
        alert_type: formData.alert_type,
        title: formData.title,
        message: formData.message,
        severity: formData.severity,
        link: formData.link || null,
        send_email: formData.send_email,
      });
    },
    onSuccess: () => {
      toast.success('Alerta enviado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  const handleSendAlerts = async () => {
    if (selectedViewers.length === 0) {
      toast.error('Selecione pelo menos um visualizador');
      return;
    }

    if (!formData.title || !formData.message) {
      toast.error('Preencha título e mensagem');
      return;
    }

    for (const viewer of selectedViewers) {
      await sendAlertMutation.mutateAsync(viewer);
    }

    // Reset form
    setFormData({
      alert_type: 'custom',
      title: '',
      message: '',
      severity: 'info',
      link: '',
      send_email: true,
    });
    setSelectedViewers([]);
    setOpen(false);
  };

  const selectedAlertType = ALERT_TYPES.find(t => t.value === formData.alert_type);
  const AlertIcon = selectedAlertType?.icon || AlertTriangle;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          disabled={authorizedUsers.length === 0}
        >
          <Bell className="w-4 h-4" />
          Enviar Alerta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar Alerta para Visualizadores</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de Visualizadores */}
          <div className="space-y-3">
            <Label className="font-semibold">Destinatários</Label>
            {authorizedUsers.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                Nenhum visualizador cadastrado nesta propriedade
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                {authorizedUsers.map((user, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Checkbox
                      id={`viewer_${idx}`}
                      checked={selectedViewers.includes(user.email)}
                      onCheckedChange={(checked) => {
                        setSelectedViewers(prev =>
                          checked
                            ? [...prev, user.email]
                            : prev.filter(e => e !== user.email)
                        );
                      }}
                    />
                    <label htmlFor={`viewer_${idx}`} className="flex-1 cursor-pointer text-sm">
                      {user.name} <span className="text-gray-500">({user.email})</span>
                    </label>
                    <Badge className="bg-gray-100 text-gray-700">{user.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tipo de Alerta */}
          <div className="space-y-3">
            <Label htmlFor="alert_type" className="font-semibold">
              Tipo de Alerta
            </Label>
            <Select value={formData.alert_type} onValueChange={(v) => setFormData({ ...formData, alert_type: v })}>
              <SelectTrigger id="alert_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div className="space-y-3">
            <Label htmlFor="title" className="font-semibold">
              Título *
            </Label>
            <Input
              id="title"
              placeholder="Ex: Licença ambiental vencendo"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Mensagem */}
          <div className="space-y-3">
            <Label htmlFor="message" className="font-semibold">
              Mensagem *
            </Label>
            <Textarea
              id="message"
              placeholder="Descreva o alerta em detalhes..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
            />
          </div>

          {/* Severidade */}
          <div className="space-y-3">
            <Label htmlFor="severity" className="font-semibold">
              Nível de Severidade
            </Label>
            <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
              <SelectTrigger id="severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link (Opcional) */}
          <div className="space-y-3">
            <Label htmlFor="link" className="font-semibold">
              Link (Opcional)
            </Label>
            <Input
              id="link"
              placeholder="Ex: /Licenses"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            />
          </div>

          {/* Enviar Email */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Checkbox
              id="send_email"
              checked={formData.send_email}
              onCheckedChange={(checked) => setFormData({ ...formData, send_email: checked })}
            />
            <label htmlFor="send_email" className="cursor-pointer text-sm">
              Enviar também por e-mail
            </label>
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendAlerts}
              disabled={sendAlertMutation.isPending || selectedViewers.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {sendAlertMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Alerta
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}