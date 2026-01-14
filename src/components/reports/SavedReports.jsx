import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Trash2, Play, Edit, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function SavedReports({ user, onLoadReport, onEditReport }) {
  const queryClient = useQueryClient();

  const { data: savedReports = [], isLoading } = useQuery({
    queryKey: ['savedReports', user?.email],
    queryFn: () => base44.entities.SavedReport.filter(
      { user_email: user.email },
      '-last_used'
    ),
    enabled: !!user?.email
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedReports'] });
      toast.success('Relatório excluído com sucesso');
    }
  });

  const updateLastUsedMutation = useMutation({
    mutationFn: ({ id, config }) => base44.entities.SavedReport.update(id, {
      last_used: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedReports'] });
    }
  });

  const handleLoadReport = (report) => {
    updateLastUsedMutation.mutate({ id: report.id, config: report.config });
    onLoadReport(report.config);
    toast.success(`Relatório "${report.report_name}" carregado`);
  };

  const handleDelete = (report) => {
    if (confirm(`Tem certeza que deseja excluir o relatório "${report.report_name}"?`)) {
      deleteReportMutation.mutate(report.id);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (savedReports.length === 0) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nenhum Relatório Salvo
        </h3>
        <p className="text-gray-600 text-sm">
          Configure e salve relatórios personalizados para reutilizá-los facilmente
        </p>
      </div>
    );
  }

  const dataSourceLabels = {
    properties: 'Propriedades',
    licenses: 'Licenças',
    alerts: 'Alertas',
    documents: 'Documentos',
    processes: 'Processos',
    invoices: 'Faturas'
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">Relatórios Salvos</h2>
        <p className="text-sm text-gray-600 mt-1">
          {savedReports.length} {savedReports.length === 1 ? 'relatório salvo' : 'relatórios salvos'}
        </p>
      </div>
      <div className="divide-y">
        {savedReports.map((report) => (
          <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{report.report_name}</h3>
                {report.description && (
                  <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                )}
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {report.config.dataSources?.map((source) => (
                    <span
                      key={source}
                      className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium"
                    >
                      {dataSourceLabels[source] || source}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  {report.last_used && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Último uso: {moment(report.last_used).fromNow()}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Criado em: {moment(report.created_date).format('DD/MM/YYYY')}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleLoadReport(report)}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Carregar e gerar"
                >
                  <Play className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onEditReport(report)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar configurações"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(report)}
                  disabled={deleteReportMutation.isPending}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Excluir relatório"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}