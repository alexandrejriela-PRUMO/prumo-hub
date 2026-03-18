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
import { Plus, Award, ArrowRight } from 'lucide-react';

export default function CRATitleSection({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [formData, setFormData] = useState({
    cra_number: '',
    origin_id: '',
    property_id: '',
    cra_area_hectares: '',
    biome: '',
    state: '',
    municipality: '',
    issue_date: '',
    issuing_body: ''
  });
  const queryClient = useQueryClient();

  const { data: origins = [], refetch: refetchOrigins } = useQuery({
    queryKey: ['cra-origins', user?.email],
    queryFn: () => base44.entities.CRAOrigin.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0
  });

  const { data: titles = [], refetch: refetchTitles } = useQuery({
    queryKey: ['cra-titles', user?.email],
    queryFn: () => base44.entities.CRATitle.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0
  });

  const createTitleMutation = useMutation({
    mutationFn: (data) => base44.entities.CRATitle.create({
      ...data,
      owner_email: user.email,
      available_area_hectares: parseFloat(data.cra_area_hectares),
      current_holder_email: user.email,
      transaction_history: [],
      status: 'Disponível'
    }),
    onSuccess: async () => {
      await refetchTitles();
      setShowForm(false);
      setSelectedOrigin(null);
      setFormData({
        cra_number: '',
        origin_id: '',
        property_id: '',
        cra_area_hectares: '',
        biome: '',
        state: '',
        municipality: '',
        issue_date: '',
        issuing_body: ''
      });
    }
  });

  const handleOriginChange = (originId) => {
    const origin = origins.find(o => o.id === originId);
    setSelectedOrigin(origin);
    setFormData({
      ...formData,
      origin_id: originId,
      property_id: origin?.property_id || '',
      biome: origin?.biome || '',
      state: origin?.state || '',
      municipality: origin?.municipality || ''
    });
  };

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

      {origins.length === 0 ? (
        <Card className="border-dashed border-amber-200 bg-amber-50">
          <CardContent className="py-12 text-center">
            <Award className="w-12 h-12 mx-auto text-amber-300 mb-4" />
            <p className="text-amber-900 font-medium">Nenhuma origem de CRA cadastrada</p>
            <p className="text-xs text-amber-700 mt-1">Cadastre uma origem primeiro na aba "Origem das CRA"</p>
          </CardContent>
        </Card>
      ) : titles.length === 0 ? (
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
            const usedArea = title.transaction_history?.reduce((sum, t) => sum + (t.area_hectares || 0), 0) || 0;
            const availableArea = title.available_area_hectares || (title.cra_area_hectares - usedArea);
            
            return (
              <Card key={title.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-gray-900">CRA {title.cra_number}</h3>
                        <Badge className={getStatusColor(title.status)}>{title.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">ID: {title.id}</p>
                    </div>
                  </div>

                  {/* Fluxo de Origem → Título → Transações */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-3">Cadeia de Vinculação:</p>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="bg-white border border-emerald-200 rounded px-3 py-2 flex-1">
                        <p className="text-xs text-gray-600">Propriedade Origem (Vendedora)</p>
                        <p className="font-semibold text-emerald-700">{origin?.car_number || 'N/A'}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="bg-white border border-blue-200 rounded px-3 py-2 flex-1">
                        <p className="text-xs text-gray-600">Título CRA</p>
                        <p className="font-semibold text-blue-700">{title.cra_area_hectares} ha</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="bg-white border border-purple-200 rounded px-3 py-2 flex-1">
                        <p className="text-xs text-gray-600">Proprietário Atual</p>
                        <p className="font-semibold text-purple-700 truncate text-xs">{title.current_holder_email || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes */}
                  <div className="grid md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-600">Área Total:</span>
                      <p className="font-medium">{title.cra_area_hectares} ha</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Área Utilizada:</span>
                      <p className="font-medium text-orange-600">{usedArea.toFixed(2)} ha</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Área Disponível:</span>
                      <p className="font-medium text-emerald-600">{availableArea.toFixed(2)} ha</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Transações:</span>
                      <p className="font-medium">{title.transaction_history?.length || 0}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 text-sm border-t pt-4">
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
            <DialogTitle>Emitir Novo Título de CRA</DialogTitle>
            <p className="text-xs text-gray-600 mt-2">Selecione a propriedade de origem que gerará a CRA</p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Propriedade de Origem (Vendedora) *</Label>
              <Select value={formData.origin_id} onValueChange={handleOriginChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a propriedade origem" />
                </SelectTrigger>
                <SelectContent>
                  {origins.map(origin => (
                    <SelectItem key={origin.id} value={origin.id}>
                      {origin.car_number} - Potencial: {origin.potential_cra_area_hectares}ha
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOrigin && (
                <div className="mt-2 p-3 bg-blue-50 rounded text-xs text-blue-900 border border-blue-200">
                  <p><strong>Propriedade:</strong> {selectedOrigin.car_number}</p>
                  <p><strong>Área Potencial CRA:</strong> {selectedOrigin.potential_cra_area_hectares} ha</p>
                  <p><strong>Bioma:</strong> {selectedOrigin.biome}</p>
                </div>
              )}
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
                  step="0.01"
                  value={formData.cra_area_hectares}
                  onChange={(e) => setFormData({ ...formData, cra_area_hectares: e.target.value })}
                  placeholder="Digite a área"
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
                onClick={() => {
                  setShowForm(false);
                  setSelectedOrigin(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={createTitleMutation.isPending}
              >
                {createTitleMutation.isPending ? 'Salvando...' : 'Emitir CRA'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}