import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Headphones, 
  Plus, 
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  'Aberto': { color: 'bg-blue-100 text-blue-700', icon: Clock },
  'Em Atendimento': { color: 'bg-amber-100 text-amber-700', icon: MessageCircle },
  'Resolvido': { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  'Fechado': { color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
};

export default function Support() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
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

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets', user?.email],
    queryFn: () => base44.entities.SupportTicket.filter({ client_email: user.email }, '-created_date'),
    enabled: !!user?.email,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SupportTicket.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
      setDialogOpen(false);
      setFormData({ subject: '', message: '' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      client_email: user.email,
      status: 'Aberto',
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suporte ao Cliente</h1>
          <p className="text-gray-500 mt-1">Estamos aqui para ajudar</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Chamado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Abrir Chamado de Suporte</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Assunto</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Descreva brevemente o assunto"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Descreva detalhadamente sua dúvida ou problema..."
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Enviando...' : 'Enviar Chamado'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contact Info */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Telefone</p>
              <p className="font-semibold text-gray-900">(XX) XXXXX-XXXX</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">E-mail</p>
              <p className="font-semibold text-gray-900">contato@santarute.com.br</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Horário</p>
              <p className="font-semibold text-gray-900">Seg - Sex, 8h às 18h</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="text-lg">Meus Chamados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <Headphones className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
              <h3 className="font-semibold text-gray-900">Nenhum chamado aberto</h3>
              <p className="text-gray-500 mt-2">Clique em "Novo Chamado" se precisar de ajuda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => {
                const status = statusConfig[ticket.status] || statusConfig['Aberto'];
                const StatusIcon = status.icon;
                return (
                  <Card key={ticket.id} className="border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.color}`}>
                            <StatusIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{ticket.subject}</h4>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ticket.message}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              Aberto em {format(parseISO(ticket.created_date), 'dd/MM/yyyy às HH:mm')}
                            </p>
                          </div>
                        </div>
                        <Badge className={status.color}>
                          {ticket.status}
                        </Badge>
                      </div>
                      {ticket.response && (
                        <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <p className="text-xs text-emerald-600 font-medium mb-1">Resposta da equipe:</p>
                          <p className="text-sm text-gray-700">{ticket.response}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}