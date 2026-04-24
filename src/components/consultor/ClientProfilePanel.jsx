import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, Building2, Mail, Phone, MapPin, FileText, Calendar, Hash, Info, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import PropertyLinkManager from './PropertyLinkManager';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const ATIVIDADES_RURAIS = ['Agricultura','Pecuária','Silvicultura','Aquicultura','Extrativismo','Agroindústria','Turismo Rural','Outro'];

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <Icon className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-800 break-words">{value}</p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs text-gray-600">{label}</Label>
      {children}
    </div>
  );
}

export default function ClientProfilePanel({ client, onUpdate }) {
  const queryClient = useQueryClient();

  // Derivados do client atual (reactive)
  const clientType = client?.client_type || 'pf';
  const isPF = clientType === 'pf';
  const clientName = client?.client_name || client?.client_email?.split('@')[0] || '?';

  const buildPersonalData = (c) => {
    const ct = c?.client_type || 'pf';
    const isPf = ct === 'pf';
    const name = c?.client_name || c?.client_email?.split('@')[0] || '';
    return {
      client_type: ct,
      full_name: isPf ? name : '',
      company_name: !isPf ? name : '',
      email: c?.client_email || '',
      phone: c?.client_phone || '',
      cpf: c?.cpf || '',
      rg: c?.rg || '',
      birth_date: c?.birth_date || '',
      cnpj: c?.cnpj || '',
      state_registration: c?.state_registration || '',
      address: c?.address || '',
      city: c?.city || '',
      state: c?.state || '',
      zip_code: c?.zip_code || '',
      notes: c?.notes || '',
    };
  };

  const [editingPersonal, setEditingPersonal] = React.useState(false);
  const [personalData, setPersonalData] = React.useState(() => buildPersonalData(client));

  // Reinicializa estado quando muda de cliente
  React.useEffect(() => {
    setPersonalData(buildPersonalData(client));
    setEditingPersonal(false);
  }, [client?.id]);

  const [editingProperty, setEditingProperty] = React.useState(null);
  const [propertyForm, setPropertyForm] = React.useState({});
  const [addingProperty, setAddingProperty] = React.useState(false);
  const [newPropertyForm, setNewPropertyForm] = React.useState({
    property_name: '', property_type: 'rural', location: '', city: '', state: '',
    total_hectares: '', app_hectares: '', legal_reserve_hectares: '',
    total_area_m2: '', built_area_m2: '', main_activity: '', activities: '',
  });

  const set = (field, val) => setPersonalData(prev => ({ ...prev, [field]: val }));
  const setProp = (field, val) => setPropertyForm(prev => ({ ...prev, [field]: val }));
  const setNewProp = (field, val) => setNewPropertyForm(prev => ({ ...prev, [field]: val }));

  const updatePersonal = useMutation({
    mutationFn: async () => {
      if (!client?.id) throw new Error('Client ID not found');
      const name = personalData?.client_type === 'pf' ? personalData?.full_name : personalData?.company_name;
      await base44.entities.ClientCRM.update(client.id, {
        client_name: name,
        client_email: personalData.email,
        client_phone: personalData.phone,
        client_type: personalData.client_type,
        cpf: personalData.cpf,
        rg: personalData.rg,
        birth_date: personalData.birth_date || undefined,
        cnpj: personalData.cnpj,
        state_registration: personalData.state_registration,
        address: personalData.address,
        city: personalData.city,
        state: personalData.state,
        zip_code: personalData.zip_code,
        notes: personalData.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultor-crm-clients'] });
      queryClient.invalidateQueries({ queryKey: ['consultor-properties'] });
      queryClient.invalidateQueries({ queryKey: ['crm-board-list'] });
      toast.success('Dados atualizados!');
      setEditingPersonal(false);
      onUpdate?.();
    },
    onError: () => toast.error('Erro ao atualizar dados.')
  });

  const updateProperty = useMutation({
    mutationFn: () => {
      if (!editingProperty?.id) throw new Error('Property ID not found');
      return base44.entities.Property.update(editingProperty.id, {
        property_name: propertyForm?.property_name || '',
        property_type: propertyForm?.property_type || 'rural',
        location: propertyForm?.location || '',
        city: propertyForm?.city || '',
        state: propertyForm?.state || '',
        main_activity: propertyForm?.main_activity || '',
        activities: propertyForm?.activities || '',
        owner_email: client?.client_email || '',
        client_name: clientName || '',
        total_hectares: (propertyForm?.property_type === 'rural') ? (parseFloat(propertyForm?.total_hectares) || 0) : undefined,
        app_hectares: (propertyForm?.property_type === 'rural') ? (parseFloat(propertyForm?.app_hectares) || 0) : undefined,
        legal_reserve_hectares: (propertyForm?.property_type === 'rural') ? (parseFloat(propertyForm?.legal_reserve_hectares) || 0) : undefined,
        total_area_m2: (propertyForm?.property_type === 'urbano') ? (parseFloat(propertyForm?.total_area_m2) || 0) : undefined,
        built_area_m2: (propertyForm?.property_type === 'urbano') ? (parseFloat(propertyForm?.built_area_m2) || 0) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultor-properties'] });
      queryClient.invalidateQueries({ queryKey: ['consultor-crm-clients'] });
      toast.success('Propriedade atualizada!');
      setEditingProperty(null);
    },
    onError: (err) => toast.error('Erro ao atualizar propriedade: ' + (err.message || ''))
  });

  const createProperty = useMutation({
    mutationFn: async () => {
      if (!client?.client_email) throw new Error('Client email not found');
      const newProp = await base44.entities.Property.create({
        owner_email: client.client_email,
        property_name: newPropertyForm?.property_name || '',
        property_type: newPropertyForm?.property_type || 'rural',
        location: newPropertyForm?.location || '',
        city: newPropertyForm?.city || '',
        state: newPropertyForm?.state || '',
        main_activity: newPropertyForm?.main_activity || '',
        activities: newPropertyForm?.activities || '',
        total_hectares: (newPropertyForm?.property_type === 'rural') ? (parseFloat(newPropertyForm?.total_hectares) || 0) : undefined,
        app_hectares: (newPropertyForm?.property_type === 'rural') ? (parseFloat(newPropertyForm?.app_hectares) || 0) : undefined,
        legal_reserve_hectares: (newPropertyForm?.property_type === 'rural') ? (parseFloat(newPropertyForm?.legal_reserve_hectares) || 0) : undefined,
        total_area_m2: (newPropertyForm?.property_type === 'urbano') ? (parseFloat(newPropertyForm?.total_area_m2) || 0) : undefined,
        built_area_m2: (newPropertyForm?.property_type === 'urbano') ? (parseFloat(newPropertyForm?.built_area_m2) || 0) : undefined,
        consultor_email: client?.consultor_email || '',
        client_name: clientName || '',
      });
      // Sincroniza vinculação no ClientCRM
      if (client?.id) {
        await base44.entities.ClientCRM.update(client.id, { property_id: newProp?.id });
      }
      return newProp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultor-properties'] });
      queryClient.invalidateQueries({ queryKey: ['consultor-crm-clients'] });
      toast.success('Propriedade adicionada!');
      setAddingProperty(false);
      setNewPropertyForm({ property_name:'',property_type:'rural',location:'',city:'',state:'',total_hectares:'',app_hectares:'',legal_reserve_hectares:'',total_area_m2:'',built_area_m2:'',main_activity:'',activities:'' });
    },
    onError: (err) => toast.error('Erro ao criar propriedade: ' + (err.message || ''))
  });

  const openEditProperty = (prop) => {
    if (!prop?.id) return;
    setEditingProperty(prop);
    setPropertyForm({
      property_name: prop?.property_name || '',
      property_type: prop?.property_type || 'rural',
      location: prop?.location || '',
      city: prop?.city || '',
      state: prop?.state || '',
      main_activity: prop?.main_activity || '',
      activities: prop?.activities || '',
      total_hectares: prop?.total_hectares || '',
      app_hectares: prop?.app_hectares || '',
      legal_reserve_hectares: prop?.legal_reserve_hectares || '',
      total_area_m2: prop?.total_area_m2 || '',
      built_area_m2: prop?.built_area_m2 || '',
    });
  };

  if (!client) return <div className="text-center py-8 text-gray-500">Selecione um cliente</div>;

  const visibleProperties = (client?.properties || []).filter(p => !p?.is_client_only);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl">
        <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xl font-bold">{clientName?.charAt(0)?.toUpperCase()}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{clientName}</h3>
          <Badge className={isPF ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
            {isPF ? 'Pessoa Física' : 'Pessoa Jurídica'}
          </Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditingPersonal(true)} className="gap-1">
          <Pencil className="w-3 h-3" /> Editar Perfil
        </Button>
      </div>

      {/* Dados Pessoais */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">
            {isPF ? 'Dados Pessoais' : 'Dados Empresariais'}
          </p>
          {isPF ? (
            <>
              <InfoRow icon={User} label="Nome Completo" value={clientName} />
              <InfoRow icon={Hash} label="CPF" value={client?.cpf} />
              <InfoRow icon={FileText} label="RG" value={client?.rg} />
              <InfoRow icon={Calendar} label="Data de Nascimento" value={client?.birth_date ? new Date(client.birth_date).toLocaleDateString('pt-BR') : null} />
            </>
          ) : (
            <>
              <InfoRow icon={Building2} label="Razão Social" value={clientName} />
              <InfoRow icon={Hash} label="CNPJ" value={client?.cnpj} />
              <InfoRow icon={FileText} label="Inscrição Estadual" value={client?.state_registration} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">Contato</p>
          <InfoRow icon={Mail} label="E-mail" value={client?.client_email} />
          <InfoRow icon={Phone} label="Telefone / WhatsApp" value={client?.client_phone} />
        </CardContent>
      </Card>

      {(client?.address || client?.city || client?.state) && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">Endereço</p>
            <InfoRow icon={MapPin} label="Endereço" value={client?.address} />
            <InfoRow icon={MapPin} label="Cidade" value={client?.city} />
            <InfoRow icon={MapPin} label="Estado" value={client?.state} />
            <InfoRow icon={MapPin} label="CEP" value={client?.zip_code} />
          </CardContent>
        </Card>
      )}

      {client?.notes && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">Observações</p>
            <InfoRow icon={Info} label="Notas" value={client?.notes} />
          </CardContent>
        </Card>
      )}

      {/* Propriedades com PropertyLinkManager */}
      <PropertyLinkManager 
        client={client} 
        properties={client.properties || []} 
        onRefresh={onUpdate}
      />

      {/* Botão para criar nova propriedade */}
      <div className="flex justify-center">
        <Button size="sm" variant="outline" onClick={() => setAddingProperty(true)} className="gap-1">
          <Plus className="w-3 h-3" /> Nova Propriedade / Empreendimento
        </Button>
      </div>

      {/* Modal: Editar Dados Pessoais */}
      <Dialog open={editingPersonal} onOpenChange={setEditingPersonal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Pencil className="w-4 h-4" /> Editar Dados do Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <Tabs value={personalData.client_type} onValueChange={val => set('client_type', val)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pf"><User className="w-4 h-4 mr-1" />Pessoa Física</TabsTrigger>
                <TabsTrigger value="pj"><Building2 className="w-4 h-4 mr-1" />Pessoa Jurídica</TabsTrigger>
              </TabsList>
              <TabsContent value="pf" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Nome Completo *">
                      <Input value={personalData.full_name} onChange={e => set('full_name', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="CPF">
                    <Input value={personalData.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
                  </Field>
                  <Field label="RG">
                    <Input value={personalData.rg} onChange={e => set('rg', e.target.value)} />
                  </Field>
                  <Field label="Data de Nascimento">
                    <Input type="date" value={personalData.birth_date} onChange={e => set('birth_date', e.target.value)} />
                  </Field>
                </div>
              </TabsContent>
              <TabsContent value="pj" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Razão Social *">
                      <Input value={personalData.company_name} onChange={e => set('company_name', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="CNPJ">
                    <Input value={personalData.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
                  </Field>
                  <Field label="Inscrição Estadual">
                    <Input value={personalData.state_registration} onChange={e => set('state_registration', e.target.value)} />
                  </Field>
                </div>
              </TabsContent>
            </Tabs>

            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Contato e Endereço</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail">
                  <Input value={personalData.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
                </Field>
                <Field label="Telefone / WhatsApp">
                  <Input value={personalData.phone} onChange={e => set('phone', e.target.value)} placeholder="(00) 00000-0000" />
                </Field>
                <div className="col-span-2">
                  <Field label="Endereço">
                    <Input value={personalData.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, bairro" />
                  </Field>
                </div>
                <Field label="Cidade">
                  <Input value={personalData.city} onChange={e => set('city', e.target.value)} />
                </Field>
                <Field label="Estado">
                  <Select value={personalData.state} onValueChange={val => set('state', val)}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>{ESTADOS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="CEP">
                  <Input value={personalData.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="00000-000" />
                </Field>
                <Field label="Observações">
                  <Input value={personalData.notes} onChange={e => set('notes', e.target.value)} />
                </Field>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditingPersonal(false)}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updatePersonal.mutate()} disabled={updatePersonal.isPending}>
                {updatePersonal.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Propriedade */}
      <Dialog open={!!editingProperty} onOpenChange={() => setEditingProperty(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Pencil className="w-4 h-4" /> Editar Propriedade
            </DialogTitle>
          </DialogHeader>
          <PropertyFormFields form={propertyForm} setField={setProp} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditingProperty(null)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateProperty.mutate()} disabled={updateProperty.isPending}>
              {updateProperty.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Nova Propriedade */}
      <Dialog open={addingProperty} onOpenChange={setAddingProperty}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Plus className="w-4 h-4" /> Nova Propriedade / Empreendimento
            </DialogTitle>
          </DialogHeader>
          <PropertyFormFields form={newPropertyForm} setField={setNewProp} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setAddingProperty(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => createProperty.mutate()} disabled={createProperty.isPending}>
              {createProperty.isPending ? 'Salvando...' : 'Adicionar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PropertyFormFields({ form, setField }) {
  const ATIVIDADES = ['Agricultura','Pecuária','Silvicultura','Aquicultura','Extrativismo','Agroindústria','Turismo Rural','Outro'];
  const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <Label>Nome da Propriedade *</Label>
        <Input value={form.property_name} onChange={e => setField('property_name', e.target.value)} />
      </div>
      <div>
        <Label>Tipo</Label>
        <Select value={form.property_type} onValueChange={val => setField('property_type', val)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="rural">Rural</SelectItem>
            <SelectItem value="urbano">Urbano / Empreendimento</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Atividade Principal</Label>
        {form.property_type === 'rural' ? (
          <Select value={form.main_activity} onValueChange={val => setField('main_activity', val)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{ATIVIDADES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        ) : (
          <Input value={form.main_activity} onChange={e => setField('main_activity', e.target.value)} />
        )}
      </div>
      <div className="col-span-2">
        <Label>Localização</Label>
        <Input value={form.location} onChange={e => setField('location', e.target.value)} />
      </div>
      <div>
        <Label>Cidade</Label>
        <Input value={form.city} onChange={e => setField('city', e.target.value)} />
      </div>
      <div>
        <Label>Estado</Label>
        <Select value={form.state} onValueChange={val => setField('state', val)}>
          <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>{UFS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {form.property_type === 'rural' ? (
        <>
          <div><Label>Área Total (ha)</Label><Input type="number" value={form.total_hectares} onChange={e => setField('total_hectares', e.target.value)} /></div>
          <div><Label>APP (ha)</Label><Input type="number" value={form.app_hectares} onChange={e => setField('app_hectares', e.target.value)} /></div>
          <div><Label>Reserva Legal (ha)</Label><Input type="number" value={form.legal_reserve_hectares} onChange={e => setField('legal_reserve_hectares', e.target.value)} /></div>
          <div><Label>Atividades</Label><Input value={form.activities} onChange={e => setField('activities', e.target.value)} placeholder="Ex: Soja, Milho" /></div>
        </>
      ) : (
        <>
          <div><Label>Área Total (m²)</Label><Input type="number" value={form.total_area_m2} onChange={e => setField('total_area_m2', e.target.value)} /></div>
          <div><Label>Área Construída (m²)</Label><Input type="number" value={form.built_area_m2} onChange={e => setField('built_area_m2', e.target.value)} /></div>
        </>
      )}
    </div>
  );
}