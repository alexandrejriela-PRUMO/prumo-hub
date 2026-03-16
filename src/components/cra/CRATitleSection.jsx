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
import { Plus, Award } from 'lucide-react';

export default function CRATitleSection({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    cra_number: '',
    origin_id: '',
    cra_area_hectares: '',
    biome: '',
    state: '',
    municipality: '',
    issue_date: '',
    issuing_body: ''
  });
  const queryClient = useQueryClient();

  const { data: origins = [] } = useQuery({
    queryKey: ['cra-origins', user?.email],
    queryFn: () => base44.entities.CRAOrigin.filter({ consultor_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: titles = [] } = useQuery({
    queryKey: ['cra-titles', user?.email],
    queryFn: () => base44.entities.CRATitle.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  const createTitleMutation = useMutation({
    mutationFn: (data) => base44.entities.CRATitle.create({
      ...data,
      owner_email: user.email,
      current_holder_email: user.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cra-titles'] });
      setShowForm(false);
      setFormData({
        cra_number: '',
        origin_id: '',
        cra_area_hectares: '',
        biome: '',
        state: '',
        municipality: '',
        issue_date: '',
        issuing_body: ''
      });
    }
  });

  const handleSubmit = () => {
    if (!formData.cra_number || !formData.origin_id || !formData.cra_area_hectares) {
      alert('Preencha os campos obrigatórios');
      return;
    }
    createTitleMutation.mutate(formData);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Disponível': 'bg-green-100 text-green-800',
      'Reservada': 'bg-yellow-100 text-yellow-800',
      'Vendida': 'bg-blue-100 text-blue-800',
      'Vinculada': 'bg-purple-100 text-purple-800'
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
          Emitir Novo Título
        </Button>
      </div>

      {titles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Award className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">Nenhum título de CRA cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {titles.map(title => {
            const origin = origins.find(o => o.id === title.origin_id);
            return (
              <Card key={title.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 mb-2">CRA {title.cra_number}</h3>
                      <Badge className={getStatusColor(title.status)} className="mb-3">{title.status}</Badge>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Origem:</span>
                      <p className="font-medium">{origin?.car_number || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Área:</span>
                      <p className="font-medium text-emerald-700">{title.cra_area_hectares} ha</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Bioma:</span>
                      <p className="font-medium">{title.biome}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Localização:</span>
                      <p className="font-medium">{title.municipality}/{title.state}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Emissão:</span>
                      <p className="font-medium">{new Date(title.issue_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Órgão emissor:</span>
                      <p className="font-medium">{title.issuing_body}</p>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Emitir Novo Título de CRA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Origem *</Label>
              <Select value={formData.origin_id} onValueChange={(value) => {
                const origin = origins.find(o => o.id === value);
                setFormData({
                  ...formData,
                  origin_id: value,
                  biome: origin?.biome || '',
                  state: origin?.state || '',
                  municipality: origin?.municipality || ''
                });
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  {origins.map(origin => (
                    <SelectItem key={origin.id} value={origin.id}>
                      {origin.car_number} - {origin.potential_cra_area_hectares}ha
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Número da CRA *</Label>
                <Input
                  value={formData.cra_number}
                  onChange={(e) => setFormData({ ...formData, cra_number: e.target.value })}
                  placeholder="Ex: 2024-001"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Área (ha) *</Label>
                <Input
                  type="number"
                  value={formData.cra_area_hectares}
                  onChange={(e) => setFormData({ ...formData, cra_area_hectares: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Data de Emissão *</Label>
                <Input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Órgão Emissor</Label>
                <Input
                  value={formData.issuing_body}
                  onChange={(e) => setFormData({ ...formData, issuing_body: e.target.value })}
                  placeholder="Ex: INEA"
                  className="mt-1"
                />
              </div>
            </div>

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
                disabled={createTitleMutation.isPending}
              >
                {createTitleMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}