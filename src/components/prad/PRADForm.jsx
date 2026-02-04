import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function PRADForm({ prad, propertyId, userEmail, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    project_name: prad?.project_name || '',
    degradation_type: prad?.area_identification?.degradation_type || '',
    total_area_ha: prad?.area_identification?.total_area_ha || '',
    plot_name: prad?.area_identification?.plot_name || '',
    coordinates: prad?.area_identification?.coordinates || '',
    diagnosis_date: prad?.area_identification?.diagnosis_date || '',
    main_objective: prad?.recovery_objective?.main_objective || '',
    impact_level: prad?.environmental_diagnosis?.impact_level || '',
    status: prad?.status || 'Planejamento',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PRAD.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['prad']);
      toast.success('PRAD criado com sucesso!');
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PRAD.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['prad']);
      toast.success('PRAD atualizado!');
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      property_id: propertyId,
      owner_email: userEmail,
      project_name: formData.project_name,
      area_identification: {
        degradation_type: formData.degradation_type,
        total_area_ha: parseFloat(formData.total_area_ha) || 0,
        plot_name: formData.plot_name,
        coordinates: formData.coordinates,
        diagnosis_date: formData.diagnosis_date,
      },
      recovery_objective: {
        main_objective: formData.main_objective,
      },
      environmental_diagnosis: {
        impact_level: formData.impact_level,
      },
      status: formData.status,
    };

    if (prad) {
      updateMutation.mutate({ id: prad.id, data: { ...prad, ...data } });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Nome do Projeto *</Label>
          <Input
            value={formData.project_name}
            onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
            placeholder="PRAD - Área APP Norte"
            required
          />
        </div>

        <div>
          <Label>Tipo de Degradação *</Label>
          <Select
            value={formData.degradation_type}
            onValueChange={(value) => setFormData({ ...formData, degradation_type: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Erosão">Erosão</SelectItem>
              <SelectItem value="Supressão">Supressão</SelectItem>
              <SelectItem value="Compactação">Compactação</SelectItem>
              <SelectItem value="APP">APP</SelectItem>
              <SelectItem value="Passivo Legal">Passivo Legal</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Área Total Degradada (ha) *</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.total_area_ha}
            onChange={(e) => setFormData({ ...formData, total_area_ha: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <Label>Talhão / Gleba</Label>
          <Input
            value={formData.plot_name}
            onChange={(e) => setFormData({ ...formData, plot_name: e.target.value })}
            placeholder="Talhão 3"
          />
        </div>

        <div>
          <Label>Data do Diagnóstico</Label>
          <Input
            type="date"
            value={formData.diagnosis_date}
            onChange={(e) => setFormData({ ...formData, diagnosis_date: e.target.value })}
          />
        </div>

        <div>
          <Label>Objetivo da Recuperação *</Label>
          <Select
            value={formData.main_objective}
            onValueChange={(value) => setFormData({ ...formData, main_objective: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Regularização Ambiental">Regularização Ambiental</SelectItem>
              <SelectItem value="Atendimento a Auto de Infração">Atendimento a Auto de Infração</SelectItem>
              <SelectItem value="Condicionante de Licença">Condicionante de Licença</SelectItem>
              <SelectItem value="Recuperação Voluntária">Recuperação Voluntária</SelectItem>
              <SelectItem value="Compensação Ambiental">Compensação Ambiental</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Grau de Impacto</Label>
          <Select
            value={formData.impact_level}
            onValueChange={(value) => setFormData({ ...formData, impact_level: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Baixo">Baixo</SelectItem>
              <SelectItem value="Médio">Médio</SelectItem>
              <SelectItem value="Alto">Alto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label>Coordenadas Georreferenciadas</Label>
          <Input
            value={formData.coordinates}
            onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
            placeholder="-23.5505,-46.6333"
          />
        </div>

        <div>
          <Label>Status do Projeto</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Planejamento">Planejamento</SelectItem>
              <SelectItem value="Em Execução">Em Execução</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
              <SelectItem value="Suspenso">Suspenso</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-green-600 hover:bg-green-700"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {prad ? 'Atualizar' : 'Criar'} PRAD
        </Button>
      </div>
    </form>
  );
}