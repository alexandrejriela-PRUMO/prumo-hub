import React, { useState, useEffect } from 'react';
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
import { useDialogDirtyAlert } from '@/hooks/useFormDirtyAlert';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const emptyClient = {
  full_name: '', company_name: '', cpf: '', rg: '', birth_date: '',
  cnpj: '', state_registration: '', email: '', phone: '',
  address: '', city: '', state: '', zip_code: '', notes: ''
};

export default function NewClientForm({ isOpen, onClose, consultorEmail, onSuccess, initialStatus = null }) {
  const queryClient = useQueryClient();
  const [clientType, setClientType] = useState('pf');
  const [crmStatus, setCrmStatus] = useState(initialStatus || 'Prospect');
  const [clientData, setClientData] = useState(emptyClient);
  const [initialData, setInitialData] = useState(null);

  const isFormDirty = initialData && (
    JSON.stringify(clientData) !== JSON.stringify(initialData.clientData) ||
    clientType !== initialData.clientType ||
    crmStatus !== initialData.crmStatus
  );

  const handleClose = () => {
    setClientType('pf');
    setCrmStatus(initialStatus || 'Prospect');
    setClientData(emptyClient);
    setInitialData(null);
    onClose();
  };

  const handleCloseWithAlert = useDialogDirtyAlert(
    isFormDirty,
    handleClose,
    'Você tem alterações não salvas. Deseja fechar sem salvar?'
  );

  const createCRM = useMutation({
    mutationFn: (data) => base44.entities.ClientCRM.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['crm-board-list'] });
      queryClient.invalidateQueries({ queryKey: ['consultor-crm-clients'] });
      toast.success(crmStatus === 'Prospect' ? 'Lead cadastrado!' : 'Cliente cadastrado!');
      onSuccess?.(result);
      handleClose();
    },
    onError: () => toast.error('Erro ao cadastrar.')
  });

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
      cpf: clientData.cpf,
      rg: clientData.rg,
      birth_date: clientData.birth_date || undefined,
      cnpj: clientData.cnpj,
      state_registration: clientData.state_registration,
      address: clientData.address,
      city: clientData.city,
      state: clientData.state,
      zip_code: clientData.zip_code,
      notes: clientData.notes,
    });
  };

  const set = (field, val) => setClientData(prev => ({ ...prev, [field]: val }));
  const isCliente = crmStatus === 'Ativo';

  // Capture initial state when dialog opens
  useEffect(() => {
    if (isOpen && !initialData) {
      setInitialData({ clientType, crmStatus, clientData });
    }
  }, [isOpen, initialData]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseWithAlert()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-800">
            <UserPlus className="w-5 h-5" />
            {initialStatus === 'Ativo' ? 'Novo Cliente' : initialStatus === 'Prospect' ? 'Novo Lead' : 'Novo Lead / Cliente'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Só mostra seleção se não foi fixado via initialStatus */}
          {!initialStatus && (
            <div>
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">Tipo de Cadastro</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCrmStatus('Prospect')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    !isCliente ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <UserPlus className="w-6 h-6" />
                  <span className="font-semibold text-sm">Lead / Prospect</span>
                  <span className="text-xs text-center opacity-70">Contato em potencial</span>
                </button>
                <button
                  onClick={() => setCrmStatus('Ativo')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    isCliente ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-6 h-6" />
                  <span className="font-semibold text-sm">Cliente Ativo</span>
                  <span className="text-xs text-center opacity-70">Já é seu cliente</span>
                </button>
              </div>
            </div>
          )}

          {/* PF ou PJ */}
          <Tabs value={clientType} onValueChange={setClientType}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pf"><User className="w-4 h-4 mr-1" /> Pessoa Física</TabsTrigger>
              <TabsTrigger value="pj"><Building2 className="w-4 h-4 mr-1" /> Pessoa Jurídica</TabsTrigger>
            </TabsList>

            <TabsContent value="pf" className="mt-4">
              <div className="space-y-3">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input value={clientData.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nome completo" />
                </div>
                {isCliente && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>CPF</Label>
                      <Input value={clientData.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
                    </div>
                    <div>
                      <Label>RG</Label>
                      <Input value={clientData.rg} onChange={e => set('rg', e.target.value)} placeholder="00.000.000-0" />
                    </div>
                    <div>
                      <Label>Data de Nascimento</Label>
                      <Input type="date" value={clientData.birth_date} onChange={e => set('birth_date', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pj" className="mt-4">
              <div className="space-y-3">
                <div>
                  <Label>Razão Social *</Label>
                  <Input value={clientData.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Nome da empresa" />
                </div>
                {isCliente && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>CNPJ</Label>
                      <Input value={clientData.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
                    </div>
                    <div>
                      <Label>Inscrição Estadual</Label>
                      <Input value={clientData.state_registration} onChange={e => set('state_registration', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Contato */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Contato{isCliente ? ' e Endereço' : ''}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={clientData.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div>
                <Label>Telefone / WhatsApp</Label>
                <Input value={clientData.phone} onChange={e => set('phone', e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              {isCliente && (
                <>
                  <div className="col-span-2">
                    <Label>Endereço</Label>
                    <Input value={clientData.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, bairro" />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input value={clientData.city} onChange={e => set('city', e.target.value)} placeholder="Cidade" />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Select value={clientData.state} onValueChange={val => set('state', val)}>
                      <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>{ESTADOS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>CEP</Label>
                    <Input value={clientData.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="00000-000" />
                  </div>
                </>
              )}
              <div className={isCliente ? '' : 'col-span-2'}>
                <Label>Observações</Label>
                <Input value={clientData.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas adicionais" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleCloseWithAlert}>Cancelar</Button>
            <Button
              className={!isCliente ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}
              onClick={handleSubmit}
              disabled={createCRM.isPending}
            >
              {createCRM.isPending ? 'Salvando...' : !isCliente ? 'Salvar Lead' : 'Salvar Cliente'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}