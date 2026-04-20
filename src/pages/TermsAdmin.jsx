import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Eye, CheckCircle, GitCompare, Users, Bell, ScrollText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import TermsVersionCompare from '@/components/terms/TermsVersionCompare';
import TermsAcceptanceLogs from '@/components/terms/TermsAcceptanceLogs';
import SaasContractLogs from '@/components/terms/SaasContractLogs';

export default function TermsAdmin() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewTerm, setPreviewTerm] = useState(null);
  const [formData, setFormData] = useState({ version: '', content: '', published_at: '' });
  const [notifying, setNotifying] = useState(false);
  const queryClient = useQueryClient();

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ['termsOfUse'],
    queryFn: () => base44.entities.TermsOfUse.list('-version', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TermsOfUse.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['termsOfUse']);
      setDialogOpen(false);
      setFormData({ version: '', content: '', published_at: '' });
      toast.success('Versão criada com sucesso!');
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (term) => {
      // Desativa todos os outros
      await Promise.all(
        terms.filter(t => t.id !== term.id && t.is_active).map(t =>
          base44.entities.TermsOfUse.update(t.id, { is_active: false })
        )
      );
      return base44.entities.TermsOfUse.update(term.id, { is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['termsOfUse']);
      toast.success('Termo ativado com sucesso!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TermsOfUse.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['termsOfUse']);
      toast.success('Versão removida.');
    },
  });

  const handleNotifyUsers = async () => {
    const active = terms.find(t => t.is_active);
    if (!active) return toast.error('Nenhum termo ativo para notificar.');
    setNotifying(true);
    try {
      // Busca usuários que ainda não aceitaram a versão ativa
      const users = await base44.entities.User.list();
      const pending = users.filter(u => !u.accepted_terms_version || u.accepted_terms_version < active.version);
      await Promise.all(
        pending.map(u =>
          base44.integrations.Core.SendEmail({
            to: u.email,
            subject: `PRUMO Hub — Novos Termos de Uso (v${active.version})`,
            body: `Olá, ${u.full_name || 'usuário'}!\n\nPublicamos uma nova versão dos Termos de Uso (v${active.version}). Acesse a plataforma para lê-los e aceitá-los.\n\nEquipe PRUMO Hub`,
          })
        )
      );
      toast.success(`${pending.length} usuário(s) notificado(s) por e-mail!`);
    } catch (e) {
      toast.error('Erro ao notificar usuários.');
    }
    setNotifying(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Gerenciamento de Termos de Uso</h1>
          <p className="text-sm text-emerald-600 mt-1">Crie versões, ative, compare e acompanhe os aceites dos usuários.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNotifyUsers} disabled={notifying} className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
            <Bell className="w-4 h-4" />
            {notifying ? 'Notificando...' : 'Notificar Usuários'}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="w-4 h-4" /> Nova Versão
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Versão dos Termos de Uso</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Versão *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 2.0"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Publicação</Label>
                    <Input
                      type="date"
                      value={formData.published_at}
                      onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Conteúdo (HTML) *</Label>
                  <textarea
                    className="w-full h-64 border border-gray-200 rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Cole o HTML do conteúdo dos termos aqui..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={!formData.version || !formData.content || createMutation.isPending}
                  onClick={() => createMutation.mutate({
                    version: parseFloat(formData.version),
                    content: formData.content,
                    published_at: formData.published_at || new Date().toISOString().split('T')[0],
                    is_active: false,
                  })}
                >
                  {createMutation.isPending ? 'Salvando...' : 'Criar Versão'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="versions">
        <TabsList className="bg-emerald-50 border border-emerald-100">
          <TabsTrigger value="versions" className="gap-2"><FileText className="w-4 h-4" />Versões</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><Users className="w-4 h-4" />Logs de Aceite</TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2"><ScrollText className="w-4 h-4" />Contratos SaaS</TabsTrigger>
          <TabsTrigger value="compare" className="gap-2"><GitCompare className="w-4 h-4" />Comparar Versões</TabsTrigger>
        </TabsList>

        {/* Versões */}
        <TabsContent value="versions" className="space-y-4 mt-4">
          {isLoading ? (
            <p className="text-center text-gray-400 py-10">Carregando...</p>
          ) : terms.length === 0 ? (
            <Card className="border-dashed border-2 border-emerald-200">
              <CardContent className="py-16 text-center">
                <FileText className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma versão cadastrada ainda.</p>
              </CardContent>
            </Card>
          ) : (
            terms.map(term => (
              <Card key={term.id} className={`border ${term.is_active ? 'border-emerald-400 shadow-md' : 'border-gray-200'}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-emerald-900">Versão {term.version}</CardTitle>
                      {term.is_active && (
                        <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300">
                          <CheckCircle className="w-3 h-3 mr-1" /> Ativa
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPreviewTerm(term)} className="gap-1 text-xs">
                        <Eye className="w-3.5 h-3.5" /> Visualizar
                      </Button>
                      {!term.is_active && (
                        <Button size="sm" onClick={() => activateMutation.mutate(term)} className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Ativar
                        </Button>
                      )}
                      {!term.is_active && (
                        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 text-xs" onClick={() => {
                          if (confirm('Remover esta versão?')) deleteMutation.mutate(term.id);
                        }}>
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500">
                    Publicado em: {term.published_at ? format(parseISO(term.published_at), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs" className="mt-4">
          <TermsAcceptanceLogs />
        </TabsContent>

        {/* Contratos SaaS */}
        <TabsContent value="contracts" className="mt-4">
          <SaasContractLogs />
        </TabsContent>

        {/* Comparar */}
        <TabsContent value="compare" className="mt-4">
          <TermsVersionCompare terms={terms} />
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewTerm} onOpenChange={() => setPreviewTerm(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévia — Versão {previewTerm?.version}</DialogTitle>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none text-gray-700 mt-4 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: previewTerm?.content }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}