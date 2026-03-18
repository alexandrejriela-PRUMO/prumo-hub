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
import { Leaf, Plus, Edit2, Trash2, AlertCircle, Save, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const BIOMAS = ['Amazônia', 'Cerrado', 'Mata Atlântica', 'Caatinga', 'Pantanal', 'Pampas'];

export default function CRASimple() {
  const [user, setUser] = useState(null);
  const [editingOrigin, setEditingOrigin] = useState(null);
  const [editingTitle, setEditingTitle] = useState(null);
  const [originFormData, setOriginFormData] = useState({});
  const [titleFormData, setTitleFormData] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('User not logged in');
      }
    };
    loadUser();
  }, []);

  // ============ QUERIES ============
  const { data: properties = [] } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => base44.entities.Property.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0,
    refetchInterval: 30000
  });

  const { data: origins = [], refetch: refetchOrigins } = useQuery({
    queryKey: ['cra-origins', user?.email],
    queryFn: () => base44.entities.CRAOrigin.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0,
    refetchInterval: 30000
  });

  const { data: titles = [], refetch: refetchTitles } = useQuery({
    queryKey: ['cra-titles', user?.email],
    queryFn: () => base44.entities.CRATitle.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0,
    refetchInterval: 30000
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['cra-transactions', user?.email],
    queryFn: () => base44.entities.CRATransaction.filter({ seller_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0,
    refetchInterval: 30000
  });

  const { data: compensations = [] } = useQuery({
    queryKey: ['cra-compensations', user?.email],
    queryFn: () => base44.entities.CRACompensation.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0,
    refetchInterval: 30000
  });

  // ============ MUTATIONS ============
  const saveOriginMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.property_id || !data.car_number || !data.biome) {
        throw new Error('Preencha todos os campos obrigatórios');
      }
      
      const existing = parseFloat(data.existing_legal_reserve_hectares) || 0;
      const required = parseFloat(data.required_legal_reserve_hectares) || 0;
      const total = parseFloat(data.total_area_hectares) || 0;

      if (total <= 0 || required < 0 || existing < 0) {
        throw new Error('Valores devem ser positivos');
      }

      const surplus = Math.max(0, existing - required);
      const payload = {
        property_id: data.property_id,
        car_number: data.car_number,
        biome: data.biome,
        state: data.state,
        municipality: data.municipality,
        owner_email: user.email,
        consultor_email: user.email,
        total_area_hectares: total,
        required_legal_reserve_hectares: required,
        existing_legal_reserve_hectares: existing,
        surplus_native_vegetation_hectares: surplus,
        potential_cra_area_hectares: surplus,
        status: editingOrigin?.id ? (editingOrigin.status || 'Pendente') : 'Pendente'
      };

      if (editingOrigin?.id) {
        return base44.entities.CRAOrigin.update(editingOrigin.id, payload);
      }
      return base44.entities.CRAOrigin.create(payload);
    },
    onSuccess: async () => {
      await refetchOrigins();
      setEditingOrigin(null);
      setOriginFormData({});
      toast.success('Origem CRA salva com sucesso!');
    },
    onError: (err) => {
      console.error('[CRA] Erro ao salvar origem:', err);
      toast.error(err.message || 'Erro ao salvar');
    }
  });

  const deleteOriginMutation = useMutation({
    mutationFn: (id) => base44.entities.CRAOrigin.delete(id),
    onSuccess: async () => {
      await refetchOrigins();
      toast.success('Deletado!');
    },
    onError: () => toast.error('Erro ao deletar')
  });

  const saveTitleMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.cra_number || !data.origin_id || !data.biome) {
        throw new Error('Preencha todos os campos obrigatórios');
      }
      
      const area = parseFloat(data.cra_area_hectares) || 0;
      if (area <= 0) throw new Error('Área deve ser positiva');

      const origin = origins.find(o => o.id === data.origin_id);
      const payload = {
        cra_number: data.cra_number,
        origin_id: data.origin_id,
        property_id: origin?.property_id,
        biome: data.biome,
        cra_area_hectares: area,
        owner_email: user.email,
        current_holder_email: user.email,
        available_area_hectares: area,
        issue_date: data.issue_date || new Date().toISOString().split('T')[0],
        status: editingTitle?.id ? (editingTitle.status || 'Disponível') : 'Disponível'
      };

      if (editingTitle?.id) {
        return base44.entities.CRATitle.update(editingTitle.id, payload);
      }
      return base44.entities.CRATitle.create(payload);
    },
    onSuccess: async () => {
      await refetchTitles();
      setEditingTitle(null);
      setTitleFormData({});
      toast.success('Título CRA criado com sucesso!');
    },
    onError: (err) => {
      console.error('[CRA] Erro ao salvar título:', err);
      toast.error(err.message || 'Erro ao salvar');
    }
  });

  const deleteTitleMutation = useMutation({
    mutationFn: (id) => base44.entities.CRATitle.delete(id),
    onSuccess: async () => {
      await refetchTitles();
      toast.success('Deletado!');
    },
    onError: () => toast.error('Erro ao deletar')
  });

  const handleEditOrigin = (origin) => {
    setEditingOrigin(origin);
    setOriginFormData({
      property_id: origin.property_id || '',
      car_number: origin.car_number || '',
      biome: origin.biome || '',
      state: origin.state || '',
      municipality: origin.municipality || '',
      total_area_hectares: origin.total_area_hectares || '',
      required_legal_reserve_hectares: origin.required_legal_reserve_hectares || '',
      existing_legal_reserve_hectares: origin.existing_legal_reserve_hectares || ''
    });
  };

  const handleEditTitle = (title) => {
    setEditingTitle(title);
    setTitleFormData({
      cra_number: title.cra_number || '',
      origin_id: title.origin_id || '',
      cra_area_hectares: title.cra_area_hectares || '',
      biome: title.biome || '',
      issue_date: title.issue_date || ''
    });
  };

  const resetOriginForm = () => {
    setEditingOrigin(null);
    setOriginFormData({});
  };

  const resetTitleForm = () => {
    setEditingTitle(null);
    setTitleFormData({});
  };

  if (!user) return <div className="p-4 text-center">Carregando...</div>;

  return (
    <div className="w-full space-y-6 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <Leaf className="w-8 h-8 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-emerald-900">CRA</h1>
            <p className="text-sm text-emerald-600">Cotas de Reserva Ambiental</p>
          </div>
        </div>
        <div className="hidden sm:flex gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-700">{origins.length}</div>
            <div className="text-xs text-gray-600">Origens</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700">{titles.length}</div>
            <div className="text-xs text-gray-600">Títulos</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700">{transactions.length}</div>
            <div className="text-xs text-gray-600">Transações</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700">{compensations.length}</div>
            <div className="text-xs text-gray-600">Compensações</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="origem" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-emerald-50">
          <TabsTrigger value="origem" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Origem</TabsTrigger>
          <TabsTrigger value="titulos" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Títulos</TabsTrigger>
          <TabsTrigger value="transacoes" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Transações</TabsTrigger>
          <TabsTrigger value="compensacoes" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">Compensações</TabsTrigger>
        </TabsList>

        {/* ============ ORIGEM ============ */}
        <TabsContent value="origem" className="space-y-4 mt-6">
          {!editingOrigin && (
            <Button onClick={() => {
              setEditingOrigin({});
              setOriginFormData({
                property_id: '',
                car_number: '',
                biome: '',
                state: '',
                municipality: '',
                total_area_hectares: '',
                required_legal_reserve_hectares: '',
                existing_legal_reserve_hectares: ''
              });
            }} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Origem
            </Button>
          )}

          {editingOrigin && (
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader className="border-b border-emerald-200">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-emerald-900">{editingOrigin.id ? 'Editar Origem' : 'Nova Origem'}</CardTitle>
                  <Button size="sm" variant="ghost" onClick={resetOriginForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Propriedade *</Label>
                    <Select 
                      value={originFormData.property_id || ''} 
                      onValueChange={(value) => setOriginFormData({ ...originFormData, property_id: value })}
                    >
                      <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                        <SelectValue placeholder="Selecione uma propriedade" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">CAR *</Label>
                    <Input 
                      value={originFormData.car_number || ''} 
                      onChange={(e) => setOriginFormData({ ...originFormData, car_number: e.target.value })} 
                      placeholder="123.456.789-12"
                      className="border-emerald-200 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Bioma *</Label>
                    <Select 
                      value={originFormData.biome || ''} 
                      onValueChange={(value) => setOriginFormData({ ...originFormData, biome: value })}
                    >
                      <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                        <SelectValue placeholder="Selecione um bioma" />
                      </SelectTrigger>
                      <SelectContent>
                        {BIOMAS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Estado</Label>
                    <Input 
                      value={originFormData.state || ''} 
                      onChange={(e) => setOriginFormData({ ...originFormData, state: e.target.value })} 
                      placeholder="SP"
                      className="border-emerald-200 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Município</Label>
                    <Input 
                      value={originFormData.municipality || ''} 
                      onChange={(e) => setOriginFormData({ ...originFormData, municipality: e.target.value })} 
                      placeholder="São Paulo"
                      className="border-emerald-200 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Área total (ha) *</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={originFormData.total_area_hectares || ''} 
                      onChange={(e) => setOriginFormData({ ...originFormData, total_area_hectares: e.target.value })} 
                      placeholder="0"
                      className="border-emerald-200 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Reserva Legal exigida (ha) *</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={originFormData.required_legal_reserve_hectares || ''} 
                      onChange={(e) => setOriginFormData({ ...originFormData, required_legal_reserve_hectares: e.target.value })} 
                      placeholder="0"
                      className="border-emerald-200 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Reserva Legal existente (ha) *</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={originFormData.existing_legal_reserve_hectares || ''} 
                      onChange={(e) => setOriginFormData({ ...originFormData, existing_legal_reserve_hectares: e.target.value })} 
                      placeholder="0"
                      className="border-emerald-200 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-emerald-100">
                  <Button variant="outline" onClick={resetOriginForm} className="px-6">Cancelar</Button>
                  <Button onClick={() => saveOriginMutation.mutate({ ...editingOrigin, ...originFormData })} className="px-6 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveOriginMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {saveOriginMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {origins.length === 0 ? (
              <Card className="border-dashed border-2 border-emerald-200">
                <CardContent className="py-12 text-center text-emerald-600 flex items-center justify-center gap-2">
                  <Leaf className="w-5 h-5" />
                  <span>Nenhuma origem cadastrada</span>
                </CardContent>
              </Card>
            ) : (
              origins.map(origin => {
                const prop = properties.find(p => p.id === origin.property_id);
                const surplus = Math.max(0, (origin.existing_legal_reserve_hectares || 0) - (origin.required_legal_reserve_hectares || 0));
                return (
                  <Card key={origin.id} className="hover:shadow-lg transition-all border-emerald-100">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-emerald-900">{prop?.property_name || 'Propriedade'}</h3>
                            <p className="text-sm text-emerald-700 mt-1">CAR: <span className="font-mono">{origin.car_number}</span></p>
                          </div>
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">{origin.status || 'Pendente'}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-emerald-50 p-3 rounded-lg">
                            <p className="text-xs text-emerald-600 font-medium">BIOMA</p>
                            <p className="text-sm font-semibold text-emerald-900">{origin.biome}</p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-xs text-blue-600 font-medium">ÁREA TOTAL</p>
                            <p className="text-sm font-semibold text-blue-900">{origin.total_area_hectares}ha</p>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <p className="text-xs text-purple-600 font-medium">RESERVA LEGAL</p>
                            <p className="text-sm font-semibold text-purple-900">{origin.existing_legal_reserve_hectares}ha</p>
                          </div>
                          <div className="bg-amber-50 p-3 rounded-lg">
                            <p className="text-xs text-amber-600 font-medium">POTENCIAL CRA</p>
                            <p className="text-sm font-semibold text-amber-900">{surplus}ha</p>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => handleEditOrigin(origin)} className="border-emerald-300">
                            <Edit2 className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => {
                            if (confirm('Deletar esta origem?')) deleteOriginMutation.mutate(origin.id);
                          }} disabled={deleteOriginMutation.isPending}>
                            <Trash2 className="w-3 h-3 mr-1" />
                            Deletar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ============ TÍTULOS ============ */}
        <TabsContent value="titulos" className="space-y-4 mt-6">
          {!editingTitle && (
            <Button onClick={() => {
              setEditingTitle({});
              setTitleFormData({
                cra_number: '',
                origin_id: '',
                cra_area_hectares: '',
                biome: '',
                issue_date: ''
              });
            }} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Título
            </Button>
          )}

          {editingTitle && (
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader className="border-b border-emerald-200">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-emerald-900">{editingTitle.id ? 'Editar Título' : 'Novo Título'}</CardTitle>
                  <Button size="sm" variant="ghost" onClick={resetTitleForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Número CRA *</Label>
                    <Input 
                      value={titleFormData.cra_number || ''} 
                      onChange={(e) => setTitleFormData({ ...titleFormData, cra_number: e.target.value })} 
                      placeholder="CRA-123456"
                      className="border-emerald-200 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Origem *</Label>
                    <Select 
                      value={titleFormData.origin_id || ''} 
                      onValueChange={(value) => setTitleFormData({ ...titleFormData, origin_id: value })}
                    >
                      <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                        <SelectValue placeholder="Selecione uma origem" />
                      </SelectTrigger>
                      <SelectContent>
                        {origins.map(o => (
                          <SelectItem key={o.id} value={o.id}>
                            {properties.find(p => p.id === o.property_id)?.property_name || 'Propriedade'} - {o.car_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Área (ha) *</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={titleFormData.cra_area_hectares || ''} 
                      onChange={(e) => setTitleFormData({ ...titleFormData, cra_area_hectares: e.target.value })} 
                      placeholder="0"
                      className="border-emerald-200 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-emerald-900">Bioma *</Label>
                    <Select 
                      value={titleFormData.biome || ''} 
                      onValueChange={(value) => setTitleFormData({ ...titleFormData, biome: value })}
                    >
                      <SelectTrigger className="border-emerald-200 focus:ring-emerald-500">
                        <SelectValue placeholder="Selecione um bioma" />
                      </SelectTrigger>
                      <SelectContent>
                        {BIOMAS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-emerald-100">
                  <Button variant="outline" onClick={resetTitleForm} className="px-6">Cancelar</Button>
                  <Button onClick={() => saveTitleMutation.mutate({ ...editingTitle, ...titleFormData })} className="px-6 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveTitleMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {saveTitleMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3">
            {titles.length === 0 ? (
              <Card className="border-dashed border-2 border-emerald-200">
                <CardContent className="py-12 text-center text-emerald-600 flex items-center justify-center gap-2">
                  <Leaf className="w-5 h-5" />
                  <span>Nenhum título cadastrado</span>
                </CardContent>
              </Card>
            ) : (
              titles.map(title => (
                <Card key={title.id} className="hover:shadow-lg transition-all border-emerald-100">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-emerald-900">CRA {title.cra_number}</h3>
                          <p className="text-sm text-emerald-600 mt-1">Emitido em: {title.issue_date}</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">{title.status || 'Disponível'}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-emerald-50 p-3 rounded-lg">
                          <p className="text-xs text-emerald-600 font-medium">BIOMA</p>
                          <p className="text-sm font-semibold text-emerald-900">{title.biome}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-blue-600 font-medium">ÁREA</p>
                          <p className="text-sm font-semibold text-blue-900">{title.cra_area_hectares}ha</p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-xs text-purple-600 font-medium">DISPONÍVEL</p>
                          <p className="text-sm font-semibold text-purple-900">{title.available_area_hectares || title.cra_area_hectares}ha</p>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-lg">
                          <p className="text-xs text-amber-600 font-medium">UTILIZAÇÃO</p>
                          <p className="text-sm font-semibold text-amber-900">{Math.round(((title.cra_area_hectares - (title.available_area_hectares || 0)) / title.cra_area_hectares) * 100)}%</p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => handleEditTitle(title)} className="border-emerald-300">
                          <Edit2 className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => {
                          if (confirm('Deletar este título?')) deleteTitleMutation.mutate(title.id);
                        }} disabled={deleteTitleMutation.isPending}>
                          <Trash2 className="w-3 h-3 mr-1" />
                          Deletar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ============ TRANSAÇÕES ============ */}
        <TabsContent value="transacoes" className="mt-6">
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardContent className="p-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">Transações em desenvolvimento</p>
                <p className="text-sm text-amber-700">Você tem {transactions.length} transação(ões) registrada(s)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ COMPENSAÇÕES ============ */}
        <TabsContent value="compensacoes" className="mt-6">
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardContent className="p-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">Compensações em desenvolvimento</p>
                <p className="text-sm text-amber-700">Você tem {compensations.length} compensação(ões) registrada(s)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}