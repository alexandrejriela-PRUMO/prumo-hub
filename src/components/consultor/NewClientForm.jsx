import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Building2, Plus, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const ATIVIDADES_RURAIS = ['Agricultura','Pecuária','Silvicultura','Aquicultura','Extrativismo','Agroindústria','Turismo Rural','Outro'];

export default function NewClientForm({ isOpen, onClose, consultorEmail, onSuccess }) {
  const queryClient = useQueryClient();

  const [clientType, setClientType] = useState('pf'); // 'pf' | 'pj'
  const [step, setStep] = useState(1);

  // Dados cliente
  const [clientData, setClientData] = useState({
    // PF
    full_name: '',
    cpf: '',
    rg: '',
    birth_date: '',
    // PJ
    company_name: '',
    cnpj: '',
    state_registration: '',
    // Comum
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
  });

  // Dados propriedade
  const [propertyData, setPropertyData] = useState({
    property_name: '',
    property_type: 'rural',
    location: '',
    city: '',
    state: '',
    total_hectares: '',
    app_hectares: '',
    legal_reserve_hectares: '',
    total_area_m2: '',
    built_area_m2: '',
    main_activity: '',
    activities: '',
  });

  const [addProperty, setAddProperty] = useState(false);

  const createProperty = useMutation({
    mutationFn: (data) => base44.entities.Property.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['consultor-properties'] });
      toast.success('Cliente e propriedade cadastrados com sucesso!');
      onSuccess?.(result);
      handleClose();
    },
    onError: () => toast.error('Erro ao cadastrar propriedade.')
  });

  const handleClose = () => {
    setStep(1);
    setClientType('pf');
    setClientData({ full_name:'',cpf:'',rg:'',birth_date:'',company_name:'',cnpj:'',state_registration:'',email:'',phone:'',address:'',city:'',state:'',zip_code:'',notes:'' });
    setPropertyData({ property_name:'',property_type:'rural',location:'',city:'',state:'',total_hectares:'',app_hectares:'',legal_reserve_hectares:'',total_area_m2:'',built_area_m2:'',main_activity:'',activities:'' });
    setAddProperty(true);
    onClose();
  };

  const handleNextStep = () => {
    const name = clientType === 'pf' ? clientData.full_name : clientData.company_name;
    if (!name || !clientData.email) {
      toast.error('Preencha o nome e o e-mail do cliente.');
      return;
    }
    if (addProperty) {
      setStep(2);
    } else {
      // Salvar cliente sem propriedade vinculada - cria uma propriedade mínima com os dados do cliente
      const clientName = clientType === 'pf' ? clientData.full_name : clientData.company_name;
      createProperty.mutate({
        owner_email: clientData.email,
        property_name: `Cliente: ${clientName}`,
        property_type: 'rural',
        is_client_only: true,
        city: clientData.city,
        state: clientData.state,
        consultor_email: consultorEmail,
        client_name: clientName,
        client_contact: `${clientData.phone || ''}${clientData.phone && clientData.email ? ' | ' : ''}${clientData.email || ''}`,
        authorized_users: JSON.stringify({ client_type: clientType, ...buildClientObject(), notes: clientData.notes }),
      });
    }
  };

  const handleSubmit = () => {
    if (!propertyData.property_name) {
      toast.error('Informe o nome da propriedade/empreendimento.');
      return;
    }

    const clientName = clientType === 'pf' ? clientData.full_name : clientData.company_name;
    const contactInfo = `${clientData.phone || ''}${clientData.phone && clientData.email ? ' | ' : ''}${clientData.email || ''}`;

    // Montar notes com dados completos do cliente
    const clientNotes = buildClientNotes();

    createProperty.mutate({
      owner_email: clientData.email,
      property_name: propertyData.property_name,
      property_type: propertyData.property_type,
      location: propertyData.location || propertyData.address,
      city: propertyData.city || clientData.city,
      state: propertyData.state || clientData.state,
      total_hectares: propertyData.property_type === 'rural' ? (parseFloat(propertyData.total_hectares) || 0) : undefined,
      app_hectares: propertyData.property_type === 'rural' ? (parseFloat(propertyData.app_hectares) || 0) : undefined,
      legal_reserve_hectares: propertyData.property_type === 'rural' ? (parseFloat(propertyData.legal_reserve_hectares) || 0) : undefined,
      total_area_m2: propertyData.property_type === 'urbano' ? (parseFloat(propertyData.total_area_m2) || 0) : undefined,
      built_area_m2: propertyData.property_type === 'urbano' ? (parseFloat(propertyData.built_area_m2) || 0) : undefined,
      main_activity: propertyData.main_activity,
      activities: propertyData.activities,
      consultor_email: consultorEmail,
      client_name: clientName,
      client_contact: contactInfo,
      authorized_users: JSON.stringify({ client_type: clientType, ...buildClientObject(), notes: clientData.notes }),
    });
  };

  function buildClientObject() {
    if (clientType === 'pf') {
      return { cpf: clientData.cpf, rg: clientData.rg, birth_date: clientData.birth_date, phone: clientData.phone, address: clientData.address, city: clientData.city, state: clientData.state, zip_code: clientData.zip_code };
    } else {
      return { cnpj: clientData.cnpj, state_registration: clientData.state_registration, phone: clientData.phone, address: clientData.address, city: clientData.city, state: clientData.state, zip_code: clientData.zip_code };
    }
  }

  function buildClientNotes() {
    if (clientType === 'pf') return `CPF: ${clientData.cpf} | RG: ${clientData.rg}`;
    return `CNPJ: ${clientData.cnpj} | IE: ${clientData.state_registration}`;
  }

  const set = (field, val) => setClientData(prev => ({ ...prev, [field]: val }));
  const setProp = (field, val) => setPropertyData(prev => ({ ...prev, [field]: val }));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-800">
            <Plus className="w-5 h-5" />
            Novo Cliente
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-5">
            {/* Tipo de pessoa */}
            <Tabs value={clientType} onValueChange={setClientType}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pf" className="flex items-center gap-2">
                  <User className="w-4 h-4" /> Pessoa Física
                </TabsTrigger>
                <TabsTrigger value="pj" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Pessoa Jurídica
                </TabsTrigger>
              </TabsList>

              {/* PF */}
              <TabsContent value="pf" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome Completo *</Label>
                    <Input value={clientData.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nome completo" />
                  </div>
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
              </TabsContent>

              {/* PJ */}
              <TabsContent value="pj" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Razão Social *</Label>
                    <Input value={clientData.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Nome da empresa" />
                  </div>
                  <div>
                    <Label>CNPJ</Label>
                    <Input value={clientData.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
                  </div>
                  <div>
                    <Label>Inscrição Estadual</Label>
                    <Input value={clientData.state_registration} onChange={e => set('state_registration', e.target.value)} placeholder="IE" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Contato */}
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Contato e Endereço</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>E-mail *</Label>
                  <Input type="email" value={clientData.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
                </div>
                <div>
                  <Label>Telefone / WhatsApp</Label>
                  <Input value={clientData.phone} onChange={e => set('phone', e.target.value)} placeholder="(00) 00000-0000" />
                </div>
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
                    <SelectContent>
                      {ESTADOS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CEP</Label>
                  <Input value={clientData.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="00000-000" />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Input value={clientData.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas adicionais" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleNextStep}>
                Salvar Cliente
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-semibold text-gray-700">Dados da Propriedade / Empreendimento</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome da Propriedade / Empreendimento *</Label>
                <Input value={propertyData.property_name} onChange={e => setProp('property_name', e.target.value)} placeholder="Ex: Fazenda São João" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={propertyData.property_type} onValueChange={val => setProp('property_type', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rural">Rural</SelectItem>
                    <SelectItem value="urbano">Urbano / Empreendimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Atividade Principal</Label>
                {propertyData.property_type === 'rural' ? (
                  <Select value={propertyData.main_activity} onValueChange={val => setProp('main_activity', val)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {ATIVIDADES_RURAIS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={propertyData.main_activity} onChange={e => setProp('main_activity', e.target.value)} placeholder="Ex: Condomínio Residencial" />
                )}
              </div>
              <div className="col-span-2">
                <Label>Endereço / Localização</Label>
                <Input value={propertyData.location} onChange={e => setProp('location', e.target.value)} placeholder="Endereço completo" />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={propertyData.city} onChange={e => setProp('city', e.target.value)} placeholder="Cidade" />
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={propertyData.state} onValueChange={val => setProp('state', val)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {propertyData.property_type === 'rural' ? (
                <>
                  <div>
                    <Label>Área Total (ha)</Label>
                    <Input type="number" value={propertyData.total_hectares} onChange={e => setProp('total_hectares', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label>APP (ha)</Label>
                    <Input type="number" value={propertyData.app_hectares} onChange={e => setProp('app_hectares', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label>Reserva Legal (ha)</Label>
                    <Input type="number" value={propertyData.legal_reserve_hectares} onChange={e => setProp('legal_reserve_hectares', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label>Atividades (separadas por vírgula)</Label>
                    <Input value={propertyData.activities} onChange={e => setProp('activities', e.target.value)} placeholder="Ex: Soja, Milho, Bovinocultura" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Área Total (m²)</Label>
                    <Input type="number" value={propertyData.total_area_m2} onChange={e => setProp('total_area_m2', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label>Área Construída (m²)</Label>
                    <Input type="number" value={propertyData.built_area_m2} onChange={e => setProp('built_area_m2', e.target.value)} placeholder="0" />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Voltar</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSubmit}
                disabled={createProperty.isPending}
              >
                {createProperty.isPending ? 'Salvando...' : 'Salvar Cliente'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}