import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  MapPin, 
  Plus, 
  ExternalLink,
  Upload,
  Trash2,
  Map,
  FileText,
  Download
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function Georeferencing() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
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
    queryKey: ['geo-documents', user?.email],
    queryFn: () => base44.entities.Document.filter({ owner_email: user.email, document_type: 'Georreferenciamento' }),
    enabled: !!user?.email,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['geo-documents']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['geo-documents']),
  });

  const resetForm = () => {
    setFormData({
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
      document_type: 'Georreferenciamento',
      owner_email: user.email,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Georreferenciamento</h1>
          <p className="text-gray-500 mt-1">Arquivos de georreferenciamento da sua propriedade</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Arquivo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Georreferenciamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome do Arquivo</Label>
                <Input
                  value={formData.document_name}
                  onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
                  placeholder="Ex: Georreferenciamento Fazenda 2024"
                />
              </div>

              <div className="space-y-2">
                <Label>Arquivo</Label>
                <Input
                  type="file"
                  accept=".pdf,.kml,.kmz,.shp,.zip,.dwg,.dxf"
                  onChange={handleFileUpload}
                />
                <p className="text-xs text-gray-500">Formatos aceitos: PDF, KML, KMZ, SHP, DWG, DXF</p>
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
                  placeholder="Informações adicionais sobre o arquivo..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando...' : 'Salvar Arquivo'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-emerald-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <Map className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Sobre Georreferenciamento</h3>
              <p className="text-sm text-gray-600 mt-1">
                O georreferenciamento é a determinação das coordenadas geográficas precisas do imóvel rural. 
                É obrigatório para imóveis acima de 100 hectares e essencial para regularização fundiária.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="border-dashed border-2 border-emerald-200">
          <CardContent className="py-16 text-center">
            <MapPin className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Nenhum arquivo de georreferenciamento</h3>
            <p className="text-gray-500 mt-2">Clique em "Adicionar Arquivo" para enviar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow border-emerald-100">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-200 flex items-center justify-center">
                    <MapPin className="w-7 h-7 text-teal-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{doc.document_name || 'Georreferenciamento'}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Adicionado em {format(parseISO(doc.created_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
                {doc.notes && (
                  <p className="text-sm text-gray-600 mt-4 bg-gray-50 p-3 rounded-lg">{doc.notes}</p>
                )}
                <div className="flex gap-2 mt-4">
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Baixar
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
          ))}
        </div>
      )}
    </div>
  );
}