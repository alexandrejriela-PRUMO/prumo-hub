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
import { Badge } from '@/components/ui/badge';
import { 
  FileQuestion, 
  Plus, 
  Clock,
  CheckCircle,
  MessageSquare,
  AlertCircle,
  Scale,
  Leaf,
  FileText,
  Folder
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import RequestConversation from '../components/requests/RequestConversation';

const categories = [
  { value: 'Jurídico', icon: Scale, color: 'bg-purple-100 text-purple-700' },
  { value: 'Ambiental', icon: Leaf, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'Licenciamento', icon: FileText, color: 'bg-blue-100 text-blue-700' },
  { value: 'Documentação', icon: Folder, color: 'bg-amber-100 text-amber-700' },
  { value: 'Outro', icon: FileQuestion, color: 'bg-gray-100 text-gray-700' },
];

const statusConfig = {
  'Aberto': { color: 'bg-blue-100 text-blue-700', icon: Clock },
  'Em Análise': { color: 'bg-amber-100 text-amber-700', icon: MessageSquare },
  'Respondido': { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  'Fechado': { color: 'bg-gray-100 text-gray-500', icon: CheckCircle },
};

const priorities = ['Baixa', 'Média', 'Alta', 'Urgente'];

export default function Requests() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [conversationDialogOpen, setConversationDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    description: '',
    priority: 'Média',
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

  const { data: requests, isLoading } = useQuery({
    queryKey: ['requests', user?.email],
    queryFn: () => base44.entities.Request.filter({ client_email: user.email }, '-created_date'),
    enabled: !!user?.email,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Request.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['requests']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      subject: '',
      category: '',
      description: '',
      priority: 'Média',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      client_email: user.email,
      status: 'Aberto',
    });
  };

  const getCategoryInfo = (cat) => categories.find(c => c.value === cat) || categories[4];
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgente': return 'bg-red-100 text-red-700';
      case 'Alta': return 'bg-orange-100 text-orange-700';
      case 'Média': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requerimentos</h1>
          <p className="text-gray-500 mt-1">Dúvidas jurídicas e ambientais</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Requerimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Requerimento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Assunto</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Descreva brevemente sua dúvida"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="w-4 h-4" />
                            {cat.value}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição Detalhada</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva sua dúvida ou solicitação com o máximo de detalhes possível..."
                  rows={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Enviando...' : 'Enviar Requerimento'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Consultoria Jurídica</h3>
              <p className="text-sm text-gray-600 mt-1">
                Dúvidas sobre legislação ambiental, regularização fundiária e direitos do produtor rural.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Consultoria Ambiental</h3>
              <p className="text-sm text-gray-600 mt-1">
                Orientações sobre licenciamento, CAR, reserva legal e áreas de preservação.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : requests.length === 0 ? (
        <Card className="border-dashed border-2 border-emerald-200">
          <CardContent className="py-16 text-center">
            <FileQuestion className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Nenhum requerimento</h3>
            <p className="text-gray-500 mt-2">Clique em "Novo Requerimento" para enviar sua dúvida</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const categoryInfo = getCategoryInfo(request.category);
            const status = statusConfig[request.status] || statusConfig['Aberto'];
            const StatusIcon = status.icon;
            const CategoryIcon = categoryInfo.icon;

            return (
              <Card key={request.id} className="hover:shadow-lg transition-shadow border-gray-100">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${categoryInfo.color}`}>
                        <CategoryIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{request.subject}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge className={categoryInfo.color}>{request.category}</Badge>
                          <Badge className={getPriorityColor(request.priority)}>{request.priority}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-3 line-clamp-2">{request.description}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          Enviado em {format(parseISO(request.created_date), 'dd/MM/yyyy às HH:mm')}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${status.color} flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {request.status}
                    </Badge>
                  </div>

                  {request.response && (
                    <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <p className="text-sm font-medium text-emerald-700">Resposta da Equipe Técnica</p>
                      </div>
                      <p className="text-sm text-gray-700">{request.response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}