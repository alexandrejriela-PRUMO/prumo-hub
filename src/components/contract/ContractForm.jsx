import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, CheckCircle, FileText } from 'lucide-react';

const CONTRACT_TYPES = [
  'Prestação de Serviços Ambientais','Assessoria Ambiental','Licenciamento Ambiental',
  'PRAD - Recuperação de Área Degradada','Georreferenciamento','Mapeamento de Agricultura de Precisão',
  'CAR / Regularização Fundiária','Consultoria Técnica Rural','Consultoria Agronômica',
  'Assistência Técnica e Extensão Rural (ATER)','Contrato de Arrendamento Rural',
  'Contrato de Parceria Agrícola','Contrato de Parceria Pecuária','Contrato de Comodato Rural',
  'Contrato de Compra e Venda de Imóvel Rural','Contrato de Compra e Venda de Soja',
  'Contrato de Compra e Venda de Milho','Contrato de Compra e Venda de Arroz',
  'Contrato de Compra e Venda de Trigo','Contrato de Compra e Venda de Canola',
  'Contrato de Compra e Venda de Boi / Pecuária','Contrato de Compra e Venda de Algodão',
  'Contrato de Compra de Sementes','Contrato de Compra de Insumos / Defensivos',
  'Contrato de Compra de Máquinas e Equipamentos','CPR - Cédula de Produto Rural',
  'Contrato de Prestação de Serviços de Terraplanagem','Contrato de Prestação de Serviços de Irrigação',
  'Contrato de Prestação de Serviços de Colheita','Contrato de Prestação de Serviços de Pulverização',
  'Contrato de Prestação de Serviços de Transporte de Grãos','Contrato de Terceirização de Serviços Rurais',
  'Contrato de Trabalho Rural (CLT)','Contrato de Trabalho Rural (Temporário)',
  'Contrato de Honorários Advocatícios','Contrato de Honorários Contábeis',
  'Contrato de Gestão Financeira','Contrato de Seguro Rural','Contrato de Seguro de Máquinas',
  'Contrato de Armazenagem de Grãos','Contrato de Rastreabilidade / Certificação','Outro'
];

