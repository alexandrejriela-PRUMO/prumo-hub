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
import { Leaf, Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BIOMAS = ['Amazônia', 'Cerrado', 'Mata Atlântica', 'Caatinga', 'Pantanal', 'Pampas'];

export default function CRASimple() {
  const [user, setUser] = useState(null);
  const [editingOrigin, setEditingOrigin] = useState(null);
  const [editingTitle, setEditingTitle] = useState(null);
  const queryClient = useQueryClient();

  // ============ FETCH USER ============
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
    staleTime: 0
  });

  const { data: origins = [], refetch: refetchOrigins } = useQuery({
    queryKey: ['cra-origins', user?.email],
    queryFn: () => base44.entities.CRAOrigin.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0
  });

  const { data: titles = [], refetch: refetchTitles } = useQuery({
    queryKey: ['cra-titles', user?.email],
    queryFn: () => base44.entities.CRATitle.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0
  });

  const { data: transactions = [], refetch: refetchTransactions } = useQuery({
    queryKey: ['cra-transactions', user?.email],
    queryFn: () => base44.entities.CRATransaction.filter({ seller_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0
  });

  const { data: compensations = [], refetch: refetchCompensations } = useQuery({
    queryKey: ['cra-compensations', user?.email],
    queryFn: () => base44.entities.CRACompensation.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 0
  });

  // ============ MUTATIONS ============
  const saveOriginMutation = useMutation({
    mutationFn: async (data) => {
      const existing = parseFloat(data.existing_legal_reserve_hectares) || 0;
      const required = parseFloat(data.required_legal_reserve_hectares) || 0;
      const total = parseFloat(data.total_area_hectares) || 0;

      if (total <= 0 || required < 0 || existing < 0) {
        throw new Error('Valores inválidos');
      }

      const surplus = Math.max(0, existing - required);
      const payload = {
        ...data,
        owner_email: user.email,
        total_area_hectares: total,
        required_legal_reserve_hectares: required,
        existing_legal_reserve_hectares: existing,
        surplus_native_vegetation_hectares: surplus,
        potential_cra_area_hectares: surplus,
        status: editingOrigin?.status || 'Pendente'
      };

      if (editingOrigin?.id) {
        return base44.entities.CRAOrigin.update(editingOrigin.id, payload);
      }
      return base44.entities.CRAOrigin.create(payload);
    },
    onSuccess: async () => {
      await refetchOrigins();
      setEditingOrigin(null);
      toast.success(editingOrigin?.id ? 'Atualizado!' : 'Criado!');
    },
    onError: (err) => toast.error(err.message || 'Erro ao salvar')
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
      const payload = {
        ...data,
        owner_email: user.email,
        current_holder_email: user.email,
        status: editingTitle?.status || 'Disponível'
      };

      if (editingTitle?.id) {
        return base44.entities.CRATitle.update(editingTitle.id, payload);
      }
      return base44.entities.CRATitle.create(payload);
    },
    onSuccess: async () => {
      await refetchTitles();
      setEditingTitle(null);
      toast.success(editingTitle?.id ? 'Atualizado!' : 'Criado!');
    },
    onError: (err) => toast.error(err.message || 'Erro ao salvar')
  });

  const deleteTitleMutation = useMutation({
    mutationFn: (id) => base44.entities.CRATitle.delete(id),
    onSuccess: async () => {
      await refetchTitles();
      toast.success('Deletado!');
    },
    onError: () => toast.error('Erro ao deletar')
  });

  if (!user) return <div className="p-4">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-emerald-100 rounded-xl">
          <Leaf className="w-8 h-8 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">CRA - Cotas de Reserva Ambiental</h1>
          <p className="text-gray-600 text-sm">Origem: {origins.length} | Títulos: {titles.length} | Transações: {transactions.length} | Compensações: {compensations.length}</p>
        </div>
      </div>

      <Tabs defaultValue="origem" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100">
          <TabsTrigger value="origem">Origem</TabsTrigger>
          <TabsTrigger value="titulos">Títulos</TabsTrigger>
          <TabsTrigger value="transacoes">Transações</TabsTrigger>
          <TabsTrigger value="compensacoes">Compensações</TabsTrigger>
        </TabsList>

        {/* ============ ORIGEM ============ */}
        <TabsContent value="origem" className="space-y-4">
          {editingOrigin ? (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">Editar Origem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Propriedade *</Label>
                    <Select defaultValue={editingOrigin.property_id} onValueChange={(value) => setEditingOrigin({ ...editingOrigin, property_id: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
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
                    <Input defaultValue={editingOrigin.car_number} onChange={(e) => setEditingOrigin({ ...editingOrigin, car_number: e.target.value })} />
                  </div>
                  <div>
                    <Label>Bioma *</Label>
                    <Select defaultValue={editingOrigin.biome} onValueChange={(value) => setEditingOrigin({ ...editingOrigin, biome: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BIOMAS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Área total (ha) *</Label>
                    <Input type="number" step="0.01" defaultValue={editingOrigin.total_area_hectares} onChange={(e) => setEditingOrigin({ ...editingOrigin, total_area_hectares: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Reserva Legal exigida (ha) *</Label>
                    <Input type="number" step="0.01" defaultValue={editingOrigin.required_legal_reserve_hectares} onChange={(e) => setEditingOrigin({ ...editingOrigin, required_legal_reserve_hectares: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Reserva Legal existente (ha) *</Label>
                    <Input type="number" step="0.01" defaultValue={editingOrigin.existing_legal_reserve_hectares} onChange={(e) => setEditingOrigin({ ...editingOrigin, existing_legal_reserve_hectares: parseFloat(e.target.value) })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingOrigin(null)} className="flex-1">Cancelar</Button>
                  <Button onClick={() => saveOriginMutation.mutate(editingOrigin)} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={saveOriginMutation.isPending}>
                    {saveOriginMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setEditingOrigin({
              property_id: '',
              car_number: '',
              biome: '',
              state: '',
              municipality: '',
              total_area_hectares: 0,
              required_legal_reserve_hectares: 0,
              existing_legal_reserve_hectares: 0
            })} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Origem
            </Button>
          )}

          <div className="grid gap-3">
            {origins.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-gray-500">Nenhuma origem cadastrada</CardContent>
              </Card>
            ) : (
              origins.map(origin => {
                const prop = properties.find(p => p.id === origin.property_id);
                const surplus = Math.max(0, (origin.existing_legal_reserve_hectares || 0) - (origin.required_legal_reserve_hectares || 0));
                return (
                  <Card key={origin.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold">{prop?.property_name || 'Propriedade'}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs text-gray-600">
                            <div><span className="font-medium">CAR:</span> {origin.car_number}</div>
                            <div><span className="font-medium">Bioma:</span> {origin.biome}</div>
                            <div><span className="font-medium">Total:</span> {origin.total_area_hectares}ha</div>
                            <div><span className="font-medium text-emerald-700">Potencial CRA:</span> {surplus}ha</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingOrigin(origin)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteOriginMutation.mutate(origin.id)} disabled={deleteOriginMutation.isPending}>
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
        <TabsContent value="titulos" className="space-y-4">
          {editingTitle ? (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">Editar Título</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Número CRA *</Label>
                    <Input defaultValue={editingTitle.cra_number} onChange={(e) => setEditingTitle({ ...editingTitle, cra_number: e.target.value })} />
                  </div>
                  <div>
                    <Label>Origem *</Label>
                    <Select defaultValue={editingTitle.origin_id} onValueChange={(value) => setEditingTitle({ ...editingTitle, origin_id: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {origins.map(o => (
                          <SelectItem key={o.id} value={o.id}>{properties.find(p => p.id === o.property_id)?.property_name || 'Propriedade'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Área (ha) *</Label>
                    <Input type="number" step="0.01" defaultValue={editingTitle.cra_area_hectares} onChange={(e) => setEditingTitle({ ...editingTitle, cra_area_hectares: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Bioma *</Label>
                    <Select defaultValue={editingTitle.biome} onValueChange={(value) => setEditingTitle({ ...editingTitle, biome: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BIOMAS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingTitle(null)} className="flex-1">Cancelar</Button>
                  <Button onClick={() => saveTitleMutation.mutate(editingTitle)} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={saveTitleMutation.isPending}>
                    {saveTitleMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setEditingTitle({
              cra_number: '',
              origin_id: '',
              property_id: '',
              cra_area_hectares: 0,
              biome: ''
            })} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Título
            </Button>
          )}

          <div className="grid gap-3">
            {titles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-gray-500">Nenhum título cadastrado</CardContent>
              </Card>
            ) : (
              titles.map(title => (
                <Card key={title.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold">CRA {title.cra_number}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs text-gray-600">
                          <div><span className="font-medium">Área:</span> {title.cra_area_hectares}ha</div>
                          <div><span className="font-medium">Bioma:</span> {title.biome}</div>
                          <div><span className="font-medium">Disponível:</span> {title.available_area_hectares || title.cra_area_hectares}ha</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge>{title.status}</Badge>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingTitle(title)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteTitleMutation.mutate(title.id)} disabled={deleteTitleMutation.isPending}>
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
        <TabsContent value="transacoes">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-900">Transações ({transactions.length}): Gerencie vendas de CRA em breve</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ COMPENSAÇÕES ============ */}
        <TabsContent value="compensacoes">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-900">Compensações ({compensations.length}): Registre compensações ambientais em breve</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}