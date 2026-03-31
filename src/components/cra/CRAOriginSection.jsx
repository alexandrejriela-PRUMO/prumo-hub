import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import DocumentUpload from '../documents/DocumentUpload';

export default function CRAOriginSection({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState(null);
  const [formData, setFormData] = useState({
    property_id: '',
    car_number: '',
    biome: '',
    state: '',
    municipality: '',
    total_area_hectares: '',
    required_legal_reserve_hectares: '',
    existing_legal_reserve_hectares: ''
  });
  const [documents, setDocuments] = useState([]);
  const queryClient = useQueryClient();

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: origins = [] } = useQuery({
    queryKey: ['cra-origins', user?.email],
    queryFn: () => base44.entities.CRAOrigin.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  const createOriginMutation = useMutation({
    mutationFn: async (data) => {
      // 🔴 CRÍTICO #4: Validação de tipos e valores
      const existing = parseFloat(data.existing_legal_reserve_hectares) || 0;
      const required = parseFloat(data.required_legal_reserve_hectares) || 0;
      const total = parseFloat(data.total_area_hectares) || 0;

      if (isNaN(existing) || isNaN(required) || isNaN(total)) {
        throw new Error('Valores numéricos inválidos');
      }

      if (existing < 0 || required < 0 || total < 0) {
        throw new Error('Valores não podem ser negativos');
      }

      if (total === 0) {
        throw new Error('Área total não pode ser zero');
      }

      if (required > total) {
        throw new Error('Reserva Legal exigida não pode ser maior que a área total');
      }

      const surplus = Math.max(0, existing - required);
      
      if (existing < required) {
        console.warn('[CRA] Aviso: Reserva existente menor que exigida. Potencial CRA será zero.');
      }

      console.log('[CRA] Validações OK - Surplus calculado:', surplus);

      const payload = {
        ...data,
        owner_email: user.email,
        surplus_native_vegetation_hectares: surplus,
        potential_cra_area_hectares: surplus,
        status: editingOrigin?.status || 'Pendente',
        total_area_hectares: total,
        required_legal_reserve_hectares: required,
        existing_legal_reserve_hectares: existing
      };
      
      if (documents.length > 0) {
        payload.documents = documents;
      }

      if (editingOrigin) {
        console.log('[CRA] Atualizando origem:', editingOrigin.id);
        return base44.entities.CRAOrigin.update(editingOrigin.id, payload);
      }
      console.log('[CRA] Criando nova origem:', payload);
      return base44.entities.CRAOrigin.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cra-origins'] });
      setShowForm(false);
      setEditingOrigin(null);
      resetForm();
      console.log('[CRA] Origem salva com sucesso');
    },
    onError: (error) => {
      console.error('[CRA] Erro ao salvar origem:', error);
    }
  });

  const deleteOriginMutation = useMutation({
    mutationFn: (originId) => base44.entities.CRAOrigin.delete(originId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cra-origins'] });
    }
  });

  const resetForm = () => {
    setFormData({
      property_id: '',
      car_number: '',
      biome: '',
      state: '',
      municipality: '',
      total_area_hectares: '',
      required_legal_reserve_hectares: '',
      existing_legal_reserve_hectares: ''
    });
    setDocuments([]);
    setEditingOrigin(null);
  };

  const openEditForm = (origin) => {
    setEditingOrigin(origin);
    setFormData({
      property_id: origin.property_id,
      car_number: origin.car_number,
      biome: origin.biome,
      state: origin.state,
      municipality: origin.municipality,
      total_area_hectares: origin.total_area_hectares,
      required_legal_reserve_hectares: origin.required_legal_reserve_hectares,
      existing_legal_reserve_hectares: origin.existing_legal_reserve_hectares
    });
    setDocuments(origin.documents || []);
    setShowForm(true);
  };

  const handleSubmit = () => {
    // 🟡 MÉDIO #10: Substituir alert() por toast()
    const errors = [];
    if (!formData.property_id) errors.push('Propriedade');
    if (!formData.car_number) errors.push('CAR');
    if (!formData.biome) errors.push('Bioma');
    if (!formData.total_area_hectares) errors.push('Área total');
    if (!formData.required_legal_reserve_hectares) errors.push('Reserva Legal exigida');
    if (!formData.existing_legal_reserve_hectares) errors.push('Reserva Legal existente');

    if (errors.length > 0) {
      const errorMsg = `Campos obrigatórios: ${errors.join(', ')}`;
      toast.error(errorMsg);
      console.warn('[CRA] Validação falhou:', errorMsg);
      return;
    }

    // 🟡 MÉDIO #11: Validação de números negativos
    const total = parseFloat(formData.total_area_hectares);
    const required = parseFloat(formData.required_legal_reserve_hectares);
    const existing = parseFloat(formData.existing_legal_reserve_hectares);

    if (total <= 0 || required < 0 || existing < 0) {
      toast.error('Valores devem ser positivos');
      return;
    }

    if (required > total) {
      toast.error('Reserva Legal exigida não pode ser maior que a área total');
      return;
    }

    console.log('[CRA] Iniciando salvamento da origem...');
    createOriginMutation.mutate({
      ...formData,
      total_area_hectares: total,
      required_legal_reserve_hectares: required,
      existing_legal_reserve_hectares: existing
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pendente': 'bg-gray-100 text-gray-800',
      'Validado': 'bg-blue-100 text-blue-800',
      'Em Análise': 'bg-yellow-100 text-yellow-800',
      'Aprovado': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Origem
        </Button>
      </div>

      {origins.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">Nenhuma origem de CRA cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {origins.map(origin => {
            const prop = properties.find(p => p.id === origin.property_id);
            return (
              <Card key={origin.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-3">{prop?.property_name || 'Propriedade'}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">CAR:</span>
                          <span className="font-medium">{origin.car_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bioma:</span>
                          <span className="font-medium">{origin.biome}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Localização:</span>
                          <span className="font-medium">{origin.municipality}/{origin.state}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Área total:</span>
                          <span className="font-medium">{origin.total_area_hectares} ha</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reserva Legal exigida:</span>
                          <span className="font-medium">{origin.required_legal_reserve_hectares} ha</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reserva Legal existente:</span>
                          <span className="font-medium text-green-600">{origin.existing_legal_reserve_hectares} ha</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-bold">
                          <span>Potencial CRA:</span>
                          <span className="text-emerald-700">{origin.potential_cra_area_hectares} ha</span>
                        </div>
                      </div>
                      <Badge className={getStatusColor(origin.status)}>{origin.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditForm(origin)}
                      className="flex-1"
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja deletar esta origem?')) {
                          deleteOriginMutation.mutate(origin.id);
                        }
                      }}
                      disabled={deleteOriginMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl sm:max-w-lg md:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrigin ? 'Editar Origem de CRA' : 'Adicionar Origem de CRA'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Propriedade *</Label>
              <Select value={formData.property_id} onValueChange={(value) => {
                const prop = properties.find(p => p.id === value);
                setFormData({
                  ...formData,
                  property_id: value,
                  state: prop?.state || '',
                  municipality: prop?.city || ''
                });
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a propriedade" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(prop => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">CAR *</Label>
                <Input
                  value={formData.car_number}
                  onChange={(e) => setFormData({ ...formData, car_number: e.target.value })}
                  placeholder="CAR"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Bioma *</Label>
                <Select value={formData.biome} onValueChange={(value) => setFormData({ ...formData, biome: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Amazônia">Amazônia</SelectItem>
                    <SelectItem value="Cerrado">Cerrado</SelectItem>
                    <SelectItem value="Mata Atlântica">Mata Atlântica</SelectItem>
                    <SelectItem value="Caatinga">Caatinga</SelectItem>
                    <SelectItem value="Pantanal">Pantanal</SelectItem>
                    <SelectItem value="Pampas">Pampas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Área total (ha) *</Label>
                <Input
                  type="number"
                  value={formData.total_area_hectares}
                  onChange={(e) => setFormData({ ...formData, total_area_hectares: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Reserva Legal exigida (ha) *</Label>
                <Input
                  type="number"
                  value={formData.required_legal_reserve_hectares}
                  onChange={(e) => setFormData({ ...formData, required_legal_reserve_hectares: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Reserva Legal existente (ha) *</Label>
                <Input
                  type="number"
                  value={formData.existing_legal_reserve_hectares}
                  onChange={(e) => setFormData({ ...formData, existing_legal_reserve_hectares: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <DocumentUpload
              documents={documents}
              onDocumentsChange={setDocuments}
              allowedTypes={['CAR Validado', 'Matrícula do Imóvel', 'Mapa da Reserva Legal', 'Laudo Técnico', 'Outro']}
            />

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={createOriginMutation.isPending}
              >
                {createOriginMutation.isPending ? 'Salvando...' : editingOrigin ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}