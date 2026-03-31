import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Copy } from 'lucide-react';

export default function ChecklistTemplates() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('list'); // list, create, edit
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    template_name: '',
    description: '',
    category: 'Licenciamento Ambiental',
    steps: []
  });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Erro ao carregar usuário');
      }
    };
    loadUser();
  }, []);

  const { data: templates = [] } = useQuery({
    queryKey: ['checklistTemplates', user?.email],
    queryFn: () => base44.entities.ChecklistTemplate.filter({ consultor_email: user?.email }, '-created_date'),
    enabled: !!user?.email
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.ChecklistTemplate.create({
        ...data,
        consultor_email: user?.email,
        steps: data.steps || []
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      toast.success('Template criado com sucesso!');
      resetForm();
      setStep('list');
    },
    onError: (error) => {
      toast.error('Erro ao criar template: ' + error.message);
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.ChecklistTemplate.update(selectedTemplate.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      toast.success('Template atualizado!');
      resetForm();
      setStep('list');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId) => base44.entities.ChecklistTemplate.delete(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      toast.success('Template deletado');
    },
    onError: (error) => {
      toast.error('Erro ao deletar: ' + error.message);
    }
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const newTemplate = { ...template };
      delete newTemplate.id;
      delete newTemplate.created_date;
      delete newTemplate.updated_date;
      newTemplate.template_name = `${template.template_name} (Cópia)`;
      return base44.entities.ChecklistTemplate.create(newTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      toast.success('Template duplicado!');
    },
    onError: (error) => {
      toast.error('Erro ao duplicar: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      template_name: '',
      description: '',
      category: 'Licenciamento Ambiental',
      steps: []
    });
    setSelectedTemplate(null);
  };

  const handleAddStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          id: Date.now().toString(),
          title: 'Nova Etapa',
          description: '',
          order: prev.steps.length,
          default_priority: 'Média',
          estimated_days: 5
        }
      ]
    }));
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData({
      template_name: template.template_name,
      description: template.description,
      category: template.category,
      steps: template.steps || []
    });
    setStep('edit');
  };

  const handleSaveTemplate = () => {
    if (!formData.template_name.trim()) {
      toast.error('Nome do template é obrigatório');
      return;
    }

    if (selectedTemplate) {
      updateTemplateMutation.mutate(formData);
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50/30 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {step === 'list' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-emerald-900 mb-2">Modelos de Checklist</h1>
                <p className="text-gray-600">Crie e reutilize templates para seus projetos</p>
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setStep('create');
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Novo Modelo
              </Button>
            </div>

            {templates.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-600 mb-4">Nenhum modelo criado ainda</p>
                  <Button
                    onClick={() => {
                      resetForm();
                      setStep('create');
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" /> Criar Primeiro Modelo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {templates.map(template => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">{template.template_name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">
                              {template.category}
                            </span>
                            <span className="text-gray-500">{template.steps?.length || 0} etapas</span>
                            <span className="text-gray-500">Usado {template.usage_count || 0}x</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => duplicateTemplateMutation.mutate(template)}
                            className="gap-1"
                          >
                            <Copy className="w-4 h-4" /> Duplicar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTemplate(template)}
                            className="gap-1"
                          >
                            <Edit2 className="w-4 h-4" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            className="gap-1"
                          >
                            <Trash2 className="w-4 h-4" /> Deletar
                          </Button>
                        </div>
                      </div>
                      {template.steps?.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Etapas:</p>
                          <div className="flex flex-wrap gap-2">
                            {template.steps.map(step => (
                              <span
                                key={step.id}
                                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                              >
                                {step.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {(step === 'create' || step === 'edit') && (
          <Card>
            <CardHeader>
              <CardTitle>{step === 'create' ? 'Novo Modelo de Checklist' : 'Editar Modelo'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Nome do Modelo *</label>
                  <input
                    type="text"
                    value={formData.template_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, template_name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ex: Licenciamento Ambiental"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option>Licenciamento Ambiental</option>
                    <option>PRAD</option>
                    <option>Regularização Ambiental</option>
                    <option>Monitoramento</option>
                    <option>Georreferenciamento</option>
                    <option>Consultoria Técnica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg h-20"
                  placeholder="Descreva este modelo..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Etapas</h3>
                  <Button
                    onClick={handleAddStep}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Etapa
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.steps.map((step, index) => (
                    <Card key={step.id} className="p-4">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const updated = [...formData.steps];
                            updated[index].title = e.target.value;
                            setFormData(prev => ({ ...prev, steps: updated }));
                          }}
                          className="px-2 py-1 border rounded text-sm"
                          placeholder="Título da etapa"
                        />
                        <input
                          type="number"
                          value={step.estimated_days || ''}
                          onChange={(e) => {
                            const updated = [...formData.steps];
                            updated[index].estimated_days = parseInt(e.target.value) || 0;
                            setFormData(prev => ({ ...prev, steps: updated }));
                          }}
                          className="px-2 py-1 border rounded text-sm"
                          placeholder="Dias estimados"
                        />
                      </div>
                      <textarea
                        value={step.description || ''}
                        onChange={(e) => {
                          const updated = [...formData.steps];
                          updated[index].description = e.target.value;
                          setFormData(prev => ({ ...prev, steps: updated }));
                        }}
                        className="w-full px-2 py-1 border rounded text-sm mt-2 h-12"
                        placeholder="Descrição"
                      />
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setStep('list');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Salvar Modelo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}