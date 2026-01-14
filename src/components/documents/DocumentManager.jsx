import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileUp, Trash2, Download, Filter, Search, Tag, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_CATEGORIES = [
  { id: 'soil_analysis', name: 'Análises de Solo', icon: '🔬' },
  { id: 'production_records', name: 'Registros de Produção', icon: '📊' },
  { id: 'environmental_policies', name: 'Políticas Ambientais', icon: '🌍' },
  { id: 'certifications', name: 'Certificações', icon: '✅' },
  { id: 'legal_docs', name: 'Documentos Legais', icon: '⚖️' },
  { id: 'property_docs', name: 'Documentos da Propriedade', icon: '🏠' },
  { id: 'financial_records', name: 'Registros Financeiros', icon: '💰' },
  { id: 'audit_reports', name: 'Relatórios de Auditoria', icon: '📋' },
  { id: 'other', name: 'Outros', icon: '📄' }
];

export default function DocumentManager({ userEmail }) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingFile, setUploadingFile] = useState(null);
  const [fileInput, setFileInput] = useState(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', userEmail],
    queryFn: () => base44.entities.UnifiedDocument.filter(
      { uploaded_by: userEmail },
      '-upload_date'
    ),
    enabled: !!userEmail
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => base44.entities.UnifiedDocument.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Documento deletado com sucesso');
    }
  });

  const handleFileUpload = async (file, category) => {
    if (!file) return;

    setUploadingFile(true);
    try {
      const uploadedFile = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.UnifiedDocument.create({
        entity_type: 'General',
        document_type: category,
        document_name: file.name,
        description: `Documento de ${DOCUMENT_CATEGORIES.find(c => c.id === category)?.name}`,
        file_url: uploadedFile.file_url,
        file_size: file.size,
        file_type: file.type,
        upload_date: new Date().toISOString(),
        uploaded_by: userEmail,
        tags: [category]
      });

      toast.success('Documento enviado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setFileInput(null);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar documento');
    } finally {
      setUploadingFile(false);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchCategory = selectedCategory === 'all' || doc.document_type === selectedCategory;
    const matchSearch = doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const getCategoryIcon = (catId) => {
    return DOCUMENT_CATEGORIES.find(c => c.id === catId)?.icon || '📄';
  };

  const getCategoryName = (catId) => {
    return DOCUMENT_CATEGORIES.find(c => c.id === catId)?.name || catId;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            Fazer Upload de Documento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            {DOCUMENT_CATEGORIES.map(category => (
              <label
                key={category.id}
                className="flex flex-col items-center gap-2 p-3 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
              >
                <span className="text-2xl">{category.icon}</span>
                <span className="text-sm font-medium text-gray-700 text-center">{category.name}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0], category.id)}
                  disabled={uploadingFile}
                />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar documentos por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                Todos ({documents.length})
              </Button>
              {DOCUMENT_CATEGORIES.map(cat => {
                const count = documents.filter(d => d.document_type === cat.id).length;
                return (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.icon} {count}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">
          {filteredDocs.length} documento(s) encontrado(s)
        </h3>

        {filteredDocs.length > 0 ? (
          <div className="space-y-2">
            {filteredDocs.map(doc => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <span className="text-3xl">{getCategoryIcon(doc.document_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.document_name}</p>
                    {doc.description && (
                      <p className="text-sm text-gray-600 truncate">{doc.description}</p>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge className="bg-blue-100 text-blue-700 text-xs">
                        {getCategoryName(doc.document_type)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(doc.file_size)}
                      </Badge>
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.upload_date).toLocaleDateString('pt-BR')}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <Button variant="outline" size="sm" title="Download">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                    className="hover:bg-red-50"
                    title="Deletar"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-600 mb-4">Nenhum documento encontrado</p>
            <p className="text-sm text-gray-500">
              {searchTerm ? 'Tente ajustar sua busca' : 'Comece fazendo upload de documentos'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}