export default function ContractForm({ user, templates = [], onSubmit }) {
  const savedContratado = (() => {
    try { return JSON.parse(localStorage.getItem('prumo_contratado_data')) || null; } catch { return null; }
  })();

  const [formData, setFormData] = useState({
    property_id: '',
    client_email: '',
    client_name: '',
    contract_number: '',
    contract_type: 'Prestação de Serviços Ambientais',
    object: '',
    start_date: '',
    end_date: '',
    status: 'Proposta',
    total_value: '',
    payment_terms: '',
    alert_days_before_expiry: 30,
    parties: [],
    services_linked: [],
    notes: '',
  });

  const [newParty, setNewParty] = useState({ name: '', role: 'Contratante', document: '', address: '' });
  const [partySearch, setPartySearch] = useState('');
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [newService, setNewService] = useState({ name: '', value: '', status: 'Em Andamento' });
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Dados do consultor (Contratada) - via SaaS contract log
  const { data: saasContractLog } = useQuery({
    queryKey: ['saas-contract-log-gen', user?.email],
    queryFn: async () => {
      const logs = await base44.entities.TermsAcceptanceLog.filter({ user_email: user.email });
      return logs.filter(l => l.terms_version >= 1001 && l.contractor_name)
        .sort((a, b) => new Date(b.accepted_at) - new Date(a.accepted_at))[0] || null;
    },
    enabled: !!user?.email,
  });

  // Propriedades do consultor
  const { data: properties = [] } = useQuery({
    queryKey: ['properties-gen', user?.email],
    queryFn: () => base44.entities.Property.filter({ consultor_email: user?.email }),
    enabled: !!user?.email,
  });

  // Clientes CRM
  const { data: crmClients = [] } = useQuery({
    queryKey: ['crm-clients-gen', user?.email],
    queryFn: () => base44.entities.ClientCRM.filter({ consultor_email: user?.email }),
    enabled: !!user?.email,
  });

  // Quando seleciona uma propriedade, preenche o cliente
  const handlePropertyChange = (pid) => {
    const prop = properties.find(p => p.id === pid);
    setFormData(prev => ({
      ...prev,
      property_id: pid,
      client_email: prop?.owner_email || '',
      client_name: prop?.client_name || prop?.owner_names || '',
    }));
  };

  // Auto-completar Contratada com dados do consultor quando role = Contratado
  const handlePartyRoleChange = (role) => {
    if (role === 'Contratado') {
      const consultorData = saasContractLog
        ? { name: saasContractLog.contractor_name || '', document: saasContractLog.contractor_document || '', address: saasContractLog.contractor_address || '' }
        : savedContratado;
      if (consultorData) {
        setNewParty(p => ({ ...p, role, name: consultorData.name, document: consultorData.document || '', address: consultorData.address || '' }));
        setPartySearch(consultorData.name);
        return;
      }
    }
    setNewParty(p => ({ ...p, role }));
  };

  const filteredPartyClients = partySearch.length >= 1
    ? crmClients.filter(c =>
        c.client_name?.toLowerCase().includes(partySearch.toLowerCase()) ||
        c.client_email?.toLowerCase().includes(partySearch.toLowerCase())
      )
    : crmClients.slice(0, 6);

  const selectPartyClient = (client) => {
    setNewParty(p => ({ ...p, name: client.client_name || '' }));
    setPartySearch(client.client_name || '');
    setShowPartySuggestions(false);
  };

  const addParty = () => {
    if (!newParty.name) return;
    if (newParty.role === 'Contratado') {
      const saved = { name: newParty.name, document: newParty.document, address: newParty.address };
      localStorage.setItem('prumo_contratado_data', JSON.stringify(saved));
    }
    setFormData(prev => ({ ...prev, parties: [...(prev.parties || []), { ...newParty }] }));
    setNewParty({ name: '', role: 'Contratante', document: '', address: '' });
    setPartySearch('');
  };

  const removeParty = (idx) => {
    setFormData(prev => ({ ...prev, parties: prev.parties.filter((_, i) => i !== idx) }));
  };

  const addService = () => {
    if (!newService.name) return;
    setFormData(prev => ({
      ...prev,
      services_linked: [...(prev.services_linked || []), { ...newService, value: parseFloat(newService.value) || 0 }]
    }));
    setNewService({ name: '', value: '', status: 'Em Andamento' });
  };

  const removeService = (idx) => {
    setFormData(prev => ({ ...prev, services_linked: prev.services_linked.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      total_value: formData.total_value ? parseFloat(formData.total_value) : 0,
      template_id: selectedTemplateId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Modelos Disponíveis */}
      {templates.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Modelos de Contrato Salvos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`text-left p-3 rounded-lg border text-sm transition-all ${
                    selectedTemplateId === t.id
                      ? 'border-emerald-500 bg-emerald-100 text-emerald-900 font-semibold'
                      : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <p className="font-medium">{t.name}</p>
                  {t.contract_type && <p className="text-xs text-gray-500 mt-0.5">{t.contract_type}</p>}
                  {selectedTemplateId === t.id && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 mt-1">
                      <CheckCircle className="w-3 h-3" /> Selecionado
                    </span>
                  )}
                </button>
              ))}
            </div>
            {selectedTemplateId && (
              <button type="button" onClick={() => setSelectedTemplateId('')}
                className="mt-2 text-xs text-gray-400 hover:text-red-500 transition-colors">
                Remover seleção de modelo
              </button>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="basic">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="basic">Dados</TabsTrigger>
          <TabsTrigger value="parties">Partes</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
        </TabsList>

        {/* Dados */}
        <TabsContent value="basic" className="space-y-4 mt-4">

          {/* Propriedade / Cliente */}
          {properties.length > 0 && (
            <div>
              <Label className="text-xs">Cliente / Propriedade</Label>
              <Select value={formData.property_id} onValueChange={handlePropertyChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.client_name || p.owner_names || p.property_name} — {p.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.client_name && (
            <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-800 font-medium">Contratante: {formData.client_name}</span>
              {formData.client_email && <span className="text-emerald-600 text-xs">({formData.client_email})</span>}
            </div>
          )}

          {/* Preencher cliente manualmente se não há propriedade */}
          {properties.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Nome do Cliente *</Label>
                <Input className="mt-1" value={formData.client_name}
                  onChange={e => setFormData(p => ({ ...p, client_name: e.target.value }))} required />
              </div>
              <div>
                <Label className="text-xs">Email do Cliente</Label>
                <Input type="email" className="mt-1" value={formData.client_email}
                  onChange={e => setFormData(p => ({ ...p, client_email: e.target.value }))} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Tipo de Contrato *</Label>
              <Select value={formData.contract_type} onValueChange={v => setFormData(p => ({ ...p, contract_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nº do Contrato</Label>
              <Input className="mt-1 h-9" value={formData.contract_number}
                onChange={e => setFormData(p => ({ ...p, contract_number: e.target.value }))}
                placeholder="Ex: 001/2025" />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <Label className="text-xs">Objeto do Contrato *</Label>
              <Textarea className="mt-1 text-sm" value={formData.object}
                onChange={e => setFormData(p => ({ ...p, object: e.target.value }))}
                placeholder="Descreva o objeto e finalidade do contrato..."
                rows={3} required />
            </div>
            <div>
              <Label className="text-xs">Data de Início *</Label>
              <Input type="date" className="mt-1 h-9" value={formData.start_date}
                onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} required />
            </div>
            <div>
              <Label className="text-xs">Data de Término</Label>
              <Input type="date" className="mt-1 h-9" value={formData.end_date}
                onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Valor Total (R$)</Label>
              <Input type="number" step="0.01" className="mt-1 h-9" value={formData.total_value}
                onChange={e => setFormData(p => ({ ...p, total_value: e.target.value }))}
                placeholder="0,00" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Proposta','Ativo','Em Assinatura','Em Renovação','Encerrado','Cancelado'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Alertar X dias antes do vencimento</Label>
              <Input type="number" min="1" className="mt-1 h-9" value={formData.alert_days_before_expiry}
                onChange={e => setFormData(p => ({ ...p, alert_days_before_expiry: parseInt(e.target.value) || 30 }))} />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <Label className="text-xs">Condições de Pagamento</Label>
              <Input className="mt-1 h-9" value={formData.payment_terms}
                onChange={e => setFormData(p => ({ ...p, payment_terms: e.target.value }))}
                placeholder="Ex: 50% na assinatura, 50% na entrega" />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <Label className="text-xs">Observações / Cláusulas Adicionais</Label>
              <Textarea className="mt-1 text-sm" value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={3}
                placeholder="Termos, condições e cláusulas adicionais..." />
            </div>
          </div>
        </TabsContent>

        {/* Partes */}
        <TabsContent value="parties" className="space-y-4 mt-4">
          <p className="text-sm font-medium text-gray-700">Partes do Contrato</p>

          {/* Info Contratada automática */}
          {(saasContractLog || savedContratado) && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Contratada:</strong> Seus dados de consultor ({saasContractLog?.contractor_name || savedContratado?.name}) serão preenchidos automaticamente ao selecionar o papel "Contratado".
              </span>
            </div>
          )}

          {(formData.parties || []).length > 0 && (
            <div className="space-y-2">
              {formData.parties.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.role}{p.document && ` · ${p.document}`}</p>
                    {p.address && <p className="text-xs text-gray-400">{p.address}</p>}
                  </div>
                  <button type="button" onClick={() => removeParty(i)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 border border-dashed border-emerald-300 rounded-lg bg-emerald-50/30 space-y-2">
            <p className="text-xs font-medium text-emerald-700">Adicionar parte</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Input className="h-8 text-sm" placeholder="Nome completo *" value={partySearch}
                  onChange={e => {
                    setPartySearch(e.target.value);
                    setNewParty(p => ({ ...p, name: e.target.value }));
                    setShowPartySuggestions(true);
                  }}
                  onFocus={() => setShowPartySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPartySuggestions(false), 200)}
                  autoComplete="off"
                />
                {showPartySuggestions && filteredPartyClients.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-emerald-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {filteredPartyClients.map(c => (
                      <button key={c.id} type="button" onMouseDown={() => selectPartyClient(c)}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-0">
                        <p className="text-xs font-medium text-gray-900">{c.client_name}</p>
                        {c.client_email && <p className="text-xs text-gray-400">{c.client_email}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Select value={newParty.role} onValueChange={handlePartyRoleChange}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Contratante','Contratado','Testemunha','Fiador','Interveniente'].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input className="h-8 text-sm" placeholder="CPF/CNPJ" value={newParty.document}
                onChange={e => setNewParty(p => ({ ...p, document: e.target.value }))} />
              <Input className="h-8 text-sm" placeholder="Endereço" value={newParty.address}
                onChange={e => setNewParty(p => ({ ...p, address: e.target.value }))} />
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addParty}
              className="border-emerald-500 text-emerald-700 hover:bg-emerald-50">
              <Plus className="w-3 h-3 mr-1" /> Adicionar Parte
            </Button>
          </div>
        </TabsContent>

        {/* Serviços */}
        <TabsContent value="services" className="space-y-4 mt-4">
          <p className="text-sm font-medium text-gray-700">Serviços Vinculados ao Contrato</p>
          {(formData.services_linked || []).length > 0 && (
            <div className="space-y-2">
              {formData.services_linked.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.value > 0 && <span className="text-xs font-bold text-emerald-700">R$ {Number(s.value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>}
                      <Badge variant="outline" className="text-xs">{s.status}</Badge>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeService(i)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="p-3 border border-dashed border-emerald-300 rounded-lg bg-emerald-50/30 space-y-2">
            <p className="text-xs font-medium text-emerald-700">Adicionar serviço</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input className="h-8 text-sm sm:col-span-2" placeholder="Nome do serviço *" value={newService.name}
                onChange={e => setNewService(p => ({ ...p, name: e.target.value }))} />
              <Input type="number" className="h-8 text-sm" placeholder="Valor R$" value={newService.value}
                onChange={e => setNewService(p => ({ ...p, value: e.target.value }))} />
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addService}
              className="border-emerald-500 text-emerald-700 hover:bg-emerald-50">
              <Plus className="w-3 h-3 mr-1" /> Adicionar Serviço
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
        Próximo: Editar e Gerar Contrato
      </Button>
    </form>
  );
}