import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import PRADSmartUpload from './PRADSmartUpload';

export default function PRADForm({ prad, propertyId, userEmail, onClose }) {
  const queryClient = useQueryClient();
  const [showSmartUpload, setShowSmartUpload] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
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
    ai_analysis: prad?.ai_analysis || '',
  });

  const handleSmartUploadData = (extracted) => {
    setFormData(prev => {
      const merged = { ...prev };
      Object.entries(extracted).forEach(([key, value]) => {
        if (key.startsWith('_')) return;
        if (value !== null && value !== undefined && value !== '' && (merged[key] === null || merged[key] === undefined || merged[key] === '')) {
          merged[key] = value;
        }
      });
      // ai_analysis é sempre gerado pela IA — atualiza mesmo se já houver um valor anterior da própria IA
      if (extracted.ai_analysis) {
        merged.ai_analysis = extracted.ai_analysis;
      }
      return merged;
    });
    setAiFilled(true);
    setShowSmartUpload(false);
  };

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
      ai_analysis: formData.ai_analysis,
    };

    if (prad) {
      updateMutation.mutate({ id: prad.id, data: { ...prad, ...data } });
    } else {
      createMutation.mutate(data);
    }
  };

  if (showSmartUpload) {
    return (
      <PRADSmartUpload
        onDataExtracted={handleSmartUploadData}
        onClose={() => setShowSmartUpload(false)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Botão de Smart Upload com IA */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
          onClick={() => setShowSmartUpload(true)}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Preencher com IA (Smart Upload)
        </Button>
      </div>

      {aiFilled && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Dados extraídos pela IA — revise os campos abaixo antes de salvar</span>
        </div>
      )}

      {/* AI Analysis banner */}
      {formData.ai_analysis && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <p className="text-xs font-semibold text-purple-800">Análise Técnica IA</p>
          </div>
          <p className="text-xs text-purple-900 leading-relaxed">{formData.ai_analysis}</p>
        </div>
      )}

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