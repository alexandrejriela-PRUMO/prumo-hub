import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ChevronLeft, Plus } from 'lucide-react';
import ChecklistView from '@/components/checklist/ChecklistView';
import { useSearchParams } from 'react-router-dom';

export default function LicenseChecklist() {
  const [searchParams] = useSearchParams();
  const licenseId = searchParams.get('license_id');
  const [user, setUser] = useState(null);
  const [showCreateChecklist, setShowCreateChecklist] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
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

  const { data: license } = useQuery({
    queryKey: ['license', licenseId],
    queryFn: () => base44.entities.License.get(licenseId),
    enabled: !!licenseId
  });

  const { data: checklist } = useQuery({
    queryKey: ['checklist', licenseId],
    queryFn: async () => {
      const result = await base44.entities.ProjectChecklist.filter({
        entity_type: 'License',
        entity_id: licenseId
      });
      return result?.[0] || null;
    },
    enabled: !!licenseId
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['checklistTemplates', user?.email],
    queryFn: () => base44.entities.ChecklistTemplate.filter({ consultor_email: user?.email }),
    enabled: !!user?.email && showCreateChecklist
  });

  const createChecklistMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ProjectChecklist.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', licenseId] });
      toast.success('Checklist criado com sucesso!');
      setShowCreateChecklist(false);
      setSelectedTemplate(null);
    },
    onError: (error) => {
      toast.error('Erro ao criar checklist: ' + error.message);
    }
  });

  const handleCreateChecklist = async (useTemplate = null) => {
    const checklistData = {
      entity_type: 'License',
      entity_id: licenseId,
      consultor_email: user?.email,
      checklist_title: license?.license_type || 'Checklist de Licença',
      description: `Workflow para ${license?.license_type}`,
      template_id: useTemplate?.id || null,
      items: useTemplate?.steps?.map((step, index) => ({
        id: Date.now().toString() + index,
        title: step.title,
        description: step.description,
        order: step.order || index,
        status: 'Pendente',
        priority: step.default_priority || 'Média',
        responsible_email: user?.email,
        responsible_name: user?.full_name,
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + (step.estimated_days || 5) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        files: [],
        activity_history: []
      })) || [],
      overall_progress: 0,
      completed_tasks: 0,
      pending_tasks: 0,
      delayed_tasks: 0,
      status: 'Em Progresso',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    createChecklistMutation.mutate(checklistData);
  };

  if (!user || !license) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50/30 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            size="sm"
            className="gap-2 mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Button>
          <h1 className="text-3xl font-bold text-emerald-900 mb-2">
            Checklist - {license.license_type}
          </h1>
          <p className="text-gray-600">{license.activity_description}</p>
        </div>

        {!checklist ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-600 mb-4">Nenhum checklist criado ainda para esta licença</p>
              <Button
                onClick={() => setShowCreateChecklist(!showCreateChecklist)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Criar Checklist
              </Button>

              {showCreateChecklist && (
                <div className="mt-6 space-y-3">
                  <Button
                    onClick={() => handleCreateChecklist(null)}
                    variant="outline"
                    className="w-full"
                  >
                    Começar do Zero
                  </Button>
                  {templates.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Ou usar um modelo:</p>
                      {templates.map(template => (
                        <Button
                          key={template.id}
                          onClick={() => handleCreateChecklist(template)}
                          variant="outline"
                          className="w-full justify-start text-left mb-2"
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{template.template_name}</span>
                            <span className="text-xs text-gray-500">{template.steps?.length || 0} etapas</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <ChecklistView checklist={checklist} isEditable={true} />
        )}
      </div>
    </div>
  );
}