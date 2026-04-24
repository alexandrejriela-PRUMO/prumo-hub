import React from 'react';

// Hooks already in React, using React.useState and React.useMemo
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, Trash2, Eye, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function ErrorLogsAdmin() {
  const [selectedError, setSelectedError] = React.useState(null);
  const [filterType, setFilterType] = React.useState('all');
  const [filterSeverity, setFilterSeverity] = React.useState('all');
  const [filterResolved, setFilterResolved] = React.useState('unresolved');
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: errors = [], refetch, isLoading } = useQuery({
    queryKey: ['error-logs'],
    queryFn: () => base44.entities.ErrorLog.list('-last_occurrence', 1000)
  });

  const { data: stats } = useQuery({
    queryKey: ['error-stats'],
    queryFn: async () => {
      const all = errors || [];
      return {
        total: all.length,
        unresolved: all.filter(e => !e?.resolved).length,
        critical: all.filter(e => e?.severity === 'critical').length,
        byType: {
          runtime: all.filter(e => e?.error_type === 'runtime').length,
          network: all.filter(e => e?.error_type === 'network').length,
          database: all.filter(e => e?.error_type === 'database').length,
          auth: all.filter(e => e?.error_type === 'auth').length,
          validation: all.filter(e => e?.error_type === 'validation').length
        }
      };
    }
  });

  const filteredErrors = React.useMemo(() => {
    return (errors || []).filter(e => {
      if (filterType !== 'all' && e?.error_type !== filterType) return false;
      if (filterSeverity !== 'all' && e?.severity !== filterSeverity) return false;
      if (filterResolved === 'resolved' && !e?.resolved) return false;
      if (filterResolved === 'unresolved' && e?.resolved) return false;
      if (searchQuery && !e?.error_message?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [errors, filterType, filterSeverity, filterResolved, searchQuery]);

  const handleResolve = async (errorId) => {
    try {
      await base44.entities.ErrorLog.update(errorId, { resolved: true });
      refetch();
      toast.success('Erro marcado como resolvido');
    } catch (err) {
      toast.error('Erro ao resolver: ' + err?.message);
    }
  };

  const handleDelete = async (errorId) => {
    if (window.confirm('Tem certeza que deseja deletar este erro?')) {
      try {
        await base44.entities.ErrorLog.delete(errorId);
        refetch();
        setSelectedError(null);
        toast.success('Erro deletado');
      } catch (err) {
        toast.error('Erro ao deletar: ' + err?.message);
      }
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      runtime: 'bg-red-50 border-red-200',
      network: 'bg-orange-50 border-orange-200',
      database: 'bg-purple-50 border-purple-200',
      auth: 'bg-yellow-50 border-yellow-200',
      validation: 'bg-blue-50 border-blue-200',
      unknown: 'bg-gray-50 border-gray-200'
    };
    return colors[type] || colors.unknown;
  };

  if (!stats) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-8 h-8 text-emerald-600" />
        <h1 className="text-3xl font-bold text-gray-900">Logs de Erros</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 text-sm">Total</p>
            <p className="text-3xl font-bold text-gray-900">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 text-sm font-medium">Críticos</p>
            <p className="text-3xl font-bold text-red-600">{stats?.critical || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="pt-6 text-center">
            <p className="text-orange-600 text-sm font-medium">Não Resolvidos</p>
            <p className="text-3xl font-bold text-orange-600">{stats?.unresolved || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 text-sm">Runtime</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.byType?.runtime || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 text-sm">Network</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.byType?.network || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar erro..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full md:w-64"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="runtime">Runtime</SelectItem>
            <SelectItem value="network">Network</SelectItem>
            <SelectItem value="database">Database</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="validation">Validation</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Severidades</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="high">Alto</SelectItem>
            <SelectItem value="medium">Médio</SelectItem>
            <SelectItem value="low">Baixo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterResolved} onValueChange={setFilterResolved}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unresolved">Não Resolvidos</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredErrors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum erro encontrado</div>
        ) : (
          filteredErrors.map(error => (
            <Card key={error?.id} className={`border-l-4 ${getTypeColor(error?.error_type)}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <p className="font-bold text-gray-900 flex-1">{error?.error_message}</p>
                      <Badge className={getSeverityColor(error?.severity)}>
                        {error?.severity?.toUpperCase()}
                      </Badge>
                      {error?.resolved && (
                        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Resolvido
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
                      <span>Tipo: {error?.error_type}</span>
                      <span>•</span>
                      <span>Ocorrências: {error?.frequency || 1}</span>
                      <span>•</span>
                      <span>Última: {format(parseISO(error?.last_occurrence), 'dd/MM HH:mm')}</span>
                      {error?.user_email && (
                        <>
                          <span>•</span>
                          <span>Usuário: {error?.user_email}</span>
                        </>
                      )}
                    </div>
                    {error?.page_url && (
                      <p className="text-xs text-gray-500 truncate">URL: {error?.page_url}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedError(error)}
                      className="gap-1"
                    >
                      <Eye className="w-4 h-4" /> Ver
                    </Button>
                    {!error?.resolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(error?.id)}
                        className="gap-1 border-green-200 text-green-700"
                      >
                        <CheckCircle className="w-4 h-4" /> Resolver
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(error?.id)}
                      className="gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedError && (
        <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Erro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Mensagem</p>
                <p className="text-sm text-gray-900 mt-1">{selectedError?.error_message}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Stack Trace</p>
                <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto mt-1">
                  {selectedError?.error_stack}
                </pre>
              </div>
              {selectedError?.context_data && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Contexto</p>
                  <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto mt-1">
                    {JSON.stringify(selectedError.context_data, null, 2)}
                  </pre>
                </div>
              )}
              {selectedError?.resolution_notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Notas de Resolução</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedError?.resolution_notes}</p>
                </div>
              )}
              <div className="flex gap-2">
                {!selectedError?.resolved && (
                  <Button
                    onClick={() => {
                      handleResolve(selectedError?.id);
                      setSelectedError(null);
                    }}
                    className="gap-1"
                  >
                    <CheckCircle className="w-4 h-4" /> Marcar como Resolvido
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDelete(selectedError?.id);
                  }}
                  className="gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Deletar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}