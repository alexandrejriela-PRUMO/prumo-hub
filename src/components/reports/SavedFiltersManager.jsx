import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Save, Trash2, Download, Star, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SavedFiltersManager({ user, currentFilters, onLoadFilter, isOpen, onClose }) {
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  const queryClient = useQueryClient();

  const { data: savedFilters = [] } = useQuery({
    queryKey: ['savedAlertFilters', user?.email],
    queryFn: () => base44.entities.SavedAlertFilter.filter({ user_email: user?.email }, '-created_date'),
    enabled: !!user?.email && isOpen
  });

  const saveFilterMutation = useMutation({
    mutationFn: async (filterData) => {
      return base44.entities.SavedAlertFilter.create({
        user_email: user.email,
        filter_name: filterName,
        description: filterDescription,
        alert_type: currentFilters.alertType,
        severity: currentFilters.severity,
        date_start: currentFilters.dateRange.start,
        date_end: currentFilters.dateRange.end,
        property_id: currentFilters.propertyId,
        min_area: currentFilters.minArea,
        ...filterData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedAlertFilters'] });
      toast.success('Filtro salvo com sucesso!');
      setShowSaveForm(false);
      setFilterName('');
      setFilterDescription('');
    }
  });

  const deleteFilterMutation = useMutation({
    mutationFn: (filterId) => base44.entities.SavedAlertFilter.delete(filterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedAlertFilters'] });
      toast.success('Filtro removido!');
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (filterId) => {
      // Remove default from all others
      const otherDefaults = savedFilters.filter(f => f.is_default && f.id !== filterId);
      await Promise.all(
        otherDefaults.map(f => base44.entities.SavedAlertFilter.update(f.id, { is_default: false }))
      );
      // Set new default
      return base44.entities.SavedAlertFilter.update(filterId, { is_default: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedAlertFilters'] });
      toast.success('Filtro padrão atualizado!');
    }
  });

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast.error('Nome do filtro é obrigatório');
      return;
    }
    saveFilterMutation.mutate({});
  };

  const handleLoadFilter = (filter) => {
    onLoadFilter({
      alertType: filter.alert_type,
      severity: filter.severity,
      dateRange: {
        start: filter.date_start,
        end: filter.date_end
      },
      propertyId: filter.property_id,
      minArea: filter.min_area
    });
    onClose();
    toast.success(`Filtro "${filter.filter_name}" carregado!`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Filtros Salvos
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Save New Filter Form */}
          {showSaveForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Salvar Novo Filtro</h3>
              <Input
                placeholder="Nome do filtro"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Descrição (opcional)"
                value={filterDescription}
                onChange={(e) => setFilterDescription(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveFilter}
                  disabled={saveFilterMutation.isPending}
                >
                  Salvar Filtro
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowSaveForm(false);
                    setFilterName('');
                    setFilterDescription('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {!showSaveForm && (
            <Button
              onClick={() => setShowSaveForm(true)}
              variant="outline"
              className="w-full gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Filtro Atual
            </Button>
          )}

          {/* Saved Filters List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm">Seus Filtros Salvos</h3>
            {savedFilters.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhum filtro salvo ainda
              </p>
            ) : (
              <div className="space-y-2">
                {savedFilters.map(filter => (
                  <div
                    key={filter.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">{filter.filter_name}</h4>
                          {filter.is_default && (
                            <Badge className="bg-amber-100 text-amber-800 text-xs">
                              Padrão
                            </Badge>
                          )}
                        </div>
                        {filter.description && (
                          <p className="text-sm text-gray-600">{filter.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!filter.is_default && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setDefaultMutation.mutate(filter.id)}
                            title="Definir como padrão"
                          >
                            <Star className="w-4 h-4 text-gray-400 hover:text-amber-500" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleLoadFilter(filter)}
                          title="Carregar filtro"
                        >
                          <Download className="w-4 h-4 text-emerald-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => deleteFilterMutation.mutate(filter.id)}
                          disabled={deleteFilterMutation.isPending}
                          title="Deletar filtro"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    {/* Filter Summary */}
                    <div className="text-xs text-gray-600 flex flex-wrap gap-2">
                      {filter.alert_type !== 'all' && (
                        <Badge variant="outline" className="text-xs">
                          {filter.alert_type === 'environmental' ? 'Ambiental' : 'Climático'}
                        </Badge>
                      )}
                      {filter.severity !== 'all' && (
                        <Badge variant="outline" className="text-xs">
                          {filter.severity}
                        </Badge>
                      )}
                      {filter.date_start && (
                        <Badge variant="outline" className="text-xs">
                          A partir de {new Date(filter.date_start).toLocaleDateString('pt-BR')}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}