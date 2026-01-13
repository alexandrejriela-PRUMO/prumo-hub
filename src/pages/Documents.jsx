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
  FileCheck
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const documentTypes = ['CAR', 'CCIR'];

export default function Documents() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    document_type: 'CAR',
    document_name: '',
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
    createMutation.mutate({
      ...formData,
      owner_email: user.email,
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
            <h3 className="font-semibold text-gray-900">{doc.document_name || doc.document_type}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Adicionado em {format(parseISO(doc.created_date), 'dd/MM/yyyy')}
            </p>
            {doc.notes && (
              <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{doc.notes}</p>
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
                <Label>Arquivo</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
                {uploading && <span className="text-sm text-gray-500">Enviando...</span>}
                {formData.file_url && (
                  <a href={formData.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 flex items-center gap-1">
                    <FileText className="w-4 h-4" /> Ver arquivo
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