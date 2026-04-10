import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, TrendingUp, Loader2, CheckCircle2, Clock, DollarSign, AlertCircle, Edit3, Trash2, Landmark } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLOR = {
  'Em Proposta': 'bg-blue-100 text-blue-700',
  'Contratado': 'bg-purple-100 text-purple-700',
  'Em Andamento': 'bg-amber-100 text-amber-700',
  'Concluído': 'bg-green-100 text-green-700',
  'Cancelado': 'bg-red-100 text-red-700',
};

export default function ClientFinancialSummary({ client }) {
  const queryClient = useQueryClient();
  // O `client` passado é o ClientCRM diretamente (do ConsultorClients ou CRMBoard)
  const crmId = client?.id;
  const crmConsultorEmail = client?.consultor_email;
  const crmOwnerEmail = client?.owner_email;

  const { data: crm, isLoading } = useQuery({
    queryKey: ['client-crm-financial', crmId],
    queryFn: async () => {
      if (!crmId) return null;
      const results = await base44.entities.ClientCRM.filter({ id: crmId });
      return results[0] || null;
    },
    enabled: !!crmId,
  });

  const upsertCRM = useMutation({
    mutationFn: (data) => {
      if (crmId) return base44.entities.ClientCRM.update(crmId, data);
      return Promise.reject(new Error('ClientCRM não identificado'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-crm-financial', crmId] });
      queryClient.invalidateQueries({ queryKey: ['client-crm', crmId] });
      queryClient.invalidateQueries({ queryKey: ['consultor-crm-clients'] });
      queryClient.invalidateQueries({ queryKey: ['crm-board-list'] });
    },
  });

  const [receivedDateInput, setReceivedDateInput] = React.useState({});
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);
  const [newService, setNewService] = useState({ name: '', status: 'Em Proposta', value: '', notes: '', payment_type: 'avista', payment_method: 'Pix', installments: '', start_date: '', installments_data: [], received: false, received_at: '', account_id: null });

  const [loggedEmail, setLoggedEmail] = useState(null);
  useEffect(() => {
    base44.auth.me().then(u => { if (u?.email) setLoggedEmail(u.email); }).catch(() => {});
  }, []);

  // Buscar contas usando todos os emails possíveis
  const { data: financialAccounts = [] } = useQuery({
    queryKey: ['financial-accounts-crm-all', crmConsultorEmail, loggedEmail],
    queryFn: async () => {
      const emails = [...new Set([crmConsultorEmail, crmOwnerEmail, loggedEmail].filter(Boolean))];
      const results = await Promise.all(
        emails.map(email => base44.entities.FinancialAccount.filter({ consultor_email: email }, 'name', 100).catch(() => []))
      );
      const map = new Map();
      results.flat().forEach(a => map.set(a.id, a));
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!(crmConsultorEmail || loggedEmail),
  });

  const startEdit = (service, index) => {
    setEditingIndex(index);
    
    // Para parcelado: mapear do array installments (agora é array de objetos)
    let installments_data = [];
    if (service.payment_type === 'parcelado' && Array.isArray(service.installments) && service.installments.length > 0) {
      installments_data = service.installments.map(inst => ({
        due_date: inst.due_date || '',
        received: inst.received || false,
        received_date: inst.received_date || '',
      }));
    }
    
    setEditForm({
      name: service.name,
      status: service.status,
      value: service.value?.toString() || '',
      notes: service.notes || '',
      payment_type: service.payment_type || 'avista',
      payment_method: service.payment_method || 'Pix',
      installments: service.installments?.length?.toString() || '',
      start_date: service.start_date || '',
      installments_data,
      received: service.received || false,
      received_at: service.received_at ? service.received_at.split('T')[0] : '',
      account_id: service.account_id || null,
    });
  };

  const saveEdit = () => {
    console.log("STEP 1 - EDIT FORM STATE:", JSON.stringify(editForm, null, 2));
    const services = (crm?.services || []).map((s, i) => {
      if (i !== editingIndex) return { ...s, account_id: s.account_id || null };

      // Para parcelado: estrutura com array installments
      if (editForm.payment_type === 'parcelado') {
        const totalValue = parseFloat(editForm.value) || 0;
        const numInstallments = parseInt(editForm.installments) || 1;
        const installmentValue = totalValue / numInstallments;
        
        const installments = editForm.installments_data?.map((inst, idx) => ({
          number: idx + 1,
          amount: installmentValue,
          due_date: inst.due_date || '',
          received: inst.received || false,
          received_date: inst.received_date || null,
        })) || [];

        return {
          name: editForm.name,
          status: editForm.status,
          value: totalValue,
          notes: editForm.notes,
          payment_type: 'parcelado',
          payment_method: editForm.payment_method,
          start_date: editForm.start_date || '',
          installments,
          received: false,
          received_at: null,
          account_id: editForm.account_id || null,
        };
      } else {
        // À vista
        return {
          name: editForm.name,
          status: editForm.status,
          value: parseFloat(editForm.value) || 0,
          notes: editForm.notes,
          payment_type: 'avista',
          payment_method: editForm.payment_method,
          start_date: editForm.start_date || '',
          installments: [],
          received: editForm.received || false,
          received_at: editForm.received && editForm.received_at
            ? editForm.received_at
            : null,
          account_id: editForm.account_id || null,
        };
      }
    });

    console.log("STEP 3 - PAYLOAD ENVIADO (saveEdit):", JSON.stringify({ services }, null, 2));
    upsertCRM.mutate({ services }, {
      onSuccess: async () => {
        try {
          await base44.functions.invoke('syncInstallmentTransactions', {
            crmId: crmId,
            consultor_email: crmConsultorEmail,
          });
          queryClient.invalidateQueries({ queryKey: ['fin-manual'] });
        } catch (err) {
          console.warn('Erro ao sincronizar transações:', err);
        }
        toast.success('Serviço atualizado!');
        setEditingIndex(null);
      },
      onError: (e) => toast.error('Erro ao salvar: ' + e.message),
    });
  };

  const deleteService = async (index) => {
    const svc = crm?.services?.[index];
    const services = (crm?.services || []).filter((_, i) => i !== index);

    // Remover entradas Expense sincronizadas para este serviço
    if (svc) {
      try {
        const clientPropertyId = crm.property_id || crm.id;
        const existingExpenses = await base44.entities.Expense.filter({
          consultor_email: crmConsultorEmail,
          client_property_id: clientPropertyId,
        });
        // Encontrar entradas que pertencem a este serviço pela descrição
        const toDelete = existingExpenses.filter(exp => {
          const desc = exp.description || '';
          return desc === svc.name || desc.startsWith(`${svc.name} - Parcela `);
        });
        await Promise.all(toDelete.map(exp => base44.entities.Expense.delete(exp.id)));
        if (toDelete.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['fin-manual'] });
        }
      } catch (err) {
        console.warn('Erro ao remover transações vinculadas:', err);
      }
    }

    upsertCRM.mutate({ services }, {
      onSuccess: async () => {
        try {
          await base44.functions.invoke('syncInstallmentTransactions', {
            crmId: crmId,
            consultor_email: crmConsultorEmail,
          });
          queryClient.invalidateQueries({ queryKey: ['fin-manual'] });
        } catch (err) {
          console.warn('Erro ao sincronizar após exclusão:', err);
        }
        toast.success('Serviço removido.');
      },
      onError: (e) => toast.error('Erro ao remover: ' + e.message),
    });
  };

  const addNewService = () => {
    console.log("STEP 1 - NEW SERVICE STATE:", JSON.stringify(newService, null, 2));
    if (!newService.name) { toast.error('Informe o nome do serviço'); return; }
    const serviceValue = parseFloat(newService.value) || 0;

    // Para parcelado: estrutura com array installments
    if (newService.payment_type === 'parcelado') {
      const numInstallments = parseInt(newService.installments) || 1;
      const installmentValue = serviceValue / numInstallments;
      const installments = newService.installments_data?.map((inst, idx) => ({
        number: idx + 1,
        amount: installmentValue,
        due_date: inst.due_date || '',
        received: inst.received || false,
        received_date: inst.received_date || null,
      })) || [];

      const newServiceObj = {
        name: newService.name,
        status: newService.status,
        value: serviceValue,
        notes: newService.notes,
        payment_type: 'parcelado',
        payment_method: newService.payment_method,
        start_date: newService.start_date || '',
        installments,
        received: false,
        received_at: null,
        account_id: newService.account_id || null,
      };

      console.log("STEP 3 - PAYLOAD ENVIADO (addNewService parcelado):", JSON.stringify({ newServiceObj }, null, 2));
      const services = [...(crm?.services || []), newServiceObj];
      upsertCRM.mutate({ services }, {
        onSuccess: async () => {
          try {
            await base44.functions.invoke('syncInstallmentTransactions', {
              crmId: crmId,
              consultor_email: crmConsultorEmail,
            });
            queryClient.invalidateQueries({ queryKey: ['fin-manual'] });
          } catch (err) {
            console.warn('Erro ao sincronizar transações:', err);
          }
          toast.success('Serviço adicionado!');
          setShowNewServiceForm(false);
          setNewService({ name: '', status: 'Em Proposta', value: '', notes: '', payment_type: 'avista', payment_method: 'Pix', installments: '', start_date: '', installments_data: [], received: false, received_at: '', account_id: null });
        },
        onError: (e) => toast.error('Erro ao adicionar: ' + e.message),
      });
    } else {
      // À vista
      const newServiceObj = {
        name: newService.name,
        status: newService.status,
        value: serviceValue,
        notes: newService.notes,
        payment_type: 'avista',
        payment_method: newService.payment_method,
        start_date: newService.start_date || '',
        installments: [],
        received: newService.received || false,
        received_at: newService.received && newService.received_at ? newService.received_at : null,
        account_id: newService.account_id || null,
      };

      console.log("STEP 3 - PAYLOAD ENVIADO (addNewService avista):", JSON.stringify({ newServiceObj }, null, 2));
      const services = [...(crm?.services || []), newServiceObj];
      upsertCRM.mutate({ services }, {
        onSuccess: async () => {
          try {
            await base44.functions.invoke('syncInstallmentTransactions', {
              crmId: crmId,
              consultor_email: crmConsultorEmail,
            });
            queryClient.invalidateQueries({ queryKey: ['fin-manual'] });
          } catch (err) {
            console.warn('Erro ao sincronizar transações:', err);
          }
          toast.success('Serviço adicionado!');
          setShowNewServiceForm(false);
          setNewService({ name: '', status: 'Em Proposta', value: '', notes: '', payment_type: 'avista', payment_method: 'Pix', installments: '', start_date: '', installments_data: [], received: false, received_at: '', account_id: null });
        },
        onError: (e) => toast.error('Erro ao adicionar: ' + e.message),
      });
    }
  };

  const toggleReceived = (index) => {
     const svc = crm?.services?.[index];
     const nowReceived = !svc?.received;
     const received_at = nowReceived
       ? (receivedDateInput[index] ? new Date(receivedDateInput[index] + 'T12:00:00').toISOString() : new Date().toISOString())
       : null;
     const services = (crm?.services || []).map((s, i) =>
       i === index ? { ...s, received: nowReceived, received_at } : s
     );
     upsertCRM.mutate({ services }, {
       onSuccess: async () => {
         try {
           await base44.functions.invoke('syncInstallmentTransactions', {
             crmId: crmId,
             consultor_email: crmConsultorEmail,
           });
           queryClient.invalidateQueries({ queryKey: ['fin-manual'] });
         } catch (err) {
           console.warn('Erro ao sincronizar:', err);
         }
         toast.success('Status de recebimento atualizado!');
       },
       onError: (error) => {
         toast.error('Erro ao atualizar status: ' + (error?.message || 'Tente novamente'));
       }
     });
   };

  if (isLoading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
    </div>
  );

  const services = crm?.services || [];
   const activeServices = services.filter(s => s.status === 'Contratado' || s.status === 'Em Andamento');
   const totalRevenue = services.reduce((sum, s) => {
     const value = parseFloat(s.value);
     return sum + (isNaN(value) ? 0 : value);
   }, 0);
   const receivedRevenue = services.filter(s => s.received).reduce((sum, s) => {
     const value = parseFloat(s.value);
     return sum + (isNaN(value) ? 0 : value);
   }, 0);
   const pendingRevenue = Math.max(0, totalRevenue - receivedRevenue);

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-700" />
              <p className="text-xs font-semibold text-emerald-800">Total Contratado</p>
            </div>
            <p className="text-xl font-bold text-emerald-900">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">{services.length} serviço(s)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-700" />
              <p className="text-xs font-semibold text-green-800">Recebido</p>
            </div>
            <p className="text-xl font-bold text-green-900">
              R$ {receivedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-green-600 mt-0.5">{services.filter(s => s.received).length} serviço(s)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-700" />
              <p className="text-xs font-semibold text-amber-800">A Receber</p>
            </div>
            <p className="text-xl font-bold text-amber-900">
              R$ {pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">{services.filter(s => !s.received && s.status !== 'Cancelado').length} serviço(s)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <p className="text-xs font-semibold text-blue-800">Ativos</p>
            </div>
            <p className="text-xl font-bold text-blue-900">{activeServices.length}</p>
            <p className="text-xs text-blue-600 mt-0.5">em andamento / contratados</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progresso de recebimento */}
      {totalRevenue > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold text-gray-700">Progresso de Recebimento</p>
              <span className="text-sm font-bold text-emerald-700">
                {Math.round((receivedRevenue / totalRevenue) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(receivedRevenue / totalRevenue) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>R$ {receivedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebidos</span>
              <span>R$ {pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendentes</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalhamento por serviço */}
       <Card>
         <CardHeader className="pb-2 flex flex-row items-center justify-between">
           <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
             <CreditCard className="w-4 h-4 text-emerald-600" />
             Detalhamento por Serviço
           </CardTitle>
           <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowNewServiceForm(true)}>
             + Novo Serviço
           </Button>
         </CardHeader>
          {showNewServiceForm && (
            <div className="border-b border-gray-100">
              <div className="p-4 space-y-3 bg-emerald-50/30 border-b border-emerald-100">
                <p className="text-sm font-semibold text-emerald-800">Novo Serviço</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-gray-600 mb-1 block">Nome do Serviço *</Label>
                    <Input className="h-9 text-sm" value={newService.name} onChange={e => setNewService(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Licença Ambiental LP" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Status</Label>
                    <Select value={newService.status} onValueChange={v => setNewService(p => ({ ...p, status: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Em Proposta','Contratado','Em Andamento','Concluído','Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Valor Total (R$)</Label>
                    <Input className="h-9 text-sm" type="number" value={newService.value} onChange={e => setNewService(p => ({ ...p, value: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Tipo de Pagamento</Label>
                    <Select value={newService.payment_type} onValueChange={v => setNewService(p => ({ ...p, payment_type: v, due_dates: [], installments: '' }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avista">À Vista</SelectItem>
                        <SelectItem value="parcelado">Parcelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1 block">Forma de Pagamento</Label>
                    <Select value={newService.payment_method} onValueChange={v => setNewService(p => ({ ...p, payment_method: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{['Pix','Transferência','Boleto','Cartão de Crédito','Cartão de Débito','Dinheiro','Cheque','Outro'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {newService.payment_type === 'avista' && (
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Data de Vencimento</Label>
                      <Input className="h-9 text-sm" type="date" value={newService.start_date} onChange={e => setNewService(p => ({ ...p, start_date: e.target.value }))} />
                    </div>
                  )}
                  {newService.payment_type === 'parcelado' && (
                    <>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Nº de Parcelas</Label>
                        <Input className="h-9 text-sm" type="number" min="2" value={newService.installments} onChange={e => {
                          const n = parseInt(e.target.value) || 0;
                          const dates = Array.from({ length: n }, (_, i) => newService.due_dates?.[i] || '');
                          const inst_data = Array.from({ length: n }, (_, i) => newService.installments_data?.[i] || { due_date: dates[i] || '', received: false, received_at: '' });
                          setNewService(p => ({ ...p, installments: e.target.value, due_dates: dates, installments_data: inst_data }));
                        }} placeholder="Ex: 3" />
                      </div>
                      {parseInt(newService.installments) > 0 && (
                        <div className="sm:col-span-2 space-y-3">
                          <Label className="text-xs text-gray-600 block">Parcelas</Label>
                          <div className="space-y-3">
                            {Array.from({ length: parseInt(newService.installments) }, (_, idx) => {
                              const inst = newService.installments_data?.[idx] || { due_date: newService.due_dates?.[idx] || '', received: false, received_at: '' };
                              return (
                                <div key={idx} className="p-3 border border-gray-200 rounded-lg">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                                    <div>
                                      <Label className="text-xs text-gray-500 mb-1 block">Vencimento</Label>
                                      <Input className="h-8 text-xs" type="date" value={inst.due_date || ''} onChange={e => {
                                        const inst_data = [...(newService.installments_data || [])];
                                        inst_data[idx] = { ...inst_data[idx], due_date: e.target.value };
                                        setNewService(p => ({ ...p, installments_data: inst_data }));
                                      }} />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-gray-500 mb-1 block">Data Receb.</Label>
                                      <Input className="h-8 text-xs" type="date" value={inst.received_date || ''} onChange={e => {
                                        const inst_data = [...(newService.installments_data || [])];
                                        inst_data[idx] = { ...inst_data[idx], received_date: e.target.value };
                                        setNewService(p => ({ ...p, installments_data: inst_data }));
                                      }} />
                                    </div>
                                    <div className="flex items-end gap-1">
                                      <input type="checkbox" id={`new-inst-${idx}`} checked={inst.received} onChange={e => {
                                        const inst_data = [...(newService.installments_data || [])];
                                        inst_data[idx] = { ...inst_data[idx], received: e.target.checked };
                                        setNewService(p => ({ ...p, installments_data: inst_data }));
                                      }} className="w-4 h-4 accent-emerald-600" />
                                      <label htmlFor={`new-inst-${idx}`} className="text-xs text-gray-600 cursor-pointer flex-1">Recebido</label>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {newService.payment_type === 'avista' && (
                    <>
                      <div className="sm:col-span-2 flex items-center gap-2">
                        <input type="checkbox" id="new-received" checked={newService.received} onChange={e => setNewService(p => ({ ...p, received: e.target.checked }))} className="w-4 h-4 accent-emerald-600" />
                        <label htmlFor="new-received" className="text-sm text-gray-700 cursor-pointer">Valor já recebido</label>
                      </div>
                      {newService.received && (
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Data do Recebimento</Label>
                          <Input className="h-9 text-sm" type="date" value={newService.received_at} onChange={e => setNewService(p => ({ ...p, received_at: e.target.value }))} />
                        </div>
                      )}
                    </>
                  )}
                  <div>
                   <Label className="text-xs text-gray-600 mb-1 block flex items-center gap-1"><Landmark className="w-3 h-3"/>Conta Financeira</Label>
                   <Select value={newService.account_id || '__none__'} onValueChange={v => {
                    console.log("STEP 2 - NEW SELECT onValueChange:", v, "=> account_id:", v === '__none__' ? null : v);
                    setNewService(p => ({ ...p, account_id: v === '__none__' ? null : v }));
                   }}>
                     <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="__none__">Sem conta específica</SelectItem>
                         {financialAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                     </SelectContent>
                   </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-gray-600 mb-1 block">Observações</Label>
                    <Input className="h-9 text-sm" value={newService.notes} onChange={e => setNewService(p => ({ ...p, notes: e.target.value }))} placeholder="Detalhes do serviço" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => { setShowNewServiceForm(false); setNewService({ name: '', status: 'Em Proposta', value: '', notes: '', payment_type: 'avista', payment_method: 'Pix', installments: '', start_date: '', installments_data: [], received: false, received_at: '', account_id: null }); }}>Cancelar</Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={addNewService} disabled={upsertCRM.isPending}>Salvar</Button>
                </div>
              </div>
            </div>
          )}
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {services.map((service, i) => {
                 const totalValue = parseFloat(service.value) || 0;
                 const isParcelado = service.payment_type === 'parcelado';
                 
                 const installmentsArray = Array.isArray(service.installments_data)
                   ? service.installments_data
                   : [];
                 
                 const numParcelas = isParcelado ? installmentsArray.length || 1 : 1;
                 const installmentValue = isParcelado ? totalValue / numParcelas : null;

                return (
                   <div key={i} className={`px-4 py-3 ${service.received ? 'bg-green-50/40' : service.status === 'Cancelado' ? 'opacity-50' : ''}`}>
                     {editingIndex === i ? (
                       <div className="space-y-3 bg-blue-50/40 border border-blue-100 rounded-xl p-4">
                         <p className="text-sm font-semibold text-blue-800">Editar Serviço</p>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           <div className="sm:col-span-2">
                             <Label className="text-xs text-gray-600 mb-1 block">Nome do Serviço *</Label>
                             <Input className="h-9 text-sm" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                           </div>
                           <div>
                             <Label className="text-xs text-gray-600 mb-1 block">Status</Label>
                             <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                               <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                               <SelectContent>{['Em Proposta','Contratado','Em Andamento','Concluído','Cancelado'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                             </Select>
                           </div>
                           <div>
                             <Label className="text-xs text-gray-600 mb-1 block">Valor Total (R$)</Label>
                             <Input className="h-9 text-sm" type="number" value={editForm.value} onChange={e => setEditForm(p => ({ ...p, value: e.target.value }))} />
                           </div>
                           <div>
                             <Label className="text-xs text-gray-600 mb-1 block">Tipo de Pagamento</Label>
                             <Select value={editForm.payment_type} onValueChange={v => setEditForm(p => ({ ...p, payment_type: v, due_dates: [], installments: '' }))}>
                               <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="avista">À Vista</SelectItem>
                                 <SelectItem value="parcelado">Parcelado</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                           <div>
                             <Label className="text-xs text-gray-600 mb-1 block">Forma de Pagamento</Label>
                             <Select value={editForm.payment_method} onValueChange={v => setEditForm(p => ({ ...p, payment_method: v }))}>
                               <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                               <SelectContent>{['Pix','Transferência','Boleto','Cartão de Crédito','Cartão de Débito','Dinheiro','Cheque','Outro'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                             </Select>
                           </div>
                           {editForm.payment_type === 'avista' && (
                             <div>
                               <Label className="text-xs text-gray-600 mb-1 block">Data de Vencimento</Label>
                               <Input className="h-9 text-sm" type="date" value={editForm.start_date} onChange={e => setEditForm(p => ({ ...p, start_date: e.target.value }))} />
                             </div>
                           )}
                           {editForm.payment_type === 'parcelado' && (
                             <>
                               <div>
                                 <Label className="text-xs text-gray-600 mb-1 block">Nº de Parcelas</Label>
                                 <Input className="h-9 text-sm" type="number" min="2" value={editForm.installments} onChange={e => {
                                   const n = parseInt(e.target.value) || 0;
                                   const dates = Array.from({ length: n }, (_, i) => editForm.due_dates?.[i] || '');
                                   const inst_data = Array.from({ length: n }, (_, i) => editForm.installments_data?.[i] || { due_date: dates[i] || '', received: false, received_at: '' });
                                   setEditForm(p => ({ ...p, installments: e.target.value, due_dates: dates, installments_data: inst_data }));
                                 }} />
                               </div>
                               {parseInt(editForm.installments) > 0 && (
                                 <div className="sm:col-span-2 space-y-3">
                                   <Label className="text-xs text-gray-600 block">Parcelas</Label>
                                   <div className="space-y-3">
                                     {Array.from({ length: parseInt(editForm.installments) }, (_, idx) => {
                                       const inst = editForm.installments_data?.[idx] || { due_date: editForm.due_dates?.[idx] || '', received: false, received_at: '' };
                                       return (
                                         <div key={idx} className="p-3 border border-gray-200 rounded-lg">
                                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                                             <div>
                                               <Label className="text-xs text-gray-500 mb-1 block">Vencimento</Label>
                                               <Input className="h-8 text-xs" type="date" value={inst.due_date || ''} onChange={e => {
                                                 const inst_data = [...(editForm.installments_data || [])];
                                                 inst_data[idx] = { ...inst_data[idx], due_date: e.target.value };
                                                 setEditForm(p => ({ ...p, installments_data: inst_data }));
                                               }} />
                                             </div>
                                             <div>
                                                         <Label className="text-xs text-gray-500 mb-1 block">Data Receb.</Label>
                                                         <Input className="h-8 text-xs" type="date" value={inst.received_date || ''} onChange={e => {
                                                           const inst_data = [...(editForm.installments_data || [])];
                                                           inst_data[idx] = { ...inst_data[idx], received_date: e.target.value };
                                                           setEditForm(p => ({ ...p, installments_data: inst_data }));
                                                         }} />
                                                       </div>
                                             <div className="flex items-end gap-1">
                                               <input type="checkbox" id={`edit-inst-${idx}`} checked={inst.received} onChange={e => {
                                                 const inst_data = [...(editForm.installments_data || [])];
                                                 inst_data[idx] = { ...inst_data[idx], received: e.target.checked };
                                                 setEditForm(p => ({ ...p, installments_data: inst_data }));
                                               }} className="w-4 h-4 accent-emerald-600" />
                                               <label htmlFor={`edit-inst-${idx}`} className="text-xs text-gray-600 cursor-pointer flex-1">Recebido</label>
                                             </div>
                                           </div>
                                         </div>
                                       );
                                     })}
                                   </div>
                                 </div>
                               )}
                             </>
                           )}
                           {editForm.payment_type === 'avista' && (
                             <>
                               <div className="sm:col-span-2 flex items-center gap-2">
                                 <input type="checkbox" id={`edit-received-${i}`} checked={editForm.received} onChange={e => setEditForm(p => ({ ...p, received: e.target.checked }))} className="w-4 h-4 accent-emerald-600" />
                                 <label htmlFor={`edit-received-${i}`} className="text-sm text-gray-700 cursor-pointer">Valor já recebido</label>
                               </div>
                               {editForm.received && (
                                 <div>
                                   <Label className="text-xs text-gray-600 mb-1 block">Data do Recebimento</Label>
                                   <Input className="h-9 text-sm" type="date" value={editForm.received_at} onChange={e => setEditForm(p => ({ ...p, received_at: e.target.value }))} />
                                 </div>
                               )}
                             </>
                           )}
                           {editForm.payment_type === 'parcelado' && (
                             <div className="sm:col-span-2 text-xs text-gray-500 px-3 py-2 bg-gray-50 rounded-lg">
                               ℹ️ Configure a data de recebimento de cada parcela acima
                             </div>
                           )}
                           <div>
                             <Label className="text-xs text-gray-600 mb-1 block flex items-center gap-1"><Landmark className="w-3 h-3"/>Conta Financeira</Label>
                             <Select value={editForm.account_id || '__none__'} onValueChange={v => {
                               console.log("STEP 2 - EDIT SELECT onValueChange:", v, "=> account_id:", v === '__none__' ? null : v);
                               setEditForm(p => ({ ...p, account_id: v === '__none__' ? null : v }));
                             }}>
                               <SelectTrigger className="h-9 text-sm">
                                 <SelectValue placeholder="Selecione a conta" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="__none__">Sem conta específica</SelectItem>
                                 {financialAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                               </SelectContent>
                             </Select>
                           </div>
                           <div className="sm:col-span-2">
                             <Label className="text-xs text-gray-600 mb-1 block">Observações</Label>
                             <Input className="h-9 text-sm" value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
                           </div>
                           </div>
                           <div className="flex justify-end gap-2 pt-1">
                           <Button size="sm" variant="outline" onClick={() => setEditingIndex(null)}>Cancelar</Button>
                           <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={saveEdit} disabled={upsertCRM.isPending}>Salvar</Button>
                         </div>
                       </div>
                     ) : (
                     <div className="flex items-start gap-3">
                     <div className="mt-0.5">
                       {service.received
                         ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                         : <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                       }
                     </div>
                     <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start gap-2 justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                          {service.notes && <p className="text-xs text-gray-500">{service.notes}</p>}
                          {!isParcelado && service.start_date && (
                            <p className="text-xs text-gray-400">Vencimento: {new Date(service.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900">
                            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {installmentValue && (
                            <p className="text-xs text-gray-500 mt-1">
                              {numParcelas}x de R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      </div>
                      {isParcelado && installmentsArray.length > 0 && (
                        <div className="mt-1.5 space-y-1.5">
                          {installmentsArray.map((inst, pi) => (
                            <div key={pi} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md flex items-center justify-between gap-2">
                              <span>
                                Parcela {inst.number}: {new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </span>
                              {inst.received ? (
                                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                                  ✓ {inst.received_date ? new Date(inst.received_date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Recebido'}
                                </span>
                              ) : (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Aguardando</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge className={`${STATUS_COLOR[service.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                          {service.status}
                        </Badge>
                        {service.payment_method && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">{service.payment_method}</span>
                        )}
                        {service.account_id && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md flex items-center gap-1">
                            <Landmark className="w-3 h-3"/>
                            {financialAccounts.find(a => a.id === service.account_id)?.name || '...'}
                          </span>
                        )}
                        {isParcelado
                          ? <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md font-medium">📊 {numParcelas}x Parcelado</span>
                          : <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">À Vista</span>
                        }
                        {!isParcelado && (
                          <>
                            {service.received ? (
                              <>
                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-md font-medium">
                                  ✓ Recebido{service.received_at ? ` em ${new Date(service.received_at).toLocaleDateString('pt-BR')}` : ''}
                                </span>
                                <Button size="sm" variant="outline" className="h-6 text-xs px-2 border-green-300 text-green-700 hover:bg-green-50" onClick={() => toggleReceived(i)}>
                                  Desfazer
                                </Button>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="date"
                                  className="h-7 text-xs border border-gray-300 rounded px-1.5 text-gray-600"
                                  value={receivedDateInput[i] || ''}
                                  onChange={e => setReceivedDateInput(prev => ({ ...prev, [i]: e.target.value }))}
                                />
                                <Button size="sm" className="h-7 text-xs px-2 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => toggleReceived(i)}>
                                  Marcar Recebido
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0 ml-2">
                      <button onClick={() => startEdit(service, i)} className="p-1 hover:bg-blue-50 rounded text-gray-300 hover:text-blue-500 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteService(i)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    </div>
                    )}
                    </div>
                    );
                    })}
                    </div>
                    </CardContent>
                    </Card>
    </div>
  );
}