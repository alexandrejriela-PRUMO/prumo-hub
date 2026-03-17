import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Building2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const emptyClient = { full_name:'', company_name:'', cpf:'', cnpj:'', email:'', phone:'', city:'', state:'', notes:'' };

export default function NewClientForm({ isOpen, onClose, consultorEmail, onSuccess }) {
  const queryClient = useQueryClient();
  const [clientType, setClientType] = useState('pf');
  const [crmStatus, setCrmStatus] = useState('Prospect'); // 'Prospect' = Lead, 'Ativo' = Cliente
  const [clientData, setClientData] = useState(emptyClient);

  const createCRM = useMutation({
    mutationFn: (data) => base44.entities.ClientCRM.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['crm-board-list'] });
      toast.success(crmStatus === 'Prospect' ? 'Lead cadastrado com sucesso!' : 'Cliente cadastrado com sucesso!');
      onSuccess?.(result);
      handleClose();
    },
    onError: () => toast.error('Erro ao cadastrar.')
  });

  const handleClose = () => {
    setClientType('pf');
    setCrmStatus('Prospect');
    setClientData(emptyClient);
    onClose();
  };

  const handleSubmit = () => {
    const name = clientType === 'pf' ? clientData.full_name : clientData.company_name;
    if (!name) {
      toast.error('Preencha o nome.');
      return;
    }

    createCRM.mutate({
      consultor_email: consultorEmail,
      client_name: name,
      client_email: clientData.email,
      client_phone: clientData.phone,
      client_type: clientType,
      status: crmStatus,
      notes: clientData.notes,
    });
  };

  const set = (field, val) => setClientData(prev => ({ ...prev, [field]: val }));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-800">
            <UserPlus className="w-5 h-5" />
            Novo Lead / Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Lead ou Cliente */}
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">Tipo de Cadastro</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCrmStatus('Prospect')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  crmStatus === 'Prospect'
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <UserPlus className="w-6 h-6" />
                <span className="font-semibold text-sm">Lead / Prospect</span>
                <span className="text-xs text-center opacity-70">Contato em potencial ainda não convertido</span>
              </button>
              <button
                onClick={() => setCrmStatus('Ativo')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  crmStatus === 'Ativo'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <Users className="w-6 h-6" />
                <span className="font-semibold text-sm">Cliente Ativo</span>
                <span className="text-xs text-center opacity-70">Já possui vínculo com sua consultoria</span>
              </button>
            </div>
          </div>

          {/* PF ou PJ */}
          <Tabs value={clientType} onValueChange={setClientType}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pf" className="flex items-center gap-2">
                <User className="w-4 h-4" /> Pessoa Física
              </TabsTrigger>
              <TabsTrigger value="pj" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Pessoa Jurídica
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pf" className="mt-4">
              <div>
                <Label>Nome Completo *</Label>
                <Input value={clientData.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nome completo" />
              </div>
            </TabsContent>

            <TabsContent value="pj" className="mt-4">
              <div>
                <Label>Razão Social *</Label>
                <Input value={clientData.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Nome da empresa" />
              </div>
            </TabsContent>
          </Tabs>

          {/* Contato */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={clientData.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input value={clientData.phone} onChange={e => set('phone', e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={clientData.city} onChange={e => set('city', e.target.value)} placeholder="Cidade" />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={clientData.state} onValueChange={val => set('state', val)}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {ESTADOS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Input value={clientData.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas adicionais" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button
              className={crmStatus === 'Prospect' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}
              onClick={handleSubmit}
              disabled={createCRM.isPending}
            >
              {createCRM.isPending ? 'Salvando...' : crmStatus === 'Prospect' ? 'Salvar Lead' : 'Salvar Cliente'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}