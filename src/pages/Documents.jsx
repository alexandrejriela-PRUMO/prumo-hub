import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Plus, 
  ExternalLink,
  Upload,
  Trash2,
  Map,
  FileCheck,
  History,
  RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import VersionHistory from '../components/documents/VersionHistory';

const documentTypes = ['CAR', 'CCIR'];

export default function Documents() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    document_type: 'CAR',
    document_name: '',
    file_url: '',
    notes: '',
  });
  const [newVersionData, setNewVersionData] = useState({
    file_url: '',
    notes: '',
  });

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

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', user?.email],
    queryFn: () => base44.entities.Document.filter({ owner_email: user.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['documents']),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['documents']);
      setVersionDialogOpen(false);
      setNewVersionData({ file_url: '', notes: '' });
    },
  });

  const resetForm = () => {
    setFormData({
      document_type: 'CAR',
      document_name: '',
      file_url: '',
      notes: '',
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, file_url });
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newDoc = {
      ...formData,
      owner_email: user.email,
      current_version: 1,
      versions: [{
        version_number: 1,
        file_url: formData.file_url,
        uploaded_date: new Date().toISOString(),
        uploaded_by: user.email,
        notes: formData.notes || 'Versão inicial'
      }]
    };
    createMutation.mutate(newDoc);
  };

  const handleNewVersionUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setNewVersionData({ ...newVersionData, file_url });
    setUploading(false);
  };

  const handleAddVersion = () => {
    if (!newVersionData.file_url || !selectedDocument) return;

    const currentVersions = selectedDocument.versions || [];
    const newVersionNumber = (selectedDocument.current_version || 1) + 1;
    
    const newVersion = {
      version_number: newVersionNumber,
      file_url: newVersionData.file_url,
      uploaded_date: new Date().toISOString(),
      uploaded_by: user.email,
      notes: newVersionData.notes || `Atualização v${newVersionNumber}`
    };

    updateMutation.mutate({
      id: selectedDocument.id,
      data: {
        file_url: newVersionData.file_url,
        current_version: newVersionNumber,
        versions: [...currentVersions, newVersion]
      }
    });
  };

  const handleRestoreVersion = (version) => {
    if (!selectedDocument) return;

    updateMutation.mutate({
      id: selectedDocument.id,
      data: {
        file_url: version.file_url,
        current_version: version.version_number
      }
    });
  };

  const carDocuments = documents.filter(d => d.document_type === 'CAR');
  const ccirDocuments = documents.filter(d => d.document_type === 'CCIR');

  const DocumentCard = ({ doc }) => (
    <Card className="hover:shadow-lg transition-shadow border-emerald-100">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
            <FileCheck className="w-7 h-7 text-emerald-700" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{doc.document_name || doc.document_type}</h3>
              {doc.current_version > 1 && (
                <Badge variant="outline" className="text-xs">v{doc.current_version}</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Adicionado em {format(parseISO(doc.created_date), 'dd/MM/yyyy')}
            </p>
            {doc.versions && doc.versions.length > 0 && (
              <p className="text-xs text-emerald-600 mt-1">
                {doc.versions.length} {doc.versions.length === 1 ? 'versão' : 'versões'}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {doc.file_url && (
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Visualizar
            </a>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setSelectedDocument(doc);
              setVersionDialogOpen(true);
            }}
            title="Gerenciar versões"
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => deleteMutation.mutate(doc.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ type }) => (
    <Card className="border-dashed border-2 border-emerald-200">
      <CardContent className="py-12 text-center">
        <FileText className="w-12 h-12 mx-auto text-emerald-300 mb-4" />
        <h3 className="font-semibold text-gray-900">Nenhum documento {type}</h3>
        <p className="text-gray-500 mt-2 text-sm">Clique em "Adicionar" para enviar</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Info Card */}
      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-emerald-900">O que é CAR + CCIR?</h3>
            <p className="text-emerald-800 text-sm">
              <strong>CAR (Cadastro Ambiental Rural):</strong> Registro obrigatório de propriedades e posses rurais que integra informações ambientais da propriedade, incluindo localização, limites, APP, Reserva Legal e áreas sob uso antrópico.
            </p>
            <p className="text-emerald-800 text-sm">
              <strong>CCIR (Certificado de Cadastro de Imóvel Rural):</strong> Documento emitido pela Receita Federal que certifica o registro do imóvel no SNCR (Sistema Nacional de Cadastro Rural). Essencial para operações de crédito, venda e cumprimento de obrigações legais.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CAR + CCIR</h1>
          <p className="text-gray-500 mt-1">Documentos de regularização ambiental</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Documento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <Select
                  value={formData.document_type}
                  onValueChange={(v) => setFormData({ ...formData, document_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome/Descrição</Label>
                <Input
                  value={formData.document_name}
                  onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
                  placeholder="Ex: CAR Fazenda Santa Maria"
                />
              </div>

              <div className="space-y-2">
                <Label>Selecionar Arquivo do Computador</Label>
                <label 
                  htmlFor="document-file-upload"
                  className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">
                    {uploading ? 'Enviando...' : formData.file_url ? 'Arquivo carregado - Clique para alterar' : 'Clique para buscar arquivo (PDF, JPG, PNG)'}
                  </span>
                </label>
                <Input
                  id="document-file-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {formData.file_url && (
                  <a href={formData.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 flex items-center gap-1 hover:underline">
                    <FileText className="w-4 h-4" /> Visualizar arquivo carregado
                  </a>
                )}
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informações adicionais..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando...' : 'Salvar Documento'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Version Management Dialog */}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Versões: {selectedDocument?.document_name || selectedDocument?.document_type}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Add New Version */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Adicionar Nova Versão
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Selecionar Nova Versão do Arquivo</Label>
                  <label 
                    htmlFor="version-file-upload"
                    className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-50 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">
                      {uploading ? 'Enviando...' : newVersionData.file_url ? 'Arquivo carregado' : 'Clique para buscar arquivo (PDF, JPG, PNG)'}
                    </span>
                  </label>
                  <Input
                    id="version-file-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleNewVersionUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  {newVersionData.file_url && (
                    <a href={newVersionData.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 flex items-center gap-1 hover:underline">
                      <FileText className="w-4 h-4" /> Visualizar arquivo carregado
                    </a>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Observações sobre esta versão</Label>
                  <Textarea
                    value={newVersionData.notes}
                    onChange={(e) => setNewVersionData({ ...newVersionData, notes: e.target.value })}
                    placeholder="O que mudou nesta versão?"
                    rows={2}
                  />
                </div>
                <Button 
                  onClick={handleAddVersion}
                  disabled={!newVersionData.file_url || updateMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Nova Versão'}
                </Button>
              </div>
            </div>

            {/* Version History */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <History className="w-4 h-4" />
                Histórico de Versões
              </h3>
              <VersionHistory 
                versions={selectedDocument?.versions || []}
                currentVersion={selectedDocument?.current_version}
                onRestore={handleRestoreVersion}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="car" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="car">CAR ({carDocuments.length})</TabsTrigger>
          <TabsTrigger value="ccir">CCIR ({ccirDocuments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="car" className="mt-6">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : carDocuments.length === 0 ? (
            <EmptyState type="CAR" />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {carDocuments.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ccir" className="mt-6">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : ccirDocuments.length === 0 ? (
            <EmptyState type="CCIR" />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {ccirDocuments.map((doc) => <DocumentCard key={doc.id} doc={doc} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}