import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Plus, Trash2, Save, Bell, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import TooltipInfo from '../components/ui/tooltip-info';

export default function AlertSettings() {
  const [user, setUser] = useState(null);
  const [editingThreshold, setEditingThreshold] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);

  const { data: thresholds = [] } = useQuery({
    queryKey: ['alert-thresholds'],
    queryFn: () => base44.entities.AlertThreshold.list(),
    enabled: true
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AlertThreshold.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-thresholds'] });
      setShowForm(false);
      setEditingThreshold(null);
      toast.success('Limiar criado com sucesso!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AlertThreshold.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-thresholds'] });
      setShowForm(false);
      setEditingThreshold(null);
      toast.success('Limiar atualizado com sucesso!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AlertThreshold.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-thresholds'] });
      toast.success('Limiar removido com sucesso!');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const thresholdValue = parseFloat(formData.get('threshold_value'));
    
    // Validações
    if (!formData.get('alert_type')) {
      toast.error('Selecione o tipo de alerta');
      return;
    }
    
    if (!formData.get('parameter_name')?.trim()) {
      toast.error('Digite o nome do parâmetro');
      return;
    }
    
    if (isNaN(thresholdValue)) {
      toast.error('Digite um valor numérico válido para o limiar');
      return;
    }
    
    const data = {
      alert_type: formData.get('alert_type'),
      parameter_name: formData.get('parameter_name').trim(),
      threshold_value: thresholdValue,
      comparison_operator: formData.get('comparison_operator'),
      severity: formData.get('severity'),
      description: formData.get('description')?.trim() || '',
      active: formData.get('active') === 'on',
      notification_enabled: formData.get('notification_enabled') === 'on',
      notification_channels: ['email', 'push', 'sms'].filter(ch => formData.get(`channel_${ch}`) === 'on')
    };

    if (editingThreshold) {
      updateMutation.mutate({ id: editingThreshold.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const severityColors = {
    'Crítica': 'bg-red-100 text-red-700 border-red-300',
    'Alta': 'bg-orange-100 text-orange-700 border-orange-300',
    'Média': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'Baixa': 'bg-blue-100 text-blue-700 border-blue-300'
  };

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto">
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="py-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
            <p className="text-gray-600">Apenas administradores podem configurar limiares de alertas.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Info Card */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-900">Configurar Alertas - Uso Futuro</h3>
              </div>
            </div>
            <p className="text-amber-800 text-sm">
              <strong>Objetivo Atual:</strong> Esta seção permite que administradores pre-configurem limiares e regras que serão usados quando a integração com sistemas de detecção automática estiver disponível.
            </p>
            <p className="text-amber-800 text-sm">
              <strong>Funcionalidade Futura:</strong> Quando integradas plataformas como PRODES, DETER, MapBiomas e outros sensores geoespaciais, os alertas será automaticamente disparados com base nesses limiares configurados aqui, gerando notificações em tempo real.
            </p>
            <p className="text-amber-800 text-sm">
              <strong>Agora:</strong> Configure seus limiares antecipadamente para estar pronto quando a automação for ativada.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-emerald-600" />
              Configurações de Alertas Ambientais
            </h1>
            <Badge className="bg-blue-100 text-blue-700 border border-blue-300">Em Breve</Badge>
          </div>
          <p className="text-gray-500">Defina limiares customizados para alertas de NDVI, desmatamento e mudanças no uso da terra</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingThreshold(null); }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Limiar
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-2 border-emerald-200">
          <CardHeader className="bg-emerald-50">
            <CardTitle>{editingThreshold ? 'Editar Limiar' : 'Novo Limiar'}</CardTitle>
            <CardDescription>Configure os parâmetros do limiar de alerta</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Label>Tipo de Alerta *</Label>
                    <TooltipInfo content="Selecione o tipo de monitoramento ambiental que este limiar irá controlar" />
                  </div>
                  <Select name="alert_type" defaultValue={editingThreshold?.alert_type} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Desmatamento">Desmatamento</SelectItem>
                      <SelectItem value="Mudança de Uso da Terra">Mudança de Uso da Terra</SelectItem>
                      <SelectItem value="Índice de Vegetação">Índice de Vegetação (NDVI)</SelectItem>
                      <SelectItem value="APP">APP</SelectItem>
                      <SelectItem value="Reserva Legal">Reserva Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Label>Nome do Parâmetro *</Label>
                    <TooltipInfo content="Nome descritivo do parâmetro que será monitorado. Ex: 'NDVI Médio', 'Área Desmatada'" />
                  </div>
                  <Input name="parameter_name" defaultValue={editingThreshold?.parameter_name} placeholder="Ex: NDVI, Área Desmatada (ha)" required />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Label>Valor Limite *</Label>
                    <TooltipInfo content="Valor numérico que, quando atingido, irá disparar o alerta. Ex: 0.3 para NDVI, 5.0 para hectares" />
                  </div>
                  <Input name="threshold_value" type="number" step="0.01" defaultValue={editingThreshold?.threshold_value} placeholder="Ex: 0.3, 5.0" required />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Label>Operador de Comparação *</Label>
                    <TooltipInfo content="Define como o valor será comparado. Ex: 'menor que 0.3' para NDVI baixo" />
                  </div>
                  <Select name="comparison_operator" defaultValue={editingThreshold?.comparison_operator} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="menor_que">Menor que (&lt;)</SelectItem>
                      <SelectItem value="maior_que">Maior que (&gt;)</SelectItem>
                      <SelectItem value="igual_a">Igual a (=)</SelectItem>
                      <SelectItem value="diferente_de">Diferente de (≠)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Label>Gravidade do Alerta *</Label>
                    <TooltipInfo content="Nível de severidade que será atribuído ao alerta quando disparado" />
                  </div>
                  <Select name="severity" defaultValue={editingThreshold?.severity} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Crítica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea name="description" defaultValue={editingThreshold?.description} placeholder="Descreva quando este alerta deve ser disparado..." rows={3} />
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Switch name="active" defaultChecked={editingThreshold?.active !== false} />
                  <Label>Limiar Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch name="notification_enabled" defaultChecked={editingThreshold?.notification_enabled !== false} />
                  <Label>Notificações Habilitadas</Label>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="mb-2 block">Canais de Notificação</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" name="channel_email" defaultChecked className="w-4 h-4" />
                    <Label>Email</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" name="channel_push" defaultChecked className="w-4 h-4" />
                    <Label>Push</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" name="channel_sms" className="w-4 h-4" />
                    <Label>SMS</Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingThreshold(null); }}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Limiar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Thresholds List */}
      <div className="grid gap-4">
        {thresholds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Nenhum limiar configurado</h3>
              <p className="text-gray-500 mt-1">Crie limiares customizados para monitoramento ambiental</p>
            </CardContent>
          </Card>
        ) : (
          thresholds.map(threshold => (
            <Card key={threshold.id} className={`border-2 ${threshold.active ? 'border-emerald-200' : 'border-gray-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-gray-900">{threshold.parameter_name}</h3>
                      <Badge className={severityColors[threshold.severity]}>
                        {threshold.severity}
                      </Badge>
                      <Badge variant="outline">{threshold.alert_type}</Badge>
                      {!threshold.active && <Badge variant="outline" className="bg-gray-100">Inativo</Badge>}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      Alerta quando valor {threshold.comparison_operator === 'menor_que' ? '<' : threshold.comparison_operator === 'maior_que' ? '>' : threshold.comparison_operator === 'igual_a' ? '=' : '≠'} {threshold.threshold_value}
                    </p>
                    
                    {threshold.description && (
                      <p className="text-sm text-gray-700 mb-2">{threshold.description}</p>
                    )}

                    <div className="flex gap-2 text-xs">
                      {threshold.notification_enabled && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <Bell className="w-3 h-3 mr-1" />
                          Notificações Ativas
                        </Badge>
                      )}
                      {threshold.notification_channels?.map(ch => (
                        <Badge key={ch} variant="outline" className="text-xs">
                          {ch}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingThreshold(threshold); setShowForm(true); }}>
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => {
                      if (confirm('Deseja realmente remover este limiar?')) {
                        deleteMutation.mutate(threshold.id);
                      }
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Bell className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Sobre Notificações</h4>
                <p className="text-sm text-blue-800">
                  As notificações push e SMS requerem backend habilitado. Configure os limiares agora e as notificações serão ativadas automaticamente quando o backend for habilitado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">Exemplos de Limiares</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• NDVI &lt; 0.3 = Vegetação degradada (Alta)</li>
                  <li>• Área Desmatada &gt; 2ha = Desmatamento (Crítica)</li>
                  <li>• Mudança de uso &gt; 1ha = Monitoramento (Média)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}