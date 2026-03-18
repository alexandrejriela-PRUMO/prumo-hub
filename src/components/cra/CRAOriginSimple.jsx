import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CRAOriginSimple({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
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
  const queryClient = useQueryClient();

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0
  });

  const { data: origins = [], refetch: refetchOrigins } = useQuery({
    queryKey: ['cra-origins', user?.email],
    queryFn: () => base44.entities.CRAOrigin.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const existing = parseFloat(data.existing_legal_reserve_hectares) || 0;
      const required = parseFloat(data.required_legal_reserve_hectares) || 0;
      const total = parseFloat(data.total_area_hectares) || 0;

      if (existing < 0 || required < 0 || total <= 0) {
        throw new Error('Valores inválidos');
      }

      const surplus = Math.max(0, existing - required);
      const payload = {
        ...data,
        owner_email: user.email,
        total_area_hectares: total,
        required_legal_reserve_hectares: required,
        existing_legal_reserve_hectares: existing,
        surplus_native_vegetation_hectares: surplus,
        potential_cra_area_hectares: surplus,
        status: editingId ? origins.find(o => o.id === editingId)?.status : 'Pendente'
      };

      if (editingId) {
        return base44.entities.CRAOrigin.update(editingId, payload);
      }
      return base44.entities.CRAOrigin.create(payload);
    },
    onSuccess: async () => {
      await refetchOrigins();
      resetForm();
      toast.success(editingId ? 'Origem atualizada!' : 'Origem criada!');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao salvar');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CRAOrigin.delete(id),
    onSuccess: async () => {
      await refetchOrigins();
      toast.success('Deletado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao deletar');
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
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (origin) => {
    setEditingId(origin.id);
    setFormData({
      property_id: origin.property_id,
      car_number: origin.car_number,
      biome: origin.biome,
      state: origin.state,
      municipality: origin.municipality,
      total_area_hectares: origin.total_area_hectares?.toString() || '',
      required_legal_reserve_hectares: origin.required_legal_reserve_hectares?.toString() || '',
      existing_legal_reserve_hectares: origin.existing_legal_reserve_hectares?.toString() || ''
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.property_id || !formData.car_number || !formData.biome) {
      toast.error('Preencha: Propriedade, CAR e Bioma');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Origem
        </Button>
      </div>

      {origins.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-gray-500">
            Nenhuma origem cadastrada
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {origins.map(origin => {
            const prop = properties.find(p => p.id === origin.property_id);
            return (
              <Card key={origin.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900">{prop?.property_name || 'Propriedade'}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-gray-600">CAR</p>
                          <p className="font-medium">{origin.car_number}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Bioma</p>
                          <p className="font-medium">{origin.biome}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Localização</p>
                          <p className="font-medium">{origin.municipality}/{origin.state}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Potencial CRA</p>
                          <p className="font-bold text-emerald-700">{origin.potential_cra_area_hectares}ha</p>
                        </div>
                      </div>
                    </div>
                    <Badge className="ml-4">{origin.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(origin)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Deletar esta origem?')) {
                          deleteMutation.mutate(origin.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
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

      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowForm(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Origem' : 'Adicionar Origem'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Propriedade *</Label>
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
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>CAR *</Label>
                <Input
                  value={formData.car_number}
                  onChange={(e) => setFormData({ ...formData, car_number: e.target.value })}
                  placeholder="123.456.789-12.0001-25"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Bioma *</Label>
                <Select value={formData.biome} onValueChange={(value) => setFormData({ ...formData, biome: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
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
                <Label>Área total (ha) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_area_hectares}
                  onChange={(e) => setFormData({ ...formData, total_area_hectares: e.target.value })}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Reserva Legal exigida (ha) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.required_legal_reserve_hectares}
                  onChange={(e) => setFormData({ ...formData, required_legal_reserve_hectares: e.target.value })}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Reserva Legal existente (ha) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.existing_legal_reserve_hectares}
                  onChange={(e) => setFormData({ ...formData, existing_legal_reserve_hectares: e.target.value })}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={resetForm} className="flex-1" disabled={saveMutation.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}