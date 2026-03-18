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
import { Plus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CRACompensationSection({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    compensation_number: '',
    property_id: '',
    car_number: '',
    cra_title_id: '',
    cra_number: '',
    compensated_area_hectares: '',
    compensation_date: '',
    status: 'Protocolada',
    environmental_agency: '',
    protocol_number: ''
  });
  const queryClient = useQueryClient();

  const { data: craTitles = [] } = useQuery({
    queryKey: ['cra-titles', user?.email],
    queryFn: () => base44.entities.CRATitle.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: compensations = [] } = useQuery({
    queryKey: ['cra-compensations', user?.email],
    queryFn: () => base44.entities.CRACompensation.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  const createCompensationMutation = useMutation({
    mutationFn: (data) => base44.entities.CRACompensation.create({
      ...data,
      owner_email: user.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cra-compensations'] });
      setShowForm(false);
      setFormData({
        compensation_number: '',
        property_id: '',
        car_number: '',
        cra_title_id: '',
        cra_number: '',
        compensated_area_hectares: '',
        compensation_date: '',
        status: 'Protocolada',
        environmental_agency: '',
        protocol_number: ''
      });
      toast.success('Compensação registrada com sucesso!');
      console.log('[CRA] Compensação criada com sucesso');
    },
    onError: (error) => {
      console.error('[CRA] Erro ao criar compensação:', error);
    }
  });

  const handleSubmit = () => {
    // 🟡 MÉDIO #10: Toast ao invés de alert()
    const errors = [];
    if (!formData.compensation_number) errors.push('Número da compensação');
    if (!formData.car_number) errors.push('CAR compensado');
    if (!formData.cra_title_id) errors.push('CRA utilizada');

    if (errors.length > 0) {
      toast.error(`Campos obrigatórios: ${errors.join(', ')}`);
      return;
    }

    // 🟡 MÉDIO #12: Validação de duplicatas
    const exists = compensations.some(c => c.compensation_number === formData.compensation_number);
    if (exists) {
      toast.error(`Compensação "${formData.compensation_number}" já existe`);
      console.warn('[CRA] Tentativa de duplicação:', formData.compensation_number);
      return;
    }

    console.log('[CRA] Salvando compensação:', formData.compensation_number);
    createCompensationMutation.mutate(formData);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Protocolada': 'bg-yellow-100 text-yellow-800',
      'Aprovada': 'bg-blue-100 text-blue-800',
      'Registrada': 'bg-green-100 text-green-800'
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
          Registrar Compensação
        </Button>
      </div>

      {compensations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">Nenhuma compensação registrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {compensations.map(compensation => (
            <Card key={compensation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Compensação {compensation.compensation_number}</h3>
                    <Badge className={getStatusColor(compensation.status)}>{compensation.status}</Badge>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">CAR Compensado:</span>
                    <p className="font-medium">{compensation.car_number}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">CRA Utilizada:</span>
                    <p className="font-medium">{compensation.cra_number}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Área Compensada:</span>
                    <p className="font-medium text-emerald-700">{compensation.compensated_area_hectares} ha</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Data:</span>
                    <p className="font-medium">{new Date(compensation.compensation_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  {compensation.protocol_number && (
                    <div>
                      <span className="text-gray-600">Protocolo:</span>
                      <p className="font-medium">{compensation.protocol_number}</p>
                    </div>
                  )}
                  {compensation.environmental_agency && (
                    <div>
                      <span className="text-gray-600">Órgão Ambiental:</span>
                      <p className="font-medium">{compensation.environmental_agency}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl sm:max-w-lg md:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nova Compensação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Número da Compensação *</Label>
              <Input
                value={formData.compensation_number}
                onChange={(e) => setFormData({ ...formData, compensation_number: e.target.value })}
                placeholder="Ex: COMP-2024-001"
                className="mt-1"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">CAR Compensado *</Label>
                <Input
                  value={formData.car_number}
                  onChange={(e) => setFormData({ ...formData, car_number: e.target.value })}
                  placeholder="CAR"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">CRA Utilizada *</Label>
                <Select value={formData.cra_title_id} onValueChange={(value) => {
                  const cra = craTitles.find(c => c.id === value);
                  setFormData({
                    ...formData,
                    cra_title_id: value,
                    cra_number: cra?.cra_number || ''
                  });
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione a CRA" />
                  </SelectTrigger>
                  <SelectContent>
                    {craTitles.map(cra => (
                      <SelectItem key={cra.id} value={cra.id}>
                        CRA {cra.cra_number} - {cra.cra_area_hectares}ha
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Área Compensada (ha) *</Label>
                <Input
                  type="number"
                  value={formData.compensated_area_hectares}
                  onChange={(e) => setFormData({ ...formData, compensated_area_hectares: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Data da Compensação *</Label>
                <Input
                  type="date"
                  value={formData.compensation_date}
                  onChange={(e) => setFormData({ ...formData, compensation_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Órgão Ambiental</Label>
                <Input
                  value={formData.environmental_agency}
                  onChange={(e) => setFormData({ ...formData, environmental_agency: e.target.value })}
                  placeholder="Ex: INEA"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Número do Protocolo</Label>
                <Input
                  value={formData.protocol_number}
                  onChange={(e) => setFormData({ ...formData, protocol_number: e.target.value })}
                  placeholder="Número do protocolo"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Protocolada">Protocolada</SelectItem>
                  <SelectItem value="Aprovada">Aprovada</SelectItem>
                  <SelectItem value="Registrada">Registrada</SelectItem>
                </SelectContent>
              </Select>
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
                disabled={createCompensationMutation.isPending}
              >
                {createCompensationMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}