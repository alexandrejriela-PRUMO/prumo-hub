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
import { Leaf, Plus, Edit2, Trash2, AlertCircle, Save, X } from 'lucide-react';
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

  if (!user) return <div className="p-4 text-center">Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-emerald-100 rounded-xl">
          <Leaf className="w-8 h-8 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">CRA - Cotas de Reserva Ambiental</h1>
          <p className="text-gray-600 text-sm">Origem: {origins.length} | Títulos: {titles.length} | Transações: {transactions.length} | Compensações: {compensations.length}</p>
        </div>
      </div>

      <Tabs defaultValue="origem" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="origem">Origem</TabsTrigger>
          <TabsTrigger value="titulos">Títulos</TabsTrigger>
          <TabsTrigger value="transacoes">Transações</TabsTrigger>
          <TabsTrigger value="compensacoes">Compensações</TabsTrigger>
        </TabsList>

        {/* ============ ORIGEM ============ */}
        <TabsContent value="origem" className="space-y-4 mt-6">
          {editingOrigin ? (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{editingOrigin.id ? 'Editar Origem' : 'Nova Origem'}</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingOrigin(null); setOriginFormData({}); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Propriedade *</Label>
                    <Select 
                      value={originFormData.property_id || ''} 
                      onValueChange={(value) => setOriginFormData({ ...originFormData, property_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione uma propriedade" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>CAR *</Label>
                    <Input 
                      value={originFormData.car_number || ''} 
                      onChange={(e) => setOriginFormData({ ...originFormData, car_number: e.target.value })} 
                      placeholder="123.456.789-12"
                    />
                  </div>
                  <div>
                    <Label>Bioma *</Label>
                    <Select 
                      value={originFormData.biome || ''} 
                      onValueChange={(value) => setOriginFormData({ ...originFormData, biome: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione um bioma" />
                      </SelectTrigger>
                      <SelectContent>
                        {BIOMAS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estado *</Label>
                    <Input 
                      value={originFormData.state || ''} 
                      onChange={(e) => setOriginFormData({ ...originFormData, state: e.target.value })} 
                      placeholder="SP"
                    />
                  </div>
                  <div>
                    <Label>Município *</Label>
                    <Input 
                      value={originFormData.municipality || ''} 
                      onChange={(e) => setOriginFormData({ ...originFormData, municipality: e.target.value })} 
                      placeholder="São Paulo"
                    />
                  </div>
                  <div>
                    <Label>Área total (ha) *</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={originFormData.total_area_hectares || ''} 
                      onChange={(e) => setOriginFormData({ ...originFormData, total_area_hectares: e.target.value })} 
                    />
                  </div>
                  <div>
                    <Label>Reserva Legal exigida (ha) *</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={originFormData.required_legal_reserve_hectares || ''} 
                      onChange={(e) => setOriginFormData({ ...originFormData, required_legal_reserve_hectares: e.target.value })} 
                    />
                  </div>
                  <div>
                    <Label>Reserva Legal existente (ha) *</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={originFormData.existing_legal_reserve_hectares || ''} 
                      onChange={(e) => setOriginFormData({ ...originFormData, existing_legal_reserve_hectares: e.target.value })} 
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setEditingOrigin(null); setOriginFormData({}); }} className="flex-1">Cancelar</Button>
                  <Button onClick={() => saveOriginMutation.mutate({ ...editingOrigin, ...originFormData })} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={saveOriginMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {saveOriginMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
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
            }} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nova Origem
            </Button>
          )}

          <div className="grid gap-3">
            {origins.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-gray-500">Nenhuma origem cadastrada</CardContent>
              </Card>
            ) : (
              origins.map(origin => {
                const prop = properties.find(p => p.id === origin.property_id);
                const surplus = Math.max(0, (origin.existing_legal_reserve_hectares || 0) - (origin.required_legal_reserve_hectares || 0));
                return (
                  <Card key={origin.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900">{prop?.property_name || origin.property_id}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm text-gray-600">
                            <div><span className="font-medium">CAR:</span> {origin.car_number}</div>
                            <div><span className="font-medium">Bioma:</span> {origin.biome}</div>
                            <div><span className="font-medium">Total:</span> {origin.total_area_hectares}ha</div>
                            <div><span className="font-medium text-emerald-700">Potencial:</span> {surplus}ha</div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" onClick={() => setEditingOrigin(origin)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => {
                            if (confirm('Deletar esta origem?')) deleteOriginMutation.mutate(origin.id);
                          }} disabled={deleteOriginMutation.isPending}>
                            <Trash2 className="w-3 h-3" />
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
          {editingTitle ? (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{editingTitle.id ? 'Editar Título' : 'Novo Título'}</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingTitle(null); setTitleFormData({}); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Número CRA *</Label>
                    <Input 
                      value={titleFormData.cra_number || ''} 
                      onChange={(e) => setTitleFormData({ ...titleFormData, cra_number: e.target.value })} 
                      placeholder="CRA-123456"
                    />
                  </div>
                  <div>
                    <Label>Origem *</Label>
                    <Select 
                      value={titleFormData.origin_id || ''} 
                      onValueChange={(value) => setTitleFormData({ ...titleFormData, origin_id: value })}
                    >
                      <SelectTrigger className="mt-1">
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
                  <div>
                    <Label>Área (ha) *</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={titleFormData.cra_area_hectares || ''} 
                      onChange={(e) => setTitleFormData({ ...titleFormData, cra_area_hectares: e.target.value })} 
                    />
                  </div>
                  <div>
                    <Label>Bioma *</Label>
                    <Select 
                      value={titleFormData.biome || ''} 
                      onValueChange={(value) => setTitleFormData({ ...titleFormData, biome: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione um bioma" />
                      </SelectTrigger>
                      <SelectContent>
                        {BIOMAS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setEditingTitle(null); setTitleFormData({}); }} className="flex-1">Cancelar</Button>
                  <Button onClick={() => saveTitleMutation.mutate({ ...editingTitle, ...titleFormData })} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={saveTitleMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {saveTitleMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => {
              setEditingTitle({});
              setTitleFormData({
                cra_number: '',
                origin_id: '',
                property_id: '',
                cra_area_hectares: '',
                biome: ''
              });
            }} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Novo Título
            </Button>
          )}

          <div className="grid gap-3">
            {titles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-gray-500">Nenhum título cadastrado</CardContent>
              </Card>
            ) : (
              titles.map(title => (
                <Card key={title.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">CRA {title.cra_number}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm text-gray-600">
                          <div><span className="font-medium">Área:</span> {title.cra_area_hectares}ha</div>
                          <div><span className="font-medium">Bioma:</span> {title.biome}</div>
                          <div><span className="font-medium">Disponível:</span> {title.available_area_hectares || title.cra_area_hectares}ha</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge>{title.status}</Badge>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingTitle(title)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => {
                            if (confirm('Deletar este título?')) deleteTitleMutation.mutate(title.id);
                          }} disabled={deleteTitleMutation.isPending}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
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
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-900"><strong>Transações ({transactions.length}):</strong> Funcionalidade em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ COMPENSAÇÕES ============ */}
        <TabsContent value="compensacoes" className="mt-6">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-900"><strong>Compensações ({compensations.length}):</strong> Funcionalidade em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}