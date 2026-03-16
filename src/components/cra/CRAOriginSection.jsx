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
import DocumentUpload from '../documents/DocumentUpload';

export default function CRAOriginSection({ user }) {
  const [showForm, setShowForm] = useState(false);
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
    queryFn: () => base44.entities.CRAOrigin.filter({ consultor_email: user?.email }),
    enabled: !!user?.email
  });

  const createOriginMutation = useMutation({
    mutationFn: async (data) => {
      const surplus = Math.max(0, data.existing_legal_reserve_hectares - data.required_legal_reserve_hectares);
      return base44.entities.CRAOrigin.create({
        ...data,
        owner_email: user.email,
        consultor_email: user.email,
        surplus_native_vegetation_hectares: surplus,
        potential_cra_area_hectares: surplus,
        documents
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cra-origins'] });
      setShowForm(false);
      resetForm();
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
  };

  const handleSubmit = () => {
    if (!formData.property_id || !formData.biome || !formData.total_area_hectares) {
      alert('Preencha os campos obrigatórios');
      return;
    }
    createOriginMutation.mutate(formData);
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
                  <div className="grid md:grid-cols-2 gap-4">
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Origem de CRA</DialogTitle>
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
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={createOriginMutation.isPending}
              >
                {createOriginMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}