import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  FileText, 
  Upload, 
  Search, 
  Filter, 
  Download,
  Eye,
  Trash2,
  FolderOpen,
  Calendar,
  GripVertical,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DocumentUpload from '../components/documents/DocumentUpload';
import DocumentViewer from '../components/documents/DocumentViewer';
import DocumentEditModal from '../components/documents/DocumentEditModal';
import ConsultorPropertySelector from '../components/consultor/ConsultorPropertySelector';
import { MODULES, MODULE_COLORS } from '../components/documents/documentConstants';

export default function DocumentsHub() {
  const [user, setUser] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [filters, setFilters] = useState({
    entityType: 'all',
    module: 'all',
    documentType: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const [orderedIds, setOrderedIds] = useState([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not logged in');
      }
    };
    loadUser();
  }, []);

  const { data: allDocuments = [], isLoading } = useQuery({
    queryKey: ['unifiedDocuments'],
    queryFn: () => base44.entities.UnifiedDocument.list('-upload_date', 1000),
    enabled: !!user
  });

  const isConsultor = user?.user_type === 'consultor';

  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => {
      if (user?.role === 'admin') {
        return base44.entities.Property.list('-created_date', 1000);
      }
      if (isConsultor) {
        return base44.entities.Property.filter({ consultor_email: user.email }, '-created_date', 100);
      }
      return base44.entities.Property.filter({ owner_email: user.email }, '-created_date', 100);
    },
    enabled: !!user?.email
  });

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId && !isConsultor) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId, isConsultor]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.UnifiedDocument.create({
      ...data,
      uploaded_by: user?.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedDocuments'] });
      setShowUpload(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UnifiedDocument.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedDocuments'] });
      setEditingDoc(null);
      toast.success('Documento atualizado com sucesso!');
    },
    onError: () => toast.error('Erro ao atualizar documento')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UnifiedDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedDocuments'] });
      toast.success('Documento removido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover documento');
    }
  });

  const handleUploadSuccess = (documentData) => {
    createMutation.mutate(documentData);
  };

  const handleSaveEdit = (id, data) => updateMutation.mutateAsync({ id, data });

  const handleDelete = (doc) => {
    if (window.confirm(`Tem certeza que deseja remover "${doc.document_name}"?`)) {
      deleteMutation.mutate(doc.id);
    }
  };

  // Sync order when documents load
  useEffect(() => {
    if (allDocuments.length > 0) {
      setOrderedIds(prev => {
        const allIds = allDocuments.map(d => d.id);
        const preserved = prev.filter(id => allIds.includes(id));
        const newIds = allIds.filter(id => !preserved.includes(id));
        return [...preserved, ...newIds];
      });
    }
  }, [allDocuments]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const newOrder = Array.from(orderedIds);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setOrderedIds(newOrder);
  };

  // Filter and search documents
  const filteredDocuments = allDocuments.filter(doc => {
    const searchMatch = !searchTerm || 
      doc.document_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase());

    const propertyMatch = !selectedPropertyId || doc.entity_id === selectedPropertyId || doc.property_id === selectedPropertyId;
    const entityMatch = filters.entityType === 'all' || doc.entity_type === filters.entityType;
    const moduleMatch = filters.module === 'all' || doc.module === filters.module;
    const typeMatch = filters.documentType === 'all' || doc.document_type === filters.documentType;
    
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;
    const docDate = doc.upload_date ? new Date(doc.upload_date) : null;
    
    const dateMatch = (!dateFrom || (docDate && docDate >= dateFrom)) &&
                      (!dateTo || (docDate && docDate <= dateTo));

    return searchMatch && propertyMatch && entityMatch && moduleMatch && typeMatch && dateMatch && doc.is_active !== false;
  }).sort((a, b) => {
    const ai = orderedIds.indexOf(a.id);
    const bi = orderedIds.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // Get unique document types
  const documentTypes = [...new Set(allDocuments.map(d => d.document_type).filter(Boolean))];

  // Statistics
  const stats = {
    total: filteredDocuments.length,
    byEntity: {},
    byType: {},
    recentUploads: filteredDocuments.slice(0, 5).length
  };

  filteredDocuments.forEach(doc => {
    stats.byEntity[doc.entity_type] = (stats.byEntity[doc.entity_type] || 0) + 1;
    stats.byType[doc.document_type] = (stats.byType[doc.document_type] || 0) + 1;
  });

  const entityTypeLabels = {
    'Property': 'Propriedades',
    'CarbonCredit': 'Créditos de Carbono',
    'PSAContract': 'PSA',
    'EnvironmentalEasement': 'Servidão Ambiental',
    'EnvironmentalAlert': 'Alertas',
    'License': 'Licenças',
    'General': 'Geral'
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Consultor Property Selector */}
      {isConsultor && (
        <ConsultorPropertySelector
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onSelect={setSelectedPropertyId}
          isLoading={propertiesLoading}
        />
      )}

      {/* Produtor Property Selector */}
      {!isConsultor && properties.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700 font-medium text-sm sm:text-base">Propriedade ou Empreendimento:</span>
          </div>
          <select
            value={selectedPropertyId || ''}
            onChange={(e) => setSelectedPropertyId(e.target.value || null)}
            className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          >
            <option value="">Todas as Propriedades e Empreendimentos</option>
            {properties.map(prop => (
              <option key={prop.id} value={prop.id}>{prop.property_name} - {prop.city || 'N/A'}</option>
            ))}
          </select>
        </div>
      )}

      {/* Bloqueio para consultor sem propriedade selecionada */}
      {isConsultor && !selectedPropertyId ? (
        <Card className="text-center py-16 border-dashed border-2 border-amber-200">
          <CardContent>
            <FileText className="w-16 h-16 mx-auto text-amber-300 mb-4" />
            <p className="text-gray-600">Selecione uma propriedade para visualizar os documentos.</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Conteúdo principal - oculto para consultor sem propriedade */}
      {(!isConsultor || selectedPropertyId) && (
      <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Central de Documentos
          </h1>
          <p className="text-gray-600 mt-1">Gerencie todos os documentos do sistema</p>
        </div>
        <Button
          onClick={() => setShowUpload(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <DocumentUpload
          entityType="General"
          entityId=""
          onSuccess={handleUploadSuccess}
          onCancel={() => setShowUpload(false)}
          allowedTypes={undefined}
          properties={properties}
        />
      )}

      {/* Viewer Modal */}
      {selectedDoc && (
        <DocumentViewer
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {/* Edit Modal */}
      {editingDoc && (
        <DocumentEditModal
          document={editingDoc}
          properties={properties}
          onSave={handleSaveEdit}
          onCancel={() => setEditingDoc(null)}
        />
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>

        {Object.entries(stats.byEntity).slice(0, 3).map(([type, count]) => (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{entityTypeLabels[type]}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar documentos por nome, tipo ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-700 text-sm">Filtros</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Módulo</label>
                <select
                  value={filters.module}
                  onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Todos os Módulos</option>
                  {MODULES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Tipo de Documento</label>
                <select
                  value={filters.documentType}
                  onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">Todos os Tipos</option>
                  {documentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Data Início</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 mb-1 block">Data Fim</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos ({filteredDocuments.length})</CardTitle>
          <CardDescription>Todos os documentos cadastrados no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Carregando documentos...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {searchTerm || filters.entityType !== 'all' || filters.documentType !== 'all'
                  ? 'Nenhum documento encontrado com os filtros aplicados'
                  : 'Nenhum documento cadastrado ainda'
                }
              </p>
              {!searchTerm && filters.entityType === 'all' && (
                <Button onClick={() => setShowUpload(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Primeiro Documento
                </Button>
              )}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="documents-list">
                {(provided) => (
                  <div className="space-y-3" ref={provided.innerRef} {...provided.droppableProps}>
                    {filteredDocuments.map((doc, index) => (
                      <Draggable key={doc.id} draggableId={doc.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center justify-between p-4 border rounded-lg transition-all ${snapshot.isDragging ? 'border-blue-400 bg-blue-50 shadow-lg' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'}`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div {...provided.dragHandleProps} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0">
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">{doc.document_name}</h3>
                                {doc.description && (
                                  <p className="text-sm text-gray-600 truncate">{doc.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {doc.module && (
                                    <Badge className="bg-emerald-100 text-emerald-800 text-xs border border-emerald-200">
                                      {doc.module}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {entityTypeLabels[doc.entity_type] || doc.entity_type}
                                  </Badge>
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                                    {doc.document_type}
                                  </Badge>
                                  {doc.upload_date && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {format(new Date(doc.upload_date), 'dd/MM/yyyy', { locale: ptBR })}
                                    </span>
                                  )}
                                  {doc.uploaded_by && (
                                    <span className="text-xs text-gray-500">por {doc.uploaded_by}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button variant="outline" size="sm" onClick={() => setSelectedDoc(doc)}>
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => window.open(doc.file_url, '_blank')}>
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setEditingDoc(doc)} className="text-blue-600 hover:text-blue-700">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(doc)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>
      </div>
      )}
    </div>
  );
}