import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, FileText, Image, FileCheck, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AlertForm({ alert, properties, user, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(alert || {
    property_id: properties[0]?.id || '',
    title: '',
    description: '',
    alert_type: 'Desmatamento',
    severity: 'Média',
    status: 'Aberto',
    detection_date: new Date().toISOString().split('T')[0],
    coordinates: '',
    affected_area_hectares: '',
    ndvi_value: '',
    data_source: 'Manual',
    responsible_email: user?.email || '',
    recommended_actions: [],
    attachments: alert?.attachments || [],
    notification_config: {
      email: true,
      push: false,
      sms: false
    }
  });
  
  const [uploading, setUploading] = useState(false);
  const [actionInput, setActionInput] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const attachment = {
        name: file.name,
        url: file_url,
        type: file.type.startsWith('image/') ? 'foto' : 'documento',
        uploaded_date: new Date().toISOString(),
        uploaded_by: user.email
      };
      
      setFormData({
        ...formData,
        attachments: [...(formData.attachments || []), attachment]
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    }
    setUploading(false);
  };

  const removeAttachment = (index) => {
    const newAttachments = [...formData.attachments];
    newAttachments.splice(index, 1);
    setFormData({ ...formData, attachments: newAttachments });
  };

  const addAction = () => {
    if (actionInput.trim()) {
      setFormData({
        ...formData,
        recommended_actions: [...(formData.recommended_actions || []), actionInput.trim()]
      });
      setActionInput('');
    }
  };

  const removeAction = (index) => {
    const newActions = [...formData.recommended_actions];
    newActions.splice(index, 1);
    setFormData({ ...formData, recommended_actions: newActions });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      affected_area_hectares: formData.affected_area_hectares ? parseFloat(formData.affected_area_hectares) : undefined,
      ndvi_value: formData.ndvi_value ? parseFloat(formData.ndvi_value) : undefined,
      history: [
        ...(alert?.history || []),
        {
          date: new Date().toISOString(),
          action: alert ? 'Alerta atualizado' : 'Alerta criado',
          user: user.email,
          notes: alert ? 'Informações atualizadas' : 'Alerta criado manualmente'
        }
      ]
    };
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Propriedade *</Label>
          <Select
            value={formData.property_id}
            onValueChange={(v) => setFormData({ ...formData, property_id: v })}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.property_name} - {p.city}/{p.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tipo de Alerta *</Label>
          <Select
            value={formData.alert_type}
            onValueChange={(v) => setFormData({ ...formData, alert_type: v })}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Desmatamento">Desmatamento</SelectItem>
              <SelectItem value="Mudança de Uso da Terra">Mudança de Uso da Terra</SelectItem>
              <SelectItem value="Índice de Vegetação">Índice de Vegetação</SelectItem>
              <SelectItem value="APP">APP</SelectItem>
              <SelectItem value="Reserva Legal">Reserva Legal</SelectItem>
              <SelectItem value="Poluição">Poluição</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Gravidade *</Label>
          <Select
            value={formData.severity}
            onValueChange={(v) => setFormData({ ...formData, severity: v })}
            required
          >
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

        <div className="space-y-2">
          <Label>Status *</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v })}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Aberto">Aberto</SelectItem>
              <SelectItem value="Em Análise">Em Análise</SelectItem>
              <SelectItem value="Resolvido">Resolvido</SelectItem>
              <SelectItem value="Ignorado">Ignorado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Data de Ocorrência *</Label>
          <Input
            type="date"
            value={formData.detection_date}
            onChange={(e) => setFormData({ ...formData, detection_date: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Responsável</Label>
          <Input
            type="email"
            value={formData.responsible_email}
            onChange={(e) => setFormData({ ...formData, responsible_email: e.target.value })}
            placeholder="email@exemplo.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Título *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Desmatamento detectado na área norte"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Descrição *</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descreva o alerta em detalhes..."
          rows={4}
          required
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Coordenadas (lat,lng)</Label>
          <Input
            value={formData.coordinates}
            onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
            placeholder="-15.7939, -47.8828"
          />
        </div>

        <div className="space-y-2">
          <Label>Área Afetada (ha)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.affected_area_hectares}
            onChange={(e) => setFormData({ ...formData, affected_area_hectares: e.target.value })}
            placeholder="5.5"
          />
        </div>

        <div className="space-y-2">
          <Label>Fonte de Dados</Label>
          <Select
            value={formData.data_source}
            onValueChange={(v) => setFormData({ ...formData, data_source: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Manual">Manual</SelectItem>
              <SelectItem value="PRODES">PRODES</SelectItem>
              <SelectItem value="DETER">DETER</SelectItem>
              <SelectItem value="MapBiomas">MapBiomas</SelectItem>
              <SelectItem value="Google Earth Engine">Google Earth Engine</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ações Recomendadas */}
      <div className="space-y-2">
        <Label>Ações Recomendadas</Label>
        <div className="flex gap-2">
          <Input
            value={actionInput}
            onChange={(e) => setActionInput(e.target.value)}
            placeholder="Digite uma ação recomendada..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAction())}
          />
          <Button type="button" onClick={addAction} variant="outline">
            Adicionar
          </Button>
        </div>
        {formData.recommended_actions?.length > 0 && (
          <div className="space-y-1 mt-2">
            {formData.recommended_actions.map((action, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                <span className="flex-1 text-sm">{action}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeAction(idx)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anexos */}
      <div className="space-y-2">
        <Label>Anexos (Relatórios, Fotos)</Label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <Input
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="mb-3"
          />
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando arquivo...
            </div>
          )}
          {formData.attachments?.length > 0 && (
            <div className="space-y-2">
              {formData.attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-gray-50 p-2 rounded">
                  {att.type === 'foto' ? <Image className="w-5 h-5 text-blue-600" /> : <FileText className="w-5 h-5 text-gray-600" />}
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm hover:underline">
                    {att.name}
                  </a>
                  <Badge variant="outline" className="text-xs">{att.type}</Badge>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(idx)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notificações */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Label className="mb-2 block">Notificações (quando habilitadas)</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.notification_config?.email}
              onChange={(e) => setFormData({
                ...formData,
                notification_config: { ...formData.notification_config, email: e.target.checked }
              })}
            />
            Email
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.notification_config?.push}
              onChange={(e) => setFormData({
                ...formData,
                notification_config: { ...formData.notification_config, push: e.target.checked }
              })}
            />
            Push
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.notification_config?.sms}
              onChange={(e) => setFormData({
                ...formData,
                notification_config: { ...formData.notification_config, sms: e.target.checked }
              })}
            />
            SMS
          </label>
        </div>
        <p className="text-xs text-blue-700 mt-2">
          As notificações serão enviadas automaticamente quando o backend for habilitado
        </p>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          {alert ? 'Atualizar Alerta' : 'Criar Alerta'}
        </Button>
      </div>
    </form>
  );
}