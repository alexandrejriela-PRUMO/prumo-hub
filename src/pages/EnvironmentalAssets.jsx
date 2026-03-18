import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Leaf, Plus, Edit2, Trash2, AlertCircle, Save, X, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const BIOMAS = ['Amazônia', 'Cerrado', 'Mata Atlântica', 'Caatinga', 'Pantanal', 'Pampas'];

const LEGAL_RESERVE_PERCENTAGES = {
  'Amazônia': 80,
  'Cerrado': 35,
  'Mata Atlântica': 20,
  'Caatinga': 20,
  'Pantanal': 20,
  'Pampas': 20
};

export default function EnvironmentalAssets() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('origem');
  const [editingCRA, setEditingCRA] = useState(null);
  const [craFormData, setCRAFormData] = useState({});
  const [editingSale, setEditingSale] = useState(null);
  const [saleFormData, setSaleFormData] = useState({});
  const [editingBuy, setEditingBuy] = useState(null);
  const [buyFormData, setBuyFormData] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Usuário não autenticado');
      }
    };
    loadUser();
  }, []);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: craOrigins = [], refetch: refetchCRA } = useQuery({
    queryKey: ['cra-origins', user?.email],
    queryFn: () => base44.entities.CRAOrigin.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: craTitles = [], refetch: refetchTitles } = useQuery({
    queryKey: ['cra-titles', user?.email],
    queryFn: () => base44.entities.CRATitle.filter({ owner_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: transactions = [], refetch: refetchTransactions } = useQuery({
    queryKey: ['cra-transactions', user?.email],
    queryFn: () => base44.entities.CRATransaction.filter({ seller_email: user?.email }),
    enabled: !!user?.email
  });

  // ===== ORIGEM CRA =====
  const saveCRAMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.property_id || !data.biome || !data.total_area_hectares) {
        throw new Error('Preencha os campos obrigatórios');
      }

      const total = parseFloat(data.total_area_hectares);
      const existing = parseFloat(data.existing_legal_reserve_hectares) || 0;
      
      if (total <= 0) throw new Error('Área deve ser maior que zero');

      const percentual = LEGAL_RESERVE_PERCENTAGES[data.biome] || 20;
      const required = (total * percentual) / 100;
      const surplus = Math.max(0, existing - required);

      const payload = {
        property_id: data.property_id,
        owner_email: user.email,
        consultor_email: user.email,
        car_number: data.car_number || 'SEM_CAR',
        biome: data.biome,
        state: data.state || '',
        municipality: data.municipality || '',
        total_area_hectares: total,
        required_legal_reserve_hectares: required,
        existing_legal_reserve_hectares: existing,
        surplus_native_vegetation_hectares: surplus,
        potential_cra_area_hectares: surplus,
        status: 'Validado'
      };

      if (editingCRA?.id) {
        return base44.entities.CRAOrigin.update(editingCRA.id, payload);
      }
      return base44.entities.CRAOrigin.create(payload);
    },
    onSuccess: async () => {
      await refetchCRA();
      setEditingCRA(null);
      setCRAFormData({});
      toast.success('CRA salva com sucesso!');
    },
    onError: (err) => toast.error(err.message)
  });

  // ===== VENDA DE CRA =====
  const saveSaleMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.origin_id || !data.area_hectares || !data.price_per_hectare) {
        throw new Error('Preencha os campos obrigatórios');
      }

      const origin = craOrigins.find(o => o.id === data.origin_id);
      if (!origin || origin.surplus_native_vegetation_hectares < parseFloat(data.area_hectares)) {
        throw new Error('Área disponível insuficiente');
      }

      const payload = {
        origin_id: data.origin_id,
        seller_email: user.email,
        seller_property_id: origin.property_id,
        buyer_email: data.buyer_email || '',
        area_hectares: parseFloat(data.area_hectares),
        price_per_hectare: parseFloat(data.price_per_hectare),
        total_value: parseFloat(data.area_hectares) * parseFloat(data.price_per_hectare),
        transaction_date: new Date().toISOString().split('T')[0],
        status: 'Proposta',
        notes: data.notes || ''
      };

      if (editingSale?.id) {
        return base44.entities.CRATransaction.update(editingSale.id, payload);
      }
      return base44.entities.CRATransaction.create(payload);
    },
    onSuccess: async () => {
      await refetchTransactions();
      setEditingSale(null);
      setSaleFormData({});
      toast.success('Oferta de venda criada!');
    },
    onError: (err) => toast.error(err.message)
  });

  // ===== COMPRA DE CRA =====
  const saveBuyMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.property_id || !data.area_hectares || !data.price_per_hectare) {
        throw new Error('Preencha os campos obrigatórios');
      }

      const property = properties.find(p => p.id === data.property_id);
      const targetCRA = craOrigins.find(c => c.property_id === data.property_id);
      if (!targetCRA) throw new Error('Propriedade sem CRA registrada');

      const payload = {
        buyer_email: user.email,
        buyer_property_id: data.property_id,
        seller_email: data.seller_email || '',
        cra_title_id: data.cra_title_id || 'PENDENTE',
        area_hectares: parseFloat(data.area_hectares),
        price_per_hectare: parseFloat(data.price_per_hectare),
        total_value: parseFloat(data.area_hectares) * parseFloat(data.price_per_hectare),
        transaction_date: new Date().toISOString().split('T')[0],
        status: 'Proposta',
        notes: data.notes || ''
      };

      return base44.entities.CRATransaction.create(payload);
    },
    onSuccess: async () => {
      await refetchTransactions();
      setEditingBuy(null);
      setBuyFormData({});
      toast.success('Requisição de compra criada!');
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id) => base44.entities.CRATransaction.delete(id),
    onSuccess: async () => {
      await refetchTransactions();
      toast.success('Transação removida!');
    },
    onError: () => toast.error('Erro ao remover')
  });

  const resetCRAForm = () => {
    setEditingCRA(null);
    setCRAFormData({});
  };

  const handleEditCRA = (cra) => {
    setEditingCRA(cra);
    setCRAFormData({
      property_id: cra.property_id,
      car_number: cra.car_number,
      biome: cra.biome,
      state: cra.state,
      municipality: cra.municipality,
      total_area_hectares: cra.total_area_hectares,
      existing_legal_reserve_hectares: cra.existing_legal_reserve_hectares
    });
  };

  if (!user) return <div className="p-4 text-center">Carregando...</div>;

  return (
    <div className="w-full space-y-6 p-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-emerald-100 rounded-xl">
          <Leaf className="w-8 h-8 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-emerald-900">Cotas de Reserva Ambiental</h1>
          <p className="text-sm text-emerald-600">Gestão de CRA conforme Lei 12.651/2012</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-emerald-50">
          <TabsTrigger value="origem" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
            Origem
          </TabsTrigger>
          <TabsTrigger value="venda" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
            Vender
          </TabsTrigger>
          <TabsTrigger value="compra" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
            Comprar
          </TabsTrigger>
          <TabsTrigger value="transacoes" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
            Transações
          </TabsTrigger>
          <TabsTrigger value="info" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
            Info
          </TabsTrigger>
        </TabsList>

        {/* ORIGEM */}
        <TabsContent value="origem" className="space-y-4 mt-6">
          {!editingCRA && (
            <Button onClick={() => {
              setEditingCRA({});
              setCRAFormData({
                property_id: '',
                car_number: '',
                biome: '',
                state: '',
                municipality: '',
                total_area_hectares: '',
                existing_legal_reserve_hectares: ''
              });
            }} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Registrar Origem
            </Button>
          )}

          {editingCRA && (
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader className="border-b border-emerald-200">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-emerald-900">Registrar Origem CRA</CardTitle>
                  <Button size="sm" variant="ghost" onClick={resetCRAForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Propriedade *</Label>
                    <Select value={craFormData.property_id || ''} onValueChange={(value) => setCRAFormData({ ...craFormData, property_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">CAR</Label>
                    <Input value={craFormData.car_number || ''} onChange={(e) => setCRAFormData({ ...craFormData, car_number: e.target.value })} placeholder="123.456.789-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Bioma *</Label>
                    <Select value={craFormData.biome || ''} onValueChange={(value) => setCRAFormData({ ...craFormData, biome: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {BIOMAS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Estado</Label>
                    <Input value={craFormData.state || ''} onChange={(e) => setCRAFormData({ ...craFormData, state: e.target.value })} placeholder="SP" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Município</Label>
                    <Input value={craFormData.municipality || ''} onChange={(e) => setCRAFormData({ ...craFormData, municipality: e.target.value })} placeholder="São Paulo" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Área Total (ha) *</Label>
                    <Input type="number" step="0.01" value={craFormData.total_area_hectares || ''} onChange={(e) => setCRAFormData({ ...craFormData, total_area_hectares: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Vegetação Nativa (ha) *</Label>
                    <Input type="number" step="0.01" value={craFormData.existing_legal_reserve_hectares || ''} onChange={(e) => setCRAFormData({ ...craFormData, existing_legal_reserve_hectares: e.target.value })} />
                  </div>
                  {craFormData.biome && craFormData.total_area_hectares && (
                    <div className="space-y-2">
                      <Label className="font-semibold text-emerald-900">RL Exigida</Label>
                      <div className="bg-amber-100 p-3 rounded-lg border border-amber-300">
                        <p className="font-bold text-amber-900">{LEGAL_RESERVE_PERCENTAGES[craFormData.biome]}% = {((parseFloat(craFormData.total_area_hectares) * LEGAL_RESERVE_PERCENTAGES[craFormData.biome]) / 100).toFixed(2)} ha</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-emerald-100">
                  <Button variant="outline" onClick={resetCRAForm}>Cancelar</Button>
                  <Button onClick={() => saveCRAMutation.mutate({ ...editingCRA, ...craFormData })} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveCRAMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {saveCRAMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {craOrigins.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center text-gray-500">
                  Nenhuma origem registrada
                </CardContent>
              </Card>
            ) : (
              craOrigins.map(cra => {
                const surplus = cra.surplus_native_vegetation_hectares || 0;
                return (
                  <Card key={cra.id} className="hover:shadow-lg transition-all">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg">{properties.find(p => p.id === cra.property_id)?.property_name}</h3>
                            <p className="text-sm text-gray-600">{cra.biome} | CAR: {cra.car_number}</p>
                          </div>
                          <Badge variant="outline" className={surplus > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                            Potencial: {surplus.toFixed(2)}ha
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="bg-blue-50 p-2 rounded"><p className="text-blue-600 font-medium">Total</p><p className="font-bold">{cra.total_area_hectares}ha</p></div>
                          <div className="bg-amber-50 p-2 rounded"><p className="text-amber-600 font-medium">RL Exig.</p><p className="font-bold">{cra.required_legal_reserve_hectares?.toFixed(2)}ha</p></div>
                          <div className="bg-emerald-50 p-2 rounded"><p className="text-emerald-600 font-medium">RL Exist.</p><p className="font-bold">{cra.existing_legal_reserve_hectares?.toFixed(2)}ha</p></div>
                          <div className="bg-purple-50 p-2 rounded"><p className="text-purple-600 font-medium">CRA</p><p className="font-bold">{surplus.toFixed(2)}ha</p></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* VENDER */}
        <TabsContent value="venda" className="space-y-4 mt-6">
          {!editingSale && (
            <Button onClick={() => {
              setEditingSale({});
              setSaleFormData({
                origin_id: '',
                area_hectares: '',
                price_per_hectare: '',
                buyer_email: '',
                notes: ''
              });
            }} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
              <TrendingUp className="w-4 h-4 mr-2" />
              Oferecer CRA à Venda
            </Button>
          )}

          {editingSale && (
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader className="border-b border-emerald-200">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-emerald-900">Oferta de Venda</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingSale(null); setSaleFormData({}); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Origem com CRA *</Label>
                    <Select value={saleFormData.origin_id || ''} onValueChange={(value) => setSaleFormData({ ...saleFormData, origin_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {craOrigins.filter(o => (o.surplus_native_vegetation_hectares || 0) > 0).map(o => (
                          <SelectItem key={o.id} value={o.id}>
                            {properties.find(p => p.id === o.property_id)?.property_name} ({o.surplus_native_vegetation_hectares?.toFixed(2)}ha)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Área a Vender (ha) *</Label>
                    <Input type="number" step="0.01" value={saleFormData.area_hectares || ''} onChange={(e) => setSaleFormData({ ...saleFormData, area_hectares: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Preço por ha (R$) *</Label>
                    <Input type="number" step="100" value={saleFormData.price_per_hectare || ''} onChange={(e) => setSaleFormData({ ...saleFormData, price_per_hectare: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Email do Comprador</Label>
                    <Input type="email" value={saleFormData.buyer_email || ''} onChange={(e) => setSaleFormData({ ...saleFormData, buyer_email: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="font-semibold text-emerald-900">Observações</Label>
                    <Input value={saleFormData.notes || ''} onChange={(e) => setSaleFormData({ ...saleFormData, notes: e.target.value })} placeholder="Detalhes adicionais" />
                  </div>
                  {saleFormData.area_hectares && saleFormData.price_per_hectare && (
                    <div className="md:col-span-2 bg-emerald-100 p-3 rounded-lg border border-emerald-300">
                      <p className="font-bold text-emerald-900">Total: R$ {(parseFloat(saleFormData.area_hectares) * parseFloat(saleFormData.price_per_hectare)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-emerald-100">
                  <Button variant="outline" onClick={() => { setEditingSale(null); setSaleFormData({}); }}>Cancelar</Button>
                  <Button onClick={() => saveSaleMutation.mutate(saleFormData)} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveSaleMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {saveSaleMutation.isPending ? 'Criando...' : 'Criar Oferta'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {transactions.filter(t => t.seller_email === user.email).length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center text-gray-500">
                  Nenhuma oferta de venda
                </CardContent>
              </Card>
            ) : (
              transactions.filter(t => t.seller_email === user.email).map(tx => (
                <Card key={tx.id} className="hover:shadow-lg transition-all border-emerald-100">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-lg text-emerald-900">{tx.area_hectares}ha @ R$ {tx.price_per_hectare}/ha</p>
                        <p className="text-sm text-gray-600">Total: R$ {tx.total_value?.toLocaleString('pt-BR')}</p>
                        <p className="text-xs text-gray-500 mt-1">Comprador: {tx.buyer_email || 'Não especificado'}</p>
                      </div>
                      <Badge>{tx.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* COMPRAR */}
        <TabsContent value="compra" className="space-y-4 mt-6">
          {!editingBuy && (
            <Button onClick={() => {
              setEditingBuy({});
              setBuyFormData({
                property_id: '',
                area_hectares: '',
                price_per_hectare: '',
                seller_email: '',
                notes: ''
              });
            }} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
              <TrendingDown className="w-4 h-4 mr-2" />
              Requisitar Compra de CRA
            </Button>
          )}

          {editingBuy && (
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader className="border-b border-emerald-200">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-emerald-900">Requisição de Compra</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingBuy(null); setBuyFormData({}); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Propriedade para Regularizar *</Label>
                    <Select value={buyFormData.property_id || ''} onValueChange={(value) => setBuyFormData({ ...buyFormData, property_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Área a Comprar (ha) *</Label>
                    <Input type="number" step="0.01" value={buyFormData.area_hectares || ''} onChange={(e) => setBuyFormData({ ...buyFormData, area_hectares: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Preço Máximo por ha (R$) *</Label>
                    <Input type="number" step="100" value={buyFormData.price_per_hectare || ''} onChange={(e) => setBuyFormData({ ...buyFormData, price_per_hectare: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Email do Vendedor</Label>
                    <Input type="email" value={buyFormData.seller_email || ''} onChange={(e) => setBuyFormData({ ...buyFormData, seller_email: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="font-semibold text-emerald-900">Observações</Label>
                    <Input value={buyFormData.notes || ''} onChange={(e) => setBuyFormData({ ...buyFormData, notes: e.target.value })} placeholder="Detalhes" />
                  </div>
                  {buyFormData.area_hectares && buyFormData.price_per_hectare && (
                    <div className="md:col-span-2 bg-emerald-100 p-3 rounded-lg border border-emerald-300">
                      <p className="font-bold text-emerald-900">Investimento Máximo: R$ {(parseFloat(buyFormData.area_hectares) * parseFloat(buyFormData.price_per_hectare)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-emerald-100">
                  <Button variant="outline" onClick={() => { setEditingBuy(null); setBuyFormData({}); }}>Cancelar</Button>
                  <Button onClick={() => saveBuyMutation.mutate(buyFormData)} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveBuyMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {saveBuyMutation.isPending ? 'Criando...' : 'Criar Requisição'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {transactions.filter(t => t.buyer_email === user.email).length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center text-gray-500">
                  Nenhuma requisição de compra
                </CardContent>
              </Card>
            ) : (
              transactions.filter(t => t.buyer_email === user.email).map(tx => (
                <Card key={tx.id} className="hover:shadow-lg transition-all border-emerald-100">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-lg text-emerald-900">{tx.area_hectares}ha @ até R$ {tx.price_per_hectare}/ha</p>
                        <p className="text-sm text-gray-600">Máximo: R$ {tx.total_value?.toLocaleString('pt-BR')}</p>
                        <p className="text-xs text-gray-500 mt-1">Vendedor: {tx.seller_email || 'Não especificado'}</p>
                      </div>
                      <Badge>{tx.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* TRANSAÇÕES */}
        <TabsContent value="transacoes" className="space-y-4 mt-6">
          <div className="grid gap-3">
            {transactions.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center text-gray-500">
                  Nenhuma transação registrada
                </CardContent>
              </Card>
            ) : (
              transactions.map(tx => (
                <Card key={tx.id} className="hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold">{tx.area_hectares}ha × R$ {tx.price_per_hectare}/ha</p>
                          <p className="text-sm text-gray-600">Total: R$ {tx.total_value?.toLocaleString('pt-BR')}</p>
                        </div>
                        <Badge>{tx.status}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 grid grid-cols-2 gap-2">
                        <p><strong>Vendedor:</strong> {tx.seller_email}</p>
                        <p><strong>Comprador:</strong> {tx.buyer_email}</p>
                      </div>
                      {tx.notes && <p className="text-sm text-gray-600 italic">{tx.notes}</p>}
                      <div className="flex gap-2 justify-end pt-2 border-t">
                        <Button size="sm" variant="destructive" onClick={() => {
                          if (confirm('Remover transação?')) deleteTransactionMutation.mutate(tx.id);
                        }} disabled={deleteTransactionMutation.isPending}>
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* INFORMAÇÕES */}
        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Lei 12.651/2012 - Código Florestal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                <p className="font-semibold text-emerald-900">Percentual de Reserva Legal:</p>
                <ul className="mt-2 space-y-1 text-sm text-emerald-800">
                  {Object.entries(LEGAL_RESERVE_PERCENTAGES).map(([b, p]) => (
                    <li key={b}><strong>{b}:</strong> {p}%</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}